import { AppTab } from './types';

export const GENERATED_HISTORY_KEY = 'wyps_generated_history_v2';

export type GeneratedHistoryType =
  | 'Content'
  | 'Reminder'
  | 'Follow-up'
  | 'Client Guide'
  | 'Promotion'
  | 'Engagement'
  | '7-Day Plan'
  | 'Other';

export type GeneratedHistoryItem = {
  id: string;
  type: GeneratedHistoryType;
  title: string;
  subtitle: string;
  content: string;
  tab: AppTab;
  createdAt: string;
  sourceKey?: string;
  legacyId?: string;
};

type SaveInput = Omit<GeneratedHistoryItem, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

const safeJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

const dateValue = (value: string) => {
  const numberValue = new Date(value || 0).getTime();
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const formatMarketingContent = (result: any) => [
  result?.facebookCaption ? `Facebook Caption\n${result.facebookCaption}` : '',
  result?.tiktokVisualScript ? `\nTikTok / Reels Script\n${result.tiktokVisualScript}` : '',
  result?.tiktokCaption ? `\nTikTok Caption\n${result.tiktokCaption}` : '',
  Array.isArray(result?.hashtags) && result.hashtags.length ? `\nHashtags\n${result.hashtags.map((tag: string) => `#${String(tag).replace(/^#/, '')}`).join(' ')}` : '',
].filter(Boolean).join('\n\n').trim() || normalizeText(result);

export const formatGuide = (guide: any) => [
  guide?.title,
  guide?.intro,
  Array.isArray(guide?.tips) ? `အကြံပြုချက်များ\n${guide.tips.map((item: string) => `- ${item}`).join('\n')}` : '',
  Array.isArray(guide?.checklist) ? `Checklist\n${guide.checklist.map((item: string) => `- ${item}`).join('\n')}` : '',
  guide?.outro,
].filter(Boolean).join('\n\n');

export const formatPromotion = (promo: any) => [
  promo?.title,
  promo?.caption,
  promo?.valueAdd ? `Value Add\n${promo.valueAdd}` : '',
  promo?.strategy ? `Strategy\n${promo.strategy}` : '',
  Array.isArray(promo?.terms) ? `Terms\n${promo.terms.map((item: string) => `- ${item}`).join('\n')}` : '',
].filter(Boolean).join('\n\n');

export const formatEngagementPost = (post: any) => [
  post?.type,
  post?.hook ? `Hook\n${post.hook}` : '',
  post?.caption ? `Caption\n${post.caption}` : '',
  post?.visualIdea ? `Visual Idea\n${post.visualIdea}` : '',
].filter(Boolean).join('\n\n');

export const formatSevenDayPlan = (plan: any[]) => (
  Array.isArray(plan)
    ? plan.map((day, index) => [
      `${index + 1}. ${day.day || `Day ${index + 1}`}`,
      day.theme ? `Theme: ${day.theme}` : '',
      day.visualIdea ? `Visual: ${day.visualIdea}` : '',
      day.caption ? `Caption:\n${day.caption}` : '',
    ].filter(Boolean).join('\n')).join('\n\n')
    : normalizeText(plan)
);

export const saveGeneratedHistory = (item: SaveInput) => {
  const current = safeJson<GeneratedHistoryItem[]>(GENERATED_HISTORY_KEY, []);
  const nextItem: GeneratedHistoryItem = {
    ...item,
    id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: item.createdAt || new Date().toLocaleString(),
  };
  const next = [nextItem, ...current.filter((existing) => existing.id !== nextItem.id)]
    .filter((entry) => entry.content?.trim())
    .slice(0, 80);
  localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('wyps_generated_history_updated', { detail: nextItem }));
  return nextItem;
};

export const readGeneratedHistory = (): GeneratedHistoryItem[] => {
  const unified = safeJson<GeneratedHistoryItem[]>(GENERATED_HISTORY_KEY, []);
  const items: GeneratedHistoryItem[] = [...unified.map((item) => ({ ...item, sourceKey: item.sourceKey || GENERATED_HISTORY_KEY }))];

  safeJson<any[]>('wyp_content_history', []).forEach((item) => {
    items.push({
      id: `legacy-content-${item.id}`,
      type: 'Content',
      title: item.description || item.topic || 'Facebook content',
      subtitle: 'Content Factory history',
      content: formatMarketingContent(item.content || item.result),
      tab: AppTab.CONTENT_GEN,
      createdAt: item.date || '',
      sourceKey: 'wyp_content_history',
      legacyId: item.id,
    });
  });

  safeJson<any[]>('wyps_generated_history_v1', []).forEach((item) => {
    items.push({
      id: `legacy-pos-${item.id}`,
      type: item.type === 'Content' ? 'Content' : item.type === 'Reminder' ? 'Reminder' : 'Follow-up',
      title: item.title || item.type || 'Generated message',
      subtitle: item.type === 'Content' ? 'POS မှ Post idea' : 'Client follow-up message',
      content: item.content || '',
      tab: item.type === 'Content' ? AppTab.CONTENT_GEN : AppTab.POS_BOOKING_TRACKER,
      createdAt: item.createdAt || '',
      sourceKey: 'wyps_generated_history_v1',
      legacyId: item.id,
    });
  });

  safeJson<any[]>('wyp_guide_history', []).forEach((item) => {
    items.push({
      id: `legacy-guide-${item.id}`,
      type: 'Client Guide',
      title: item.topic || item.content?.title || 'Client guide',
      subtitle: 'Client guide history',
      content: formatGuide(item.content),
      tab: AppTab.CLIENT_GUIDES,
      createdAt: item.date || '',
      sourceKey: 'wyp_guide_history',
      legacyId: item.id,
    });
  });

  safeJson<any[]>('wyp_promo_history', []).forEach((item) => {
    items.push({
      id: `legacy-promo-${item.id}`,
      type: 'Promotion',
      title: item.occasion || item.content?.title || 'Promotion',
      subtitle: 'Premium promotion history',
      content: formatPromotion(item.content),
      tab: AppTab.PREMIUM_PROMOTIONS,
      createdAt: item.date || '',
      sourceKey: 'wyp_promo_history',
      legacyId: item.id,
    });
  });

  safeJson<any[]>('wyp_engagement_history', []).forEach((item) => {
    items.push({
      id: `legacy-engagement-${item.id}`,
      type: 'Engagement',
      title: item.topic || item.type || 'Engagement post',
      subtitle: item.type || 'Engagement history',
      content: formatEngagementPost(item.content),
      tab: AppTab.ENGAGEMENT_POSTS,
      createdAt: item.date || '',
      sourceKey: 'wyp_engagement_history',
      legacyId: item.id,
    });
  });

  safeJson<any[]>('wyp_7day_history', []).forEach((item) => {
    items.push({
      id: `legacy-plan-${item.id}`,
      type: '7-Day Plan',
      title: item.focusArea || '7-Day Plan',
      subtitle: 'တစ်ပတ်စာ content plan',
      content: formatSevenDayPlan(item.plan),
      tab: AppTab.SEVEN_DAY_PLAN,
      createdAt: item.date || '',
      sourceKey: 'wyp_7day_history',
      legacyId: item.id,
    });
  });

  const seen = new Set<string>();
  return items
    .filter((item) => item.content?.trim())
    .filter((item) => {
      const key = `${item.type}:${item.title}:${item.content.slice(0, 160)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
};

export const deleteGeneratedHistory = (item: GeneratedHistoryItem) => {
  const sourceKey = item.sourceKey || GENERATED_HISTORY_KEY;
  const targetId = item.legacyId || item.id;
  const current = safeJson<any[]>(sourceKey, []);
  const next = current.filter((entry) => String(entry.id) !== String(targetId));
  localStorage.setItem(sourceKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('wyps_generated_history_updated'));
};

export const clearGeneratedHistory = () => {
  [
    GENERATED_HISTORY_KEY,
    'wyp_content_history',
    'wyps_generated_history_v1',
    'wyp_guide_history',
    'wyp_promo_history',
    'wyp_engagement_history',
    'wyp_7day_history',
  ].forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent('wyps_generated_history_updated'));
};
