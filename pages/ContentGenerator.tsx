
import React, { useState, useEffect } from 'react';
import { generateMarketingContent, refineMarketingText } from '../geminiService';
import { MarketingContent, AppTab } from '../types';
import Feedback from '../components/Feedback';
import imageCompression from 'browser-image-compression';
import { formatMarketingContent, saveGeneratedHistory } from '../generatedHistory';
import { saveApprovalItem } from '../workflowBoard';

interface ContentHistory {
  id: string;
  date: string;
  description: string;
  content: MarketingContent;
}

interface ContentGeneratorProps {
  onNavigate?: (tab: AppTab) => void;
}

interface FacebookInsightsSummary {
  postsAnalyzed: number;
  topPosts: Array<{
    message: string;
    format: string;
    topic: string;
    reach: number;
    engagement: number;
    permalinkUrl?: string;
  }>;
  topTopics: Array<{ topic: string; count: number; reach: number; engagement: number; averageScore: number }>;
  topFormats: Array<{ format: string; count: number; averageScore: number }>;
  recommendations: string[];
  contentIdeas?: Array<{
    title: string;
    angle: string;
    bestFor: string;
    prompt: string;
  }>;
  generatedAt: string;
  datePreset?: string;
  usedHistoricalFallback?: boolean;
  warning?: string;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const QUICK_HINT_GROUPS = [
  {
    title: 'Tone',
    hints: [
      'ပိုပြီး Premium ဆန်စေပါ',
      'မြန်မာလို ပိုသဘာဝကျစေပါ',
      'English စကားလုံး လျှော့ပါ',
      'Sales မဆန်အောင်ရေးပါ',
      'Client emotion ပိုပါစေ',
    ],
  },
  {
    title: 'Structure',
    hints: [
      'အစစာကြောင်း ပိုဆွဲဆောင်စေပါ',
      'စာပိုဒ် 4-6 ပိုဒ်နဲ့ရေးပါ',
      'စာပိုဒ်တိုတိုနဲ့ ဖတ်ရလွယ်အောင်',
      'Visual detail ပိုဖော်ပြပါ',
      'အရင် post နဲ့မတူအောင်ရေးပါ',
    ],
  },
  {
    title: 'Conversion',
    hints: [
      'soft booking CTA ပါစေ',
      'Booking inquiry ရစေမယ့် CTA ပါစေ',
      'Facebook အတွက် ပိုဖတ်လွယ်အောင်',
      'TikTok/Reels hook ပိုပြင်းအောင်',
      'Hashtag ပိုသပ်ရပ်စေပါ',
    ],
  },
] as const;

const CONTENT_OBJECTIVES = [
  'Booking inquiry ရစေချင်တယ်',
  'Brand trust တက်စေချင်တယ်',
  'Recent shoot ကို showcase လုပ်ချင်တယ်',
  'Reels/TikTok အတွက် short-video idea လိုချင်တယ်',
  'Client education / guide ပုံစံလိုချင်တယ်',
] as const;

const CONTENT_TONES = [
  'နူးညံ့ပြီး Premium ဆန်',
  'နွေးထွေးပြီး ယုံကြည်မှုရှိ',
  'တိုတိုရှင်းရှင်းနဲ့ direct',
  'Storytelling ပိုများ',
  'Elegant sales CTA ပါ',
] as const;

const TARGET_AUDIENCES = [
  'Pre-wedding couple',
  'Birthday / Sweet 17',
  'Family / Baby / Portrait',
  'Donation / Monk offering',
  'General studio customer',
] as const;

const CREATOR_MODES = [
  'World-class Studio Content Creator',
  'Premium Storytelling Strategist',
  'TikTok/Reels Hook Specialist',
  'Booking Conversion Copywriter',
] as const;

const getMonthlyTrendBrief = () => {
  const month = new Date().getMonth();
  const trends = [
    'January: New year fresh-start, family portrait, couple milestone, elegant yearly memories.',
    'February: Valentine couple story, romantic pre-wedding, soft love-language, gift/photo memory angle.',
    'March: Summer color, graduation/convocation, bright outdoor mood, short Reels transitions.',
    'April: Thingyan/New Year warmth, family gathering, donation/merit moments, water festival freshness.',
    'May: Pre-monsoon soft indoor mood, elegant studio lighting, graduation/convocation, wedding planning season.',
    'June: Rainy-season cozy indoor content, intimate couple story, soft lighting, premium indoor setup.',
    'July: Waso/donation season, family merit moments, traditional outfit, emotional storytelling.',
    'August: Monsoon portrait, warm family content, behind-the-scenes trust, indoor premium vibe.',
    'September: Pre-wedding planning, elegant dress detail, booking inquiry angle, polished studio mood.',
    'October: Thadingyut lights, family/couple memories, festive outfit, warm premium celebration.',
    'November: Wedding season peak, pre-wedding/outdoor schedule, cinematic couple storytelling.',
    'December: Year-end memories, family portraits, couple milestones, holiday premium gift angle.',
  ];
  return trends[month];
};

const INSIGHT_TOPIC_LABELS: Record<string, string> = {
  'General studio content': 'Studio ရိုက်ကူးရေး အထွေထွေ',
  'Pre-wedding': 'Pre-wedding / မင်္ဂလာအကြို',
  'Sweet 17 / Birthday': 'မွေးနေ့ / Sweet 17',
  'Family': 'မိသားစု / Portrait',
  'Donation / Monk offering': 'အလှူ / ဆွမ်းကပ်',
  'Indoor portrait': 'Indoor Studio Portrait',
};

const formatInsightTopic = (topic?: string) => topic ? (INSIGHT_TOPIC_LABELS[topic] || topic) : 'မရှိသေးပါ';

const formatInsightPreset = (preset?: string) => {
  if (preset === 'last_7d') return 'နောက်ဆုံး ၇ ရက်';
  if (preset === 'last_30d') return 'နောက်ဆုံး ၃၀ ရက်';
  if (preset === 'last_90d') return 'နောက်ဆုံး ၉၀ ရက်';
  if (preset === 'maximum') return 'ယခင် ad data အားလုံး';
  return 'Insights data';
};

const formatFacebookCaption = (text: string): string => {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/^\s*(facebook\s*(caption|post)|caption|post)\s*[:：-]\s*/gim, '')
    .replace(/^\s*(ခေါင်းစဉ်|ပိုစ့်|ပိုစ်တ်|ကပ်ရှင်)\s*[:：-]\s*/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return text;

  const existingParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (existingParagraphs.length >= 3) {
    return existingParagraphs.join('\n\n');
  }

  const sentenceChunks = normalized
    .split(/(?<=[.!?။…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentenceChunks.length <= 2) {
    return normalized;
  }

  const grouped: string[] = [];
  for (let index = 0; index < sentenceChunks.length; index += 2) {
    grouped.push(sentenceChunks.slice(index, index + 2).join(' ').trim());
  }

  return grouped.join('\n\n');
};

const polishMyanmarCopy = (text = '') => text
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .replace(/\bDM\b/gi, 'Message')
  .replace(/\bInbox\b/gi, 'Message')
  .trim();

const normalizeHashtag = (tag: string) => tag
  .trim()
  .replace(/^#+/, '')
  .replace(/\s+/g, '')
  .replace(/[၊။,.]+$/g, '');

const normalizeHashtags = (tags: string[] = []) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  tags.forEach((tag) => {
    const cleanTag = normalizeHashtag(tag);
    const key = cleanTag.toLowerCase();
    if (!cleanTag || seen.has(key)) return;
    seen.add(key);
    normalized.push(cleanTag);
  });
  return normalized;
};

const splitTikTokCaptionAndTags = (caption = '', tags: string[] = []) => {
  const extractedTags = caption.match(/#[^\s#]+/g) || [];
  const cleanCaption = caption
    .replace(/(?:^|\s)#[^\s#]+/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    caption: cleanCaption || caption.trim(),
    hashtags: normalizeHashtags([...tags, ...extractedTags]),
  };
};

const buildCapCutChecklist = (content: MarketingContent) => {
  const scenes = content.tiktokSceneBreakdown?.length
    ? content.tiktokSceneBreakdown
    : [content.tiktokVisualScript].filter(Boolean);

  const checklist = [
    'CapCut Edit Checklist',
    '',
    'Project Setup',
    '1. New project ဖွင့်ပြီး Format ကို 9:16 ထားပါ။',
    '2. ရွေးထားတဲ့ photo/video တွေကို Scene Breakdown အစဉ်လိုက် import လုပ်ပါ။',
    '3. Overall duration ကို 10s-20s အတွင်းထားပါ။ Hook ပိုပြင်းချင်ရင် ပထမ 3s ကိုအရေးကြီးဆုံးထားပါ။',
    '',
    'Scene Order',
    ...scenes.flatMap((scene, index) => [
      `${index + 1}. Scene ${index + 1}`,
      `   - Media: ${scene}`,
      '   - Motion: Photo ဆို Slow zoom / Pan, Video ဆို အကောင်းဆုံး moment ကို trim လုပ်ပါ။',
      '   - Text: စာသားထည့်မယ်ဆို 1 line တိုတိုပဲထားပါ။ မျက်နှာကိုမဖုံးအောင် top/bottom safe area ထားပါ။',
      '   - Transition: 0.2s-0.4s အတွင်း smooth transition သုံးပါ။ အရမ်းကြီး effect မများပါစေနှင့်။',
    ]),
    '',
    'Audio / Music',
    `- Music mood: ${content.tiktokAudioStyle || 'Soft cinematic / romantic audio'}`,
    '- Beat ရှိတဲ့နေရာမှာ scene cut ကိုချိန်ပါ။ Voiceover ပါရင် music volume ကို 8%-15% အတွင်းချပါ။',
    '',
    'Editing Style',
    `- ${content.tiktokEditingStyle || 'Smooth, premium, clean color, not too flashy.'}`,
    '- Color/Filter ကို skin tone မပျက်အောင် light touch ပဲသုံးပါ။',
    '',
    'Export',
    '1. Export 1080p, 30fps သို့မဟုတ် 60fps ထားပါ။',
    '2. TikTok/Reels မတင်ခင် video ကိုတစ်ခါပြန်ကြည့်ပြီး မျက်နှာ/စာသား မဖြတ်သွားတာစစ်ပါ။',
    '3. Caption ကို app ထဲက TikTok Caption section မှ copy လုပ်ပြီး paste ပါ။',
  ];

  return checklist.join('\n');
};

const normalizeMarketingContent = (data: MarketingContent): MarketingContent => {
  const tiktok = splitTikTokCaptionAndTags(data.tiktokCaption, data.hashtags);
  return {
    ...data,
    facebookCaption: formatFacebookCaption(polishMyanmarCopy(data.facebookCaption)),
    facebookVariants: Array.isArray(data.facebookVariants)
      ? data.facebookVariants
        .filter((variant) => variant?.caption)
        .slice(0, 3)
        .map((variant) => ({
          style: polishMyanmarCopy(variant.style || 'Facebook Version'),
          caption: formatFacebookCaption(polishMyanmarCopy(variant.caption)),
        }))
      : [],
    tiktokCaption: polishMyanmarCopy(tiktok.caption),
    hashtags: tiktok.hashtags,
  };
};

const formatDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getFacebookScheduleMinValue = () => {
  const minDate = new Date(Date.now() + 10 * 60 * 1000);
  minDate.setSeconds(0, 0);
  return formatDateTimeLocalValue(minDate);
};

const getFacebookScheduleMaxValue = () => {
  const maxDate = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000);
  maxDate.setSeconds(0, 0);
  return formatDateTimeLocalValue(maxDate);
};

const ContentGenerator: React.FC<ContentGeneratorProps> = ({ onNavigate }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketingContent | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedHints, setSelectedHints] = useState<string[]>([]);
  const [contentObjective, setContentObjective] = useState<string>(CONTENT_OBJECTIVES[0]);
  const [contentTone, setContentTone] = useState<string>(CONTENT_TONES[0]);
  const [targetAudience, setTargetAudience] = useState<string>(TARGET_AUDIENCES[0]);
  const [ctaStyle, setCtaStyle] = useState('Message မှာပေါ့ပေါ့ပါးပါးမေးရန်');
  const [creatorMode, setCreatorMode] = useState<string>(CREATOR_MODES[0]);
  const [monthlyTrendBrief, setMonthlyTrendBrief] = useState(getMonthlyTrendBrief());
  const [refiningAction, setRefiningAction] = useState('');
  const [editingFacebookCaption, setEditingFacebookCaption] = useState(false);
  const [facebookCaptionDraft, setFacebookCaptionDraft] = useState('');
  
  const [fbToken, setFbToken] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const [fbScheduleTime, setFbScheduleTime] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<FacebookInsightsSummary | null>(null);

  const [history, setHistory] = useState<ContentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('fb_page_token');
    const savedPageId = localStorage.getItem('fb_page_id');
    const pendingTopic = localStorage.getItem('wyp_content_topic');
    const savedHints = localStorage.getItem('wyp_content_hints');
    const savedFactorySettings = localStorage.getItem('wyp_content_factory_settings');
    const savedInsights = localStorage.getItem('wyp_facebook_insights_summary');
    if (savedToken) setFbToken(savedToken);
    if (savedPageId) setFbPageId(savedPageId);
    if (pendingTopic) {
      setDescription(pendingTopic);
      localStorage.removeItem('wyp_content_topic');
    } else {
      const savedDraft = localStorage.getItem('wyp_content_draft');
      if (savedDraft) setDescription(savedDraft);
    }
    if (savedHints) {
      try {
        setSelectedHints(JSON.parse(savedHints));
      } catch (e) {
        console.error('Failed to parse content hints', e);
      }
    }
    if (savedFactorySettings) {
      try {
        const settings = JSON.parse(savedFactorySettings);
        if (settings.contentObjective) setContentObjective(settings.contentObjective);
        if (settings.contentTone) setContentTone(settings.contentTone);
        if (settings.targetAudience) setTargetAudience(settings.targetAudience);
        if (settings.ctaStyle) setCtaStyle(settings.ctaStyle);
        if (settings.creatorMode) setCreatorMode(settings.creatorMode);
        if (settings.monthlyTrendBrief) setMonthlyTrendBrief(settings.monthlyTrendBrief);
      } catch (e) {
        console.error('Failed to parse content factory settings', e);
      }
    }
    if (savedInsights) {
      try {
        setInsights(JSON.parse(savedInsights));
      } catch (e) {
        console.error('Failed to parse Facebook insights summary', e);
      }
    }

    const savedHistory = localStorage.getItem('wyp_content_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Auto-save draft: debounce 800ms so we don't thrash localStorage on every keystroke
  useEffect(() => {
    if (!description) return;
    const t = setTimeout(() => {
      localStorage.setItem('wyp_content_draft', description);
    }, 800);
    return () => clearTimeout(t);
  }, [description]);

  const saveToHistory = (content: MarketingContent, topicText = description) => {
    const newEntry: ContentHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      description: topicText,
      content
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('wyp_content_history', JSON.stringify(updatedHistory));
    saveGeneratedHistory({
      type: 'Content',
      title: topicText?.trim()?.slice(0, 90) || 'Facebook / TikTok Content',
      subtitle: 'Content Factory မှ generate လုပ်ထားသော output',
      content: formatMarketingContent(content),
      tab: AppTab.CONTENT_GEN,
    });
    saveApprovalItem({
      title: topicText?.trim()?.slice(0, 90) || 'Facebook / TikTok Content',
      subtitle: `${creatorMode} · ${targetAudience}`,
      facebookCaption: content.facebookCaption,
      tiktokCaption: content.tiktokCaption,
      sourceTopic: topicText || '',
    });
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('wyp_content_history', JSON.stringify(updated));
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFbToken(val);
    localStorage.setItem('fb_page_token', val);
  };

  const handlePageIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFbPageId(val);
    localStorage.setItem('fb_page_id', val);
  };

  const startFacebookCaptionEdit = () => {
    if (!result?.facebookCaption) return;
    setFacebookCaptionDraft(result.facebookCaption);
    setEditingFacebookCaption(true);
  };

  const saveFacebookCaptionEdit = () => {
    if (!result) return;
    const nextCaption = formatFacebookCaption(facebookCaptionDraft);
    setResult({ ...result, facebookCaption: nextCaption });
    setFacebookCaptionDraft(nextCaption);
    setEditingFacebookCaption(false);
    setToastMsg('Facebook caption ကိုပြင်ပြီးပါပြီ။');
    setTimeout(() => setToastMsg(''), 2500);
  };

  const cancelFacebookCaptionEdit = () => {
    setFacebookCaptionDraft(result?.facebookCaption || '');
    setEditingFacebookCaption(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      setErrorMsg('');
      setStatusMsg('ပုံကို post အတွက် ပြင်ဆင်နေပါသည်...');
      const options = {
        maxSizeMB: 3.5,
        maxWidthOrHeight: 2048,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setCompressedImageFile(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error(error);
      setErrorMsg("ပုံကို ချုံ့ရာတွင် အခက်အခဲရှိနေပါသည်။");
    } finally {
      setCompressing(false);
      setStatusMsg('');
    }
  };

  const postToFacebook = async () => {
    if (!fbToken || !fbPageId) {
      alert("Facebook Page ID နှင့် Page Access Token ထည့်ပေးပါ။ (User Access Token အသုံးပြု၍ မရပါ။)");
      setShowTokenInput(true);
      return;
    }
    if (!compressedImageFile) {
      alert("Facebook သို့ တိုက်ရိုက်တင်ရန် ပုံရွေးချယ်ပေးပါ။");
      return;
    }
    if (!result?.facebookCaption) return;
    if (fbScheduleTime) {
      const scheduleDate = new Date(fbScheduleTime);
      const minScheduleDate = Date.now() + 10 * 60 * 1000;
      const maxScheduleDate = Date.now() + 75 * 24 * 60 * 60 * 1000;
      if (Number.isNaN(scheduleDate.getTime())) {
        setErrorMsg('Schedule time မမှန်ပါ။ ပြန်ရွေးပေးပါ။');
        return;
      }
      if (scheduleDate.getTime() < minScheduleDate) {
        setErrorMsg('Facebook schedule time ကို အနည်းဆုံး 10 မိနစ်အနာဂတ်မှာထားပေးပါ။');
        return;
      }
      if (scheduleDate.getTime() > maxScheduleDate) {
        setErrorMsg('Facebook schedule time ကို 75 ရက်အတွင်းပဲထားပေးပါ။');
        return;
      }
    }

    setPosting(true);
    setErrorMsg('');
    setStatusMsg(fbScheduleTime ? 'Facebook post ကို schedule လုပ်နေပါသည်...' : 'Facebook သို့ post တင်နေပါသည်...');
    try {
      const facebookReadyImage = await imageCompression(compressedImageFile, {
        maxSizeMB: 1.6,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.82,
      });

      const imageDataUrl = await fileToDataUrl(facebookReadyImage);
      const res = await fetch('/api/facebook-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: fbPageId,
          pageToken: fbToken,
          message: result.facebookCaption,
          imageDataUrl,
          scheduleTime: fbScheduleTime ? new Date(fbScheduleTime).toISOString() : null,
        }),
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { error: rawText || 'Unexpected response from Facebook API proxy' };
      }
      
      if (!res.ok || data.error) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Facebook publish failed');
      }
      
      setToastMsg(
        fbScheduleTime
          ? "Facebook post ကို schedule လုပ်ပြီးပါပြီ! ⏰"
          : "Facebook သို့ အောင်မြင်စွာ တင်ပြီးပါပြီ! 🎉"
      );
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message;
      if (errorMessage.includes("publish_actions")) {
        errorMessage = "Token ထုတ်တဲ့အချိန် publish_actions permission ပါသွားလို့ Meta က ပိတ်ထားပါတယ်။\n\nပြန်လုပ်ရန်:\n1. Graph API Explorer ထဲက Permissions list မှာ publish_actions ကို ဖျက်ပါ။\n2. pages_manage_posts, pages_read_engagement, pages_show_list ကိုသာထားပါ။\n3. User or Page နေရာမှာ With You Photo Studio Page ကိုရွေးပြီး Page Access Token အသစ် Generate လုပ်ပါ။\n4. App ထဲက Page Access Token ကို အသစ်နဲ့အစားထိုးပါ။";
      } else if (errorMessage.includes("Unsupported post request") || errorMessage.includes("missing permissions") || errorMessage.includes("(#200)")) {
        errorMessage = "Page Access Token အမှန် မဟုတ်ပါ (သို့) Permission မပြည့်စုံပါ။\n\nကျေးဇူးပြု၍ Graph API Explorer တွင်:\n1. User Token အစား 'Get Page Access Token' ကို ရွေးပါ။\n2. 'pages_manage_posts' နှင့် 'pages_read_engagement' permission များ ထည့်ပါ။\n3. Generate လုပ်ထားသော Token အသစ်ကို ပြန်ထည့်ပါ။";
      }
      setErrorMsg("Facebook သို့ တင်ရာတွင် အခက်အခဲရှိနေပါသည်: " + errorMessage);
    } finally {
      setPosting(false);
      setStatusMsg('');
    }
  };

  const fetchFacebookInsights = async () => {
    setInsightsLoading(true);
    setErrorMsg('');
    setStatusMsg('Sai Lao Facebook ad insights ကိုဆွဲယူပြီး pattern စစ်နေပါသည်...');
    try {
      const response = await fetch('/api/facebook-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'ad_account',
          days: 30,
          limit: 50,
        }),
      });
      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { error: rawText || 'Unexpected Facebook Insights response' };
      }
      if (!response.ok || data.error) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Facebook Insights failed');
      }
      setInsights(data);
      localStorage.setItem('wyp_facebook_insights_summary', JSON.stringify(data));
      setToastMsg('Sai Lao Insights ကို update လုပ်ပြီးပါပြီ။');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Facebook Insights ဆွဲရာတွင် အခက်အခဲရှိနေပါသည်: ${error?.message || 'Unknown error'}`);
    } finally {
      setInsightsLoading(false);
      setStatusMsg('');
    }
  };

  const clearFacebookInsights = () => {
    setInsights(null);
    localStorage.removeItem('wyp_facebook_insights_summary');
    setToastMsg('Facebook Insights ကို Clear လုပ်ပြီးပါပြီ။ မလိုသေးရင် မပေါ်တော့ပါ။');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const buildInsightsBrief = (ideaPrompt?: string) => {
    if (!insights) return;
    const topTopic = formatInsightTopic(insights.topTopics?.[0]?.topic || 'General studio content');
    const topFormat = insights.topFormats?.[0]?.format === 'ad insight' ? 'ယခင်ကြော်ငြာ performance pattern' : (insights.topFormats?.[0]?.format || 'photo');
    const topPost = insights.topPosts?.[0];
    return [
      ideaPrompt ? `ရွေးထားသော Idea:\n${ideaPrompt}` : '',
      'Facebook Insights ကိုအခြေခံပြီး ဒီနေ့တင်ရန် content ရေးပါ။',
      `အလုပ်ဖြစ်ခဲ့တဲ့ topic: ${topTopic}`,
      `သုံးမယ့် pattern: ${topFormat}`,
      insights.recommendations?.length ? `လမ်းညွှန်ချက်များ:\n- ${insights.recommendations.join('\n- ')}` : '',
      topPost?.message ? `ကိုးကားရန် ယခင်အလုပ်ဖြစ်ခဲ့သော content/ad:\n${topPost.message}` : '',
      'ဒီ insight တွေကိုအခြေခံပြီး ထပ်တူမဖြစ်အောင် Fresh angle နဲ့ Facebook post + TikTok/Reels idea ထုတ်ပေးပါ။',
    ].filter(Boolean).join('\n\n');
  };

  const useInsightsAsBrief = () => {
    const brief = buildInsightsBrief();
    if (!brief) return;
    setDescription(brief);
    setContentObjective('Booking inquiry ရစေချင်တယ်');
    setContentTone('နူးညံ့ပြီး Premium ဆန်');
    setToastMsg('Insights brief ကို Content Topic ထဲထည့်ပြီးပါပြီ။ Generate နှိပ်နိုင်ပါပြီ။');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const useInsightIdea = (idea: NonNullable<FacebookInsightsSummary['contentIdeas']>[number], shouldGenerate = false) => {
    const brief = buildInsightsBrief(idea.prompt);
    if (!brief) return;
    setDescription(brief);
    setContentObjective(idea.bestFor.includes('Reels') ? 'Reels/TikTok အတွက် short-video idea လိုချင်တယ်' : 'Booking inquiry ရစေချင်တယ်');
    setContentTone(idea.bestFor.includes('Booking') ? 'တိုတိုရှင်းရှင်းနဲ့ direct' : 'နူးညံ့ပြီး Premium ဆန်');
    setToastMsg(shouldGenerate ? `${idea.title} ကို Generate လုပ်နေပါပြီ။` : 'Idea brief ကို Content Topic ထဲထည့်ပြီးပါပြီ။');
    setTimeout(() => setToastMsg(''), 3000);
    if (shouldGenerate) {
      void handleGenerate(brief);
    }
  };

  const getFallbackInsightIdeas = (): NonNullable<FacebookInsightsSummary['contentIdeas']> => {
    if (!insights) return [];
    return insights.recommendations.slice(0, 3).map((recommendation, index) => ({
      title: ['Facebook Post အဖြစ်ရေးရန်', 'Booking Inquiry Post အဖြစ်ရေးရန်', 'Reels/TikTok Caption အဖြစ်ရေးရန်'][index] || `Idea ${index + 1}`,
      angle: recommendation,
      bestFor: ['Facebook Post', 'Booking CTA', 'Reels / TikTok'][index] || 'Facebook Post',
      prompt: [
        `ဒီ recommendation ကို အခြေခံပြီး copy-ready content ရေးပါ။`,
        recommendation,
        'မြန်မာလိုအဓိကရေးပါ။ စာပိုဒ်တိုတို၊ CTA နူးညံ့၊ copy & paste တင်လို့ရအောင်ရေးပါ။',
      ].join('\n'),
    }));
  };

  const buildGenerationPrompt = (rawNotes = description) => {
    const fallbackTopic = [
      'ဒီနေ့အတွက် With You Photo Studio Facebook/TikTok post တစ်ခုရေးပါ။',
      'Topic မထည့်ထားသောကြောင့် studio brand, monthly trend, Facebook/TikTok audience behavior ကိုအခြေခံပြီး best daily content angle ကိုကိုယ်တိုင်ရွေးပါ။',
      'Fetch Insights မရှိလည်း အလုပ်ဖြစ်စေမယ့် evergreen studio content ဖြစ်ပါစေ။',
    ].join('\n');
    const brief = [
      `Content objective: ${contentObjective}`,
      `Target audience: ${targetAudience}`,
      `Preferred tone: ${contentTone}`,
      `Creator mode: ${creatorMode}`,
      `Monthly trend intelligence: ${monthlyTrendBrief}`,
      `CTA style: ${ctaStyle}`,
      selectedHints.length ? `Extra directions:\n- ${selectedHints.join('\n- ')}` : '',
      [
        'Copy-ready output rules:',
        '- Facebook caption ကို heading/label မပါဘဲ တင်လို့ရတဲ့ final caption အဖြစ်သာရေးပါ။',
        '- မြန်မာလို ၈၀% အနည်းဆုံးရေးပါ။ English term များကို service/marketing လိုအပ်မှသာသုံးပါ။',
        '- First line သည် hook ဖြစ်ရမည်။ နောက်က 4-7 short paragraphs ဖြစ်ရမည်။',
        '- CTA သည် soft ဖြစ်ရမည်။ “ခုပဲ Booking တင်လိုက်ပါ” ကို aggressive မဖြစ်အောင်လိုအပ်မှသာသုံးပါ။',
        '- TikTok caption သည် 4-7 short lines ဖြစ်ပြီး hashtags မထပ်ပါစေနှင့်။',
        '- Facebook alternate versions ၃ ခုထုတ်ပါ: Emotional Storytelling / Booking CTA / Short & Premium.',
        '- Same idea ကိုနှစ်ကြိမ်မထပ်ရေးပါနှင့်။',
      ].join('\n'),
      `Raw topic / notes:\n${rawNotes || fallbackTopic}`,
    ].filter(Boolean).join('\n\n');

    localStorage.setItem('wyp_content_factory_settings', JSON.stringify({
      contentObjective,
      contentTone,
      targetAudience,
      ctaStyle,
      creatorMode,
      monthlyTrendBrief,
    }));

    return brief;
  };

  const toggleHint = (hint: string) => {
    const updated = selectedHints.includes(hint)
      ? selectedHints.filter((item) => item !== hint)
      : [...selectedHints, hint];
    setSelectedHints(updated);
    localStorage.setItem('wyp_content_hints', JSON.stringify(updated));
  };

  const handleGenerate = async (topicOverride?: string) => {
    const effectiveDescription = typeof topicOverride === 'string' ? topicOverride : description;
    const autoTopic = [
      'ဒီနေ့အတွက် With You Photo Studio content တစ်ခုကို AI content creator အနေနဲ့ကိုယ်တိုင် angle ရွေးရေးပါ။',
      monthlyTrendBrief ? `Monthly trend: ${monthlyTrendBrief}` : '',
      'Facebook post + TikTok/Reels caption ကို copy & paste တင်နိုင်အောင်ရေးပါ။',
    ].filter(Boolean).join('\n');
    if (typeof topicOverride === 'string') {
      setDescription(topicOverride);
    } else if (!effectiveDescription && !image) {
      setDescription(autoTopic);
    }
    setLoading(true);
    setResult(null);
    setEditingFacebookCaption(false);
    setFacebookCaptionDraft('');
    setErrorMsg('');
    setStatusMsg('Caption နဲ့ TikTok plan ကို generate လုပ်နေပါသည်...');
    try {
      const data = await generateMarketingContent(buildGenerationPrompt(effectiveDescription || autoTopic), image || undefined);
      const formattedData = normalizeMarketingContent(data);
      setResult(formattedData);
      setFacebookCaptionDraft(formattedData.facebookCaption);
      localStorage.removeItem('wyp_content_draft');
      saveToHistory(formattedData, effectiveDescription || autoTopic);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "အကြောင်းအရာ ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const refineFacebookCaption = async (instruction: string, label: string) => {
    if (!result?.facebookCaption || refiningAction) return;
    setRefiningAction(label);
    setErrorMsg('');
    setStatusMsg(`${label} အတွက် caption ကို ပြန်ညှိနေပါသည်...`);
    try {
      const refinedCaption = await refineMarketingText(result.facebookCaption, instruction, description);
      const nextCaption = formatFacebookCaption(refinedCaption);
      setResult({ ...result, facebookCaption: nextCaption });
      setFacebookCaptionDraft(nextCaption);
      setEditingFacebookCaption(false);
      setToastMsg(`${label} version ကို ပြန်ထုတ်ပြီးပါပြီ!`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "Caption ကို ပြန်ညှိလို့ မရပါဘူး။");
    } finally {
      setRefiningAction('');
      setStatusMsg('');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMsg(`${label} ကို ကူးယူပြီးပါပြီ!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const goToVoiceover = (script: string) => {
    localStorage.setItem('wyp_tts_script', script);
    if (onNavigate) {
      onNavigate(AppTab.VOICEOVER_GEN);
    }
  };

  const exportToScriptToVideo = (content: MarketingContent) => {
    const payload = {
      tiktokVisualScript: content.tiktokVisualScript,
      tiktokSceneBreakdown: content.tiktokSceneBreakdown,
      tiktokAudioStyle: content.tiktokAudioStyle,
      tiktokEditingStyle: content.tiktokEditingStyle,
    };
    localStorage.setItem('wyp_script_to_video_import', JSON.stringify(payload));
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setToastMsg('Script to Video JSON ကူးယူပြီး — wyps-script-to-video app ဖွင့်ပါ (port 3010)');
    setTimeout(() => setToastMsg(''), 4000);
  };

  const exportToCapCutPack = (content: MarketingContent) => {
    const payload = {
      tiktokVisualScript: content.tiktokVisualScript,
      tiktokSceneBreakdown: content.tiktokSceneBreakdown,
      tiktokAudioStyle: content.tiktokAudioStyle,
      tiktokEditingStyle: content.tiktokEditingStyle,
      tiktokCaption: content.tiktokCaption,
    };
    localStorage.setItem('wyp_capcut_pack_import', JSON.stringify(payload));
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setToastMsg('CapCut Pack JSON ကူးယူပြီး — wyps-capcut-pack app ဖွင့်ပါ (port 3020)');
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div className="space-y-6 md:space-y-10 burmese-text pb-10">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-amber-500 text-slate-950 px-6 py-3 rounded-full shadow-2xl font-black text-sm animate-in fade-in slide-in-from-top-4">
          ✨ {toastMsg}
        </div>
      )}

      {(statusMsg || errorMsg) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${errorMsg ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-blue-500/10 border-blue-500/20 text-blue-100'}`}>
          <div className="font-bold">{errorMsg ? 'Action Needed' : 'Working'}</div>
          <p className="mt-1">{errorMsg || statusMsg}</p>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Content <span className="text-amber-500">Factory</span></h1>
          <p className="text-slate-400 font-medium mt-1">Specialist Content Writer ပုံစံနဲ့ caption, hook, TikTok plan ကိုတစ်ခါတည်းရေးပေးရန်</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-colors border border-slate-700"
        >
          {showHistory ? '🔙 အသစ်ရေးမည်' : '📜 History ကြည့်မည်'}
        </button>
      </header>

      {showHistory ? (
        <div className="space-y-6 animate-in fade-in">
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော ပိုစ့်များ</h2>
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500">
              မှတ်တမ်း မရှိသေးပါ။
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {history.map((h) => (
                <div key={h.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] relative group">
                  <button 
                    onClick={() => deleteHistoryItem(h.id)}
                    className="absolute top-4 right-4 w-8 h-8 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                  <div className="text-[10px] text-slate-500 mb-2">{h.date}</div>
                  <div className="mb-4">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">Topic: {h.description || 'Image Upload'}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 max-h-48 overflow-y-auto">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{h.content.facebookCaption}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(h.content.facebookCaption, 'Facebook Caption')}
                    className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    COPY CAPTION
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-10 items-start">
        {/* INPUT BOX */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-8">
          <div className="bg-slate-900/50 border border-slate-800 p-4 sm:p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="mb-6">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 mb-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Specialist Writer Mode</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  ကမ္ဘာကျော် Content Creator တစ်ယောက်လို studio context, monthly trend, Facebook/TikTok behavior, booking intent ကိုစဉ်းစားပြီး copy-ready output ထုတ်ပေးပါမယ်။
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Content Writer ပုံစံ</label>
                  <select
                    value={creatorMode}
                    onChange={(e) => setCreatorMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CREATOR_MODES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">ရည်ရွယ်ချက်</label>
                  <select
                    value={contentObjective}
                    onChange={(e) => setContentObjective(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CONTENT_OBJECTIVES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Target Client</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {TARGET_AUDIENCES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">ရေးသားပုံ</label>
                  <select
                    value={contentTone}
                    onChange={(e) => setContentTone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CONTENT_TONES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">CTA</label>
                  <input
                    value={ctaStyle}
                    onChange={(e) => setCtaStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Message မှာမေးရန် / Booking တင်ရန်..."
                  />
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">ဒီလအတွက် Trend / Direction</div>
                <textarea
                  value={monthlyTrendBrief}
                  onChange={(event) => setMonthlyTrendBrief(event.target.value)}
                  className="mt-3 min-h-[92px] w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-200 outline-none focus:ring-1 focus:ring-sky-400"
                  placeholder="ဒီလအတွက် trend direction..."
                />
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  ဒီနေရာက လစဉ် trend memory ပါ။ ကိုယ့် page/data အရ အချိန်မရွေးပြင်ပြီး ထုတ်သမျှ content ထဲသက်ရောက်စေနိုင်ပါတယ်။
                </p>
              </div>

              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">ရေးချင်တဲ့ Topic / မှတ်ချက်</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ဥပမာ- ဒီနေ့ ရိုက်ထားတဲ့ Sweet 17 / Pre-wedding / Family shoot အကြောင်း, ပုံထဲက mood, outfit, location, client note..."
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm leading-relaxed text-slate-200 resize-none"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Quick Add</label>
                {selectedHints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHints([]);
                      localStorage.setItem('wyp_content_hints', JSON.stringify([]));
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-400"
                  >
                    Clear {selectedHints.length}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {QUICK_HINT_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{group.title}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.hints.map((hint) => {
                        const active = selectedHints.includes(hint);
                        return (
                          <button
                            key={hint}
                            type="button"
                            onClick={() => toggleHint(hint)}
                            className={`px-3 py-2 rounded-full text-[10px] font-black transition-all border ${
                              active
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-900/20'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {hint}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">ကိုးကားပုံ (Auto-compressed)</label>
              {!image ? (
                <label className="w-full h-32 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-all group relative">
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={compressing} />
                  {compressing ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full mb-2" />
                      <span className="text-[9px] font-black text-amber-500 uppercase">Compressing...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">🖼️</span>
                      <span className="text-[9px] font-black text-slate-600 uppercase">ပုံတင်ပြီး content ရေးရန်</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
                  <img src={image} className="w-full h-48 object-cover" />
                  <button onClick={() => { setImage(null); setCompressedImageFile(null); }} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all">✕</button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <button 
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-blue-400 transition-colors"
              >
                <span>⚙️</span> Facebook Page Setup {showTokenInput ? '(Hide)' : '(Setup)'}
              </button>
              {showTokenInput && (
                <div className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Page ID</label>
                    <input
                      type="text"
                      value={fbPageId}
                      onChange={handlePageIdChange}
                      placeholder="e.g. 1234567890"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Page Access Token</label>
                    <input
                      type="password"
                      value={fbToken}
                      onChange={handleTokenChange}
                      placeholder="Paste your Page Access Token here..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-[9px] text-amber-500 leading-relaxed font-medium">
                      ⚠️ အရေးကြီး: <b>User Access Token</b> အသုံးပြု၍ မရပါ။ <b>Page Access Token</b> သာ အသုံးပြုရပါမည်။<br/><br/>
                      <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline text-blue-400">Graph API Explorer</a> တွင် <b>User or Page</b> နေရာ၌ <b>သင့် Page အမည်</b> ကို ရွေးပါ။<br/>
                      ❌ <b>publish_actions</b> permission ကို လုံးဝ မသုံးပါနဲ့ (ဖျက်ပစ်ပါ)။<br/>
                      ✅ <b>pages_manage_posts</b> နှင့် <b>pages_read_engagement</b> ကိုသာ ထည့်သွင်းပြီး Generate လုပ်ပါ။
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Facebook Insights</div>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    Optional ပါ။ မနှိပ်လည်း Specialist Generate လုပ်လို့ရပြီး၊ လိုအပ်မှ insights direction ထုတ်ရန်။
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
                  <button
                    type="button"
                    onClick={fetchFacebookInsights}
                    disabled={insightsLoading}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-black text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {insightsLoading ? 'FETCHING...' : 'FETCH INSIGHTS'}
                  </button>
                  {insights && (
                    <button
                      type="button"
                      onClick={clearFacebookInsights}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-[10px] font-black text-slate-300 hover:border-rose-400/50 hover:text-rose-200"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>
              {insights && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[9px] text-slate-500">Posts analyzed</div>
                    <div className="text-lg font-black text-white">{insights.postsAnalyzed}</div>
                    <div className="mt-1 text-[8px] font-bold text-slate-500">{formatInsightPreset(insights.datePreset)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[9px] text-slate-500">အကောင်းဆုံး Topic</div>
                      <div className="text-xs font-black text-amber-400">{formatInsightTopic(insights.topTopics?.[0]?.topic)}</div>
                    </div>
                  </div>
                  {insights.warning && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] leading-relaxed text-amber-200">
                      {insights.warning}
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">ဒီနေ့အတွက် လမ်းညွှန်ချက်</div>
                    <ul className="space-y-1 text-[10px] leading-relaxed text-slate-300">
                      {insights.recommendations.slice(0, 3).map((item, index) => (
                        <li key={`${item}-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">ဒီနေ့ရေးရန် Idea ၃ ခု</div>
                    <p className="mb-3 text-[10px] leading-relaxed text-slate-400">
                      တစ်ခုရွေးပြီး Generate နှိပ်လိုက်ရင် Facebook caption, TikTok caption, hook တွေကို copy & paste တင်လို့ရအောင်ရေးပေးမယ်။
                    </p>
                    <div className="space-y-3">
                      {(insights.contentIdeas?.length ? insights.contentIdeas : getFallbackInsightIdeas()).slice(0, 3).map((idea, index) => (
                        <div key={`${idea.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Idea {index + 1} • {idea.bestFor}</div>
                              <div className="mt-1 text-xs font-black leading-relaxed text-white">{idea.title}</div>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{idea.angle}</p>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => useInsightIdea(idea, true)}
                              disabled={loading}
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-[9px] font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                            >
                              ဒီ IDEA နဲ့ GENERATE
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(idea.prompt, `Idea ${index + 1} Brief`)}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-black text-slate-300 hover:border-amber-500/40 hover:text-amber-300"
                            >
                              BRIEF COPY
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={useInsightsAsBrief}
                    className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[10px] font-black text-amber-300 hover:bg-amber-500 hover:text-slate-950"
                >
                    INSIGHTS ကို TODAY TOPIC ထဲထည့်မယ်
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={loading || compressing}
              className="w-full py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" />
                  <span>AI က Content ရေးနေပါတယ်...</span>
                </>
              ) : "SPECIALIST GENERATE ✨"}
            </button>
            {!description && !image && !loading && (
              <p className="mt-3 text-center text-[10px] font-bold leading-relaxed text-slate-500">
                Topic/photo မထည့်ထားလည်း Generate နှိပ်နိုင်ပါတယ်။ Monthly Trend + Studio brand context နဲ့ ဒီနေ့တင်ရန် content angle ကို AI ကရွေးပေးပါမယ်။
              </p>
            )}
          </div>
        </div>

        {/* RESULTS AREA */}
        <div className="lg:col-span-7 space-y-6">
          {!result && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">🖋️</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Write something to start the magic</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-96 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              {(result.contentStrategy || result.captionAngle || result.hookOptions?.length) && (
                <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-950 border border-amber-500/20 rounded-[2rem] p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">✍️</div>
                    <div>
                      <h3 className="font-black text-white text-xl tracking-tight">Writer Strategy</h3>
                      <p className="text-xs text-slate-500">Specialist content writer အနေနဲ့ ရွေးထားတဲ့ angle</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2">Angle</div>
                      <p className="text-sm text-slate-200 leading-relaxed">{result.captionAngle || result.contentStrategy}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2">Strategy</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{result.contentStrategy}</p>
                    </div>
                  </div>
                  {!!result.hookOptions?.length && (
                    <div className="mt-4 rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-3">Alternative Hooks</div>
                      <div className="space-y-2">
                        {result.hookOptions.slice(0, 4).map((hook, index) => (
                          <button
                            key={`${hook}-${index}`}
                            onClick={() => copyToClipboard(hook, 'Hook')}
                            className="block w-full text-left rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-300 hover:border-amber-500/40 hover:text-white"
                          >
                            {index + 1}. {hook}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!!result.facebookVariants?.length && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8">
                  <div className="mb-5">
                    <h3 className="font-black text-white text-xl tracking-tight">Facebook Version ၃ မျိုး</h3>
                    <p className="mt-1 text-xs text-slate-500">အကြိုက်ဆုံး version ကိုရွေးပြီး main caption အဖြစ်သုံးနိုင်ပါတယ်။</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {result.facebookVariants.map((variant, index) => (
                      <div key={`${variant.style}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                            {variant.style || `Version ${index + 1}`}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyToClipboard(variant.caption, variant.style || `Version ${index + 1}`)}
                              className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black text-slate-300 hover:border-amber-400 hover:text-white"
                            >
                              COPY
                            </button>
                            <button
                              onClick={() => {
                                setResult({ ...result, facebookCaption: variant.caption });
                                setFacebookCaptionDraft(variant.caption);
                                setToastMsg('ဒီ version ကို main Facebook caption အဖြစ်ထားပြီးပါပြီ။');
                                setTimeout(() => setToastMsg(''), 2500);
                              }}
                              className="rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-slate-950 hover:bg-amber-400"
                            >
                              USE THIS
                            </button>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{variant.caption}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FACEBOOK CARD */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 text-9xl text-blue-500/5 rotate-12 group-hover:scale-110 transition-transform">f</div>
                 <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 font-black">f</div>
                    <h3 className="font-black text-white text-xl uppercase tracking-tight">Facebook Master</h3>
                 </div>
                 <div className="mb-6">
                   <div className="flex items-center justify-end gap-2 mb-3">
                     {editingFacebookCaption ? (
                       <>
                         <button
                           onClick={cancelFacebookCaptionEdit}
                           className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-[10px] font-black transition-colors"
                         >
                           CANCEL
                         </button>
                         <button
                           onClick={saveFacebookCaptionEdit}
                           className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition-colors"
                         >
                           DONE
                         </button>
                       </>
                     ) : (
                       <button
                         onClick={startFacebookCaptionEdit}
                         className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-[10px] font-black transition-colors"
                       >
                         EDIT CAPTION
                       </button>
                     )}
                   </div>
                   {editingFacebookCaption ? (
                     <textarea
                       value={facebookCaptionDraft}
                       onChange={(event) => setFacebookCaptionDraft(event.target.value)}
                       className="w-full min-h-[340px] bg-slate-950/80 p-6 rounded-2xl text-slate-100 text-sm leading-relaxed border border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 outline-none font-medium resize-y"
                     />
                   ) : (
                     <div className="bg-slate-950/80 p-6 rounded-2xl text-slate-200 text-sm leading-relaxed border border-slate-800/50 font-medium whitespace-pre-wrap">
                        {result.facebookCaption}
                     </div>
                   )}
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                   <button 
                    onClick={() => refineFacebookCaption('Make the opening hook stronger and more thumb-stopping, while keeping the rest natural.', 'ပိုဆွဲဆောင်တဲ့ Hook')}
                    disabled={!!refiningAction}
                    className="py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-200 rounded-xl font-black text-[10px] border border-slate-800 transition-colors"
                   >
                     {refiningAction === 'ပိုဆွဲဆောင်တဲ့ Hook' ? 'REFINING...' : 'HOOK ပိုကောင်းအောင်'}
                   </button>
                   <button 
                    onClick={() => refineFacebookCaption('Keep the post warm but make the CTA softer and more natural for booking inquiries.', 'ပိုနူးညံ့တဲ့ CTA')}
                    disabled={!!refiningAction}
                    className="py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-200 rounded-xl font-black text-[10px] border border-slate-800 transition-colors"
                   >
                     {refiningAction === 'ပိုနူးညံ့တဲ့ CTA' ? 'REFINING...' : 'CTA ပိုနူးညံ့အောင်'}
                   </button>
                   <button 
                    onClick={() => refineFacebookCaption('Shorten the caption slightly so it is easier to read quickly, without losing the main message.', 'ပိုတိုတဲ့ Version')}
                    disabled={!!refiningAction}
                    className="py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-200 rounded-xl font-black text-[10px] border border-slate-800 transition-colors"
                   >
                     {refiningAction === 'ပိုတိုတဲ့ Version' ? 'REFINING...' : 'SHORTER VERSION'}
                   </button>
                 </div>
                 <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                   <div className="flex flex-col md:flex-row md:items-end gap-3">
                     <div className="flex-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                         Facebook Schedule
                       </label>
                       <input
                         type="datetime-local"
                         value={fbScheduleTime}
                         min={getFacebookScheduleMinValue()}
                         max={getFacebookScheduleMaxValue()}
                         onChange={(e) => setFbScheduleTime(e.target.value)}
                         className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                       />
                     </div>
                     {fbScheduleTime && (
                       <button
                         onClick={() => setFbScheduleTime('')}
                         className="px-4 py-3 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                       >
                         CLEAR
                       </button>
                     )}
                   </div>
                   <p className="mt-2 text-[9px] text-slate-500 leading-relaxed">
                     မရွေးထားရင် Facebook ပေါ် တိုက်ရိုက်တင်မယ်။ ရွေးထားရင် အနည်းဆုံး 10 မိနစ်အနာဂတ်မှာ Scheduled Post အဖြစ်တင်မယ်။
                   </p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <button
                    onClick={() => copyToClipboard(result.facebookCaption, "FB Caption")}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs transition-all border border-slate-700"
                   >
                     COPY FB CAPTION
                   </button>
                   <button
                    onClick={() => {
                      copyToClipboard(result.facebookCaption, "Messenger");
                      window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer');
                    }}
                    className="flex-1 py-4 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-black text-xs transition-all border border-indigo-600 flex items-center justify-center gap-1.5"
                   >
                     💬 SHARE VIA MESSENGER
                   </button>
                   <button
                    onClick={postToFacebook}
                    disabled={posting || !compressedImageFile}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                   >
                     {posting
                       ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                       : fbScheduleTime
                         ? "⏰ SCHEDULE FACEBOOK"
                         : "🚀 POST TO FACEBOOK"}
                   </button>
                 </div>
                 {!compressedImageFile && (
                   <p className="text-[9px] text-slate-500 mt-3 text-center">Facebook သို့ တိုက်ရိုက်တင်ရန် ဘယ်ဘက်တွင် ပုံရွေးချယ်ပေးပါ။</p>
                 )}
              </div>

              {/* TIKTOK CARD */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 text-9xl text-pink-500/5 -rotate-12 group-hover:scale-110 transition-transform">♪</div>
                 <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="w-10 h-10 bg-pink-600/10 rounded-xl flex items-center justify-center text-pink-500 text-2xl">♪</div>
                    <h3 className="font-black text-white text-xl uppercase tracking-tight">TikTok Viral Blueprint</h3>
                 </div>
                 
                 <div className="space-y-6 mb-8 relative z-10">
                    {/* Visual Section */}
                    <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">1. Visual Script (ဘာရိုက်မလဲ)</span>
                        <div className="flex gap-4">
                          <button onClick={() => goToVoiceover(result.tiktokVisualScript)} className="text-[10px] font-black text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                            <span>🎙️</span> GENERATE VOICEOVER
                          </button>
                          <button type="button" onClick={() => exportToCapCutPack(result)} className="text-[10px] font-black text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1">
                            <span>📦</span> CAPCUT PACK
                          </button>
                          <button type="button" onClick={() => exportToScriptToVideo(result)} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                            <span>🎬</span> SCRIPT TO VIDEO
                          </button>
                          <button onClick={() => copyToClipboard(result.tiktokVisualScript, "TikTok Script")} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors">COPY SCRIPT</button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic">"{result.tiktokVisualScript}"</p>
                    </div>

                    {/* Scene Breakdown */}
                    <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                      <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-4">2. Scene Breakdown (အဆင့်ဆင့် ရိုက်ကူးရန်)</span>
                      <div className="space-y-3">
                        {result.tiktokSceneBreakdown.map((scene, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="text-pink-500 font-black text-xs">{i + 1}.</span>
                            <p className="text-xs text-slate-300">{scene}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Style Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Audio Style</span>
                        <p className="text-xs text-slate-400">{result.tiktokAudioStyle}</p>
                      </div>
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-2">Editing Style</span>
                        <p className="text-xs text-slate-400">{result.tiktokEditingStyle}</p>
                      </div>
                    </div>

                    {/* CapCut Checklist */}
                    <div className="bg-gradient-to-br from-emerald-500/10 via-slate-950/70 to-slate-950 p-5 rounded-2xl border border-emerald-500/20">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">CapCut Edit Checklist</span>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                            CapCut ထဲမှာ တစ်ဆင့်ချင်းလိုက်လုပ်ရန်။ Photo To Reel မသုံးဘဲ manual edit အတွက်ပါ။
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(buildCapCutChecklist(result), 'CapCut Checklist')}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-[10px] font-black text-slate-950 hover:bg-emerald-400"
                        >
                          COPY CHECKLIST
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">1. Project Setup</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">9:16 project ဖွင့်၊ photo/video တွေကို scene order အတိုင်း import လုပ်၊ duration ကို 10s-20s အတွင်းချိန်ပါ။</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">2. Scene-by-scene Edit</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">Scene Breakdown အတိုင်း media ရွေးပြီး photo ဆို slow zoom/pan, video ဆို best moment ကို trim လုပ်ပါ။ စာသားက 1 line တိုတိုပဲထားပါ။</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">3. Music + Export</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">Music beat နဲ့ cut ချိန်ပြီး 1080p export လုပ်ပါ။ မတင်ခင် မျက်နှာ/စာသား မဖြတ်သွားတာစစ်ပါ။</p>
                        </div>
                      </div>
                    </div>

                    {/* Caption Section */}
                    <div className="bg-slate-950/80 p-6 rounded-2xl border border-amber-500/10 shadow-inner">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">3. Post Caption (Copy & Paste)</span>
                      </div>
                      {(() => {
                        const tiktokPost = splitTikTokCaptionAndTags(result.tiktokCaption, result.hashtags);
                        return (
                          <>
                            <p className="text-sm text-slate-100 font-bold mb-4">{tiktokPost.caption}</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                              {tiktokPost.hashtags.map((tag, i) => (
                                <span key={`${tag}-${i}`} className="text-[10px] font-black text-amber-400 bg-amber-500/5 px-2 py-1 rounded-md">#{tag}</span>
                              ))}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(`${tiktokPost.caption}\n\n${tiktokPost.hashtags.map(t => `#${t}`).join(' ')}`, "TikTok Post")}
                              className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-pink-900/20"
                            >
                              COPY TIKTOK CAPTION + TAGS
                            </button>
                          </>
                        );
                      })()}
                    </div>
                 </div>

                 <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                   <span className="text-blue-400">💡</span>
                   <p className="text-[10px] text-slate-400 leading-relaxed font-medium"><strong>Engagement Pro:</strong> {result.engagementTips}</p>
                 </div>
              </div>
              {!!result.qualityChecklist?.length && (
                <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3">Quality Check</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.qualityChecklist.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex gap-2 rounded-xl bg-slate-950/50 border border-slate-800 px-3 py-2 text-xs text-slate-300">
                        <span className="text-emerald-400">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Feedback 
                contentId={`content-${Date.now()}`} 
                contentType="marketing" 
              />
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;
