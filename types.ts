
export enum AppTab {
  DASHBOARD = 'dashboard',
  CONTENT_GEN = 'content-gen',
  SALES_SCRIPTS = 'sales-scripts',
  STRATEGY = 'strategy',
  PRICING = 'pricing',
  HASHTAGS = 'hashtags',
  PORTFOLIO_BIO = 'portfolio-bio',
  REVIEW_REPLY = 'review-reply',
  SEASONAL_CAMPAIGN = 'seasonal-campaign',
  SEVEN_DAY_PLAN = 'seven-day-plan',
  ENGAGEMENT_POSTS = 'engagement-posts',
  CLIENT_GUIDES = 'client-guides',
  PREMIUM_PROMOTIONS = 'premium-promotions',
  AUTO_REPLY = 'auto-reply',
  STRATEGY_PARTNER = 'strategy-partner',
  CONTRACT_GEN = 'contract-gen',
  CONCEPT_GEN = 'concept-gen',
  SAVED_LIBRARY = 'saved-library',
  COMPETITOR_ANALYSIS = 'competitor-analysis',
  VOICEOVER_GEN = 'voiceover-gen',
  MARKETING_AUDIT = 'marketing-audit'
}

export interface EngagementPost {
  type: string;
  hook: string;
  caption: string;
  visualIdea: string;
}

export interface DailyContent {
  day: string;
  theme: string;
  visualIdea: string;
  caption: string;
}

export interface ClientGuide {
  title: string;
  intro: string;
  tips: string[];
  checklist: string[];
  outro: string;
}

export interface PremiumPromotion {
  title: string;
  strategy: string;
  valueAdd: string;
  caption: string;
  terms: string[];
}

export interface AutoReply {
  category: string;
  faqs: {
    question: string;
    answer: string;
  }[];
}

export interface MarketingContent {
  facebookCaption: string;
  tiktokVisualScript: string;
  tiktokCaption: string;
  tiktokAudioStyle: string;
  tiktokEditingStyle: string;
  tiktokSceneBreakdown: string[];
  hashtags: string[];
  engagementTips: string;
}

export interface DailyPlan {
  title: string;
  fbIdea: string;
  tiktokHook: string;
  tiktokVisualIdea: string;
  tiktokCaption: string;
  messengerTip: string;
}

export interface SalesScript {
  scenario: string;
  script: string;
  proTip: string;
}

export interface MarketTrend {
  category: string;
  popularity: number;
  description: string;
}
