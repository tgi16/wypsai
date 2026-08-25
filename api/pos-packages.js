import { authorizeGeminiRequest } from "../geminiGuard.js";

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
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function normalizePackageDoc(doc) {
  const data = decodeFirestoreFields(doc.fields || {});
  const id = String(doc.name || "").split("/").pop() || "";
  return {
    id,
    name: String(data.name ?? "Unnamed package").trim(),
    category: String(data.category ?? "Other").trim(),
    subcategory: String(data.subcategory ?? "General").trim(),
    price: Number(data.price ?? 0),
    details: String(data.details ?? "").trim(),
  };
}

async function signInWithPassword(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${POS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "POS login failed.");
  return { idToken: data.idToken, refreshToken: data.refreshToken, email: data.email || email };
}

async function refreshIdToken(refreshToken) {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${POS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "POS session expired. Please login again.");
  return { idToken: data.id_token, refreshToken: data.refresh_token || refreshToken, email: data.user_id || "" };
}

async function fetchPackages(idToken) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${POS_PROJECT_ID}/databases/(default)/documents/packages?pageSize=500`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Failed to read POS packages.");
  return (data.documents || []).map(normalizePackageDoc).filter((pkg) => pkg.name && pkg.price > 0);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await authorizeGeminiRequest(req);
    const { email, password, refreshToken } = req.body || {};
    if (!refreshToken && (!email || !password)) {
      return res.status(400).json({ error: "POS email/password သို့မဟုတ် saved session လိုအပ်ပါတယ်။" });
    }

    const authSession = refreshToken ? await refreshIdToken(refreshToken) : await signInWithPassword(email, password);
    const packages = await fetchPackages(authSession.idToken);

    return res.status(200).json({
      sourceMode: "vercel-proxy",
      sourceLabel: "WYPS-POS master-data.js Firestore packages via Vercel",
      lastUpdated: new Date().toISOString(),
      session: {
        email: authSession.email || email || "",
        refreshToken: authSession.refreshToken || refreshToken || "",
      },
      packages,
    });
  } catch (error) {
    console.error("POS packages proxy error:", error);
    return res.status(error?.status || 500).json({ error: error?.message || "Failed to load POS packages." });
  }
}
