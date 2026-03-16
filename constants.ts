import { AppTab } from './types';

export const MENU_GROUPS = [
  {
    title: 'Main',
    items: [
      { id: AppTab.DASHBOARD, label: 'ပင်မစာမျက်နှာ', icon: '🏠' },
    ]
  },
  {
    title: 'Content Creation',
    items: [
      { id: AppTab.CONTENT_GEN, label: 'ပိုစ်တ် ရေးပေးရန်', icon: '✍️' },
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
      { id: AppTab.STRATEGY_PARTNER, label: 'Strategy Partner AI', icon: '🧠' },
      { id: AppTab.CONCEPT_GEN, label: 'Moodboard & Concept', icon: '✨' },
      { id: AppTab.STRATEGY, label: 'လုပ်ငန်းတိုးချဲ့ရန်', icon: '📈' },
      { id: AppTab.PRICING, label: 'စျေးနှုန်း သတ်မှတ်ချက်', icon: '💰' },
      { id: AppTab.HASHTAGS, label: 'Hashtag Strategy', icon: '#️⃣' },
      { id: AppTab.PORTFOLIO_BIO, label: 'Portfolio Bio', icon: '👤' },
    ]
  }
];
