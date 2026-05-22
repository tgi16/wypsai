
import { MarketingContent, MarketTrend, DailyPlan, SalesScript, DailyContent, EngagementPost, ClientGuide, PremiumPromotion, AutoReply } from "./types";
import { DAILY_BUDGET, PRICING, UsageMetadata } from "./constants";
import { getSavedPricingContext } from "./pricingCatalog";

const getUsageDayKey = () => new Date().toLocaleDateString('en-CA');

const getTodayUsageSnapshot = () => {
  const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
  const today = getUsageDayKey();
  return savedUsage[today] || { totalCost: 0, count: 0, lastCost: 0 };
};

/**
 * Track and store Gemini API usage cost in localStorage
 */
const trackUsage = (model: string, usage: UsageMetadata) => {
  try {
    const pricing = (PRICING as any)[model] || PRICING['gemini-2.5-flash'];
    const promptTokens = Number(usage.promptTokenCount) || 0;
    const outputTokens = Number(usage.candidatesTokenCount) || 0;
    const cost = (promptTokens * pricing.input) + (outputTokens * pricing.output);
    
    const today = getUsageDayKey();
    const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
    
    if (!savedUsage[today]) {
      savedUsage[today] = { totalCost: 0, count: 0, models: {} };
    }
    
    savedUsage[today].totalCost += cost;
    savedUsage[today].count += 1;
    savedUsage[today].lastCost = cost;
    savedUsage[today].models = savedUsage[today].models || {};
    savedUsage[today].models[model] = savedUsage[today].models[model] || { cost: 0, count: 0 };
    savedUsage[today].models[model].cost += cost;
    savedUsage[today].models[model].count += 1;
    
    localStorage.setItem('gemini_usage_v2', JSON.stringify(savedUsage));
    
    // Dispatch custom event to notify UI
    window.dispatchEvent(new CustomEvent('gemini_usage_updated', { detail: savedUsage[today] }));
  } catch (e) {
    console.error("Failed to track usage:", e);
  }
};

enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

const STUDIO_CONTEXT = `
With You Photo Studio, Taunggyi (Myanmar)
- Brand Name: With You Photo Studio, Taunggyi
- Focus: Premium Indoor photo shoots (Pre-wedding, Family, Solo, Birthday, etc.) & High-End Wedding/Donation Coverage.
- Location: Taunggyi (Hyper-local focus).

[BRAND VOICE & TERMINOLOGY - CRITICAL]
- DO NOT translate "Indoor photo shoot" to "အိမ်တွင်းရိုက်ကူးရေး". Always use the English term "Indoor photo shoot" or "Indoor".
- Use natural, conversational Burmese mixed with common English photography terms (e.g., lighting, pose, mood, vibe). Avoid overly formal, stiff, or direct dictionary translations.
- ALWAYS include these core hashtags at the end of every post/caption: #WithYouPhotoStudio #Taunggyi #wyps #taunggyiphotographer
- When a post needs a soft booking CTA, prefer natural lines such as "ခုပဲ Booking တင်လိုက်ပါ" or "အသေးစိတ်ကို Message မှာ မေးမြန်းနိုင်ပါပြီ" instead of robotic closing lines.

- Pricing / package source of truth: WYPS-POS public/js/master-data.js direction and its Firestore packages collection.
- If price/package details are needed, use the CURRENT POS PACKAGE PRICE SOURCE appended below. Do not rely on old hardcoded price memory.

- Extra Time Policy:
  * ၃ နာရီကျော်ပါက အချိန်ပို ၃၀ မိနစ် (၃ သောင်းကျပ်)၊ ၁ နာရီ (၅ သောင်းကျပ်) ထပ်ဆောင်းပေးရမည်။

- Unique Selling Point: Premium Makeup, Life-long Memories, High-end Lighting & Equipment.

CRITICAL RULE: "With You Photo Studio" ဟူသော အမည်ကို မြန်မာလို (ဥပမာ- ဝစ်သ်ယူဓာတ်ပုံတိုက်) ဟု လုံးဝ (လုံးဝ) မဘာသာပြန်ပါနှင့်။ အင်္ဂလိပ်လိုသာ "With You Photo Studio" ဟု အမြဲတမ်း သုံးနှုန်းပါ။
`;

const getStudioContext = () => `${STUDIO_CONTEXT}\n${getSavedPricingContext()}`;

const getFeedbackContext = () => {
  try {
    const feedback = JSON.parse(localStorage.getItem('app_feedback') || '[]');
    if (feedback.length === 0) return "";
    
    const helpfulCount = feedback.filter((f: any) => f.helpful).length;
    const unhelpfulCount = feedback.length - helpfulCount;
    
    return `
User Feedback History:
- Helpful content generated: ${helpfulCount} times
- Unhelpful content generated: ${unhelpfulCount} times
(AI Instruction: Please maintain the quality that users liked and avoid patterns from unhelpful generations if possible.)
`;
  } catch (e) {
    return "";
  }
};

type GeminiModelProfile = 'quality' | 'balanced' | 'fast' | 'tts';

const MODEL_ROUTES: Record<GeminiModelProfile, string[]> = {
  quality: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  balanced: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  fast: ['gemini-2.5-flash'],
  tts: ['gemini-2.5-flash-preview-tts'],
};

const isModelProfile = (model: string): model is GeminiModelProfile => model in MODEL_ROUTES;

const resolveModelRoute = (model: string) => isModelProfile(model) ? MODEL_ROUTES[model] : [model];

const dataUriToBlob = async (dataUri: string) => {
  const response = await fetch(dataUri);
  return response.blob();
};

const shrinkImageDataUri = async (
  imageUri: string,
  options: { maxDimension: number; quality: number; mimeType?: string }
) => {
  if (typeof window === 'undefined' || !imageUri.startsWith('data:image/')) {
    return imageUri;
  }

  const blob = await dataUriToBlob(imageUri);
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Image preview could not be loaded'));
      element.src = imageUrl;
    });

    const scale = Math.min(options.maxDimension / image.width, options.maxDimension / image.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) return imageUri;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(options.mimeType || 'image/jpeg', options.quality);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const extractInlineData = async (
  imageUri: string,
  options: { maxDimension: number; quality: number; mimeType?: string }
) => {
  const optimizedImageUri = await shrinkImageDataUri(imageUri, options);
  const [header, data = ''] = optimizedImageUri.split(',');
  const mimeMatch = header.match(/^data:(.*?);base64$/);
  return {
    mimeType: mimeMatch?.[1] || options.mimeType || 'image/jpeg',
    data,
  };
};

/**
 * Proxy call to the server-side Gemini endpoint
 */
export const callGeminiProxy = async (params: { model: string, contents: any, config?: any }) => {
  const todayUsage = getTodayUsageSnapshot();
  if ((Number(todayUsage.totalCost) || 0) >= DAILY_BUDGET) {
    const message = `ဒီနေ့ API usage budget $${DAILY_BUDGET.toFixed(2)} ပြည့်သွားပါပြီ။ မနက်ဖြန်မှ ပြန်သုံးပါ သို့မဟုတ် budget ကို ပြန်ညှိပါ။`;
    window.dispatchEvent(new CustomEvent('wyps_app_notice', { detail: { type: 'budget', message } }));
    throw new Error(message);
  }

  const modelRoute = resolveModelRoute(params.model);
  let lastErrorMessage = '';

  const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const apiSecret = (import.meta as any).env?.VITE_WYPS_API_SECRET;
  if (apiSecret) requestHeaders["x-wyps-secret"] = apiSecret;

  for (const model of modelRoute) {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ ...params, model }),
    });

    const rawText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? JSON.parse(rawText || '{}')
      : { error: rawText || 'Unexpected server response' };
    
    if (!response.ok) {
      if (response.status === 413) {
        const message = 'ပို့လိုက်တဲ့ image data က အရမ်းကြီးနေပါတယ်။ Photo အရေအတွက် လျှော့ပြီး သို့မဟုတ် smaller image နဲ့ပြန်စမ်းပါ။';
        window.dispatchEvent(new CustomEvent('wyps_app_notice', { detail: { type: 'error', message } }));
        throw new Error(message);
      }

      lastErrorMessage = data.error || `Failed to call Gemini API (${model})`;
      if (modelRoute.length > 1) {
        console.warn(`Gemini model ${model} failed. Trying fallback model...`, lastErrorMessage);
        continue;
      }

      window.dispatchEvent(new CustomEvent('wyps_app_notice', { detail: { type: 'error', message: lastErrorMessage } }));
      throw new Error(lastErrorMessage);
    }

    // Track usage if metadata is available. Use the actual model, not the route profile.
    if (data.usageMetadata) {
      trackUsage(model, data.usageMetadata);
    }

    return { ...data, modelUsed: model };
  }

  const message = lastErrorMessage || "Failed to call Gemini API";
  window.dispatchEvent(new CustomEvent('wyps_app_notice', { detail: { type: 'error', message } }));
  throw new Error(message);
};

/**
 * Handle API responses with automatic retries for rate limits (429)
 */
export const handleResponse = async <T>(promiseFn: () => Promise<T>, retries = 3, backoff = 2000): Promise<T> => {
  try {
    return await promiseFn();
  } catch (error: any) {
    // If it's a rate limit error and we still have retries left
    if ((error.message?.includes('429') || error.status === 429) && retries > 0) {
      console.warn(`Rate limit reached. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return handleResponse(promiseFn, retries - 1, backoff * 2); // Exponential backoff
    }
    
    if (error.message?.includes('429') || error.status === 429) {
      throw new Error("API Quota ခဏတာ ပြည့်သွားပါပြီ။ ၁ မိနစ်ခန့် စောင့်ပြီးမှ ပြန်လည် ကြိုးစားပေးပါ။ (Rate Limit Reached)");
    }

    // Handle specific location error
    if (error.message?.includes("User location is not supported") || 
        error.message?.includes("FAILED_PRECONDITION") ||
        JSON.stringify(error).includes("FAILED_PRECONDITION")) {
      throw new Error("Gemini API သည် မြန်မာနိုင်ငံမှ တိုက်ရိုက်အသုံးပြုခြင်းကို ကန့်သတ်ထားပါသည်။ အသုံးပြုနိုင်ရန် VPN (USA/Singapore) ဖွင့်ပေးပါရန် သို့မဟုတ် Server Proxy ကို အသုံးပြုပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။");
    }
    
    throw error;
  }
};

export const generateDailyMarketingPlan = async (): Promise<DailyPlan> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'balanced',
    contents: `With You Photo Studio, Taunggyi အတွက် ဒီနေ့အတွက် အလွန် Viral ဖြစ်မည့် Marketing Strategy တစ်ခုကို မြန်မာဘာသာဖြင့်သာ ထုတ်ပေးပါ။ 

    တင်းကျပ်သော လမ်းညွှန်ချက်များ:
    1. အင်္ဂလိပ်စာ (English) ကို လုံးဝ မသုံးပါနှင့်။ စာသားအားလုံးကို မြန်မာဘာသာ (Unicode) ဖြင့်သာ ရေးသားပါ။
    2. Viral ဖြစ်စေရန် Emotional Storytelling (ဥပမာ- မိဘတွေရဲ့ ပီတိ၊ ဇနီးမောင်နှံရဲ့ အမှတ်တရ) ကို အသုံးချပါ။
    3. အလှူပွဲ နှင့် ဆွမ်းကပ် စျေးနှုန်းအသစ်များ (480k, 390k, 500k) ကို အသုံးပြုပါ။
    4. Pre-wedding (Limited) နှင့် Wedding/Donation (Unlimited Raw CD) ခြားနားချက်ကို မမှားစေရ။

    Context: ${getStudioContext()} ${getFeedbackContext()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          fbIdea: { type: Type.STRING },
          tiktokHook: { type: Type.STRING },
          tiktokVisualIdea: { type: Type.STRING },
          tiktokCaption: { type: Type.STRING },
          messengerTip: { type: Type.STRING }
        },
        required: ["title", "fbIdea", "tiktokHook", "tiktokVisualIdea", "tiktokCaption", "messengerTip"]
      }
    }
  }));
  return JSON.parse(response.text || '{}');
};

export const generateMarketingContent = async (
  description: string,
  imageUri?: string
): Promise<MarketingContent> => {
  const parts: any[] = [{ text: `You are the dedicated world-class Content Creator and Creative Director for With You Photo Studio, Taunggyi.

    Role:
    - Think like a senior Myanmar social media copywriter who understands premium photo studio customers.
    - Think like a content strategist who understands platform behavior: Facebook needs emotional story + trust + clean paragraph structure; TikTok/Reels needs 1-3 second visual hook, short lines, replay value, and caption that feels native.
    - Your job is not to "write a caption only". Your job is to choose the best angle, shape the emotion, protect the premium brand, and produce copy that the studio owner can post immediately.
    - Write like a real human content writer: tasteful, warm, specific, visual, and not repetitive.
    - Act like the studio has hired you as a monthly content creator. Use the monthly trend intelligence supplied in User Input, Facebook Insights patterns, and the brand context to make content feel timely without chasing cheap trends.

    Brand writing principles:
    - မြန်မာစာကို အဓိကသုံးပါ။ Output တစ်ခုချင်းစီမှာ မြန်မာစာ ၈၀% အနည်းဆုံးပါရမည်။ Photography/marketing terms လိုအပ်မှသာ English ညှပ်သုံးပါ (Indoor photo shoot, lighting, mood, pose, vibe, package, booking).
    - "အိမ်တွင်းရိုက်ကူးရေး" မသုံးပါနှင့်။ "Indoor photo shoot" သို့မဟုတ် "Indoor" ဟုသုံးပါ။
    - Premium image ကိုမကျစေပါနှင့်။ အရမ်း discount/salesy မရေးပါနှင့်။
    - Fear-based opening များကို အလွန်မသုံးပါနှင့်။ Customer ကိုစိတ်မသက်မသာဖြစ်စေတဲ့ "အခက်အခဲ", "စိုးရိမ်", "မပေးတတ်" စကားလုံးများကို မလိုအပ်ဘဲမသုံးပါနှင့်။
    - Same meaning ကိုနှစ်ခါမထပ်ပါနှင့်။ Opening hook တစ်ခု၊ visual detail တစ်ခု၊ emotional value တစ်ခု၊ soft CTA တစ်ခု ဆိုတဲ့ flow နဲ့ရေးပါ။
    - Facebook caption ကို copy/paste တင်လို့ရအောင် 4-7 short paragraphs ဖြင့် သပ်သပ်ရပ်ရပ်ခွဲပါ။
    - TikTok/Reels caption ကို long paragraph မလုပ်ပါနှင့်။ 4-7 short lines + hashtags အတွက်ရေးပါ။
    - facebookCaption/tiktokCaption ထဲတွင် "Facebook Caption:", "TikTok Caption:", "Post Caption", markdown heading, numbered section title မထည့်ပါနှင့်။ User က တန်း copy/paste တင်နိုင်တဲ့ final caption သာထည့်ပါ။
    - facebookVariants ထဲတွင် Facebook caption alternate ၃ ခုထည့်ပါ: Emotional Storytelling, Booking CTA, Short & Premium. တစ်ခုချင်းစီသည် final copy-ready caption ဖြစ်ရမည်။ Hashtag မထပ်ပါနှင့်။
    - First line must be a natural hook, not a label. Keep it specific to the service/photo/context.
    - ဈေးနှုန်းပါလာရင် POS pricing context ထဲက current package data ကိုသာအတည်ယူပါ။ မသေချာရင် price မထည့်ဘဲ "အသေးစိတ်ကို Message မှာမေးမြန်းနိုင်ပါပြီ" ဟုရေးပါ။
    - Always include core hashtags in Facebook caption or hashtag list: #WithYouPhotoStudio #Taunggyi #wyps #taunggyiphotographer

    Specialist process to follow before writing:
    1. Identify the best content angle: emotional milestone, premium setup, client transformation, behind-the-scenes trust, or booking intent.
    2. Choose a hook that fits the actual topic/photo, not a generic viral hook.
    3. Mention concrete visual details if image/context provides them: dress, flowers, lighting, pose, family moment, cake, frame, studio mood.
    4. Make the CTA soft and elegant.
    5. Self-check the output for: paragraph breaks, brand voice, no robotic phrasing, no repetitive lines, no wrong price/package promise.
    6. Make Facebook and TikTok outputs meaningfully different. Facebook = warm storytelling. TikTok/Reels = short, punchy, visual-first, less formal.
    7. Use current monthly/seasonal trend brief naturally. Do not explicitly say "trend" unless it fits. The trend should influence angle, hook, and timing.
    8. Avoid repeating the same opening pattern across outputs. If the topic is Sweet 17, Pre-wedding, Family, Donation, or Indoor portrait, create a fresh hook specific to that service.
    9. tiktokSceneBreakdown ကို CapCut မှာ manual edit လုပ်နိုင်အောင်ရေးပါ။ Each scene should include: time range, media/shot suggestion, motion/transition idea, and optional short text overlay. Prefer Myanmar language, with only necessary editing terms like zoom, pan, beat cut, fade, text overlay.
    
    တင်းကျပ်သော လမ်းညွှန်ချက်များ:
    1. Package စျေးနှုန်းများကို မလိုအပ်ဘဲ မထည့်ပါနှင့်။ ပါရမယ်ဆို POS pricing context အတိုင်းသာရေးပါ။
    2. ဖတ်ရတာ ဆွဲဆောင်မှုရှိစေရန် သင့်တော်သော Emoji များ (ဥပမာ- ✨📸💖) ထည့်သွင်း အသုံးပြုပေးပါ။
    3. CTA လိုအပ်ပါက သဘာဝကျကျ soft CTA တစ်ကြောင်း ထည့်ပေးပါ။ ဥပမာ - "ခုပဲ Booking တင်လိုက်ပါ" သို့မဟုတ် "အသေးစိတ်ကို Message မှာ မေးမြန်းနိုင်ပါပြီ"။
    4. Pain point / fear-based opening များကို အလွန်မသုံးပါနှင့်။ "pose မပေးတတ်လို့ စိတ်ပူနေလား", "အခက်အခဲ", "စိုးရိမ်" စသည့်စကားလုံးများကို လိုအပ်မှ တစ်ကြောင်းအောက်သာ သုံးပါ။
    5. ပုံမှန် Facebook caption တစ်ပုဒ်လို သဘာဝကျကျရေးပါ။ အလှ, mood, setup, lighting, moment, service value, soft CTA ကို balance လုပ်ပါ။
    6. တူညီတဲ့အဓိပ္ပာယ်ကို နှစ်ခါထပ်မရေးပါနှင့်။ Opening hook တစ်ခုသာသုံးပြီး caption ကိုတိုက်ရိုက်စတင်ပါ။
    7. Output ထဲမှာ contentStrategy, captionAngle, hookOptions, qualityChecklist ကိုပါ ထည့်ပါ။ ဒါတွေက owner ကို content writer ဘယ်လိုစဉ်းစားထားလဲ သိစေရန်ဖြစ်သည်။
    8. contentStrategy ထဲမှာ Creator Role, target audience, monthly trend influence, Facebook/TikTok split ကိုတိုတိုရှင်းရှင်းထည့်ပါ။
    9. TikTok/Reels Blueprint သည် CapCut manual editing အတွက်ဖြစ်သည်။ Scene Breakdown ကို vague မဖြစ်စေဘဲ "0:00-0:03 - ... / Motion: ... / Text: ..." ပုံစံဖြင့် အသုံးချလို့ရအောင်ရေးပါ။
    10. Output ကို native Myanmar social media writer တစ်ယောက်ရေးသလိုထုတ်ပါ။ Robotic translation, generic premium phrases, repeated "အိမ်မက်ဆန်ဆန်", repeated "အမှတ်တရ" များကိုလျှော့ပါ။
    
    Context: ${getStudioContext()} ${getFeedbackContext()}
    User Input: ${description}` }];

  if (imageUri) {
    const inlineImage = await extractInlineData(imageUri, {
      maxDimension: 1280,
      quality: 0.76,
      mimeType: 'image/jpeg',
    });
    parts.push({
      inlineData: inlineImage
    });
  }

  const response = await handleResponse(() => callGeminiProxy({
    model: 'quality',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contentStrategy: { type: Type.STRING },
          captionAngle: { type: Type.STRING },
          hookOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          facebookVariants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                caption: { type: Type.STRING }
              },
              required: ["style", "caption"]
            }
          },
          facebookCaption: { type: Type.STRING },
          tiktokVisualScript: { type: Type.STRING },
          tiktokCaption: { type: Type.STRING },
          tiktokAudioStyle: { type: Type.STRING },
          tiktokEditingStyle: { type: Type.STRING },
          tiktokSceneBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          engagementTips: { type: Type.STRING },
          qualityChecklist: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["contentStrategy", "captionAngle", "hookOptions", "facebookVariants", "facebookCaption", "tiktokVisualScript", "tiktokCaption", "tiktokAudioStyle", "tiktokEditingStyle", "tiktokSceneBreakdown", "hashtags", "engagementTips", "qualityChecklist"]
      }
    }
  }));

  return JSON.parse(response.text || '{}');
};

export const refineMarketingText = async (
  currentText: string,
  instruction: string,
  context?: string
): Promise<string> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `Improve the following Myanmar marketing copy.

Rules:
1. Keep the original language unchanged.
2. Preserve brand fit for With You Photo Studio, Taunggyi.
3. Keep the result natural and ready to post.
4. Keep the text in clean, readable short paragraphs for Facebook. Preserve or improve paragraph breaks instead of merging everything into one long block.
5. Return JSON only.

Optional context:
${context || 'None'}

Instruction:
${instruction}

Current text:
${currentText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
        },
        required: ["text"]
      }
    }
  }));

  return JSON.parse(response.text || '{"text": ""}').text || currentText;
};

export const generateSalesScripts = async (scenario: string, customQuestion?: string): Promise<SalesScript> => {
  const prompt = customQuestion 
    ? `Client က အခုလို မေးလာပါတယ်: "${customQuestion}" \n\n With You Photo Studio, Taunggyi ရဲ့ Professional ဆန်စွာ မြန်မာဘာသာဖြင့် ပြန်လည်ဖြေကြားပေးပါ။ 
       မှတ်ချက်: ဆွမ်းကပ် (480k)၊ အလှူ (390k/500k) တွေမှာ Unlimited Raw CD ပေးကြောင်း သေချာထည့်ပြောပါ။`
    : `Scenario: ${scenario} \n\n With You Photo Studio, Taunggyi အတွက် အကောင်းဆုံး Sales Script ကို "မြန်မာဘာသာဖြင့်သာ" ရေးပေးပါ။`;

  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `Context: ${getStudioContext()} ${getFeedbackContext()} \n\n ${prompt}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenario: { type: Type.STRING },
          script: { type: Type.STRING },
          proTip: { type: Type.STRING }
        }
      }
    }
  }));
  return JSON.parse(response.text || '{}');
};

export const getMarketInsights = async (): Promise<MarketTrend[]> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: "မြန်မာနိုင်ငံရှိ မင်္ဂလာဆောင်ဓာတ်ပုံစျေးကွက် Trends ၅ ခုကို မြန်မာဘာသာဖြင့် JSON format ဖြင့် ဖော်ပြပေးပါ။",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            popularity: { type: Type.NUMBER },
            description: { type: Type.STRING }
          }
        }
      }
    }
  }));
  return JSON.parse(response.text || '[]');
};

export const generateBusinessStrategy = async (goals: string): Promise<string> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'quality',
    contents: `With You Photo Studio, Taunggyi Strategy Planner. Goals: ${goals}. Studio: ${getStudioContext()} ${getFeedbackContext()}. အစီအစဉ်အားလုံး မြန်မာဘာသာဖြင့်သာ ရေးပါ။ အင်္ဂလိပ်စာ လုံးဝ မပါရ။`,
  }));
  return response.text || '';
};

export const generateHashtags = async (topic: string): Promise<{ tags: string[], strategy: string }> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `With You Photo Studio, Taunggyi အတွက် Hashtag Strategy ထုတ်ပေးပါ။ 
    Topic: ${topic}
    Context: ${getStudioContext()} ${getFeedbackContext()}
    
    လိုအပ်ချက်များ:
    1. Facebook, TikTok နှင့် Instagram အတွက် သီးသန့် Hashtags များ ခွဲခြားပေးပါ။
    2. Hashtag တစ်ခုချင်းစီ ဘာကြောင့် သုံးသင့်လဲ ဆိုတာကို မြန်မာလို ရှင်းပြပါ။
    3. Viral ဖြစ်စေမည့် Strategy ကိုလည်း မြန်မာလို ရေးပေးပါ။`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategy: { type: Type.STRING }
        },
        required: ["tags", "strategy"]
      }
    }
  }));
  return JSON.parse(response.text || '{"tags": [], "strategy": ""}');
};

export const generatePortfolioBio = async (style: string, details: string): Promise<{ bio: string, tips: string }> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `With You Photo Studio, Taunggyi အတွက် Professional Portfolio Bio တစ်ခု ရေးပေးပါ။
    Style: ${style} (ဥပမာ- Professional, Friendly, Luxury)
    Extra Details: ${details}
    Context: ${getStudioContext()} ${getFeedbackContext()}
    
    လိုအပ်ချက်များ:
    1. Facebook Page Bio နှင့် Instagram Bio ၂ မျိုးလုံးအတွက် ရေးပေးပါ။
    2. မြန်မာဘာသာဖြင့်သာ ရေးသားပါ။
    3. စွဲဆောင်မှုရှိပြီး ယုံကြည်မှုရစေမည့် စာသားများ ဖြစ်ရမည်။`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bio: { type: Type.STRING },
          tips: { type: Type.STRING }
        },
        required: ["bio", "tips"]
      }
    }
  }));
  return JSON.parse(response.text || '{"bio": "", "tips": ""}');
};

export const generateReviewReply = async (review: string, rating: number): Promise<{ reply: string, engagementTip: string }> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `Client ဆီက Review တစ်ခု ရထားပါတယ်။ အဲဒါကို Professional ဆန်စွာ ပြန်လည်ဖြေကြားပေးပါ။
    Review: "${review}"
    Rating: ${rating} Stars
    Context: ${getStudioContext()} ${getFeedbackContext()}
    
    လိုအပ်ချက်များ:
    1. မြန်မာဘာသာဖြင့်သာ ရေးသားပါ။
    2. Rating ကောင်းလျှင် ကျေးဇူးတင်စကားနှင့် နောက်တစ်ခါ ထပ်မံဖိတ်ခေါ်ပါ။
    3. Rating မကောင်းလျှင် (သို့) အားနည်းချက်ပြောလျှင် ယဉ်ကျေးစွာ တောင်းပန်ပြီး ပြုပြင်မည့်အကြောင်း ပြောပါ။`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          engagementTip: { type: Type.STRING }
        },
        required: ["reply", "engagementTip"]
      }
    }
  }));
  return JSON.parse(response.text || '{"reply": "", "engagementTip": ""}');
};

export const generateSevenDayPlan = async (focusArea: string): Promise<DailyContent[]> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'balanced',
    contents: `With You Photo Studio, Taunggyi အတွက် ၇ ရက်စာ Facebook Content Plan တစ်ခု ဆွဲပေးပါ။
    
    အရေးကြီးသော ကန့်သတ်ချက် (CRITICAL CONSTRAINT):
    Studio တွင် "Indoor photo shoot" ပုံများ (Pre-wedding, Family, Solo, Birthday စသည်) သာ အများဆုံးရှိပါသည်။ Behind the Scenes (BTS) သို့မဟုတ် Outdoor ပုံများ မရှိသလောက် ရှားပါသည်။ 
    ထို့ကြောင့် ၇ ရက်စာလုံးအတွက် အကြံပြုမည့် ပုံများ (Visual Ideas) သည် "Indoor photo shoot ပုံများကိုသာ" အခြေခံပြီး ဖန်တီးနိုင်သော အရာများ ဖြစ်ရမည်။
    
    ဥပမာ အကြံပြုချက်များ:
    - အလှဆုံး Indoor ပုံတစ်ပုံတည်းကို Storytelling ဖြင့် တင်ခြင်း (Hero Shot)
    - အသေးစိတ် (Detail/Close-up) ပုံများကိုသာ ဖြတ်တင်ခြင်း
    - Indoor ပုံကို နောက်ခံထားပြီး အပေါ်မှ စာသား (Text-on-Image) ရေးတင်ခြင်း (ဥပမာ - Tips များ)
    - Indoor ပုံကို အဖြူအမည်း (Black & White) ပြောင်းပြီး ခံစားချက်စာသားဖြင့် တင်ခြင်း
    - မပြင်ရသေးသောပုံ နှင့် ပြင်ပြီးသားပုံ (Raw vs Edited) ယှဉ်တင်ခြင်း
    - Indoor ပုံ ၃-၄ ပုံကို Collage လုပ်ပြီး တင်ခြင်း
    - Indoor ပုံနှင့်အတူ Customer ၏ Review ကို တွဲတင်ခြင်း
    
    လိုအပ်ချက်များ:
    1. "အိမ်တွင်းရိုက်ကူးရေး" ဟု လုံးဝ (လုံးဝ) မသုံးပါနှင့်။ "Indoor photo shoot" သို့မဟုတ် "Indoor" ဟုသာ သုံးပါ။
    2. စာသားများကို အရမ်းကြီး တရားဝင်ဆန်သော မြန်မာလို မရေးဘဲ၊ လူငယ်ကြိုက် ပေါ့ပေါ့ပါးပါး (Conversational) မြန်မာလို ရေးပါ။ လိုအပ်ပါက English စကားလုံးများ (vibe, mood, lighting စသည်) ညှပ်သုံးပါ။
    3. Package စျေးနှုန်းများ (ဥပမာ- 350k, 500k စသည်) ကို ပိုစ့်ထဲတွင် လုံးဝ (လုံးဝ) မထည့်ပါနှင့်။
    4. ဖတ်ရတာ ဆွဲဆောင်မှုရှိစေရန် သင့်တော်သော Emoji များ ထည့်သွင်း အသုံးပြုပေးပါ။
    5. Caption ၏ အဆုံးတွင် မဖြစ်မနေ #WithYouPhotoStudio #Taunggyi #wyps #taunggyiphotographer နှင့် အခြား သက်ဆိုင်ရာ Hashtag များ ထည့်ပေးပါ။
    
    Focus Area: ${focusArea || 'Indoor photo shoot ၏ အလှတရားနှင့် ခံစားချက်'}
    Context: ${getStudioContext()} ${getFeedbackContext()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING, description: "ဥပမာ - တနင်္လာနေ့" },
            theme: { type: Type.STRING, description: "ပိုစ့်၏ အဓိက ရည်ရွယ်ချက် (ဥပမာ - Storytelling, Tips, Review)" },
            visualIdea: { type: Type.STRING, description: "Indoor ပုံကို မည်သို့ အသုံးပြုရမည်ကို အကြံပြုချက် (ဥပမာ - အဖြူအမည်းပြောင်းပါ၊ စာသားထည့်ပါ)" },
            caption: { type: Type.STRING, description: "Facebook တွင် တင်ရန် အသင့်ရေးထားသော စာသား (စျေးနှုန်းမပါရ၊ Emoji ပါရမည်)" }
          },
          required: ["day", "theme", "visualIdea", "caption"]
        }
      }
    }
  }));
  return JSON.parse(response.text || '[]');
};

export const generateEngagementPost = async (topic: string, type: string): Promise<EngagementPost> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'balanced',
    contents: `With You Photo Studio, Taunggyi အတွက် Facebook Reach ကျနေသည်ကို ပြန်ဆယ်ရန် (Engagement/Giveaway) ပိုစ့်တစ်ခု ရေးပေးပါ။
    
    ရည်ရွယ်ချက်: Like, Comment, Share များများရရန်နှင့် Reach ပြန်တက်ရန်။
    ပိုစ့်အမျိုးအစား: ${type} (ဥပမာ - Giveaway, This or That, Q&A, Tag a Friend)
    အကြောင်းအရာ: ${topic || 'Indoor Photo Shoot အမှတ်တရများ'}
    
    လိုအပ်ချက်များ:
    1. Hook (အစစာကြောင်း) သည် ဖတ်သူကို ချက်ချင်း ရပ်ကြည့်သွားစေရမည်။
    2. Comment ရေးချင်လာအောင် မေးခွန်း သို့မဟုတ် လုပ်ဆောင်ရမည့်အချက် (Call to Action) ကို ရှင်းလင်းစွာ ထည့်ပါ။
    3. စာသားများကို လူငယ်ကြိုက် ပေါ့ပေါ့ပါးပါး (Conversational) မြန်မာလို ရေးပါ။
    4. Caption ၏ အဆုံးတွင် မဖြစ်မနေ #WithYouPhotoStudio #Taunggyi #wyps #taunggyiphotographer နှင့် အခြား သက်ဆိုင်ရာ Hashtag များ ထည့်ပေးပါ။
    5. Indoor ပုံများကိုသာ အခြေခံ၍ မည်သို့သော ပုံမျိုး တင်သင့်ကြောင်း Visual Idea ကို အကြံပြုပါ။
    6. Booking/Message CTA လိုအပ်ပါက "ခုပဲ Booking တင်လိုက်ပါ" သို့မဟုတ် "အသေးစိတ်ကို Message မှာ မေးမြန်းနိုင်ပါပြီ" ကို သဘာဝကျကျ တစ်ကြောင်းထည့်နိုင်သည်။
    
    Context: ${getStudioContext()} ${getFeedbackContext()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "ပိုစ့်အမျိုးအစား (Giveaway, Poll, etc.)" },
          hook: { type: Type.STRING, description: "ဆွဲဆောင်မှုရှိသော အစစာကြောင်း" },
          caption: { type: Type.STRING, description: "Facebook တွင် တင်ရန် အသင့်ရေးထားသော စာသား (Emoji ပါရမည်)" },
          visualIdea: { type: Type.STRING, description: "Indoor ပုံကို မည်သို့ အသုံးပြုရမည်ကို အကြံပြုချက်" }
        },
        required: ["type", "hook", "caption", "visualIdea"]
      }
    }
  }));
  return JSON.parse(response.text || '{"type":"", "hook":"", "caption":"", "visualIdea":""}');
};

export const generateClientGuide = async (topic: string): Promise<ClientGuide> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'quality',
    contents: `With You Photo Studio, Taunggyi အတွက် Customer များ ကြိုတင်ပြင်ဆင်နိုင်ရန် Client Preparation Guide တစ်ခု ရေးပေးပါ။
    
    ရည်ရွယ်ချက်: Premium Brand Image ကို မြှင့်တင်ရန်နှင့် Customer များ ရိုက်ကူးရေးအတွက် အကောင်းဆုံး ပြင်ဆင်လာနိုင်စေရန်။
    အကြောင်းအရာ: ${topic}
    
    လိုအပ်ချက်များ:
    1. "အိမ်တွင်းရိုက်ကူးရေး" သို့မဟုတ် "အပြင်ထွက်ရိုက်ကူးရေး" ဟူသော စကားလုံးများကို လုံးဝ မသုံးပါနှင့်။ အခြေအနေပေါ်မူတည်၍ "Indoor photo shoot" သို့မဟုတ် "Outdoor photo shoot" ဟုသာ သုံးပါ။
    2. စကားပြောဆိုရာတွင် ယဉ်ကျေးပြီး ဂရုစိုက်မှုအပြည့်ပါသော (Premium & Caring) လေသံဖြင့် ရေးပါ။
    3. လက်တွေ့ကျသော အကြံပြုချက်များ (Tips) နှင့် မေ့တတ်သော အရာများစာရင်း (Checklist) ပါဝင်ရမည်။ (Outdoor ဖြစ်ပါက နေပူခံခရင်မ်၊ ထီး၊ ရေဘူး၊ ခြင်ဆေး စသည့် Outdoor နှင့် သက်ဆိုင်သော အချက်များ ထည့်ပေးရန်)
    4. မြန်မာလို ရေးပါ၊ သို့သော် လိုအပ်ပါက English စကားလုံးများ (vibe, mood, lighting, props စသည်) ညှပ်သုံးပါ။
    5. မိတ်ကပ်နှင့် ဆံပင် အကြံပြုချက်များ: Customer များကို ကိုယ်တိုင် မိတ်ကပ် လုံးဝ (လုံးဝ) မလိမ်းလာရန် ယဉ်ကျေးစွာ အသိပေးပါ။ "Studio မှ Professional Makeup Artist များက အစအဆုံး ပြင်ဆင်ပေးမည်ဖြစ်၍ မျက်နှာသစ်ပြီး Skin Care အနည်းငယ်သာ လိမ်းလာရန်နှင့် ဆံပင်လျှော်ပြီး ခြောက်အောင်သာ လုပ်လာပေးရန်" ဟု သေချာထည့်ရေးပေးပါ။ (Premium ဆန်ဆန်၊ ဂရုစိုက်မှုအပြည့်ပါသော လေသံဖြင့် ရေးရန်)
    
    Context: ${getStudioContext()} ${getFeedbackContext()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Guide ၏ ခေါင်းစဉ် (ဥပမာ - Pre-wedding မရိုက်ခင် သိထားသင့်သော အချက်များ)" },
          intro: { type: Type.STRING, description: "နွေးထွေးသော နှုတ်ခွန်းဆက်စကားနှင့် Guide ၏ ရည်ရွယ်ချက်" },
          tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "အရေးကြီးသော အကြံပြုချက်များ (၃-၅ ချက်)" },
          checklist: { type: Type.ARRAY, items: { type: Type.STRING }, description: "မေ့မကျန်စေရန် ယူလာရမည့်/လုပ်ရမည့် Checklist" },
          outro: { type: Type.STRING, description: "နိဂုံးချုပ် စကားနှင့် ဆက်သွယ်ရန်" }
        },
        required: ["title", "intro", "tips", "checklist", "outro"]
      }
    }
  }));
  return JSON.parse(response.text || '{"title":"", "intro":"", "tips":[], "checklist":[], "outro":""}');
};

export const generatePremiumPromotion = async (occasion: string): Promise<PremiumPromotion> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'balanced',
    contents: `With You Photo Studio, Taunggyi အတွက် Premium Promotion Strategy တစ်ခု ရေးဆွဲပေးပါ။
    
    ရည်ရွယ်ချက်: Brand Image မကျစေဘဲ (ဈေးမချဘဲ) Customer ကို ဆွဲဆောင်နိုင်မည့် Value-Added Promotion ဖန်တီးရန်။
    အကြောင်းအရာ/ရာသီ: ${occasion}
    
    လိုအပ်ချက်များ:
    1. ဈေးနှုန်းကို % ဖြင့် လျှော့ချခြင်း (Discount) လုံးဝ မလုပ်ပါနှင့်။ ၎င်းအစား လက်ဆောင်ပေးခြင်း (ဥပမာ - ဘောင်အပို၊ Softcopy အပို၊ မိတ်ကပ် free) စသည့် Value-Added ကိုသာ သုံးပါ။
    2. "အိမ်တွင်းရိုက်ကူးရေး" ဟု လုံးဝ မသုံးပါနှင့်။ "Indoor photo shoot" ဟုသာ သုံးပါ။
    3. Pre-wedding package များသည် Limited Softcopy သာ ရမည်ဆိုသည့် စည်းမျဉ်းကို မချိုးဖောက်ပါနှင့်။ (Unlimited ပေးမည်ဟု လုံးဝ မရေးရ)
    4. Facebook တွင် တင်ရန် ဆွဲဆောင်မှုရှိသော Caption တစ်ခု အပါအဝင် ရေးပေးပါ။ Caption အဆုံးတွင် #WithYouPhotoStudio #Taunggyi #wyps #taunggyiphotographer ထည့်ပါ။
    5. Caption ထဲတွင် လိုအပ်ပါက "ခုပဲ Booking တင်လိုက်ပါ" သို့မဟုတ် "အသေးစိတ်ကို Message မှာ မေးမြန်းနိုင်ပါပြီ" ကို soft CTA အဖြစ် သဘာဝကျကျ ထည့်ပေးပါ။
    
    Context: ${getStudioContext()} ${getFeedbackContext()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Promotion ၏ အမည်" },
          strategy: { type: Type.STRING, description: "ဤ Promotion သည် Brand Image ကို မည်သို့ ထိန်းသိမ်းထားကြောင်း ရှင်းလင်းချက်" },
          valueAdd: { type: Type.STRING, description: "Customer ရရှိမည့် အပိုခံစားခွင့် (Value-Added Offer)" },
          caption: { type: Type.STRING, description: "Facebook တွင် တင်ရန် အသင့်ရေးထားသော ကြော်ငြာစာသား (Emoji ပါရမည်)" },
          terms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "စည်းကမ်းချက်များ (ဥပမာ - ကာလအကန့်အသတ်၊ Softcopy ကန့်သတ်ချက်)" }
        },
        required: ["title", "strategy", "valueAdd", "caption", "terms"]
      }
    }
  }));
  return JSON.parse(response.text || '{"title":"", "strategy":"", "valueAdd":"", "caption":"", "terms":[]}');
};

export const generateAutoReply = async (category: string): Promise<AutoReply> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `With You Photo Studio, Taunggyi ၏ Facebook Messenger အတွက် Auto-Reply / FAQ စာသားများ ရေးပေးပါ။
    
    ရည်ရွယ်ချက်: Customer များ မကြာခဏ မေးလေ့ရှိသော မေးခွန်းများကို လူကိုယ်တိုင် ပြန်နေသကဲ့သို့ သဘာဝကျကျ၊ ယဉ်ကျေးစွာ ပြန်လည်ဖြေကြားပေးရန်။
    ကဏ္ဍ (Category): ${category}
    
    လိုအပ်ချက်များ:
    1. "အိမ်တွင်းရိုက်ကူးရေး" ဟု လုံးဝ မသုံးပါနှင့်။ "Indoor photo shoot" ဟုသာ သုံးပါ။
    2. စကားပြောဆိုရာတွင် စက်ရုပ်ဆန်ဆန် မဟုတ်ဘဲ၊ နွေးထွေးပျူငှာသော (Friendly & Professional) လေသံဖြင့် ရေးပါ။
    3. Package ဈေးနှုန်းများကို POS pricing context ထဲက current package list အတိုင်းသာ မှန်ကန်စွာ ဖြေကြားပါ။
    4. မေးခွန်း ၃ ခု မှ ၅ ခု အထိ ထုတ်ပေးပါ။
    
    Context: ${getStudioContext()} ${getFeedbackContext()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "FAQ ကဏ္ဍ အမည်" },
          faqs: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Customer မေးလေ့ရှိသော မေးခွန်း" },
                answer: { type: Type.STRING, description: "ယဉ်ကျေးပြီး ပြည့်စုံသော အဖြေစာသား" }
              },
              required: ["question", "answer"]
            }
          }
        },
        required: ["category", "faqs"]
      }
    }
  }));
  return JSON.parse(response.text || '{"category":"", "faqs":[]}');
};

export const generateContract = async (clientName: string, packageType: string, date: string, extraNotes: string): Promise<string> => {
  const isOutdoorEvent = packageType.includes('မင်္ဂလာ') || packageType.includes('အလှူ') || packageType.toLowerCase().includes('outdoor') || packageType.toLowerCase().includes('event');
  const extraTimeInstruction = isOutdoorEvent 
    ? `\n    - ဤပွဲသည် ပြင်ပပွဲ (Outdoor/Event) ဖြစ်သောကြောင့် အောက်ပါ အချိန်ပိုကြေး သတ်မှတ်ချက်ကို မဖြစ်မနေ ထည့်သွင်းပေးပါ။\n      "အချိန်ပိုကြေး သတ်မှတ်ချက် (Extra Time Policy): သတ်မှတ်ချိန်ထက် ကျော်လွန်သွားပါက အချိန်ပိုကြေး အနေဖြင့် ၃၀ မိနစ် လျှင် - ၃၀,၀၀၀ ကျပ်၊ ၁ နာရီ လျှင် - ၅၀,၀၀၀ ကျပ် ထပ်ဆောင်း ပေးချေရမည် ဖြစ်ပါသည်။"`
    : `\n    - ဤပွဲသည် Indoor ရိုက်ကူးရေး ဖြစ်သောကြောင့် အချိန်ပိုကြေး (Extra Time Policy) ကို စာချုပ်တွင် လုံးဝ (လုံးဝ) မထည့်ပါနှင့်။`;

  const response = await handleResponse(() => callGeminiProxy({
    model: 'quality',
    contents: `With You Photo Studio, Taunggyi အတွက် Customer နှင့် သဘောတူညီချက် စာချုပ် (Agreement / Terms & Conditions) တစ်ခု ရေးပေးပါ။
    
    Customer Name: ${clientName}
    Package / Service: ${packageType}
    Date: ${date}
    Extra Notes: ${extraNotes}
    
    လိုအပ်ချက်များ:
    1. Professional ဖြစ်ပြီး တရားဝင်ဆန်သော မြန်မာစာသားဖြင့် ရေးပါ။ (English စကားလုံးများ လိုအပ်သလို သုံးနိုင်သည်)
    2. "With You Photo Studio" ၏ စည်းမျဉ်းများဖြစ်သော (Limited Softcopy သာရမည်) ကို သေချာစွာ ထည့်သွင်းပါ။${extraTimeInstruction}
    3. ငွေချေရမည့် ပုံစံ (Deposit, Full Payment) နှင့် ပုံအပ်မည့် အချိန် (Delivery Time) များကို ထည့်သွင်းပါ။
    4. အောက်ခြေတွင် Customer နှင့် Studio ဘက်မှ လက်မှတ်ထိုးရန် နေရာများ ထည့်ပေးပါ။
    
    Context: ${getStudioContext()}`,
  }));
  return response.text || '';
};

export const generateConcept = async (vibe: string): Promise<string> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'quality',
    contents: `With You Photo Studio, Taunggyi အတွက် Photo Shoot Concept & Moodboard အကြံပြုချက်များ ရေးပေးပါ။
    
    Customer လိုချင်သော Vibe / Theme: ${vibe}
    
    လိုအပ်ချက်များ:
    1. ဤ Vibe နှင့် ကိုက်ညီမည့် Lighting Setup (အလင်းအမှောင် ပုံစံ)။
    2. အဝတ်အစား အရောင်အသွေးနှင့် ပုံစံ (Outfit & Color Palette)။
    3. အသုံးပြုသင့်သော Props များ (ဥပမာ - ပန်း၊ စာအုပ်၊ ခုံ)။
    4. Pose အိုင်ဒီယာ ၃ ခု။
    5. Photographer အတွက် အထူးသတိပြုရန် အချက်များ။
    
    မြန်မာလို ရှင်းလင်းစွာ ရေးပေးပါ။
    Context: ${getStudioContext()}`,
  }));
  return response.text || '';
};

export const generateSeasonalCampaign = async (season: string): Promise<{ title: string, ideas: string[], promotion: string }> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `မြန်မာနိုင်ငံ၏ ${season} ပွဲတော်အတွက် With You Photo Studio အတွက် Marketing Campaign တစ်ခု ဆွဲပေးပါ။
    Context: ${getStudioContext()} ${getFeedbackContext()}
    
    လိုအပ်ချက်များ:
    1. Campaign Title (မြန်မာလို)။
    2. Viral ဖြစ်စေမည့် Content Ideas ၃ ခု (မြန်မာလို)။
    3. အထူး Promotion အစီအစဉ် (စျေးနှုန်းနှင့်တကွ)။ လိုအပ်ပါက "ခုပဲ Booking တင်လိုက်ပါ" သို့မဟုတ် "အသေးစိတ်ကို Message မှာ မေးမြန်းနိုင်ပါပြီ" လို soft CTA တစ်ကြောင်းပါနိုင်သည်။
    4. အင်္ဂလိပ်စာ လုံးဝ မသုံးရ။`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ideas: { type: Type.ARRAY, items: { type: Type.STRING } },
          promotion: { type: Type.STRING }
        },
        required: ["title", "ideas", "promotion"]
      }
    }
  }));
  return JSON.parse(response.text || '{"title": "", "ideas": [], "promotion": ""}');
};

export const generateSpeech = async (
  text: string,
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'
): Promise<{ audioData: string; mimeType: string }> => {
  const voiceDirectives = {
    Kore: 'Warm, gentle, and human. Speak like a polished Myanmar female reel narrator with soft emotional lift and short natural pauses.',
    Zephyr: 'Confident, smooth, and human. Speak like a calm Myanmar male narrator with relaxed pacing and clean sentence endings.',
    Puck: 'Bright, lively, and expressive. Speak like an upbeat Myanmar social media host without sounding cartoonish.',
    Charon: 'Steady, informative, and reassuring. Speak like a composed Myanmar presenter with natural pauses and grounded tone.',
    Fenrir: 'Deep, cinematic, and rich. Speak like a premium Myanmar trailer narrator with slow, confident delivery.',
  } as const;

  const rewriteResponse = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: [{
      parts: [{
        text: `Rewrite this script so it sounds natural when spoken aloud in a Myanmar reel voiceover.

Rules:
- Keep the original language unchanged.
- Make it sound like a real person speaking, not reading.
- Use short sentences and natural pauses.
- Remove stiff, repetitive, robotic phrasing.
- Keep the meaning and key selling points.
- Output JSON only.

Script:
${text}`
      }]
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          spokenScript: { type: Type.STRING },
        },
        required: ['spokenScript'],
      },
    },
  }));

  const spokenScript = JSON.parse(rewriteResponse.text || '{"spokenScript": ""}').spokenScript?.trim() || text.trim();

  const response = await handleResponse(() => callGeminiProxy({
    model: 'tts',
    contents: [{
      parts: [{
        text: `${voiceDirectives[voiceName]}

Director notes:
- Sound human, warm, and expressive.
- Avoid robotic pacing.
- Add tiny pauses where punctuation suggests a breath.
- Keep pronunciation natural and smooth.
- Do not change the words.

Transcript:
${spokenScript}`
      }]
    }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  }));

  const inlineData = response.candidates
    ?.flatMap((candidate: any) => candidate?.content?.parts || [])
    .find((part: any) => part?.inlineData?.data)
    ?.inlineData;

  if (!inlineData?.data) {
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'OTHER') {
      throw new Error("ဒီစာသားကို အသံဖိုင်အဖြစ် မထုတ်ပေးနိုင်သေးပါ။ စာသားကို အနည်းငယ်တိုအောင် သို့မဟုတ် အင်္ဂလိပ်ညွှန်ကြားချက်မထည့်ဘဲ ပြန်စမ်းပေးပါ။");
    }
    throw new Error("အသံဖိုင် data မရရှိပါ။ ခဏနေလောက်ပြီး ပြန်စမ်းပေးပါ။");
  }
  return {
    audioData: inlineData.data,
    mimeType: inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000',
  };
};

export const runMarketingAudit = async (data: string, imageBase64?: string): Promise<{
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: { topic: string; reason: string; strategy: string }[];
}> => {
  const parts: any[] = [{ text: `Analyze the following Facebook/TikTok marketing insights data for "With You Photo Studio" and provide a strategic audit.
    
    Text Data:
    ${data}
    
    Provide the response in JSON format with the following structure:
    {
      "summary": "A concise summary of the current performance in Burmese.",
      "strengths": ["List of 3 strengths in Burmese"],
      "weaknesses": ["List of 3 weaknesses in Burmese"],
      "recommendations": [
        {
          "topic": "Specific post topic or content idea in Burmese",
          "reason": "Why this is recommended based on the data in Burmese",
          "strategy": "Brief execution strategy in Burmese"
        }
      ]
    }
    
    Keep the tone professional, strategic, and encouraging.` }];

  if (imageBase64) {
    const inlineImage = await extractInlineData(imageBase64, {
      maxDimension: 1280,
      quality: 0.76,
      mimeType: 'image/jpeg',
    });
    parts.push({
      inlineData: inlineImage
    });
  }

  const response = await handleResponse(() => callGeminiProxy({
    model: 'quality',
    contents: [{ parts }],
    config: {
      responseMimeType: 'application/json',
    },
  }));
  return JSON.parse(response.text || '{"summary": "", "strengths": [], "weaknesses": [], "recommendations": []}');
};

export const generateClientReminder = async (input: {
  clientName?: string;
  shootDate?: string;
  shootTime?: string;
  packageLabel: string;
  packageSubtitle: string;
  dos: string[];
  donts: string[];
  extraNote?: string;
  baseReminder: string;
}): Promise<string> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'fast',
    contents: `You are the premium client-care assistant for With You Photo Studio, Taunggyi.

Task: Write a NEW client reminder message from scratch in natural Burmese for Messenger/Viber/SMS.
Do NOT rewrite or imitate a basic checklist template. Create a warmer, more thoughtful, more human message that makes the client feel carefully cared for before tomorrow's shoot.

Context:
${getStudioContext()}

Client Info:
- Client name: ${input.clientName?.trim() || 'မဖော်ပြထား'}
- Shoot date: ${input.shootDate || 'မဖော်ပြထား'}
- Shoot time: ${input.shootTime || 'မဖော်ပြထား'}
- Package: ${input.packageLabel}
- Package detail: ${input.packageSubtitle}
- Extra note from studio: ${input.extraNote?.trim() || 'မရှိ'}

Package-specific ဆောင်ရန်:
${input.dos.map((item) => `- ${item}`).join('\n')}

Package-specific ရှောင်ရန်:
${input.donts.map((item) => `- ${item}`).join('\n')}

Output style:
- မြန်မာလို သဘာဝကျကျ၊ assistant မဟုတ်ဘဲ studio staff ကိုယ်တိုင် care လုပ်ပြီးပို့သလိုရေးပါ။
- Premium but friendly. မချီးကျူးလွန်၊ မကြော်ငြာဆန်၊ မစက်ရုပ်ဆန်စေပါနှင့်။
- English ကိုလိုအပ်သော photography terms များ (Indoor photo shoot, Makeup, pose, mood, lighting, outfit) လောက်သာသုံးပါ။
- Client ကို "မနက်ဖြန် အေးအေးဆေးဆေးလာရုံပဲ" ဆိုတဲ့ စိတ်သက်သာမှုရစေပါ။
- Checklist ကို “ဆောင်ရန် / ရှောင်ရန်” ခေါင်းစဉ်ကြီးကြီးနဲ့ မဟုတ်ဘဲ စကားပြောသဘာဝအတိုင်း, readable short lines ထဲမှာပေါင်းထည့်ပါ။
- Package-specific dos/donts ၏ အဓိပ္ပါယ်ကို မပြောင်းပါနှင့်။ သို့သော် စာသားကိုနူးညံ့အောင်ပြန်ရေးနိုင်သည်။
- မလိုအပ်သော promise, price, delivery term, discount, hashtags မထည့်ပါနှင့်။
- Emoji ကို 1-3 ခုထက်မပိုပါနှင့်။

Required message structure:
1. Warm greeting with client name if available.
2. Reminder of date/time in a soft way.
3. Reassurance line: studio team will guide pose/mood/details carefully.
4. Package-specific preparation notes, written like friendly care notes.
5. Gentle avoid notes, written softly and not like warnings.
6. Extra note if provided.
7. Soft closing: invite questions via Message and sign off as With You Photo Studio.

Quality bar:
- It should feel noticeably better than a basic draft.
- It should be copy-ready without needing another generator.
- Prefer 10-18 short lines, not one long paragraph.
- Avoid repeating the same meaning twice.

Return JSON only.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: {
            type: Type.STRING,
            description: "Messenger/Viber/SMS တွင် တန်းပို့နိုင်သော final client reminder message"
          }
        },
        required: ["message"]
      }
    }
  }));

  const parsed = JSON.parse(response.text || '{}');
  return String(parsed.message || input.baseReminder).trim();
};

export const createStrategyChat = (initialHistory: any[] = []) => {
  const history = [...initialHistory];
  
  return {
    sendMessage: async (message: string) => {
      const response = await handleResponse(() => callGeminiProxy({
        model: 'quality',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: `You are a highly experienced Business & Marketing Strategy Partner for "With You Photo Studio" located in Taunggyi, Myanmar.
          
          Your goal is to act as a brainstorming partner, consultant, and problem solver for the studio owner.
          
          Context about the business:
          ${getStudioContext()}
          
          Guidelines for your responses:
          1. Speak in natural, conversational Burmese (Myanmar language), but you can mix in English business/photography terms (e.g., marketing, brand awareness, premium, lighting, mood, tone).
          2. Be encouraging, professional, and highly strategic.
          3. Provide actionable advice, not just generic statements. If the user asks for a promotion idea, give specific mechanics. If they ask how to handle a difficult customer, give a specific script.
          4. Always keep the "Premium Brand Image" in mind. Do not suggest cheap discounts that devalue the brand. Suggest value-adds instead.
          5. Keep your responses concise and easy to read (use bullet points, emojis, and short paragraphs).
          `,
        }
      }));

      const text = response.text || '';
      history.push({ role: 'user', parts: [{ text: message }] });
      history.push({ role: 'model', parts: [{ text: text }] });
      
      return { text };
    }
  };
};
