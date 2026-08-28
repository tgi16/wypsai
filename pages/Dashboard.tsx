import React, { useEffect, useMemo, useState } from 'react';
import { AppTab } from '../types';
import { DAILY_BUDGET } from '../constants';
import { POS_PACKAGE_CACHE_KEY, POS_PRICING_CONTEXT_KEY, POS_SESSION_KEY } from '../pricingCatalog';
import { readGeneratedHistory } from '../generatedHistory';
import { readApprovalItems } from '../workflowBoard';
import { getAuthorizedJsonHeaders } from '../apiClient';
import { notifyBusinessBrainChanged } from '../businessBrain';

interface DashboardProps {
  onNavigate: (tab: AppTab) => void;
}

type HistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  tab: AppTab;
  createdAt: string;
};

type PosBooking = {
  id: string;
  source: string;
  clientName: string;
  packageName: string;
  date: string;
  time: string;
  status: string;
  workStatus: string;
};

type FacebookInsightIdea = {
  title: string;
  angle: string;
  bestFor: string;
  prompt: string;
};

type FacebookInsightsSummary = {
  source?: string;
  postsAnalyzed?: number;
  warning?: string;
  recommendations?: string[];
  contentIdeas?: FacebookInsightIdea[];
  topTopics?: Array<{ topic: string }>;
  topFormats?: Array<{ format: string }>;
};

type ActionItem = {
  label: string;
  title: string;
  detail: string;
  tab: AppTab;
  tone: string;
};

type PosSession = {
  email?: string;
  refreshToken?: string;
};

const POS_CACHE_KEY = 'wyps_pos_bookings_cache_v1';
const POS_REMINDER_STATUS_KEY = 'wyps_pos_reminder_status_v1';
const GENERATED_HISTORY_KEY = 'wyps_generated_history_v1';

const getUsageDayKey = () => new Date().toLocaleDateString('en-CA');

const safeJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const dateOnlyValue = (rawDate: string): number | null => {
  if (!rawDate) return null;
  const date = new Date(`${rawDate}T00:00:00`);
  const value = date.getTime();
  return Number.isFinite(value) ? value : null;
};

const toInputDate = (offsetDays: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('en-CA');
};

const isCompleted = (booking: PosBooking) => {
  const status = `${booking.status} ${booking.workStatus}`.toLowerCase();
  return status.includes('completed') || status.includes('done');
};

const getBookingKey = (booking: PosBooking) => `${booking.source}:${booking.id}`;

const normalizeText = (value: unknown) => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

const readUnifiedHistory = (): HistoryItem[] => {
  const items: HistoryItem[] = [];

  safeJson<any[]>('wyp_content_history', []).forEach((item) => {
    items.push({
      id: `content-${item.id}`,
      title: item.topic || 'Facebook content',
      subtitle: 'ပိုစ်တ်ရေးထားသော history',
      content: item.result?.facebookCaption || item.result?.tiktokCaption || normalizeText(item.result),
      tab: AppTab.CONTENT_GEN,
      createdAt: item.date || '',
    });
  });

  safeJson<any[]>(GENERATED_HISTORY_KEY, []).forEach((item) => {
    items.push({
      id: `pos-${item.id}`,
      title: item.title || item.type || 'Generated message',
      subtitle: item.type === 'Content' ? 'POS မှ Post idea' : 'Client follow-up message',
      content: item.content || '',
      tab: item.type === 'Content' ? AppTab.CONTENT_GEN : AppTab.POS_BOOKING_TRACKER,
      createdAt: item.createdAt || '',
    });
  });

  safeJson<any[]>('wyp_7day_history', []).forEach((item) => {
    items.push({
      id: `plan-${item.id}`,
      title: item.focusArea || '7-Day Plan',
      subtitle: 'တစ်ပတ်စာ content plan',
      content: normalizeText(item.plan),
      tab: AppTab.SEVEN_DAY_PLAN,
      createdAt: item.date || '',
    });
  });

  safeJson<any[]>('wyp_guide_history', []).forEach((item) => {
    items.push({
      id: `guide-${item.id}`,
      title: item.topic || item.content?.title || 'Client guide',
      subtitle: 'Client guide history',
      content: normalizeText(item.content),
      tab: AppTab.CLIENT_GUIDES,
      createdAt: item.date || '',
    });
  });

  safeJson<any[]>('wyp_promo_history', []).forEach((item) => {
    items.push({
      id: `promo-${item.id}`,
      title: item.occasion || item.content?.title || 'Promotion',
      subtitle: 'Premium promotion history',
      content: normalizeText(item.content),
      tab: AppTab.PREMIUM_PROMOTIONS,
      createdAt: item.date || '',
    });
  });

  return items
    .filter((item) => item.content)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookings, setBookings] = useState<PosBooking[]>([]);
  const [reminderStatus, setReminderStatus] = useState<Record<string, boolean>>({});
  const [usage, setUsage] = useState({ totalCost: 0, count: 0, lastCost: 0, models: {} as Record<string, { cost: number; count: number }> });
  const [insights, setInsights] = useState<FacebookInsightsSummary | null>(null);
  const [approvalPending, setApprovalPending] = useState(0);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [posSyncing, setPosSyncing] = useState(false);
  const [toast, setToast] = useState('');

  const refreshLocalData = () => {
    setHistory(readGeneratedHistory().slice(0, 8));
    setBookings(safeJson<PosBooking[]>(POS_CACHE_KEY, []));
    setReminderStatus(safeJson<Record<string, boolean>>(POS_REMINDER_STATUS_KEY, {}));
    setInsights(safeJson<FacebookInsightsSummary | null>('wyp_facebook_insights_summary', null));
    setApprovalPending(readApprovalItems().filter((item) => item.status === 'Draft' || item.status === 'Ready').length);
    const todayUsage = safeJson<Record<string, any>>('gemini_usage_v2', {})[getUsageDayKey()] || {};
    setUsage({
      totalCost: Number(todayUsage.totalCost) || 0,
      count: Number(todayUsage.count) || 0,
      lastCost: Number(todayUsage.lastCost) || 0,
      models: todayUsage.models || {},
    });
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const syncPosBookings = async () => {
    const session = safeJson<PosSession | null>(POS_SESSION_KEY, null);
    if (!session?.refreshToken) {
      showToast('POS session မရှိသေးပါ။ POS Booking Tracker ထဲမှာ login ဝင်ပါ။');
      return;
    }
    setPosSyncing(true);
    try {
      const response = await fetch('/api/pos-bookings', {
        method: 'POST',
        headers: await getAuthorizedJsonHeaders(),
        body: JSON.stringify({ refreshToken: session.refreshToken, email: session.email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'POS data refresh မအောင်မြင်သေးပါ။');
      const nextBookings = Array.isArray(data.bookings) ? data.bookings : [];
      setBookings(nextBookings);
      localStorage.setItem(POS_CACHE_KEY, JSON.stringify(nextBookings));
      notifyBusinessBrainChanged();
      if (data.session?.refreshToken) {
        localStorage.setItem(POS_SESSION_KEY, JSON.stringify({
          email: data.session.email || session.email || '',
          refreshToken: data.session.refreshToken,
        }));
      }
      showToast(`POS booking ${nextBookings.length} ခု refresh ပြီးပါပြီ။`);
    } catch (error: any) {
      showToast(error?.message || 'POS refresh လုပ်ရာတွင် အခက်အခဲရှိနေပါသည်။');
    } finally {
      setPosSyncing(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await fetch('/api/facebook-insights', {
        method: 'POST',
        headers: await getAuthorizedJsonHeaders(),
        body: JSON.stringify({ source: 'ad_account', days: 30, limit: 3 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Facebook Insights failed');
      }
      setInsights(data);
      localStorage.setItem('wyp_facebook_insights_summary', JSON.stringify(data));
      notifyBusinessBrainChanged();
      showToast('Facebook Insights idea ၃ ခု update ပြီးပါပြီ။');
    } catch (error: any) {
      showToast(error?.message || 'Facebook Insights ဆွဲရာတွင် အခက်အခဲရှိနေပါသည်။');
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    refreshLocalData();
    const handleUsage = (event: any) => setUsage({
      totalCost: Number(event.detail?.totalCost) || 0,
      count: Number(event.detail?.count) || 0,
      lastCost: Number(event.detail?.lastCost) || 0,
      models: event.detail?.models || {},
    });
    const handleNotice = (event: any) => {
      showToast(event.detail?.message || 'လုပ်ဆောင်ချက်တစ်ခု update ဖြစ်ပါပြီ။');
    };
    window.addEventListener('gemini_usage_updated', handleUsage);
    window.addEventListener('wyps_app_notice', handleNotice);
    window.addEventListener('storage', refreshLocalData);
    window.addEventListener('wyps_generated_history_updated', refreshLocalData);
    window.addEventListener('wyps_content_board_updated', refreshLocalData);
    return () => {
      window.removeEventListener('gemini_usage_updated', handleUsage);
      window.removeEventListener('wyps_app_notice', handleNotice);
      window.removeEventListener('storage', refreshLocalData);
      window.removeEventListener('wyps_generated_history_updated', refreshLocalData);
      window.removeEventListener('wyps_content_board_updated', refreshLocalData);
    };
  }, []);

  const today = toInputDate(0);
  const tomorrow = toInputDate(1);
  const todayValue = dateOnlyValue(today) || 0;

  const dashboardStats = useMemo(() => {
    const active = bookings.filter((booking) => !String(booking.status || '').toLowerCase().includes('cancel'));
    const tomorrowUnsent = active.filter((booking) => booking.date === tomorrow && !reminderStatus[getBookingKey(booking)]);
    const todayShoots = active.filter((booking) => booking.date === today);
    const followUps = active.filter((booking) => {
      const value = dateOnlyValue(booking.date) || 0;
      return value < todayValue && (isCompleted(booking) || !String(booking.workStatus || '').toLowerCase().includes('delivered'));
    });
    return { active, tomorrowUnsent, todayShoots, followUps };
  }, [bookings, reminderStatus, today, todayValue, tomorrow]);

  const usagePercent = Math.min((usage.totalCost / DAILY_BUDGET) * 100, 100);
  const topModel = Object.entries(usage.models || {}).sort((a, b) => (b[1]?.cost || 0) - (a[1]?.cost || 0))[0];
  const posSession = Boolean(localStorage.getItem(POS_SESSION_KEY));
  const pricingSynced = Boolean(localStorage.getItem(POS_PRICING_CONTEXT_KEY) || localStorage.getItem(POS_PACKAGE_CACHE_KEY));
  const insightIdeas = insights?.contentIdeas?.slice(0, 3) || [];

  const copyHistory = async (item: HistoryItem) => {
    await navigator.clipboard.writeText(item.content);
    showToast('History ထဲကစာသားကို copy လုပ်ပြီးပါပြီ။');
  };

  const reuseHistory = (item: HistoryItem) => {
    if (item.tab === AppTab.CONTENT_GEN) localStorage.setItem('wyp_content_topic', item.content);
    onNavigate(item.tab);
  };

  const useInsightIdea = (idea: FacebookInsightIdea) => {
    localStorage.setItem('wyp_content_topic', [
      `Facebook Insights idea: ${idea.title}`,
      idea.angle,
      idea.prompt,
      '',
      'Copy & paste တင်နိုင်အောင် မြန်မာလိုအဓိက, short paragraphs, soft CTA နဲ့ရေးပါ။',
    ].filter(Boolean).join('\n\n'));
    onNavigate(AppTab.CONTENT_GEN);
  };

  const workbenchCards = [
    {
      title: 'မနက်ဖြန် Reminder',
      count: dashboardStats.tomorrowUnsent.length,
      detail: dashboardStats.tomorrowUnsent[0]?.clientName || 'မပို့ရသေးတာ မရှိပါ',
      tab: AppTab.POS_BOOKING_TRACKER,
      accent: 'from-amber-500/20 to-orange-500/5 border-amber-500/25',
    },
    {
      title: 'ဒီနေ့ Shoot',
      count: dashboardStats.todayShoots.length,
      detail: dashboardStats.todayShoots[0]?.clientName || 'ဒီနေ့ booking မတွေ့ပါ',
      tab: AppTab.POS_BOOKING_TRACKER,
      accent: 'from-sky-500/20 to-cyan-500/5 border-sky-500/25',
    },
    {
      title: 'Follow-up / Delivery',
      count: dashboardStats.followUps.length,
      detail: dashboardStats.followUps[0]?.clientName || 'စစ်ရန် မရှိပါ',
      tab: AppTab.POS_BOOKING_TRACKER,
      accent: 'from-rose-500/20 to-pink-500/5 border-rose-500/25',
    },
    {
      title: 'Approval စစ်ရန်',
      count: approvalPending,
      detail: approvalPending ? 'Draft / Ready content စစ်ရန်' : 'စစ်ရန် content မရှိပါ',
      tab: AppTab.CONTENT_APPROVAL,
      accent: 'from-emerald-500/20 to-lime-500/5 border-emerald-500/25',
    },
  ];

  const nextActions = useMemo<ActionItem[]>(() => {
    const actions: ActionItem[] = [];
    if (!posSession) {
      actions.push({
        label: 'Setup',
        title: 'POS Login ချိတ်ပါ',
        detail: 'Booking/reminder/follow-up dashboard ကိုမှန်အောင် POS session လိုပါတယ်။',
        tab: AppTab.POS_BOOKING_TRACKER,
        tone: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
      });
    }
    dashboardStats.tomorrowUnsent.slice(0, 2).forEach((booking) => actions.push({
      label: 'Reminder',
      title: `${booking.clientName} ကို reminder ပို့ရန်`,
      detail: `${booking.date} ${booking.time || ''} · ${booking.packageName}`,
      tab: AppTab.POS_BOOKING_TRACKER,
      tone: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
    }));
    dashboardStats.todayShoots.slice(0, 1).forEach((booking) => actions.push({
      label: 'Today Shoot',
      title: `${booking.clientName} shoot detail စစ်ရန်`,
      detail: `${booking.time || 'အချိန်မထည့်ထား'} · ${booking.packageName}`,
      tab: AppTab.POS_BOOKING_TRACKER,
      tone: 'border-sky-500/25 bg-sky-500/10 text-sky-100',
    }));
    dashboardStats.followUps.slice(0, 1).forEach((booking) => actions.push({
      label: 'Follow-up',
      title: `${booking.clientName} ကို follow-up ပို့ရန်`,
      detail: `${booking.packageName} · delivery/review update စစ်ရန်`,
      tab: AppTab.POS_BOOKING_TRACKER,
      tone: 'border-rose-500/25 bg-rose-500/10 text-rose-100',
    }));
    if (approvalPending > 0) {
      actions.push({
        label: 'Approval',
        title: `${approvalPending} ခု content approval စစ်ရန်`,
        detail: 'Draft / Ready content တွေကို scheduled/posted ပြောင်းနိုင်ပါတယ်။',
        tab: AppTab.CONTENT_APPROVAL,
        tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
      });
    }
    if (usagePercent > 80) {
      actions.push({
        label: 'Budget',
        title: 'AI Usage budget မြင့်နေပါတယ်',
        detail: `ဒီနေ့ $${usage.totalCost.toFixed(4)} သုံးထားပါတယ်။ မလိုတဲ့ generate တွေလျှော့ပါ။`,
        tab: AppTab.TOKEN_MANAGER,
        tone: 'border-red-500/25 bg-red-500/10 text-red-100',
      });
    }
    if (actions.length < 5) {
      actions.push({
        label: 'Content',
        title: 'ဒီနေ့ post တစ်ခုရေးရန်',
        detail: insightIdeas[0]?.title || 'Topic မထည့်လည်း Content Factory က angle ရွေးရေးပေးနိုင်ပါတယ်။',
        tab: AppTab.CONTENT_GEN,
        tone: 'border-slate-700 bg-slate-950/60 text-slate-200',
      });
    }
    return actions.slice(0, 5);
  }, [approvalPending, dashboardStats.followUps, dashboardStats.todayShoots, dashboardStats.tomorrowUnsent, insightIdeas, posSession, usage.totalCost, usagePercent]);

  const commandActions = useMemo(() => {
    if (!posSession) {
      return {
        label: 'POS Login အရင်ချိတ်ပါ',
        title: 'ဒီနေ့ action တွေကိုမှန်မှန်ထုတ်ချင်ရင် POS data လိုပါတယ်။',
        detail: 'တစ်ခါ login ဝင်ပြီးရင် Dashboard ကနေ refresh လုပ်နိုင်ပါမယ်။',
        button: 'POS ချိတ်မယ်',
        tab: AppTab.POS_BOOKING_TRACKER,
        tone: 'border-amber-500/30 bg-amber-500/10',
      };
    }
    if (dashboardStats.tomorrowUnsent.length > 0) {
      return {
        label: 'Priority 1',
        title: `${dashboardStats.tomorrowUnsent[0].clientName} ကို မနက်ဖြန် reminder ပို့ရန်`,
        detail: `${dashboardStats.tomorrowUnsent.length} ခု reminder မပို့ရသေးပါ။ Client care မကျန်အောင်အရင်လုပ်ပါ။`,
        button: 'Reminder ပြင်မယ်',
        tab: AppTab.POS_BOOKING_TRACKER,
        tone: 'border-amber-500/30 bg-amber-500/10',
      };
    }
    if (dashboardStats.todayShoots.length > 0) {
      return {
        label: 'Today Shoot',
        title: `${dashboardStats.todayShoots[0].clientName} ရိုက်ကူးရေးအတွက် checklist စစ်ရန်`,
        detail: 'ဒီနေ့ shoot ရှိတဲ့ client များကို အချိန်, package, notes ပြန်စစ်ပါ။',
        button: 'Booking ကြည့်မယ်',
        tab: AppTab.POS_BOOKING_TRACKER,
        tone: 'border-sky-500/30 bg-sky-500/10',
      };
    }
    if (dashboardStats.followUps.length > 0) {
      return {
        label: 'Follow-up',
        title: `${dashboardStats.followUps[0].clientName} အတွက် follow-up/delivery message ပို့ရန်`,
        detail: `${dashboardStats.followUps.length} ခု follow-up စစ်ရန်ရှိပါတယ်။`,
        button: 'Follow-up လုပ်မယ်',
        tab: AppTab.POS_BOOKING_TRACKER,
        tone: 'border-rose-500/30 bg-rose-500/10',
      };
    }
    if (insightIdeas[0]) {
      return {
        label: 'Content Move',
        title: insightIdeas[0].title,
        detail: insightIdeas[0].angle,
        button: 'ဒီ idea နဲ့ Post ရေးမယ်',
        tab: AppTab.CONTENT_GEN,
        tone: 'border-emerald-500/30 bg-emerald-500/10',
      };
    }
    return {
      label: 'Ready',
      title: 'ဒီနေ့အတွက် Insights idea ဆွဲပြီး content စနိုင်ပါတယ်။',
      detail: 'Facebook performance data ကိုကြည့်ပြီး idea ၃ ခုထုတ်ပါ။',
      button: 'Insights ယူမယ်',
      tab: AppTab.CONTENT_GEN,
      tone: 'border-slate-700 bg-slate-900/50',
    };
  }, [dashboardStats.followUps, dashboardStats.todayShoots, dashboardStats.tomorrowUnsent, insightIdeas, posSession]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-24 md:pb-10">
      {toast && (
        <div className="fixed top-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl">
          {toast}
        </div>
      )}

      <header className="rounded-[2rem] md:rounded-[3rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 p-5 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">Today Workbench</p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-white">
              ဒီနေ့ ဘာလုပ်မလဲ?
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              POS booking, content, reminder, follow-up, API usage တို့ကို တစ်နေရာတည်းကနေ စစ်ပြီး ဆက်လုပ်နိုင်အောင် စုထားပါတယ်။
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={() => onNavigate(AppTab.CONTENT_GEN)} className="rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-slate-950">
              ပိုစ်တ်ရေးမယ်
            </button>
            <button onClick={() => onNavigate(AppTab.POS_BOOKING_TRACKER)} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-white">
              Booking စစ်မယ်
            </button>
            <button onClick={() => onNavigate(AppTab.APP_HEALTH)} className="col-span-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-white sm:col-span-1">
              Health Check
            </button>
          </div>
        </div>
      </header>

      <section className={`rounded-[2rem] border p-5 md:p-6 ${commandActions.tone}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Daily Command Center</div>
            <div className="mt-2 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
              {commandActions.label}
            </div>
            <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-4xl">{commandActions.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{commandActions.detail}</p>
          </div>
          <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[420px]">
            <button
              onClick={() => {
                if (commandActions.label === 'Content Move' && insightIdeas[0]) {
                  useInsightIdea(insightIdeas[0]);
                  return;
                }
                if (commandActions.label === 'Ready') {
                  void fetchInsights();
                  return;
                }
                onNavigate(commandActions.tab);
              }}
              className="rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-slate-950 hover:bg-amber-400"
            >
              {commandActions.button}
            </button>
            <button
              onClick={syncPosBookings}
              disabled={posSyncing || !posSession}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-xs font-black text-white disabled:text-slate-600"
            >
              {posSyncing ? 'POS Syncing...' : 'POS Refresh'}
            </button>
            <button
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-xs font-black text-white disabled:text-slate-600"
            >
              {insightsLoading ? 'Fetching...' : 'Insights Refresh'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {workbenchCards.map((card) => (
          <button
            key={card.title}
            onClick={() => onNavigate(card.tab)}
            className={`rounded-[1.5rem] border bg-gradient-to-br ${card.accent} p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400/40 md:p-5`}
          >
            <div className="text-3xl font-black text-white">{card.count}</div>
            <div className="mt-2 text-sm font-black text-white">{card.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-slate-400">{card.detail}</div>
          </button>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Next 5 Actions</h2>
            <p className="text-xs leading-relaxed text-slate-500">ဒီနေ့ app ဖွင့်လိုက်တာနဲ့ ဘာစလုပ်ရမလဲကို priority အတိုင်းစီထားပါတယ်။</p>
          </div>
          <button onClick={refreshLocalData} className="self-start rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black text-slate-300 sm:self-auto">
            Refresh
          </button>
        </div>
        <div className="grid gap-3">
          {nextActions.map((action, index) => (
            <button
              key={`${action.label}-${action.title}-${index}`}
              onClick={() => onNavigate(action.tab)}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400/40 ${action.tone}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/25 text-sm font-black">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{action.label}</div>
                  <div className="mt-1 text-sm font-black text-white">{action.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-80">{action.detail}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Today Content Ideas</h2>
            <p className="text-xs leading-relaxed text-slate-500">
              Facebook Insights ကနေယူထားတဲ့ idea ၃ ခုပါ။ တစ်ခုနှိပ်ပြီး Content Factory ထဲကို topic အဖြစ်ပို့နိုင်ပါတယ်။
            </p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {insights?.source || 'No insights yet'} · {insights?.postsAnalyzed ?? 0} rows
          </div>
        </div>

        {insights?.warning && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
            {insights.warning}
          </div>
        )}

        {insightIdeas.length ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {insightIdeas.map((idea) => (
              <button
                key={idea.title}
                onClick={() => useInsightIdea(idea)}
                className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-emerald-400/40"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">{idea.bestFor}</div>
                <h3 className="mt-2 text-sm font-black leading-relaxed text-white">{idea.title}</h3>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">{idea.angle}</p>
                <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-amber-400">Use as topic</div>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={fetchInsights}
            disabled={insightsLoading}
            className="w-full rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-sm font-black text-slate-300 disabled:text-slate-600"
          >
            {insightsLoading ? 'Insights ဆွဲနေပါပြီ...' : 'Insights idea ၃ ခု ဆွဲယူမယ်'}
          </button>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Generated History + Reuse</h2>
              <p className="text-xs text-slate-500">Content, follow-up, plan, guide history တွေကို တစ်နေရာတည်းကနေပြန်ယူပါ။</p>
            </div>
            <button onClick={refreshLocalData} className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black text-slate-300">
              Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
              History မရှိသေးပါ။ Content / Reminder တစ်ခု generate လုပ်ပြီးရင် ဒီမှာပြန်ပေါ်ပါမယ်။
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white line-clamp-1">{item.title}</div>
                      <div className="mt-1 text-[11px] font-bold text-slate-500">{item.subtitle} · {item.createdAt || 'recent'}</div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{item.content}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => copyHistory(item)} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-black text-white">Copy</button>
                      <button onClick={() => reuseHistory(item)} className="rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-slate-950">Reuse</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5">
            <h2 className="text-lg font-black text-white">Cost Control</h2>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-3xl font-black text-amber-400">${usage.totalCost.toFixed(4)}</div>
                <div className="text-xs text-slate-500">{usage.count} AI calls today</div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Daily budget</div>
                <div className="font-black text-white">${DAILY_BUDGET.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
              <div
                className={`h-full ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.max(usagePercent, usage.totalCost > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {topModel ? `အများဆုံးသုံးနေတဲ့ model: ${topModel[0]} (${topModel[1].count} calls)` : 'ဒီနေ့ AI call မရှိသေးပါ။'}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5">
            <h2 className="text-lg font-black text-white">App Health</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">POS session</span>
                <span className={`font-black ${posSession ? 'text-emerald-400' : 'text-amber-400'}`}>{posSession ? 'Ready' : 'Login လိုနိုင်'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Pricing sync</span>
                <span className={`font-black ${pricingSynced ? 'text-emerald-400' : 'text-amber-400'}`}>{pricingSynced ? 'Synced' : 'Fallback'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">History</span>
                <span className="font-black text-sky-400">{history.length} items</span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => onNavigate(AppTab.PRICING)} className="rounded-xl border border-slate-700 px-3 py-3 text-[10px] font-black text-white">Price စစ်မယ်</button>
              <button onClick={() => onNavigate(AppTab.TOKEN_MANAGER)} className="rounded-xl border border-slate-700 px-3 py-3 text-[10px] font-black text-white">Token စစ်မယ်</button>
              <button onClick={() => onNavigate(AppTab.APP_HEALTH)} className="rounded-xl border border-slate-700 px-3 py-3 text-[10px] font-black text-white">Health Check</button>
              <button onClick={() => onNavigate(AppTab.CLIENT_TIMELINE)} className="rounded-xl border border-slate-700 px-3 py-3 text-[10px] font-black text-white">Timeline</button>
              <button onClick={() => onNavigate(AppTab.CONTENT_APPROVAL)} className="rounded-xl border border-slate-700 px-3 py-3 text-[10px] font-black text-white">Approval</button>
              <button onClick={() => onNavigate(AppTab.STRATEGY_PARTNER)} className="rounded-xl border border-slate-700 px-3 py-3 text-[10px] font-black text-white">AI ဆွေးနွေးမယ်</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
