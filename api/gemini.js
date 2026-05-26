import { GoogleGenAI } from "@google/genai";

// ── Simple in-memory rate limiter (per Vercel function instance) ────────────
// Limits to MAX_CALLS requests per IP within WINDOW_MS milliseconds.
const WINDOW_MS = 60_000; // 1 minute
const MAX_CALLS = 25;     // max 25 calls/min per IP
const rateLimitMap = new Map(); // ip → { count, windowStart }

const checkRateLimit = (ip) => {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > WINDOW_MS) {
    // Reset window
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false; // not limited
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count > MAX_CALLS; // true = over limit
};
// ─────────────────────────────────────────────────────────────────────────────

const headerValue = (value) => (Array.isArray(value) ? value[0] : value);

const headerUrlMatchesHost = (value, host) => {
  const rawValue = headerValue(value);
  if (!rawValue || !host) return false;

  try {
    return new URL(rawValue).host === host;
  } catch {
    return false;
  }
};

const isAppOriginRequest = (req) => (
  headerUrlMatchesHost(req.headers.origin, req.headers.host) ||
  headerUrlMatchesHost(req.headers.referer, req.headers.host)
);

const isAuthorizedGeminiRequest = (req) => {
  const expectedSecret = process.env.WYPS_API_SECRET;
  if (!expectedSecret) return true;
  if (req.headers["x-wyps-secret"] === expectedSecret) return true;

  return isAppOriginRequest(req);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!isAuthorizedGeminiRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.socket?.remoteAddress
    || "unknown";
  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: "တစ်မိနစ်မှာ request အများကြီး ပို့မနေပါနဲ့။ ခဏစောင့်ပြီး ပြန်စမ်းပါ။" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const { model, contents, config } = req.body || {};
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    return res.status(200).json({
      text: response.text || "",
      candidates: response.candidates || null,
      usageMetadata: response.usageMetadata || null,
    });
  } catch (error) {
    console.error("Vercel Gemini Error:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Internal Server Error",
      details: error?.details || null,
    });
  }
}
