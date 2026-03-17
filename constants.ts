import { AppTab } from './types';

export const MENU_GROUPS = [
  {
    title: 'Main',
    items: [
      { id: AppTab.DASHBOARD, label: 'ပင်မစာမျက်နှာ', icon: '🏠' },
    ]
  },
  {
    title: 'My Workspace',
    items: [
      { id: AppTab.SAVED_LIBRARY, label: 'Saved Library', icon: '💾' },
    ]
  },
  {
    title: 'Content Creation',
    items: [
      { id: AppTab.CONTENT_GEN, label: 'ပိုစ်တ် ရေးပေးရန်', icon: '✍️' },
      { id: AppTab.VOICEOVER_GEN, label: 'Voiceover Generator', icon: '🎙️' },
      { id: AppTab.SEVEN_DAY_PLAN, label: '7-Day Plan', icon: '📅' },
      { id: AppTab.ENGAGEMENT_POSTS, label: 'Engagement Boost', icon: '🔥' },
      { id: AppTab.SEASONAL_CAMPAIGN, label: 'Seasonal Plan', icon: '🎉' },
    ]
  },
  {
    title: 'Customer Experience',
    items: [
      { id: AppTab.CONTRACT_GEN, label: 'Agreement / Contract', icon: '📝' },
      { id: AppTab.CLIENT_GUIDES, label: 'Client Guides', icon: '📖' },
      { id: AppTab.PREMIUM_PROMOTIONS, label: 'Premium Promos', icon: '🎁' },
      { id: AppTab.AUTO_REPLY, label: 'Auto-Reply Builder', icon: '🤖' },
      { id: AppTab.SALES_SCRIPTS, label: 'Messenger Scripts', icon: '💬' },
      { id: AppTab.REVIEW_REPLY, label: 'Review Reply', icon: '💬' },
    ]
  },
  {
    title: 'Strategy & Brand',
    items: [
      { id: AppTab.MARKETING_AUDIT, label: 'Marketing Audit', icon: '📊' },
      { id: AppTab.STRATEGY_PARTNER, label: 'Strategy Partner AI', icon: '🧠' },
      { id: AppTab.STRATEGY, label: 'Daily Strategic Plan', icon: '📅' },
      { id: AppTab.COMPETITOR_ANALYSIS, label: 'Competitor Analysis', icon: '🔭' },
      { id: AppTab.CONCEPT_GEN, label: 'Moodboard & Concept', icon: '✨' },
      { id: AppTab.PRICING, label: 'စျေးနှုန်း သတ်မှတ်ချက်', icon: '💰' },
      { id: AppTab.PORTFOLIO_BIO, label: 'Portfolio Bio', icon: '👤' },
    ]
  }
];

export const PRICING = {
  'gemini-3.1-pro-preview': { input: 3.5 / 1000000, output: 10.5 / 1000000 },
  'gemini-3-flash-preview': { input: 0.075 / 1000000, output: 0.3 / 1000000 },
  'gemini-2.5-flash-preview-tts': { input: 0.1 / 1000000, output: 0.1 / 1000000 }, // Estimated
  'gemini-1.5-pro': { input: 3.5 / 1000000, output: 10.5 / 1000000 },
  'gemini-1.5-flash': { input: 0.075 / 1000000, output: 0.3 / 1000000 },
};

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}
