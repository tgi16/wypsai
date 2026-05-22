const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const dataUrlToBlob = (dataUrl) => {
  const [header, data = ""] = String(dataUrl || "").split(",");
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] || "image/jpeg";
  const bytes = Buffer.from(data, "base64");
  return new Blob([bytes], { type: mimeType });
};

const readGraphResponse = async (graphResponse) => {
  const rawText = await graphResponse.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { error: { message: rawText || "Unexpected Facebook response" } };
  }
};

const graphErrorResponse = (res, graphResponse, data, fallbackMessage) => res.status(graphResponse.status || 500).json({
  error: data?.error?.message || fallbackMessage,
  details: data?.error || null,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { pageId, pageToken, message, imageDataUrl, scheduleTime } = await parseJsonBody(req);

    if (!pageId || !pageToken || !message || !imageDataUrl) {
      return res.status(400).json({
        error: "pageId, pageToken, message, and imageDataUrl are required.",
      });
    }

    let scheduledPublishUnixTime = null;
    if (scheduleTime) {
      const scheduleDate = new Date(scheduleTime);
      if (Number.isNaN(scheduleDate.getTime())) {
        return res.status(400).json({ error: "Invalid scheduleTime format." });
      }

      const minScheduleDate = Date.now() + 10 * 60 * 1000;
      if (scheduleDate.getTime() < minScheduleDate) {
        return res.status(400).json({
          error: "Schedule time must be at least 10 minutes in the future.",
        });
      }

      const maxScheduleDate = Date.now() + 75 * 24 * 60 * 60 * 1000;
      if (scheduleDate.getTime() > maxScheduleDate) {
        return res.status(400).json({
          error: "Schedule time must be within 75 days.",
        });
      }

      scheduledPublishUnixTime = Math.floor(scheduleDate.getTime() / 1000);
    }

    if (!scheduledPublishUnixTime) {
      const formData = new FormData();
      formData.append("source", dataUrlToBlob(imageDataUrl), "facebook-post.jpg");
      formData.append("message", message);
      formData.append("access_token", pageToken);

      const graphResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method: "POST",
        body: formData,
      });

      const data = await readGraphResponse(graphResponse);
      if (!graphResponse.ok || data?.error) {
        return graphErrorResponse(res, graphResponse, data, "Failed to publish Facebook photo post");
      }

      return res.status(200).json({ ...data, scheduled: false });
    }

    const photoFormData = new FormData();
    photoFormData.append("source", dataUrlToBlob(imageDataUrl), "facebook-post.jpg");
    photoFormData.append("published", "false");
    photoFormData.append("access_token", pageToken);

    const photoResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      method: "POST",
      body: photoFormData,
    });
    const photoData = await readGraphResponse(photoResponse);
    if (!photoResponse.ok || photoData?.error || !photoData?.id) {
      return graphErrorResponse(res, photoResponse, photoData, "Failed to upload scheduled Facebook photo");
    }

    const feedFormData = new FormData();
    feedFormData.append("message", message);
    feedFormData.append("published", "false");
    feedFormData.append("scheduled_publish_time", String(scheduledPublishUnixTime));
    feedFormData.append("attached_media[0]", JSON.stringify({ media_fbid: photoData.id }));
    feedFormData.append("access_token", pageToken);

    const feedResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      body: feedFormData,
    });
    const feedData = await readGraphResponse(feedResponse);
    if (!feedResponse.ok || feedData?.error) {
      return graphErrorResponse(res, feedResponse, feedData, "Failed to schedule Facebook post");
    }

    return res.status(200).json({
      ...feedData,
      scheduled: true,
      photoId: photoData.id,
      scheduledPublishTime: scheduledPublishUnixTime,
    });
  } catch (error) {
    console.error("Facebook post proxy error:", error);
    return res.status(500).json({
      error: error?.message || "Internal Server Error",
    });
  }
}
