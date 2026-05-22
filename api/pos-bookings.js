const POS_PROJECT_ID = "wypstudio-pos";
const POS_API_KEY = process.env.POS_FIREBASE_API_KEY || "AIzaSyDj5jftTZjkzUzaCtQ-IdReic96GYmvn_Y";

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    return decodeFirestoreFields(value.mapValue.fields || {});
  }
  return undefined;
}

function decodeFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function readNumber(value) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function detectChannel(data) {
  const source = String(data.source ?? data.channel ?? data.platform ?? "").toLowerCase();
  if (source.includes("telegram")) return "Telegram";
  if (source.includes("messenger") || source.includes("facebook")) return "Messenger";
  return "Manual";
}

function getDepositLabel({ status, balance, deposit, total }) {
  if (status === "Completed" || (balance === 0 && total > 0)) return "Paid";
  if (deposit > 0 && balance > 0) return "Partial paid";
  if (deposit > 0) return "Deposit received";
  return "Pending";
}

function getBookingTone(status, balance, deposit) {
  if (status === "Cancelled") return "neutral";
  if (status === "Completed" || (balance === 0 && deposit > 0)) return "good";
  if (deposit > 0) return "watch";
  return "risk";
}

function normalizeBookingDoc(doc, source) {
  const data = decodeFirestoreFields(doc.fields || {});
  const date = String(data.date ?? data.ceremonyDate ?? data.requestedDate ?? "");
  const status = String(data.status ?? "Open");
  const balance = readNumber(data.balance);
  const deposit = readNumber(data.deposit);
  const total = readNumber(data.finalTotal ?? data.totalPaid ?? data.amount ?? data.price);
  const id = String(doc.name || "").split("/").pop() || "";

  return {
    id,
    source,
    clientName: String(data.customerName ?? data.name ?? data.clientName ?? "Unnamed client"),
    phone: String(data.customerPhone ?? data.phone ?? ""),
    phoneType: String(data.customerPhoneType ?? ""),
    packageName: String(data.packageName ?? data.packageCategory ?? source),
    packageCategory: String(data.packageCategory ?? data.category ?? source),
    date,
    time: String(data.time ?? data.requestedTime ?? ""),
    status,
    workStatus: String(data.workStatus ?? ""),
    notes: String(data.notes ?? ""),
    deposit,
    balance,
    total,
    depositLabel: getDepositLabel({ status, balance, deposit, total }),
    channel: detectChannel(data),
    tone: getBookingTone(status, balance, deposit),
  };
}

function dateTimeValue(item) {
  const dateValue = item.date ? new Date(`${item.date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  const safeDateValue = Number.isFinite(dateValue) ? dateValue : Number.MAX_SAFE_INTEGER;
  const [hour = "0", minute = "0"] = String(item.time || "").split(":");
  return safeDateValue + readNumber(hour) * 3_600_000 + readNumber(minute) * 60_000;
}

async function signInWithPassword(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${POS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "POS login failed.");
  }
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    email: data.email || email,
  };
}

async function refreshIdToken(refreshToken) {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${POS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "POS session expired. Please login again.");
  }
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    email: data.user_id || "",
  };
}

async function fetchCollection(collectionName, idToken) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${POS_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Failed to read ${collectionName}.`);
  }
  return data.documents || [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email, password, refreshToken } = req.body || {};
    if (!refreshToken && (!email || !password)) {
      return res.status(400).json({ error: "POS email/password သို့မဟုတ် saved session လိုအပ်ပါတယ်။" });
    }

    const authSession = refreshToken
      ? await refreshIdToken(refreshToken)
      : await signInWithPassword(email, password);

    const [bookingDocs, convocationDocs] = await Promise.all([
      fetchCollection("bookings", authSession.idToken),
      fetchCollection("convocation_bookings", authSession.idToken),
    ]);

    const bookings = [
      ...bookingDocs.map((doc) => normalizeBookingDoc(doc, "Booking")),
      ...convocationDocs.map((doc) => normalizeBookingDoc(doc, "Convocation")),
    ].sort((a, b) => dateTimeValue(a) - dateTimeValue(b));

    return res.status(200).json({
      sourceMode: "vercel-proxy",
      sourceLabel: "WYPS-POS Firestore via Vercel",
      lastUpdated: new Date().toISOString(),
      session: {
        email: authSession.email || email || "",
        refreshToken: authSession.refreshToken || refreshToken || "",
      },
      bookings,
    });
  } catch (error) {
    console.error("POS bookings proxy error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to load POS bookings.",
    });
  }
}
