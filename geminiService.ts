
import { MarketingContent, MarketTrend, DailyPlan, SalesScript, DailyContent, EngagementPost, ClientGuide, PremiumPromotion, AutoReply } from "./types";
import { PRICING, UsageMetadata } from "./constants";

/**
 * Track and store Gemini API usage cost in localStorage
 */
const trackUsage = (model: string, usage: UsageMetadata) => {
  try {
    const pricing = (PRICING as any)[model] || PRICING['gemini-3-flash-preview'];
    const cost = (usage.promptTokenCount * pricing.input) + (usage.candidatesTokenCount * pricing.output);
    
    const today = new Date().toISOString().split('T')[0];
    const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
    
    if (!savedUsage[today]) {
      savedUsage[today] = { totalCost: 0, count: 0 };
    }
    
    savedUsage[today].totalCost += cost;
    savedUsage[today].count += 1;
    savedUsage[today].lastCost = cost;
    
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

- Pre-wedding Packages: 350k (Sweet Memo), 500k (Style Fusion), 650k (Elegance Duo), 1M (Grand Royal). 
  ***သတိပြုရန်: Pre-wedding packages အားလုံးသည် Limited Softcopy သာ ရမည်။ Unlimited လုံးဝ မရပါ။***

- မင်္ဂလာဆွမ်းကပ် (Monk Offering) [Taunggyi Only]:
  * 480,000 MMK (2 Cam). Options: (1) 70 Softcopy + 16x24 Frame OR (2) 50 Print + 16x24 Frame.
  * အထူးချက်: ပွဲအစအဆုံး ရိုက်သမျှ Raw & Edit အားလုံးကို CD ဖြင့် ပေးအပ်မည်။ (Unlimited Raw).

- အလှူပွဲနေ့ (Donation Day):
  * 1 Camera: 390,000 MMK. Options: (1) 60 Softcopy + 12x18 Frame OR (2) 40 Print + 12x18 Frame.
  * 2 Camera: 500,000 MMK. Options: (1) 70 Softcopy + 16x24 Frame OR (2) 50 Print + 16x24 Frame.
  * အထူးချက်: ပွဲအစအဆုံး ရိုက်သမျှ Raw & Edit အားလုံးကို CD ဖြင့် ပေးအပ်မည်။ (Unlimited Raw).

- Extra Time Policy:
  * ၃ နာရီကျော်ပါက အချိန်ပို ၃၀ မိနစ် (၃ သောင်းကျပ်)၊ ၁ နာရီ (၅ သောင်းကျပ်) ထပ်ဆောင်းပေးရမည်။

- Unique Selling Point: Premium Makeup, Life-long Memories, High-end Lighting & Equipment.

CRITICAL RULE: "With You Photo Studio" ဟူသော အမည်ကို မြန်မာလို (ဥပမာ- ဝစ်သ်ယူဓာတ်ပုံတိုက်) ဟု လုံးဝ (လုံးဝ) မဘာသာပြန်ပါနှင့်။ အင်္ဂလိပ်လိုသာ "With You Photo Studio" ဟု အမြဲတမ်း သုံးနှုန်းပါ။
`;

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

/**
 * Proxy call to the server-side Gemini endpoint
 */
export const callGeminiProxy = async (params: { model: string, contents: any, config?: any }) => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to call Gemini API");
  }

  // Track usage if metadata is available
  if (data.usageMetadata) {
    trackUsage(params.model, data.usageMetadata);
  }

  return data;
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
    model: 'gemini-3-pro-preview',
    contents: `With You Photo Studio, Taunggyi အတွက် ဒီနေ့အတွက် အလွန် Viral ဖြစ်မည့် Marketing Strategy တစ်ခုကို မြန်မာဘာသာဖြင့်သာ ထုတ်ပေးပါ။ 

    တင်းကျပ်သော လမ်းညွှန်ချက်များ:
    1. အင်္ဂလိပ်စာ (English) ကို လုံးဝ မသုံးပါနှင့်။ စာသားအားလုံးကို မြန်မာဘာသာ (Unicode) ဖြင့်သာ ရေးသားပါ။
    2. Viral ဖြစ်စေရန် Emotional Storytelling (ဥပမာ- မိဘတွေရဲ့ ပီတိ၊ ဇနီးမောင်နှံရဲ့ အမှတ်တရ) ကို အသုံးချပါ။
    3. အလှူပွဲ နှင့် ဆွမ်းကပ် စျေးနှုန်းအသစ်များ (480k, 390k, 500k) ကို အသုံးပြုပါ။
    4. Pre-wedding (Limited) နှင့် Wedding/Donation (Unlimited Raw CD) ခြားနားချက်ကို မမှားစေရ။

    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}`,
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
  const parts: any[] = [{ text: `With You Photo Studio, Taunggyi အတွက် Viral ဖြစ်မည့် Content ကို မြန်မာဘာသာဖြင့် ရေးပေးပါ။
    အင်္ဂလိပ်စာ လုံးဝ မသုံးရ။ စာသားအားလုံး မြန်မာလိုပဲ ရေးပါ။
    
    တင်းကျပ်သော လမ်းညွှန်ချက်များ:
    1. Package စျေးနှုန်းများ (ဥပမာ- 350k, 500k စသည်) ကို ပိုစ့်ထဲတွင် လုံးဝ (လုံးဝ) မထည့်ပါနှင့်။ Content ၏ အနှစ်သာရ၊ ခံစားချက် (Emotion) နှင့် Storytelling ကိုသာ အဓိကထား ရေးသားပါ။
    2. ဖတ်ရတာ ဆွဲဆောင်မှုရှိစေရန် သင့်တော်သော Emoji များ (ဥပမာ- ✨📸💖) ထည့်သွင်း အသုံးပြုပေးပါ။
    
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}
    User Input: ${description}` }];

  if (imageUri) {
    const base64Data = imageUri.split(',')[1];
    parts.push({
      inlineData: { mimeType: "image/jpeg", data: base64Data }
    });
  }

  const response = await handleResponse(() => callGeminiProxy({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          facebookCaption: { type: Type.STRING },
          tiktokVisualScript: { type: Type.STRING },
          tiktokCaption: { type: Type.STRING },
          tiktokAudioStyle: { type: Type.STRING },
          tiktokEditingStyle: { type: Type.STRING },
          tiktokSceneBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          engagementTips: { type: Type.STRING }
        },
        required: ["facebookCaption", "tiktokVisualScript", "tiktokCaption", "tiktokAudioStyle", "tiktokEditingStyle", "tiktokSceneBreakdown", "hashtags", "engagementTips"]
      }
    }
  }));

  return JSON.parse(response.text || '{}');
};

export const generateSalesScripts = async (scenario: string, customQuestion?: string): Promise<SalesScript> => {
  const prompt = customQuestion 
    ? `Client က အခုလို မေးလာပါတယ်: "${customQuestion}" \n\n With You Photo Studio, Taunggyi ရဲ့ Professional ဆန်စွာ မြန်မာဘာသာဖြင့် ပြန်လည်ဖြေကြားပေးပါ။ 
       မှတ်ချက်: ဆွမ်းကပ် (480k)၊ အလှူ (390k/500k) တွေမှာ Unlimited Raw CD ပေးကြောင်း သေချာထည့်ပြောပါ။`
    : `Scenario: ${scenario} \n\n With You Photo Studio, Taunggyi အတွက် အကောင်းဆုံး Sales Script ကို "မြန်မာဘာသာဖြင့်သာ" ရေးပေးပါ။`;

  const response = await handleResponse(() => callGeminiProxy({
    model: 'gemini-3-pro-preview',
    contents: `Context: ${STUDIO_CONTEXT} ${getFeedbackContext()} \n\n ${prompt}`,
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
    model: 'gemini-3-flash-preview',
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
    model: 'gemini-3-pro-preview',
    contents: `With You Photo Studio, Taunggyi Strategy Planner. Goals: ${goals}. Studio: ${STUDIO_CONTEXT} ${getFeedbackContext()}. အစီအစဉ်အားလုံး မြန်မာဘာသာဖြင့်သာ ရေးပါ။ အင်္ဂလိပ်စာ လုံးဝ မပါရ။`,
  }));
  return response.text || '';
};

export const generateHashtags = async (topic: string): Promise<{ tags: string[], strategy: string }> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'gemini-3-flash-preview',
    contents: `With You Photo Studio, Taunggyi အတွက် Hashtag Strategy ထုတ်ပေးပါ။ 
    Topic: ${topic}
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}
    
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
    model: 'gemini-3-flash-preview',
    contents: `With You Photo Studio, Taunggyi အတွက် Professional Portfolio Bio တစ်ခု ရေးပေးပါ။
    Style: ${style} (ဥပမာ- Professional, Friendly, Luxury)
    Extra Details: ${details}
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}
    
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
    model: 'gemini-3-flash-preview',
    contents: `Client ဆီက Review တစ်ခု ရထားပါတယ်။ အဲဒါကို Professional ဆန်စွာ ပြန်လည်ဖြေကြားပေးပါ။
    Review: "${review}"
    Rating: ${rating} Stars
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}
    
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
    model: 'gemini-3-pro-preview',
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
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}`,
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
    model: 'gemini-3-pro-preview',
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
    
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}`,
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
    model: 'gemini-3.1-pro-preview',
    contents: `With You Photo Studio, Taunggyi အတွက် Customer များ ကြိုတင်ပြင်ဆင်နိုင်ရန် Client Preparation Guide တစ်ခု ရေးပေးပါ။
    
    ရည်ရွယ်ချက်: Premium Brand Image ကို မြှင့်တင်ရန်နှင့် Customer များ ရိုက်ကူးရေးအတွက် အကောင်းဆုံး ပြင်ဆင်လာနိုင်စေရန်။
    အကြောင်းအရာ: ${topic}
    
    လိုအပ်ချက်များ:
    1. "အိမ်တွင်းရိုက်ကူးရေး" သို့မဟုတ် "အပြင်ထွက်ရိုက်ကူးရေး" ဟူသော စကားလုံးများကို လုံးဝ မသုံးပါနှင့်။ အခြေအနေပေါ်မူတည်၍ "Indoor photo shoot" သို့မဟုတ် "Outdoor photo shoot" ဟုသာ သုံးပါ။
    2. စကားပြောဆိုရာတွင် ယဉ်ကျေးပြီး ဂရုစိုက်မှုအပြည့်ပါသော (Premium & Caring) လေသံဖြင့် ရေးပါ။
    3. လက်တွေ့ကျသော အကြံပြုချက်များ (Tips) နှင့် မေ့တတ်သော အရာများစာရင်း (Checklist) ပါဝင်ရမည်။ (Outdoor ဖြစ်ပါက နေပူခံခရင်မ်၊ ထီး၊ ရေဘူး၊ ခြင်ဆေး စသည့် Outdoor နှင့် သက်ဆိုင်သော အချက်များ ထည့်ပေးရန်)
    4. မြန်မာလို ရေးပါ၊ သို့သော် လိုအပ်ပါက English စကားလုံးများ (vibe, mood, lighting, props စသည်) ညှပ်သုံးပါ။
    5. မိတ်ကပ်နှင့် ဆံပင် အကြံပြုချက်များ: Customer များကို ကိုယ်တိုင် မိတ်ကပ် လုံးဝ (လုံးဝ) မလိမ်းလာရန် ယဉ်ကျေးစွာ အသိပေးပါ။ "Studio မှ Professional Makeup Artist များက အစအဆုံး ပြင်ဆင်ပေးမည်ဖြစ်၍ မျက်နှာသစ်ပြီး Skin Care အနည်းငယ်သာ လိမ်းလာရန်နှင့် ဆံပင်လျှော်ပြီး ခြောက်အောင်သာ လုပ်လာပေးရန်" ဟု သေချာထည့်ရေးပေးပါ။ (Premium ဆန်ဆန်၊ ဂရုစိုက်မှုအပြည့်ပါသော လေသံဖြင့် ရေးရန်)
    
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}`,
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
    model: 'gemini-3-pro-preview',
    contents: `With You Photo Studio, Taunggyi အတွက် Premium Promotion Strategy တစ်ခု ရေးဆွဲပေးပါ။
    
    ရည်ရွယ်ချက်: Brand Image မကျစေဘဲ (ဈေးမချဘဲ) Customer ကို ဆွဲဆောင်နိုင်မည့် Value-Added Promotion ဖန်တီးရန်။
    အကြောင်းအရာ/ရာသီ: ${occasion}
    
    လိုအပ်ချက်များ:
    1. ဈေးနှုန်းကို % ဖြင့် လျှော့ချခြင်း (Discount) လုံးဝ မလုပ်ပါနှင့်။ ၎င်းအစား လက်ဆောင်ပေးခြင်း (ဥပမာ - ဘောင်အပို၊ Softcopy အပို၊ မိတ်ကပ် free) စသည့် Value-Added ကိုသာ သုံးပါ။
    2. "အိမ်တွင်းရိုက်ကူးရေး" ဟု လုံးဝ မသုံးပါနှင့်။ "Indoor photo shoot" ဟုသာ သုံးပါ။
    3. Pre-wedding package များသည် Limited Softcopy သာ ရမည်ဆိုသည့် စည်းမျဉ်းကို မချိုးဖောက်ပါနှင့်။ (Unlimited ပေးမည်ဟု လုံးဝ မရေးရ)
    4. Facebook တွင် တင်ရန် ဆွဲဆောင်မှုရှိသော Caption တစ်ခု အပါအဝင် ရေးပေးပါ။ Caption အဆုံးတွင် #WithYouPhotoStudio #Taunggyi #wyps #taunggyiphotographer ထည့်ပါ။
    
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}`,
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
    model: 'gemini-3-pro-preview',
    contents: `With You Photo Studio, Taunggyi ၏ Facebook Messenger အတွက် Auto-Reply / FAQ စာသားများ ရေးပေးပါ။
    
    ရည်ရွယ်ချက်: Customer များ မကြာခဏ မေးလေ့ရှိသော မေးခွန်းများကို လူကိုယ်တိုင် ပြန်နေသကဲ့သို့ သဘာဝကျကျ၊ ယဉ်ကျေးစွာ ပြန်လည်ဖြေကြားပေးရန်။
    ကဏ္ဍ (Category): ${category}
    
    လိုအပ်ချက်များ:
    1. "အိမ်တွင်းရိုက်ကူးရေး" ဟု လုံးဝ မသုံးပါနှင့်။ "Indoor photo shoot" ဟုသာ သုံးပါ။
    2. စကားပြောဆိုရာတွင် စက်ရုပ်ဆန်ဆန် မဟုတ်ဘဲ၊ နွေးထွေးပျူငှာသော (Friendly & Professional) လေသံဖြင့် ရေးပါ။
    3. Package ဈေးနှုန်းများ (350k, 500k, 650k, 1M) နှင့် Limited Softcopy စည်းမျဉ်းများကို မှန်ကန်စွာ ထည့်သွင်းဖြေကြားပါ။
    4. မေးခွန်း ၃ ခု မှ ၅ ခု အထိ ထုတ်ပေးပါ။
    
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}`,
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
    model: 'gemini-3.1-pro-preview',
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
    
    Context: ${STUDIO_CONTEXT}`,
  }));
  return response.text || '';
};

export const generateConcept = async (vibe: string): Promise<string> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'gemini-3.1-pro-preview',
    contents: `With You Photo Studio, Taunggyi အတွက် Photo Shoot Concept & Moodboard အကြံပြုချက်များ ရေးပေးပါ။
    
    Customer လိုချင်သော Vibe / Theme: ${vibe}
    
    လိုအပ်ချက်များ:
    1. ဤ Vibe နှင့် ကိုက်ညီမည့် Lighting Setup (အလင်းအမှောင် ပုံစံ)။
    2. အဝတ်အစား အရောင်အသွေးနှင့် ပုံစံ (Outfit & Color Palette)။
    3. အသုံးပြုသင့်သော Props များ (ဥပမာ - ပန်း၊ စာအုပ်၊ ခုံ)။
    4. Pose အိုင်ဒီယာ ၃ ခု။
    5. Photographer အတွက် အထူးသတိပြုရန် အချက်များ။
    
    မြန်မာလို ရှင်းလင်းစွာ ရေးပေးပါ။
    Context: ${STUDIO_CONTEXT}`,
  }));
  return response.text || '';
};

export const generateSeasonalCampaign = async (season: string): Promise<{ title: string, ideas: string[], promotion: string }> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'gemini-3-flash-preview',
    contents: `မြန်မာနိုင်ငံ၏ ${season} ပွဲတော်အတွက် With You Photo Studio အတွက် Marketing Campaign တစ်ခု ဆွဲပေးပါ။
    Context: ${STUDIO_CONTEXT} ${getFeedbackContext()}
    
    လိုအပ်ချက်များ:
    1. Campaign Title (မြန်မာလို)။
    2. Viral ဖြစ်စေမည့် Content Ideas ၃ ခု (မြန်မာလို)။
    3. အထူး Promotion အစီအစဉ် (စျေးနှုန်းနှင့်တကွ)။
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

export const generateSpeech = async (text: string, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'): Promise<string> => {
  const response = await handleResponse(() => callGeminiProxy({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: `TTS the following text clearly and professionally: ${text}` }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  }));
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio data. Please check if the model is available in your region.");
  }
  return base64Audio;
};

export const createStrategyChat = (initialHistory: any[] = []) => {
  const history = [...initialHistory];
  
  return {
    sendMessage: async (message: string) => {
      const response = await handleResponse(() => callGeminiProxy({
        model: 'gemini-3.1-pro-preview',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: `You are a highly experienced Business & Marketing Strategy Partner for "With You Photo Studio" located in Taunggyi, Myanmar.
          
          Your goal is to act as a brainstorming partner, consultant, and problem solver for the studio owner.
          
          Context about the business:
          ${STUDIO_CONTEXT}
          
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
