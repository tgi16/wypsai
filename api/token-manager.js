import { authorizeGeminiRequest } from "../geminiGuard.js";

const GRAPH_VERSION = "v19.0";
const DEFAULT_AD_ACCOUNT_ID = process.env.FACEBOOK_INSIGHTS_AD_ACCOUNT_ID || "act_4737584856358808";
const INSIGHTS_TOKEN = process.env.FACEBOOK_INSIGHTS_ACCESS_TOKEN || "";
const APP_ACCESS_TOKEN = process.env.FACEBOOK_APP_ACCESS_TOKEN
  || (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
    ? `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
    : "");

const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const readGraphResponse = async (response) => {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { error: { message: rawText || "Unexpected Facebook response" } };
  }
};

const graphGet = async (path, params = {}) => {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString());
  const data = await readGraphResponse(response);
  if (!response.ok || data?.error) {
    const error = new Error(data?.error?.message || "Facebook Graph API request failed.");
    error.details = data?.error || null;
    error.status = response.status;
    throw error;
  }
  return data;
};

const maskToken = (token = "") => {
  if (!token) return "";
  if (token.length <= 14) return `${token.slice(0, 4)}...`;
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
};

const formatUnixDate = (value) => {
  const numberValue = Number(value || 0);
  if (!numberValue) return "";
  return new Date(numberValue * 1000).toISOString();
};

const getDaysLeft = (isoDate) => {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  return Math.ceil(diff / 86_400_000);
};

const debugToken = async (token) => {
  if (!APP_ACCESS_TOKEN || !token) return null;
  const data = await graphGet("debug_token", {
    input_token: token,
    access_token: APP_ACCESS_TOKEN,
  });
  return data?.data || null;
};

const inspectPageToken = async ({ pageId, pageToken }) => {
  const base = {
    key: "pagePost",
    label: "Facebook Page Post Token",
    configured: Boolean(pageId && pageToken),
    tokenMask: maskToken(pageToken),
    pageId: pageId || "",
    valid: false,
    expiresAt: "",
    dataAccessExpiresAt: "",
    daysLeft: null,
    scopes: [],
    canDebugExpiry: Boolean(APP_ACCESS_TOKEN),
    checkedAt: new Date().toISOString(),
    warnings: [],
  };

  if (!base.configured) {
    return {
      ...base,
      status: "warn",
      message: "ဒီ browser ထဲမှာ Page ID/Page Access Token မတွေ့ပါ။",
      action: "Content Factory > Facebook Page Setup မှာ Page ID နဲ့ Token ထည့်ပါ။",
    };
  }

  try {
    const [pageData, debugData] = await Promise.all([
      graphGet(pageId, { fields: "id,name", access_token: pageToken }),
      debugToken(pageToken).catch((error) => ({ debugError: error?.message || "debug_token failed" })),
    ]);
    const expiresAt = debugData && !debugData.debugError ? formatUnixDate(debugData.expires_at) : "";
    const dataAccessExpiresAt = debugData && !debugData.debugError ? formatUnixDate(debugData.data_access_expires_at) : "";
    const daysLeft = getDaysLeft(expiresAt);
    const warnings = [];
    if (!base.canDebugExpiry) warnings.push("Expiry ကိုပြဖို့ FACEBOOK_APP_ACCESS_TOKEN သို့မဟုတ် FACEBOOK_APP_ID/SECRET env မရှိသေးပါ။");
    if (daysLeft !== null && daysLeft <= 7) warnings.push("Token expiry နီးနေပါတယ်။ အသစ်ပြန်ထုတ်ထားတာကောင်းပါတယ်။");

    return {
      ...base,
      status: daysLeft !== null && daysLeft <= 7 ? "warn" : "ok",
      valid: !debugData || debugData.debugError ? true : Boolean(debugData.is_valid),
      pageId: pageData.id,
      pageName: pageData.name,
      appId: debugData?.app_id || "",
      tokenType: debugData?.type || "page",
      expiresAt,
      dataAccessExpiresAt,
      daysLeft,
      scopes: debugData?.scopes || [],
      warnings,
      message: `${pageData.name} page token အလုပ်လုပ်နေပါတယ်။`,
      action: warnings[0] || "",
    };
  } catch (error) {
    return {
      ...base,
      status: "fail",
      message: error?.message || "Page token check failed.",
      action: "Page Access Token အသစ်ပြန်ထုတ်ပြီး Content Factory ထဲပြန်ထည့်ပါ။",
      details: error?.details || null,
    };
  }
};

const inspectInsightsToken = async () => {
  const base = {
    key: "insights",
    label: "Facebook Insights Token",
    configured: Boolean(INSIGHTS_TOKEN),
    tokenMask: maskToken(INSIGHTS_TOKEN),
    adAccountId: DEFAULT_AD_ACCOUNT_ID,
    valid: false,
    expiresAt: "",
    dataAccessExpiresAt: "",
    daysLeft: null,
    scopes: [],
    canDebugExpiry: Boolean(APP_ACCESS_TOKEN),
    checkedAt: new Date().toISOString(),
    warnings: [],
  };

  if (!INSIGHTS_TOKEN) {
    return {
      ...base,
      status: "fail",
      message: "Vercel env ထဲမှာ FACEBOOK_INSIGHTS_ACCESS_TOKEN မတွေ့ပါ။",
      action: "Vercel Project Settings > Environment Variables ထဲမှာ Insights token ထည့်ပါ။",
    };
  }

  try {
    const [me, adAccount, debugData] = await Promise.all([
      graphGet("me", { fields: "id,name", access_token: INSIGHTS_TOKEN }),
      graphGet(DEFAULT_AD_ACCOUNT_ID, { fields: "id,name,account_status", access_token: INSIGHTS_TOKEN }),
      debugToken(INSIGHTS_TOKEN).catch((error) => ({ debugError: error?.message || "debug_token failed" })),
    ]);
    const expiresAt = debugData && !debugData.debugError ? formatUnixDate(debugData.expires_at) : "";
    const dataAccessExpiresAt = debugData && !debugData.debugError ? formatUnixDate(debugData.data_access_expires_at) : "";
    const daysLeft = getDaysLeft(expiresAt);
    const scopes = debugData?.scopes || [];
    const warnings = [];
    if (!base.canDebugExpiry) warnings.push("Expiry ကိုပြဖို့ FACEBOOK_APP_ACCESS_TOKEN သို့မဟုတ် FACEBOOK_APP_ID/SECRET env မရှိသေးပါ။");
    if (daysLeft !== null && daysLeft <= 7) warnings.push("Insights token expiry နီးနေပါတယ်။");
    if (scopes.length && !scopes.includes("ads_read") && !scopes.includes("ads_management")) {
      warnings.push("ads_read သို့မဟုတ် ads_management permission မပါသေးပါ။");
    }

    return {
      ...base,
      status: warnings.some((item) => item.includes("permission")) ? "warn" : daysLeft !== null && daysLeft <= 7 ? "warn" : "ok",
      valid: !debugData || debugData.debugError ? true : Boolean(debugData.is_valid),
      ownerName: me.name,
      ownerId: me.id,
      adAccountName: adAccount.name || DEFAULT_AD_ACCOUNT_ID,
      adAccountStatus: adAccount.account_status,
      appId: debugData?.app_id || "",
      tokenType: debugData?.type || "user",
      expiresAt,
      dataAccessExpiresAt,
      daysLeft,
      scopes,
      warnings,
      message: `${adAccount.name || DEFAULT_AD_ACCOUNT_ID} insights token အလုပ်လုပ်နေပါတယ်။`,
      action: warnings[0] || "",
    };
  } catch (error) {
    return {
      ...base,
      status: "fail",
      message: error?.message || "Insights token check failed.",
      action: "Insights token အသစ်ပြန်ထုတ်ပြီး Vercel env ထဲ update လုပ်ပါ။",
      details: error?.details || null,
    };
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await authorizeGeminiRequest(req);
    const { pageId, pageToken } = await parseJsonBody(req);
    const [pagePost, insights] = await Promise.all([
      inspectPageToken({ pageId, pageToken }),
      inspectInsightsToken(),
    ]);

    return res.status(200).json({
      ok: true,
      canDebugExpiry: Boolean(APP_ACCESS_TOKEN),
      checkedAt: new Date().toISOString(),
      tokens: [pagePost, insights],
    });
  } catch (error) {
    console.error("Token manager error:", error);
    return res.status(error?.status || 500).json({ error: error?.message || "Token manager failed." });
  }
}
