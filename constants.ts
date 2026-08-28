import { AppTab } from './types';

export const APP_VERSION = '1.7.0';

export type SidebarMenuItem = {
  id: AppTab;
  label: string;
  icon: string;
  /** Highlight in nav (e.g. primary daily workflow). */
  featured?: boolean;
  subtitle?: string;
};

export type SidebarMenuGroup = {
  title: string;
  items: SidebarMenuItem[];
};

export const MENU_GROUPS: SidebarMenuGroup[] = [
  {
    title: 'Daily Workflow',
    items: [
      { id: AppTab.DASHBOARD, label: 'ပင်မစာမျက်နှာ', icon: '🏠', subtitle: 'ဒီနေ့လုပ်ရန် အဓိကနေရာ' },
      { id: AppTab.CONTENT_GEN, label: 'ပိုစ်တ် ရေးပေးရန်', icon: '✍️', subtitle: 'Facebook / TikTok content' },
      { id: AppTab.POS_BOOKING_TRACKER, label: 'POS Booking Tracker', icon: '🏪', subtitle: 'Booking / shoot / follow-up' },
      { id: AppTab.CLIENT_MESSAGE_CENTER, label: 'Client Message Center', icon: '💬', subtitle: 'Reminder / follow-up / review / reply' },
    ]
  },
  {
    title: 'Business Control',
    items: [
      { id: AppTab.SAVED_LIBRARY, label: 'Saved Library', icon: '💾', subtitle: 'Generate ထားတာတွေ ပြန်သုံးရန်' },
      { id: AppTab.CLIENT_TIMELINE, label: 'Client Timeline', icon: '🧭', subtitle: 'Client history / next step' },
      { id: AppTab.CONTENT_APPROVAL, label: 'Content Approval', icon: '✅', subtitle: 'Draft / ready / scheduled / posted' },
      { id: AppTab.PRICING, label: 'စျေးနှုန်း သတ်မှတ်ချက်', icon: '💰', subtitle: 'Package price စစ်ရန်' },
    ]
  },
  {
    title: 'Client Messages',
    items: [
      { id: AppTab.CLIENT_GUIDES, label: 'Client Guides', icon: '📖', subtitle: 'Client ကိုပို့ရန် guide' },
      { id: AppTab.CONTRACT_GEN, label: 'Agreement / Contract', icon: '📝', subtitle: 'စာချုပ် / agreement' },
    ]
  },
  {
    title: 'System',
    items: [
      { id: AppTab.APP_HEALTH, label: 'App Health Check', icon: '🩺', subtitle: 'API / Firebase / Facebook စစ်ရန်' },
      { id: AppTab.TOKEN_MANAGER, label: 'Token Manager', icon: '🔐', subtitle: 'Facebook token expiry စစ်ရန်' },
    ]
  },
  {
    title: 'More Tools',
    items: [
      { id: AppTab.VOICEOVER_GEN, label: 'Voiceover Generator', icon: '🎙️', subtitle: 'အသံဖိုင်ထုတ်ရန်' },
      { id: AppTab.MARKETING_AUDIT, label: 'Marketing Audit', icon: '📊', subtitle: 'Content topic ထုတ်ရန်' },
      { id: AppTab.STRATEGY_PARTNER, label: 'Strategy Partner AI', icon: '🧠', subtitle: 'General / business consultant' },
      { id: AppTab.SEVEN_DAY_PLAN, label: '7-Day Plan', icon: '📅', subtitle: 'အပတ်စဉ် content plan' },
      { id: AppTab.ENGAGEMENT_POSTS, label: 'Engagement Boost', icon: '🔥', subtitle: 'Engagement post idea' },
      { id: AppTab.SEASONAL_CAMPAIGN, label: 'Seasonal Plan', icon: '🎉', subtitle: 'ရာသီအလိုက် campaign' },
      { id: AppTab.PREMIUM_PROMOTIONS, label: 'Premium Promos', icon: '🎁', subtitle: 'Promotion copy' },
      { id: AppTab.COMPETITOR_ANALYSIS, label: 'Competitor Analysis', icon: '🔭', subtitle: 'Competitor idea စစ်ရန်' },
      { id: AppTab.CONCEPT_GEN, label: 'Moodboard & Concept', icon: '✨', subtitle: 'Moodboard idea' },
      { id: AppTab.PORTFOLIO_BIO, label: 'Portfolio Bio', icon: '👤', subtitle: 'Bio copy ရေးရန်' },
    ]
  }
];

export const PRICING = {
  'gemini-2.5-pro': { input: 1.25 / 1000000, output: 10.0 / 1000000 },
  'gemini-2.5-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
  'gemini-2.5-flash-preview-tts': { input: 0.1 / 1000000, output: 0.1 / 1000000 },
  'gemini-1.5-pro': { input: 3.5 / 1000000, output: 10.5 / 1000000 },
  'gemini-1.5-flash': { input: 0.075 / 1000000, output: 0.3 / 1000000 },
};

export const DAILY_BUDGET = 5.0;

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}
