import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { authorizeGeminiRequest, checkGeminiRateLimit, sanitizeGeminiRequest } from "./geminiGuard.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createHttpServer(app);

  app.use(express.json({ limit: '10mb' }));

  // Gemini API Proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const requestAbortController = new AbortController();
      req.once('aborted', () => requestAbortController.abort());
      const claims = await authorizeGeminiRequest(req, { allowDevelopment: true });
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        || req.socket.remoteAddress
        || "unknown";
      if (checkGeminiRateLimit(claims.sub, ip)) {
        return res.status(429).json({ error: "AI request အရေအတွက် များနေပါပြီ။ ခဏစောင့်ပြီး ပြန်စမ်းပါ။" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { model, contents, config } = sanitizeGeminiRequest(req.body);
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { ...config, abortSignal: requestAbortController.signal }
      });

      // Manually extract candidates to ensure binary data (inlineData) is properly serialized
      const serializedCandidates = response.candidates?.map(c => ({
        content: {
          parts: c.content.parts.map(p => ({
            text: p.text,
            inlineData: p.inlineData ? {
              data: p.inlineData.data,
              mimeType: p.inlineData.mimeType
            } : undefined
          }))
        },
        finishReason: c.finishReason,
        index: c.index,
        groundingMetadata: c.groundingMetadata,
      }));

      res.json({
        text: response.text,
        candidates: serializedCandidates,
        usageMetadata: response.usageMetadata
      });
    } catch (error: any) {
      if (error?.name === 'AbortError' || req.aborted) return;
      console.error("Server-side Gemini Error:", error);
      const isAuthError = /Authentication|required|token|account is not allowed/i.test(error?.message || '');
      res.status(isAuthError ? 401 : (error.status || 500)).json({
        error: error.message || "Internal Server Error",
        details: error.details || null
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
