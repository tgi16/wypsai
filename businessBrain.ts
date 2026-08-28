import { POS_PACKAGE_CACHE_KEY, POS_PRICING_CONTEXT_KEY } from './pricingCatalog';

export type BusinessBrainMode = 'strategy' | 'content';

export type BusinessBrainSourceId = 'bookings' | 'approvals' | 'history' | 'insights' | 'packages' | 'usage';

export type BusinessBrainSource = {
  id: BusinessBrainSourceId;
  label: string;
  available: boolean;
  detail: string;
};

export type BusinessBrainOrigin = 'device' | 'cloud';

export type BusinessBrainSnapshot = {
  generatedAt: string;
  origin: BusinessBrainOrigin;
  cloudAgeHours?: number;
  sourceCount: number;
  totalSources: number;
  sources: BusinessBrainSource[];
  metrics: {
    bookings: number;
    upcomingSevenDays: number;
    overdueOpen: number;
    outstandingBalance: number;
    pendingContent: number;
    postedContent: number;
  };
  priorities: string[];
  contentSignals: string[];
  suggestions: string[];
  context: string;
};

type StorageReader = (key: string) => string | null;

export const BUSINESS_BRAIN_CLOUD_KEY = 'wyps_business_brain_cloud_v1';
export const BUSINESS_BRAIN_UPDATED_EVENT = 'wyps_business_brain_updated';
const MAX_CLOUD_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type BrainBooking = {
  id?: string;
  source?: string;
  clientName?: string;
  packageName?: string;
  date?: string;
  time?: string;
  status?: string;
  workStatus?: string;
  deposit?: number;
  balance?: number;
};

const KEYS = {
  bookings: 'wyps_pos_bookings_cache_v1',
  reminders: 'wyps_pos_reminder_status_v1',
  approvals: 'wyps_content_approval_board_v1',
  generatedHistory: 'wyps_generated_history_v2',
  contentHistory: 'wyp_content_history',
  insights: 'wyp_facebook_insights_summary',
  usage: 'gemini_usage_v2',
} as const;

const defaultReader: StorageReader = (key) => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
};

const readJson = <T,>(read: StorageReader, key: string, fallback: T): T => {
  try {
    const raw = read(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const cleanText = (value: unknown, maxLength = 160) => String(value || '')
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .slice(0, maxLength);

const money = (value: number) => `${Math.round(value || 0).toLocaleString('en-US')} MMK`;

const dateValue = (value: unknown) => {
  const parsed = new Date(`${String(value || '')}T00:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const statusText = (booking: BrainBooking) => `${booking.status || ''} ${booking.workStatus || ''}`.toLowerCase();

const isComplete = (booking: BrainBooking) => /completed|complete|done|closed|finished/.test(statusText(booking));

const countBy = (values: string[]) => {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

const firstLine = (value: unknown) => cleanText(String(value || '').split(/\n+/).find((line) => line.trim()) || '', 130);

const extractPackageRows = (read: StorageReader) => {
  const cache = readJson<any>(read, POS_PACKAGE_CACHE_KEY, null);
  const packages = Array.isArray(cache) ? cache : Array.isArray(cache?.packages) ? cache.packages : [];
  if (packages.length) {
    return packages.slice(0, 60).map((item: any) => ({
      name: cleanText(item?.name, 90),
      category: cleanText(item?.category, 60),
      price: Number(item?.price) || 0,
    })).filter((item: any) => item.name);
  }

  const pricingContext = read(POS_PRICING_CONTEXT_KEY) || '';
  return pricingContext.split('\n').filter((line) => line.trim().startsWith('- ')).slice(0, 40).map((line) => ({
    name: cleanText(line.replace(/^[-\s]+/, ''), 130),
    category: '',
    price: 0,
  }));
};

export const buildBusinessBrainSnapshot = (
  mode: BusinessBrainMode = 'strategy',
  read: StorageReader = defaultReader,
  now = new Date(),
  allowCloudFallback = true,
): BusinessBrainSnapshot => {
  const bookings = readJson<BrainBooking[]>(read, KEYS.bookings, []);
  const reminders = readJson<Record<string, boolean>>(read, KEYS.reminders, {});
  const approvals = readJson<any[]>(read, KEYS.approvals, []);
  const generated = readJson<any[]>(read, KEYS.generatedHistory, []);
  const contentHistory = readJson<any[]>(read, KEYS.contentHistory, []);
  const insights = readJson<any>(read, KEYS.insights, null);
  const packages = extractPackageRows(read);
  const usageByDay = readJson<Record<string, any>>(read, KEYS.usage, {});

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayValue = today.getTime();
  const inSevenDays = todayValue + 7 * 24 * 60 * 60 * 1000;
  const openBookings = bookings.filter((booking) => !isComplete(booking));
  const upcoming = openBookings.filter((booking) => {
    const value = dateValue(booking.date);
    return value !== null && value >= todayValue && value <= inSevenDays;
  });
  const overdue = openBookings.filter((booking) => {
    const value = dateValue(booking.date);
    return value !== null && value < todayValue;
  });
  const outstandingBalance = openBookings.reduce((sum, booking) => sum + Math.max(0, Number(booking.balance) || 0), 0);
  const approvalCounts = countBy(approvals.map((item) => cleanText(item?.status || 'Draft', 30)));
  const pendingContent = approvals.filter((item) => ['draft', 'ready'].includes(String(item?.status || '').toLowerCase())).length;
  const postedContent = approvals.filter((item) => String(item?.status || '').toLowerCase() === 'posted').length;
  const packageMix = countBy(bookings.map((booking) => cleanText(booking.packageName, 80))).slice(0, 5);
  const recentContent = [
    ...contentHistory.map((item) => ({
      title: item?.description || item?.topic,
      opening: firstLine(item?.content?.facebookCaption || item?.result?.facebookCaption),
    })),
    ...generated.filter((item) => item?.type === 'Content').map((item) => ({
      title: item?.title,
      opening: firstLine(String(item?.content || '').replace(/^Facebook Caption\s*/i, '')),
    })),
  ].filter((item) => item.title || item.opening).slice(0, 8);

  const insightTopics = Array.isArray(insights?.topTopics)
    ? insights.topTopics.slice(0, 5).map((item: any) => cleanText(item?.topic, 80)).filter(Boolean)
    : [];
  const insightRecommendations = Array.isArray(insights?.recommendations)
    ? insights.recommendations.slice(0, 4).map((item: any) => cleanText(item, 160)).filter(Boolean)
    : [];
  const insightIdeas = Array.isArray(insights?.contentIdeas)
    ? insights.contentIdeas.slice(0, 4).map((item: any) => cleanText(`${item?.title || ''}: ${item?.angle || ''}`, 160)).filter(Boolean)
    : [];

  const dayKey = now.toLocaleDateString('en-CA');
  const todayUsage = usageByDay[dayKey] || {};
  const sources: BusinessBrainSource[] = [
    { id: 'bookings', label: 'POS Bookings', available: read(KEYS.bookings) !== null, detail: bookings.length ? `${bookings.length} bookings cached` : 'POS cache မရှိသေးပါ' },
    { id: 'approvals', label: 'Content Approval', available: read(KEYS.approvals) !== null, detail: approvals.length ? `${approvals.length} items` : 'Approval data မရှိသေးပါ' },
    { id: 'history', label: 'Content History', available: read(KEYS.generatedHistory) !== null || read(KEYS.contentHistory) !== null, detail: recentContent.length ? `${recentContent.length} recent items` : 'Generated history မရှိသေးပါ' },
    { id: 'insights', label: 'Facebook Insights', available: Boolean(insights), detail: insights ? `${insightTopics.length || insightIdeas.length} signals` : 'Insights sync မလုပ်ရသေးပါ' },
    { id: 'packages', label: 'Package Catalog', available: read(POS_PACKAGE_CACHE_KEY) !== null || read(POS_PRICING_CONTEXT_KEY) !== null, detail: packages.length ? `${packages.length} package rows` : 'Package catalog မရှိသေးပါ' },
    { id: 'usage', label: 'AI Usage', available: read(KEYS.usage) !== null, detail: read(KEYS.usage) !== null ? `${Number(todayUsage.count) || 0} calls today` : 'Usage tracker မစရသေးပါ' },
  ];
  const sourceCount = sources.filter((source) => source.available).length;

  const priorities: string[] = [];
  if (upcoming.length) priorities.push(`လာမည့် ၇ ရက်အတွင်း booking/shoot ${upcoming.length} ခုကို confirm နှင့် reminder စစ်ရန်`);
  if (overdue.length) priorities.push(`ရက်ကျော်နေပြီး မပြီးသေးသော booking/work ${overdue.length} ခု follow-up လုပ်ရန်`);
  if (outstandingBalance > 0) priorities.push(`Open booking များမှ လက်ကျန်ငွေ စုစုပေါင်း ${money(outstandingBalance)} ကို collection plan ထားရန်`);
  if (pendingContent) priorities.push(`Draft/Ready content ${pendingContent} ခုကို approve, schedule သို့မဟုတ် archive လုပ်ရန်`);
  if (!priorities.length) priorities.push(sourceCount
    ? 'လက်ရှိရရှိထားသော data ထဲတွင် critical backlog မတွေ့ပါ။ Missing sources ကို sync ပြီးမှ final decision ချပါ။'
    : 'Business data မရသေးပါ။ POS, package catalog, content history သို့မဟုတ် insights တစ်ခုခုကို အရင် sync လုပ်ပါ။');

  const contentSignals = [
    insightTopics.length ? `Facebook top topics: ${insightTopics.join(', ')}` : '',
    insightRecommendations.length ? `Insights recommendations: ${insightRecommendations.join(' | ')}` : '',
    insightIdeas.length ? `Suggested angles: ${insightIdeas.join(' | ')}` : '',
    recentContent.length ? `Recent openings to avoid repeating: ${recentContent.map((item) => item.opening).filter(Boolean).join(' | ')}` : '',
  ].filter(Boolean);

  const suggestions = [
    priorities[0],
    insightIdeas[0] || insightRecommendations[0] || (packageMix[0] ? `${packageMix[0][0]} demand ကိုအခြေခံပြီး trust-building post ရေးရန်` : 'Client trust တိုးစေမည့် behind-the-scenes post ရေးရန်'),
    pendingContent ? `Pending content ${pendingContent} ခုထဲမှ အကောင်းဆုံးတစ်ခုကို ယနေ့တင်ရန်` : 'Fresh photo-first post တစ်ပုဒ်ကို booking CTA နူးညံ့စွာဖြင့်ရေးရန်',
  ].filter(Boolean).slice(0, 3);

  const actionRows = [...upcoming, ...overdue].slice(0, 8).map((booking) => {
    const key = `${booking.source || 'pos'}:${booking.id || ''}`;
    return [
      cleanText(booking.clientName, 70) || 'Unnamed client',
      cleanText(booking.packageName, 90) || 'Package not set',
      cleanText(`${booking.date || 'No date'} ${booking.time || ''}`, 40),
      cleanText(`${booking.status || 'Open'} / ${booking.workStatus || 'No work status'}`, 60),
      Number(booking.balance) > 0 ? `balance ${money(Number(booking.balance))}` : 'no recorded balance',
      reminders[key] ? 'reminder marked sent' : 'reminder not marked sent',
    ].join(' | ');
  });

  const packageSummary = packages.length
    ? countBy(packages.map((item: any) => item.category || 'Other')).slice(0, 8).map(([category, count]) => `${category}: ${count}`).join(', ')
    : 'Package catalog not synced';

  const context = [
    '[WYPS BUSINESS BRAIN SNAPSHOT]',
    `Generated: ${now.toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })} Asia/Yangon`,
    `Mode: ${mode}`,
    'Privacy rule: client phone numbers, notes, auth tokens, account IDs, and raw secrets are excluded. Do not ask for or infer them.',
    `Data freshness: ${sourceCount}/${sources.length} device sources available. Missing data means unknown, never zero unless explicitly shown.`,
    `Source health: ${sources.map((source) => `${source.label}=${source.available ? `available (${source.detail})` : 'missing'}`).join('; ')}.`,
    '',
    '[OPERATIONS]',
    `Bookings cached: ${bookings.length}; open: ${openBookings.length}; upcoming 7 days: ${upcoming.length}; overdue open: ${overdue.length}; outstanding open balance: ${money(outstandingBalance)}.`,
    packageMix.length ? `Observed booking mix: ${packageMix.map(([name, count]) => `${name} (${count})`).join(', ')}.` : sources[0].available ? 'Observed booking mix: cached bookings contain no package names.' : 'Observed booking mix: unavailable because POS bookings are not synced.',
    actionRows.length ? `Priority booking rows:\n- ${actionRows.join('\n- ')}` : 'Priority booking rows: none available.',
    '',
    '[CONTENT PIPELINE]',
    `Approval board: ${approvalCounts.map(([status, count]) => `${status} ${count}`).join(', ') || 'empty'}.`,
    recentContent.length ? `Recent content topics: ${recentContent.map((item) => cleanText(item.title, 80)).join(' | ')}.` : 'Recent content topics: none available.',
    ...contentSignals,
    '',
    '[PACKAGE CATALOG]',
    `${packages.length} current package rows available. Category mix: ${packageSummary}.`,
    '',
    '[AI USAGE TODAY]',
    `Calls: ${Number(todayUsage.count) || 0}; estimated cost: $${(Number(todayUsage.totalCost) || 0).toFixed(4)}.`,
    '',
    '[CURRENT PRIORITIES]',
    ...priorities.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Grounding rules: Use this snapshot only when relevant. State when a conclusion is based on incomplete data. Never invent demand, conversion, profit, package details, or performance. Distinguish observed data from recommendations.',
  ].join('\n').slice(0, 14_000);

  const localSnapshot: BusinessBrainSnapshot = {
    generatedAt: now.toISOString(),
    origin: 'device',
    sourceCount,
    totalSources: sources.length,
    sources,
    metrics: {
      bookings: bookings.length,
      upcomingSevenDays: upcoming.length,
      overdueOpen: overdue.length,
      outstandingBalance,
      pendingContent,
      postedContent,
    },
    priorities,
    contentSignals,
    suggestions,
    context,
  };

  if (!allowCloudFallback) return localSnapshot;

  const cloudSnapshot = readJson<BusinessBrainSnapshot | null>(read, BUSINESS_BRAIN_CLOUD_KEY, null);
  const cloudGeneratedAt = new Date(cloudSnapshot?.generatedAt || 0).getTime();
  const cloudAge = now.getTime() - cloudGeneratedAt;
  const cloudIsUsable = cloudSnapshot
    && Array.isArray(cloudSnapshot.sources)
    && cloudSnapshot.sources.length === sources.length
    && Number.isFinite(cloudGeneratedAt)
    && cloudAge >= 0
    && cloudAge <= MAX_CLOUD_AGE_MS
    && cloudSnapshot.sourceCount > localSnapshot.sourceCount;

  if (!cloudIsUsable) return localSnapshot;

  const cloudAgeHours = Math.max(0, Math.round(cloudAge / (60 * 60 * 1000)));
  return {
    ...cloudSnapshot,
    origin: 'cloud',
    cloudAgeHours,
    context: `${cloudSnapshot.context}\n[SYNC STATUS]\nUsing the more complete private cloud snapshot from ${cloudAgeHours} hour(s) ago. Treat time-sensitive details as stale when appropriate.`,
  };
};

export const persistBusinessBrainCloudSnapshot = (snapshot: BusinessBrainSnapshot) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(BUSINESS_BRAIN_CLOUD_KEY, JSON.stringify({ ...snapshot, origin: 'cloud' }));
    window.dispatchEvent(new CustomEvent(BUSINESS_BRAIN_UPDATED_EVENT, { detail: { action: 'remote' } }));
  } catch (error) {
    console.error('Business Brain cloud cache save failed:', error);
  }
};

export const notifyBusinessBrainChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUSINESS_BRAIN_UPDATED_EVENT, { detail: { action: 'local' } }));
};

export const getBusinessBrainContext = (mode: BusinessBrainMode = 'strategy') => (
  buildBusinessBrainSnapshot(mode).context
);
