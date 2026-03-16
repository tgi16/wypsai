import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const { model, contents, config } = req.body ?? {};
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    return res.status(200).json({
      text: response.text || "",
      candidates: response.candidates ?? null,
      usageMetadata: response.usageMetadata ?? null,
    });
  } catch (error: any) {
    console.error("Vercel Gemini Error:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Internal Server Error",
      details: error?.details || null,
    });
  }
}
