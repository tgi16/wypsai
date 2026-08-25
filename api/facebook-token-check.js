import { authorizeGeminiRequest } from "../geminiGuard.js";

const GRAPH_VERSION = "v19.0";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await authorizeGeminiRequest(req);
    const { pageId, pageToken } = await parseJsonBody(req);
    if (!pageId || !pageToken) {
      return res.status(400).json({ error: "Page ID နဲ့ Page Access Token လိုအပ်ပါတယ်။" });
    }

    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", pageToken);

    const response = await fetch(url.toString());
    const data = await readGraphResponse(response);
    if (!response.ok || data?.error) {
      return res.status(response.status || 500).json({
        error: data?.error?.message || "Facebook Page token check failed.",
        details: data?.error || null,
      });
    }

    return res.status(200).json({
      ok: true,
      pageId: data.id,
      pageName: data.name,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Facebook token check error:", error);
    return res.status(error?.status || 500).json({ error: error?.message || "Facebook token check failed." });
  }
}
