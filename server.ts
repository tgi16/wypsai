import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Gemini API Proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { model, contents, config } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model,
        contents,
        config
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
        index: c.index
      }));

      res.json({
        text: response.text,
        candidates: serializedCandidates,
        usageMetadata: response.usageMetadata
      });
    } catch (error: any) {
      console.error("Server-side Gemini Error:", error);
      res.status(error.status || 500).json({ 
        error: error.message || "Internal Server Error",
        details: error.details || null
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
