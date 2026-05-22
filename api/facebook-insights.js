const GRAPH_VERSION = "v19.0";
const DEFAULT_AD_ACCOUNT_ID = process.env.FACEBOOK_INSIGHTS_AD_ACCOUNT_ID || "act_4737584856358808";
const DEFAULT_INSIGHTS_TOKEN = process.env.FACEBOOK_INSIGHTS_ACCESS_TOKEN || "";

const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const readGraphResponse = async (graphResponse) => {
  const rawText = await graphResponse.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { error: { message: rawText || "Unexpected Facebook response" } };
  }
};

const graphGet = async (path, params) => {
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

const pickMetric = (insights = [], names = []) => {
  for (const name of names) {
    const item = insights.find((metric) => metric.name === name);
    if (!item) continue;
    const value = item.values?.[0]?.value;
    if (typeof value === "number") return value;
    if (value && typeof value === "object") {
      return Object.values(value).reduce((sum, next) => sum + Number(next || 0), 0);
    }
  }
  return 0;
};

const getFormat = (post) => {
  const attachment = post.attachments?.data?.[0] || {};
  const type = `${attachment.media_type || ""} ${attachment.type || ""}`.toLowerCase();
  if (type.includes("video") || type.includes("reel")) return "reel/video";
  if (type.includes("photo") || type.includes("album")) return "photo";
  return "feed";
};

const keywordGroups = [
  { key: "Sweet 17 / Birthday", patterns: [/sweet\s*17/i, /birthday/i, /မွေးနေ့/i] },
  { key: "Pre-wedding", patterns: [/pre[-\s]?wedding/i, /wedding/i, /သတို့/i] },
  { key: "Family", patterns: [/family/i, /မိသားစု/i, /baby/i] },
  { key: "Donation / Monk offering", patterns: [/donation/i, /monk/i, /ဆွမ်း/i, /အလှူ/i] },
  { key: "Indoor portrait", patterns: [/indoor/i, /portrait/i, /studio/i] },
];

const topicLabels = {
  "Sweet 17 / Birthday": "မွေးနေ့ / Sweet 17",
  "Pre-wedding": "Pre-wedding / မင်္ဂလာအကြို",
  "Family": "မိသားစု / Portrait",
  "Donation / Monk offering": "အလှူ / ဆွမ်းကပ်",
  "Indoor portrait": "Indoor Studio Portrait",
  "General studio content": "Studio ရိုက်ကူးရေး အထွေထွေ",
};

const toMyanmarTopic = (topic = "General studio content") => topicLabels[topic] || topic;

const inferAdTopic = (text = "") => detectTopic(text);

const detectTopic = (message = "") => (
  keywordGroups.find((group) => group.patterns.some((pattern) => pattern.test(message)))?.key || "General studio content"
);

const getAdDatePreset = (days) => (
  Number(days || 30) <= 7 ? "last_7d" : Number(days || 30) <= 30 ? "last_30d" : "last_90d"
);

const buildContentIdeas = ({ topTopics = [], topPosts = [], bestTopic = "General studio content" }) => {
  const topicLabel = toMyanmarTopic(bestTopic);
  const topAdText = topPosts[0]?.message || "";
  const secondAdText = topPosts[1]?.message || "";
  const secondTopicLabel = toMyanmarTopic(topTopics[1]?.topic || "Pre-wedding");

  return [
    {
      title: `${topicLabel} ကို Storytelling Post အဖြစ်ရေးရန်`,
      angle: "ယခင် ad data ထဲက performance ကောင်းခဲ့တဲ့ angle ကို copy မကူးဘဲ client story ပုံစံနဲ့ပြန်အသက်သွင်းပါ။",
      bestFor: "Facebook Post",
      prompt: [
        `ဒီနေ့ Facebook post ကို ${topicLabel} angle နဲ့ရေးပါ။`,
        "Style: နူးညံ့ပြီး premium ဆန်, sales မဆန်, စာပိုဒ် 4-6 ပိုဒ်။",
        "Hook: ပုံ/ရိုက်ကူးရေးခံစားချက်ကို ပထမစာကြောင်းမှာဆွဲဆောင်အောင်ရေးပါ။",
        "Body: client ရဲ့အမှတ်တရဖြစ်စေချင်တဲ့ခံစားချက် + With You Photo Studio ရဲ့ ဂရုစိုက်မှုကိုထည့်ပါ။",
        "CTA: Message မှာပေါ့ပေါ့ပါးပါး မေးနိုင်ကြောင်း နူးညံ့စွာဆုံးပါ။",
        topAdText ? `Reference insight: ${topAdText}` : "",
      ].filter(Boolean).join("\n"),
    },
    {
      title: `${secondTopicLabel} အတွက် Booking Inquiry Post`,
      angle: "မေးမြန်းလာချင်အောင် pain point တစ်ခုကိုနူးညံ့စွာဖော်ပြပြီး package/detail မေးဖို့ CTA ထည့်ပါ။",
      bestFor: "Booking CTA",
      prompt: [
        `ဒီနေ့ booking inquiry ရစေဖို့ ${secondTopicLabel} အကြောင်း Facebook caption ရေးပါ။`,
        "Style: ဖတ်ရလွယ်, ပိုတို, premium but friendly။",
        "Hook: customer စိတ်ထဲကမေးခွန်း/စိုးရိမ်ချက်တစ်ခုနဲ့စပါ။",
        "Body: ရိုက်ကူးရေးမှာ pose, lighting, styling, studio care ကိုသဘာဝကျကျထည့်ပါ။",
        "CTA: အသေးစိတ် package / available date ကို Message မှာမေးနိုင်ကြောင်းရေးပါ။",
        secondAdText ? `Reference insight: ${secondAdText}` : "",
      ].filter(Boolean).join("\n"),
    },
    {
      title: "Reels/TikTok အတွက် 3-second Hook + Caption",
      angle: "Reels တင်ဖို့တိုတိုကျစ်ကျစ် hook, on-screen text, caption, hashtags ကိုတစ်ခါတည်းထုတ်ပါ။",
      bestFor: "Reels / TikTok",
      prompt: [
        `ဒီနေ့ Reels/TikTok အတွက် ${topicLabel} angle နဲ့ short-video content idea ရေးပါ။`,
        "Output ထဲမှာ Facebook caption တိုတို, TikTok caption, on-screen text 3 ခု, video hook 3 ခု ထည့်ပါ။",
        "Style: ပထမ ၃ စက္ကန့်မှာမြင်သာ, စာတို, မြန်မာလိုအဓိက, CTA နူးညံ့။",
        "Avoid: long paragraph, hard sell, English များခြင်း။",
        topAdText ? `Reference insight: ${topAdText}` : "",
      ].filter(Boolean).join("\n"),
    },
  ];
};

const buildFallbackInsights = (warning) => ({
  source: "Fallback content direction",
  postsAnalyzed: 0,
  topPosts: [],
  topTopics: [
    {
      topic: "General studio content",
      score: 0,
      count: 0,
      reach: 0,
      clicks: 0,
      spend: 0,
      leads: 0,
      messages: 0,
      engagement: 0,
      averageScore: 0,
    },
  ],
  topFormats: [{ format: "photo/storytelling", count: 0, averageScore: 0 }],
  recommendations: [
    "Insights token မမှန်သေးလို့ ယာယီ fallback အနေနဲ့ Studio ရိုက်ကူးရေး အထွေထွေ angle ကိုသုံးထားပါတယ်။",
    "ဒီနေ့ post အတွက် ပုံထဲက moment + client story + နူးညံ့တဲ့ booking CTA flow နဲ့ရေးပါ။",
    "Reels အတွက် ပထမ ၃ စက္ကန့်မှာ visual hook ထည့်ပြီး caption ကိုတိုတိုကျစ်ကျစ်ထားပါ။",
  ],
  contentIdeas: buildContentIdeas({ bestTopic: "General studio content" }),
  datePreset: "fallback",
  usedHistoricalFallback: true,
  usedMetrics: false,
  warning,
  generatedAt: new Date().toISOString(),
});

const summarizePosts = (posts) => {
  const normalized = posts.map((post) => {
    const insights = post.insights?.data || [];
    const reach = pickMetric(insights, ["post_impressions_unique", "post_impressions"]);
    const engagement = pickMetric(insights, ["post_engaged_users", "post_clicks", "post_reactions_by_type_total"]);
    const score = reach + engagement * 3;
    return {
      id: post.id,
      message: String(post.message || "").slice(0, 300),
      createdTime: post.created_time,
      permalinkUrl: post.permalink_url,
      format: getFormat(post),
      topic: detectTopic(post.message || ""),
      reach,
      engagement,
      score,
    };
  });

  const topPosts = [...normalized].sort((a, b) => b.score - a.score).slice(0, 8);
  const topicScores = {};
  const formatScores = {};

  normalized.forEach((post) => {
    topicScores[post.topic] = topicScores[post.topic] || { score: 0, count: 0, reach: 0, engagement: 0 };
    topicScores[post.topic].score += post.score;
    topicScores[post.topic].count += 1;
    topicScores[post.topic].reach += post.reach;
    topicScores[post.topic].engagement += post.engagement;

    formatScores[post.format] = formatScores[post.format] || { score: 0, count: 0 };
    formatScores[post.format].score += post.score;
    formatScores[post.format].count += 1;
  });

  const topTopics = Object.entries(topicScores)
    .map(([topic, stat]) => ({ topic, ...stat, averageScore: stat.count ? stat.score / stat.count : 0 }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);

  const topFormats = Object.entries(formatScores)
    .map(([format, stat]) => ({ format, ...stat, averageScore: stat.count ? stat.score / stat.count : 0 }))
    .sort((a, b) => b.averageScore - a.averageScore);

  const bestTopic = topTopics[0]?.topic || "General studio content";
  const bestTopicLabel = toMyanmarTopic(bestTopic);
  const bestFormat = topFormats[0]?.format || "photo";
  const recommendations = [
    `${bestTopicLabel} အကြောင်းအရာကို ${bestFormat} ပုံစံနဲ့သွားပါ။ နောက်ဆုံး posts တွေထဲမှာ ဒီပုံစံက ပိုအလုပ်ဖြစ်နေပါတယ်။`,
    `အစစာကြောင်း ၁-၂ ကြောင်းမှာ ပုံထဲကခံစားချက်နဲ့ မြင်ကွင်းကိုအရင်ဖော်ပြပါ။ ဖတ်သူကို ချက်ချင်းဆွဲခေါ်နိုင်ပါတယ်။`,
    `ဒီနေ့ content ကို ရောင်းအားတိုက်ရိုက်မဟုတ်ဘဲ client story + နူးညံ့တဲ့ booking CTA နဲ့ဆုံးပါ။`,
  ];

  return {
    postsAnalyzed: normalized.length,
    topPosts,
    topTopics,
    topFormats,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
};

const readActionValue = (actions = [], names = []) => {
  for (const name of names) {
    const action = actions.find((item) => item.action_type === name);
    if (action) return Number(action.value || 0);
  }
  return 0;
};

const summarizeAds = (rows) => {
  const normalized = rows.map((row) => {
    const impressions = Number(row.impressions || 0);
    const reach = Number(row.reach || 0);
    const clicks = Number(row.clicks || 0);
    const spend = Number(row.spend || 0);
    const leads = readActionValue(row.actions || [], ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);
    const messages = readActionValue(row.actions || [], ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"]);
    const engagement = readActionValue(row.actions || [], ["post_engagement", "page_engagement", "post_reaction"]);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const score = reach + clicks * 25 + leads * 250 + messages * 180 + engagement * 6;
    const nameText = [row.campaign_name, row.adset_name, row.ad_name].filter(Boolean).join(" ");
    return {
      campaignName: row.campaign_name || "",
      adsetName: row.adset_name || "",
      adName: row.ad_name || "",
      topic: inferAdTopic(nameText),
      impressions,
      reach,
      clicks,
      spend,
      leads,
      messages,
      engagement,
      ctr,
      cpc,
      score,
    };
  });

  const topAds = [...normalized].sort((a, b) => b.score - a.score).slice(0, 8);
  const topicScores = {};
  normalized.forEach((row) => {
    topicScores[row.topic] = topicScores[row.topic] || { score: 0, count: 0, reach: 0, clicks: 0, spend: 0, leads: 0, messages: 0 };
    topicScores[row.topic].score += row.score;
    topicScores[row.topic].count += 1;
    topicScores[row.topic].reach += row.reach;
    topicScores[row.topic].clicks += row.clicks;
    topicScores[row.topic].spend += row.spend;
    topicScores[row.topic].leads += row.leads;
    topicScores[row.topic].messages += row.messages;
  });

  const topTopics = Object.entries(topicScores)
    .map(([topic, stat]) => ({
      topic,
      ...stat,
      engagement: stat.clicks + stat.leads + stat.messages,
      averageScore: stat.count ? stat.score / stat.count : 0,
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);

  const bestTopic = topTopics[0]?.topic || "General studio content";
  const bestTopicLabel = toMyanmarTopic(bestTopic);
  const bestAd = topAds[0];
  const recommendations = [
    `${bestTopicLabel} angle ကို Facebook post/Reels အတွက်ပြန်သုံးပါ။ Sai Lao ad account data ထဲမှာ ဒီ pattern က ပိုကောင်းနေပါတယ်။`,
    bestAd?.ctr
      ? `အလုပ်ဖြစ်ခဲ့တဲ့ ad pattern က CTR ${bestAd.ctr.toFixed(2)}% ရှိပါတယ်။ အဲ့ဒီ angle ကိုတိုက်ရိုက်မကူးဘဲ သဘာဝကျတဲ့ caption အဖြစ်ပြန်ရေးပါ။`
      : "အလုပ်ဖြစ်ခဲ့တဲ့ ad pattern ကို သဘာဝကျတဲ့ Facebook caption အဖြစ်ပြန်အသက်သွင်းပါ။",
    `ဒီနေ့ Facebook post အတွက် ပုံ + ဇာတ်လမ်းပုံစံသွားပြီး Reels အတွက် ပထမ ၃ စက္ကန့်မှာမြင်သာတဲ့ hook + နူးညံ့တဲ့ CTA ကိုသုံးပါ။`,
  ];

  return {
    source: "Sai Lao ad account insights",
    postsAnalyzed: normalized.length,
    topPosts: topAds.map((row) => ({
      message: [row.campaignName, row.adsetName, row.adName].filter(Boolean).join(" / "),
      format: "ad insight",
      topic: row.topic,
      reach: row.reach,
      engagement: row.clicks + row.leads + row.messages + row.engagement,
      spend: row.spend,
      ctr: row.ctr,
      cpc: row.cpc,
    })),
    topTopics,
    topFormats: [{ format: "ad insight", count: normalized.length, averageScore: normalized.length ? normalized.reduce((sum, row) => sum + row.score, 0) / normalized.length : 0 }],
    recommendations,
    contentIdeas: buildContentIdeas({ topTopics, topPosts: topAds.map((row) => ({
      message: [row.campaignName, row.adsetName, row.adName].filter(Boolean).join(" / "),
    })), bestTopic }),
    generatedAt: new Date().toISOString(),
  };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      pageId,
      pageToken,
      adAccountId = DEFAULT_AD_ACCOUNT_ID,
      insightsToken = DEFAULT_INSIGHTS_TOKEN,
      source = "ad_account",
      days = 30,
      limit = 25,
    } = await parseJsonBody(req);

    const since = Math.floor((Date.now() - Number(days || 30) * 24 * 60 * 60 * 1000) / 1000);
    if (source !== "page") {
      if (!adAccountId || !insightsToken) {
        return res.status(400).json({ error: "Facebook Insights token/ad account env မရှိသေးပါ။" });
      }
      const adFields = [
        "campaign_name",
        "adset_name",
        "ad_name",
        "impressions",
        "reach",
        "clicks",
        "spend",
        "actions",
      ].join(",");
      let datePreset = getAdDatePreset(days);
      let usedHistoricalFallback = false;
      let adsData = await graphGet(`${adAccountId}/insights`, {
        access_token: insightsToken,
        date_preset: datePreset,
        level: "ad",
        limit: Math.min(Number(limit || 25), 100),
        fields: adFields,
      });

      if (!adsData.data?.length) {
        datePreset = "maximum";
        usedHistoricalFallback = true;
        adsData = await graphGet(`${adAccountId}/insights`, {
          access_token: insightsToken,
          date_preset: datePreset,
          level: "ad",
          limit: Math.min(Number(limit || 25), 100),
          fields: adFields,
        });
      }

      return res.status(200).json({
        ...summarizeAds(adsData.data || []),
        adAccountId,
        datePreset,
        usedHistoricalFallback,
        usedMetrics: true,
        warning: usedHistoricalFallback ? "Last 30/90 days ad data မရှိသေးလို့ historical ad insights ကို fallback ယူထားပါတယ်။" : "",
      });
    }

    if (!pageId || !pageToken) {
      return res.status(400).json({ error: "pageId and pageToken are required for page insights." });
    }
    const fieldsWithInsights = [
      "id",
      "message",
      "created_time",
      "permalink_url",
      "attachments{media_type,type}",
      "insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_clicks,post_reactions_by_type_total)",
    ].join(",");
    const fieldsWithoutInsights = [
      "id",
      "message",
      "created_time",
      "permalink_url",
      "attachments{media_type,type}",
    ].join(",");

    let postsData;
    let usedMetrics = true;
    try {
      postsData = await graphGet(`${pageId}/posts`, {
        access_token: pageToken,
        since,
        limit: Math.min(Number(limit || 25), 50),
        fields: fieldsWithInsights,
      });
    } catch (error) {
      usedMetrics = false;
      postsData = await graphGet(`${pageId}/posts`, {
        access_token: pageToken,
        since,
        limit: Math.min(Number(limit || 25), 50),
        fields: fieldsWithoutInsights,
      });
    }

    return res.status(200).json({
      ...summarizePosts(postsData.data || []),
      usedMetrics,
      warning: usedMetrics ? "" : "Post insights metrics permission မရသေးလို့ recent post topics/formats ကိုပဲအခြေခံပြီး summary ထုတ်ထားပါတယ်။",
    });
  } catch (error) {
    console.error("Facebook insights proxy error:", error);
    const message = error?.message || "";
    if (
      error?.details?.code === 200 &&
      (message.includes("ads_management") || message.includes("ads_read"))
    ) {
      return res.status(200).json(buildFallbackInsights(
        "Facebook Insights token ထဲမှာ ads_read permission မရသေးပါ။ Insights API App နဲ့ ads_read ပါတဲ့ token အသစ်ပြန်ထုတ်ပြီး Vercel env ထဲ update လုပ်ရပါမယ်။ အခုတော့ fallback idea ၃ ခုနဲ့ ဆက်ရေးနိုင်အောင်ထားထားပါတယ်။"
      ));
    }
    return res.status(error?.status || 500).json({
      error: error?.message || "Facebook Insights API failed.",
      details: error?.details || null,
    });
  }
}
