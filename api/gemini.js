import { GoogleGenAI } from "@google/genai";
import { authorizeGeminiRequest, checkGeminiRateLimit, sanitizeGeminiRequest } from "../geminiGuard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const requestAbortController = new AbortController();
    req.once?.('aborted', () => requestAbortController.abort());
    const claims = await authorizeGeminiRequest(req);
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req.socket?.remoteAddress
      || "unknown";
    if (checkGeminiRateLimit(claims.sub, ip)) {
      return res.status(429).json({ error: "AI request အရေအတွက် များနေပါပြီ။ ခဏစောင့်ပြီး ပြန်စမ်းပါ။" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const { model, contents, config } = sanitizeGeminiRequest(req.body);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { ...config, abortSignal: requestAbortController.signal },
    });

    return res.status(200).json({
      text: response.text || "",
      candidates: response.candidates || null,
      usageMetadata: response.usageMetadata || null,
    });
  } catch (error) {
    if (error?.name === 'AbortError' || req.aborted) return;
    console.error("Vercel Gemini Error:", error);
    const isAuthError = /Authentication|required|token|account is not allowed/i.test(error?.message || '');
    return res.status(isAuthError ? 401 : (error?.status || 500)).json({
      error: error?.message || "Internal Server Error",
      details: error?.details || null,
    });
  }
}
