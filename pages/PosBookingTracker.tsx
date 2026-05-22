import React, { useEffect, useMemo, useState } from 'react';
import { AppTab } from '../types';

interface PosBookingTrackerProps {
  onNavigate: (tab: AppTab) => void;
}

type PosBookingTone = 'good' | 'watch' | 'risk' | 'neutral';

interface PosBooking {
  id: string;
  source: 'Booking' | 'Convocation';
  clientName: string;
  phone: string;
  phoneType: string;
  packageName: string;
  packageCategory: string;
  date: string;
  time: string;
  status: string;
  workStatus: string;
  notes: string;
  deposit: number;
  balance: number;
  total: number;
  depositLabel: string;
  channel: 'Messenger' | 'Telegram' | 'Manual';
  tone: PosBookingTone;
}

type PosCredentials =
  | { email: string; password: string; refreshToken?: never }
  | { email?: string; password?: never; refreshToken: string };

const POS_SESSION_KEY = 'wyps_pos_session_v1';
const POS_CACHE_KEY = 'wyps_pos_bookings_cache_v1';
const POS_REMINDER_STATUS_KEY = 'wyps_pos_reminder_status_v1';
const GENERATED_HISTORY_KEY = 'wyps_generated_history_v1';

interface PosSession {
  email: string;
  refreshToken: string;
}

interface GeneratedHistoryItem {
  id: string;
  type: 'Follow-up' | 'Reminder' | 'Content';
  title: string;
  content: string;
  createdAt: string;
  bookingId?: string;
}

type FollowUpMode = 'thanks' | 'review' | 'delivery';

const toneStyles: Record<PosBooking['tone'], string> = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  watch: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  risk: 'border-red-500/30 bg-red-500/10 text-red-300',
  neutral: 'border-slate-700 bg-slate-900 text-slate-400',
};

const currency = new Intl.NumberFormat('en-US');

const toInputDate = (offsetDays: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('en-CA');
};

const dateOnlyValue = (rawDate: string): number | null => {
  if (!rawDate) return null;
  const date = new Date(`${rawDate}T00:00:00`);
  const value = date.getTime();
  return Number.isFinite(value) ? value : null;
};

const getRelativeDateLabel = (rawDate: string): string => {
  const value = dateOnlyValue(rawDate);
  if (!value) return 'No date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((value - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'ဒီနေ့';
  if (diffDays === 1) return 'မနက်ဖြန်';
  if (diffDays === -1) return 'မနေ့က';
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
};

const mapPackageToReminderType = (packageName: string) => {
  const text = packageName.toLowerCase();
  if (text.includes('pre') || text.includes('wedding')) return 'prewedding';
  if (text.includes('family')) return 'family';
  if (text.includes('birthday') || text.includes('sweet')) return 'birthday';
  if (text.includes('donation') || text.includes('monk') || text.includes('ဆွမ်း')) return 'donation';
  return 'indoor';
};

const isCompleted = (booking: PosBooking) => {
  const status = `${booking.status} ${booking.workStatus}`.toLowerCase();
  return status.includes('completed') || status.includes('done');
};

const getBookingKey = (booking: PosBooking) => `${booking.source}:${booking.id}`;

const buildFollowUpMessage = (booking: PosBooking, mode: FollowUpMode) => {
  const greeting = booking.clientName ? `${booking.clientName} ရေ` : 'မင်္ဂလာပါရှင်';

  const linesByMode: Record<FollowUpMode, string[]> = {
    thanks: [
        `${greeting}။`,
        '',
        `ဒီနေ့/မကြာသေးခင်က ${booking.packageName} ရိုက်ကူးရေးအတွက် With You Photo Studio ကို ယုံကြည်ပေးလို့ ကျေးဇူးအများကြီးတင်ပါတယ်ရှင်။`,
        '',
        'ရိုက်ကူးရေးတစ်လျှောက် အေးအေးဆေးဆေးနဲ့ အမှတ်တရလှလှလေးတွေ ဖန်တီးနိုင်ခဲ့မယ်လို့ မျှော်လင့်ပါတယ်။',
        'ကျွန်တော်တို့ဘက်ကလည်း ပုံလေးတွေကို သေချာစိစစ်ပြီး အကောင်းဆုံးဖြစ်အောင် ဆက်လုပ်ပေးနေပါမယ်ရှင်။',
        '',
        'မေးချင်တာရှိရင် အချိန်မရွေး Message ပို့ထားလို့ရပါတယ်နော်။',
        'With You Photo Studio မှ ကျေးဇူးတင်ပါတယ်ရှင်။',
    ],
    review: [
        `${greeting}။`,
        '',
        `${booking.packageName} ရိုက်ကူးရေးအတွက် With You Photo Studio ကိုယုံကြည်ပေးခဲ့လို့ ကျေးဇူးအများကြီးတင်ပါတယ်ရှင်။`,
        '',
        'အချိန်ရတဲ့အခါ ကျွန်တော်တို့ရဲ့ service နဲ့ ရိုက်ကူးရေးအတွေ့အကြုံလေးကို Review အနေနဲ့ ၁ ကြောင်း ၂ ကြောင်းလောက် ရေးပေးနိုင်ရင် အရမ်းအားတက်ရပါတယ်ရှင်။',
        'နောက်လာမယ့် client တွေအတွက်လည်း အများကြီးအထောက်အကူဖြစ်ပါတယ်။',
        '',
        'အားပေးမှုအတွက် ကျေးဇူးအများကြီးတင်ပါတယ်နော်။',
        'With You Photo Studio မှ ချစ်ခင်စွာဖြင့်။',
    ],
    delivery: [
        `${greeting}။`,
        '',
        `${booking.packageName} ရိုက်ကူးရေးပြီးသွားတဲ့အတွက် ပုံအပ်မယ့်အခြေအနေလေးကို ဒီ Message မှာပဲ ဆက်ပြီး update ပေးသွားပါမယ်ရှင်။`,
        '',
        'ပုံလေးတွေကို သေချာရွေးချယ်ပြီး အရောင်အသွေး / detail လေးတွေကို စိစစ်လုပ်ဆောင်နေပါတယ်။',
        'ပြီးသွားတာနဲ့ download/view လုပ်နိုင်မယ့်ပုံစံနဲ့ ပြန်ပို့ပေးပါမယ်နော်။',
        '',
        'အရေးကြီးလိုချင်တဲ့ပုံစံ သို့မဟုတ် မဖြစ်မနေသတိပေးချင်တာလေးရှိရင် Message မှာ ပြောထားလို့ရပါတယ်ရှင်။',
        'With You Photo Studio မှ သေချာလေးဂရုစိုက်ပေးနေပါတယ်။',
    ],
  };

  return linesByMode[mode].filter(Boolean).join('\n');
};

const BookingCard: React.FC<{
  booking: PosBooking;
  actionLabel?: string;
  onReminder: (booking: PosBooking) => void;
  reminderSent?: boolean;
  onMarkReminderSent: (booking: PosBooking) => void;
  onFollowUp: (booking: PosBooking) => void;
  onPostNeeded: (booking: PosBooking) => void;
}> = ({
  booking,
  actionLabel = 'Reminder ပြင်မယ်',
  onReminder,
  reminderSent = false,
  onMarkReminderSent,
  onFollowUp,
  onPostNeeded,
}) => (
  <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-lg font-black text-white truncate">{booking.clientName}</p>
        <p className="text-sm text-slate-400 mt-1 truncate">{booking.packageName}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${toneStyles[booking.tone]}`}>
        {booking.depositLabel}
      </span>
    </div>

    {reminderSent && (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-300">
        Reminder ပို့ပြီးပါပြီ
      </div>
    )}

    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-2xl bg-slate-900/70 p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Date</p>
        <p className="mt-1 font-bold text-slate-200">{getRelativeDateLabel(booking.date)}</p>
        <p className="text-xs text-slate-500">{booking.date || 'No date'}</p>
      </div>
      <div className="rounded-2xl bg-slate-900/70 p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Time</p>
        <p className="mt-1 font-bold text-slate-200">{booking.time || 'No time'}</p>
        <p className="text-xs text-slate-500">{booking.source}</p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{booking.status || 'Open'}</span>
      {booking.workStatus && (
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{booking.workStatus}</span>
      )}
      {booking.phone && (
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{booking.phoneType || 'Phone'}: {booking.phone}</span>
      )}
    </div>

    {booking.notes && (
      <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-400 whitespace-pre-wrap">
        {booking.notes}
      </p>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        onClick={() => onReminder(booking)}
        className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 transition-colors"
      >
        {actionLabel}
      </button>
      <button
        onClick={() => onMarkReminderSent(booking)}
        className={`rounded-2xl px-4 py-3 text-sm font-black transition-colors ${
          reminderSent
            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
            : 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
        }`}
      >
        {reminderSent ? 'Sent ပြန်ဖြုတ်မယ်' : 'Reminder Sent'}
      </button>
      <button
        onClick={() => onFollowUp(booking)}
        className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-black text-sky-200 hover:bg-sky-500/15 transition-colors"
      >
        Follow-up Message
      </button>
      <button
        onClick={() => onPostNeeded(booking)}
        className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 py-3 text-sm font-black text-fuchsia-200 hover:bg-fuchsia-500/15 transition-colors"
      >
        Post ရေးမယ်
      </button>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        Balance: <b className="text-slate-200">{currency.format(booking.balance)} Ks</b>
      </div>
    </div>
  </article>
);

const PosBookingTracker: React.FC<PosBookingTrackerProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState(() => {
    const savedSession = JSON.parse(localStorage.getItem(POS_SESSION_KEY) || 'null') as PosSession | null;
    return savedSession?.email || localStorage.getItem('wyps_pos_email') || '';
  });
  const [password, setPassword] = useState('');
  const [connected, setConnected] = useState(() => Boolean(localStorage.getItem(POS_SESSION_KEY)));
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem(POS_SESSION_KEY)));
  const [bookings, setBookings] = useState<PosBooking[]>(() => {
    const cached = JSON.parse(localStorage.getItem(POS_CACHE_KEY) || '[]');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [reminderStatus, setReminderStatus] = useState<Record<string, boolean>>(() => {
    const saved = JSON.parse(localStorage.getItem(POS_REMINDER_STATUS_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedHistoryItem[]>(() => {
    const saved = JSON.parse(localStorage.getItem(GENERATED_HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  });
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [selectedFollowUpBooking, setSelectedFollowUpBooking] = useState<PosBooking | null>(null);
  const [followUpMode, setFollowUpMode] = useState<FollowUpMode>('thanks');
  const [toast, setToast] = useState('');

  const loadBookings = async (credentials: PosCredentials) => {
    setSyncing(true);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/pos-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'POS booking data ကို Vercel server မှယူလို့မရသေးပါ။');
      }
      const nextBookings = Array.isArray(data.bookings) ? data.bookings : [];
      setBookings(nextBookings);
      setLastUpdated(new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date()));
      if (data.session?.refreshToken) {
        const nextSession = {
          email: data.session.email || credentials.email || email,
          refreshToken: data.session.refreshToken,
        };
        localStorage.setItem(POS_SESSION_KEY, JSON.stringify(nextSession));
        localStorage.setItem('wyps_pos_email', nextSession.email);
        setEmail(nextSession.email);
      }
      localStorage.setItem(POS_CACHE_KEY, JSON.stringify(nextBookings));
      setPassword('');
      setConnected(true);
    } catch (err: any) {
      if ('refreshToken' in credentials) {
        localStorage.removeItem(POS_SESSION_KEY);
        setConnected(false);
      }
      setError(err?.message || 'POS booking data ကို Vercel server မှယူလို့မရသေးပါ။');
    } finally {
      setSyncing(false);
      setLoading(false);
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    const savedSession = JSON.parse(localStorage.getItem(POS_SESSION_KEY) || 'null') as PosSession | null;
    if (!savedSession?.refreshToken) {
      setCheckingSession(false);
      return;
    }
    setEmail(savedSession.email || '');
    loadBookings({ refreshToken: savedSession.refreshToken, email: savedSession.email });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return bookings;
    return bookings.filter((booking) => [
      booking.clientName,
      booking.phone,
      booking.packageName,
      booking.status,
      booking.workStatus,
      booking.notes,
    ].some((value) => typeof value === 'string' && value.toLowerCase().includes(keyword)));
  }, [bookings, search]);

  const grouped = useMemo(() => {
    const today = toInputDate(0);
    const tomorrow = toInputDate(1);
    const todayValue = dateOnlyValue(today) || 0;

    const active = filteredBookings.filter((booking) => booking.status !== 'Cancelled');
    const tomorrowBookings = active.filter((booking) => booking.date === tomorrow && !isCompleted(booking));
    const todayBookings = active.filter((booking) => booking.date === today && !isCompleted(booking));
    const completed = active
      .filter((booking) => isCompleted(booking))
      .sort((a, b) => (dateOnlyValue(b.date) || 0) - (dateOnlyValue(a.date) || 0))
      .slice(0, 3);
    const pendingDelivery = active.filter((booking) => {
      const value = dateOnlyValue(booking.date) || 0;
      return value < todayValue && !isCompleted(booking);
    });

    return { active, tomorrowBookings, todayBookings, completed, pendingDelivery };
  }, [filteredBookings]);

  const unsentTomorrowBookings = useMemo(
    () => grouped.tomorrowBookings.filter((booking) => !reminderStatus[getBookingKey(booking)]),
    [grouped.tomorrowBookings, reminderStatus],
  );

  const actionItems = useMemo(() => [
    {
      title: 'မနက်ဖြန် Reminder မပို့ရသေး',
      count: unsentTomorrowBookings.length,
      detail: unsentTomorrowBookings[0]?.clientName || 'အားလုံးပြီးပါပြီ',
      tone: 'amber',
    },
    {
      title: 'ဒီနေ့ Shoot ရှိသူ',
      count: grouped.todayBookings.length,
      detail: grouped.todayBookings[0]?.clientName || 'ဒီနေ့ shoot မရှိသေးပါ',
      tone: 'sky',
    },
    {
      title: 'Follow-up စစ်ရန်',
      count: grouped.pendingDelivery.length,
      detail: grouped.pendingDelivery[0]?.clientName || 'pending မရှိသေးပါ',
      tone: 'red',
    },
    {
      title: 'Post ရေးရန် idea',
      count: grouped.completed.length,
      detail: grouped.completed[0]?.clientName || 'recent shoot မရှိသေးပါ',
      tone: 'fuchsia',
    },
  ], [grouped.completed, grouped.pendingDelivery, grouped.todayBookings, unsentTomorrowBookings]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const saveGeneratedHistory = (item: Omit<GeneratedHistoryItem, 'id' | 'createdAt'>) => {
    const nextItem: GeneratedHistoryItem = {
      ...item,
      id: `${Date.now()}`,
      createdAt: new Date().toLocaleString(),
    };
    const next = [nextItem, ...generatedHistory].slice(0, 30);
    setGeneratedHistory(next);
    localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(next));
  };

  const handleReminder = (booking: PosBooking) => {
    localStorage.setItem('wyps_client_reminder_prefill', JSON.stringify({
      clientName: booking.clientName,
      shootDate: booking.date,
      shootTime: booking.time,
      packageKey: mapPackageToReminderType(booking.packageName),
      extraNote: [
        booking.packageName ? `Package: ${booking.packageName}` : '',
        booking.notes ? `POS Note: ${booking.notes}` : '',
        booking.phone ? `Client contact: ${booking.phone}` : '',
      ].filter(Boolean).join('\n'),
    }));
    onNavigate(AppTab.CLIENT_REMINDER);
  };

  const toggleReminderSent = (booking: PosBooking) => {
    const key = getBookingKey(booking);
    const next = { ...reminderStatus, [key]: !reminderStatus[key] };
    if (!next[key]) delete next[key];
    setReminderStatus(next);
    localStorage.setItem(POS_REMINDER_STATUS_KEY, JSON.stringify(next));
    showToast(next[key] ? 'Reminder sent အဖြစ်မှတ်ပြီးပါပြီ။' : 'Reminder sent status ကိုပြန်ဖြုတ်ပြီးပါပြီ။');
  };

  const openFollowUpGenerator = (booking: PosBooking) => {
    const nextMode: FollowUpMode = isCompleted(booking) ? 'thanks' : 'delivery';
    const message = buildFollowUpMessage(booking, nextMode);
    setSelectedFollowUpBooking(booking);
    setFollowUpMode(nextMode);
    setFollowUpDraft(message);
  };

  const changeFollowUpMode = (mode: FollowUpMode) => {
    setFollowUpMode(mode);
    if (selectedFollowUpBooking) {
      setFollowUpDraft(buildFollowUpMessage(selectedFollowUpBooking, mode));
    }
  };

  const copyFollowUp = async () => {
    if (!selectedFollowUpBooking || !followUpDraft.trim()) return;
    await navigator.clipboard.writeText(followUpDraft);
    saveGeneratedHistory({
      type: 'Follow-up',
      title: `${selectedFollowUpBooking.clientName} - Follow-up`,
      content: followUpDraft,
      bookingId: getBookingKey(selectedFollowUpBooking),
    });
    showToast('Follow-up message ကို copy/save လုပ်ပြီးပါပြီ။');
  };

  const sendBookingToContent = (booking: PosBooking) => {
    const topic = [
      `${booking.clientName} အတွက် ${booking.packageName} shoot ပြီးသွားတဲ့ Facebook post ရေးရန်။`,
      booking.date ? `Shoot date: ${booking.date}${booking.time ? ` ${booking.time}` : ''}` : '',
      booking.notes ? `POS note: ${booking.notes}` : '',
      'Client privacy ကိုလေးစားပြီး နူးညံ့တဲ့ storytelling + soft booking CTA ပါစေ။',
    ].filter(Boolean).join('\n');
    localStorage.setItem('wyp_content_topic', topic);
    saveGeneratedHistory({
      type: 'Content',
      title: `${booking.clientName} - Post idea`,
      content: topic,
      bookingId: getBookingKey(booking),
    });
    onNavigate(AppTab.CONTENT_GEN);
  };

  const reuseHistoryItem = (item: GeneratedHistoryItem) => {
    if (item.type === 'Content') {
      localStorage.setItem('wyp_content_topic', item.content);
      onNavigate(AppTab.CONTENT_GEN);
      return;
    }
    setSelectedFollowUpBooking(null);
    setFollowUpDraft(item.content);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-sm font-bold text-slate-400">POS session ကိုပြန်ချိတ်နေပါပြီ...</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-3xl md:text-5xl font-black text-white">POS <span className="text-amber-500">Booking Tracker</span></h1>
          <p className="mt-2 text-slate-400">
            VPN မလိုအောင် browser က Firestore ကိုမခေါ်တော့ဘဲ Vercel server က POS login ဝင်ပြီး booking data ကို read-only ဆွဲယူပါမယ်။
          </p>
        </header>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/50 p-6 md:p-8 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
          )}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">POS Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 outline-none focus:border-amber-500"
              placeholder="POS login email"
              type="email"
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">POS Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 outline-none focus:border-amber-500"
              placeholder="POS password"
              type="password"
            />
          </div>
          <button
            onClick={() => loadBookings({ email: email.trim(), password })}
            disabled={loading || !email.trim() || !password}
            className="w-full rounded-2xl bg-amber-500 px-6 py-4 font-black text-slate-950 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {loading ? 'Vercel မှ POS data ယူနေပါပြီ...' : 'Vercel မှ POS Data ချိတ်မယ်'}
          </button>
          <p className="text-xs leading-relaxed text-slate-500">
            ပထမတစ်ခါ login ဝင်ပြီးရင် saved session ကိုသုံးပြီး နောက်တစ်ခါ tab ပြန်ဝင်တဲ့အခါ password ထပ်မတောင်းတော့ပါ။ Password ကို browser ထဲမသိမ်းပါ။
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-2xl">
          {toast}
        </div>
      )}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">POS <span className="text-amber-500">Booking Tracker</span></h1>
          <p className="mt-2 text-slate-400">
            POS ထဲက booking data ကိုတိုက်ရိုက်ဖတ်ပြီး reminder / shoot / delivery အလုပ်တွေကိုမြန်မြန်ဆုံးဖြတ်နိုင်ရန်။
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <span className="font-black">Live POS Sync</span>
          <span className="text-xs text-emerald-300/80">Vercel proxy · {syncing ? 'syncing...' : `updated ${lastUpdated || 'now'}`}</span>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const savedSession = JSON.parse(localStorage.getItem(POS_SESSION_KEY) || 'null') as PosSession | null;
                if (savedSession?.refreshToken) {
                  loadBookings({ refreshToken: savedSession.refreshToken, email: savedSession.email });
                }
              }}
              className="text-left text-xs font-bold text-emerald-100/80 hover:text-white"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(POS_SESSION_KEY);
                localStorage.removeItem(POS_CACHE_KEY);
                setConnected(false);
                setBookings([]);
                setPassword('');
              }}
              className="text-left text-xs font-bold text-emerald-100/60 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-slate-900/40 p-6 md:p-8">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Today Action Dashboard</h2>
            <p className="text-sm text-slate-500">POS data ကနေ ဒီနေ့အရေးကြီးဆုံးလုပ်ရမယ့်အလုပ်တွေကို စုထားပါတယ်။</p>
          </div>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-300">
            {unsentTomorrowBookings.length + grouped.todayBookings.length + grouped.pendingDelivery.length} actions
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {actionItems.map((item) => (
            <div key={item.title} className="rounded-[1.25rem] border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{item.title}</p>
              <p className={`mt-2 text-3xl font-black ${
                item.tone === 'amber' ? 'text-amber-400' :
                item.tone === 'sky' ? 'text-sky-400' :
                item.tone === 'red' ? 'text-red-400' : 'text-fuchsia-300'
              }`}>
                {item.count}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>

        {unsentTomorrowBookings[0] && (
          <button
            onClick={() => handleReminder(unsentTomorrowBookings[0])}
            className="mt-5 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
          >
            ပထမဆုံးမပို့ရသေးတဲ့ Reminder ကိုပြင်မယ်
          </button>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">မနက်ဖြန် Reminder</p>
          <p className="mt-2 text-3xl font-black text-amber-400">{grouped.tomorrowBookings.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">ဒီနေ့ Shoot</p>
          <p className="mt-2 text-3xl font-black text-sky-400">{grouped.todayBookings.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Pending Follow-up</p>
          <p className="mt-2 text-3xl font-black text-red-400">{grouped.pendingDelivery.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Active Records</p>
          <p className="mt-2 text-3xl font-black text-emerald-400">{grouped.active.length}</p>
        </div>
      </section>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 outline-none focus:border-amber-500"
        placeholder="Client name, phone, package, note ဖြင့်ရှာရန်..."
      />

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Generated History + Reuse</h2>
            <p className="text-sm text-slate-500">Follow-up message / post idea တွေကိုပြန်ကူးသုံးနိုင်ပါတယ်။</p>
          </div>
          <span className="text-sm font-bold text-slate-500">{generatedHistory.length} saved</span>
        </div>
        {generatedHistory.length ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {generatedHistory.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">{item.type}</span>
                  <span className="text-[10px] text-slate-600">{item.createdAt}</span>
                </div>
                <h3 className="line-clamp-1 font-black text-white">{item.title}</h3>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{item.content}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => reuseHistoryItem(item)}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-white hover:bg-slate-700"
                  >
                    Reuse
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.content);
                      showToast('History text ကို copy လုပ်ပြီးပါပြီ။');
                    }}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400"
                  >
                    Copy
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="Generated history မရှိသေးပါ။ Follow-up message သို့မဟုတ် Post ရေးမယ် လုပ်ပြီးမှ ဒီမှာပြပါမယ်။" />
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-white">မနက်ဖြန် Reminder ပို့ရန်</h2>
          <span className="text-sm font-bold text-slate-500">{grouped.tomorrowBookings.length} clients</span>
        </div>
        {grouped.tomorrowBookings.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {grouped.tomorrowBookings.map((booking) => (
              <BookingCard
                key={`${booking.source}-${booking.id}`}
                booking={booking}
                onReminder={handleReminder}
                reminderSent={Boolean(reminderStatus[getBookingKey(booking)])}
                onMarkReminderSent={toggleReminderSent}
                onFollowUp={openFollowUpGenerator}
                onPostNeeded={sendBookingToContent}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="မနက်ဖြန် reminder ပို့ရမယ့် booking မတွေ့သေးပါ။" />
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-white">ဒီနေ့ Shoot ရှိသူများ</h2>
          <span className="text-sm font-bold text-slate-500">{grouped.todayBookings.length} shoots</span>
        </div>
        {grouped.todayBookings.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {grouped.todayBookings.map((booking) => (
              <BookingCard
                key={`${booking.source}-${booking.id}`}
                booking={booking}
                actionLabel="Client Reminder ကြည့်မယ်"
                onReminder={handleReminder}
                reminderSent={Boolean(reminderStatus[getBookingKey(booking)])}
                onMarkReminderSent={toggleReminderSent}
                onFollowUp={openFollowUpGenerator}
                onPostNeeded={sendBookingToContent}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="ဒီနေ့ shoot record မတွေ့သေးပါ။" />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white">Follow-up / Delivery စစ်ရန်</h2>
          {grouped.pendingDelivery.length ? (
            grouped.pendingDelivery.slice(0, 8).map((booking) => (
              <BookingCard
                key={`${booking.source}-${booking.id}`}
                booking={booking}
                actionLabel="Follow-up Reminder"
                onReminder={openFollowUpGenerator}
                reminderSent={Boolean(reminderStatus[getBookingKey(booking)])}
                onMarkReminderSent={toggleReminderSent}
                onFollowUp={openFollowUpGenerator}
                onPostNeeded={sendBookingToContent}
              />
            ))
          ) : (
            <EmptyState text="နောက်ကျနေတဲ့ pending follow-up မတွေ့သေးပါ။" />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white">ပြီးသွားသော Shoot များ</h2>
          {grouped.completed.length ? (
            grouped.completed.map((booking) => (
              <BookingCard
                key={`${booking.source}-${booking.id}`}
                booking={booking}
                actionLabel="Review/Delivery Message"
                onReminder={openFollowUpGenerator}
                reminderSent={Boolean(reminderStatus[getBookingKey(booking)])}
                onMarkReminderSent={toggleReminderSent}
                onFollowUp={openFollowUpGenerator}
                onPostNeeded={sendBookingToContent}
              />
            ))
          ) : (
            <EmptyState text="Completed booking မတွေ့သေးပါ။" />
          )}
        </div>
      </section>

      {followUpDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Follow-up Message Generator</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedFollowUpBooking?.clientName || 'History message'} အတွက် ကျေးဇူးတင် / review တောင်း / delivery update message ကို ရွေးထုတ်နိုင်ပါတယ်။
                  </p>
                </div>
                <button onClick={() => setFollowUpDraft('')} className="text-2xl text-slate-500 hover:text-white">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedFollowUpBooking?.notes && (
                <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
                  <b>Internal POS Note:</b>
                  <div className="mt-1 whitespace-pre-wrap text-amber-100/80">{selectedFollowUpBooking.notes}</div>
                  <p className="mt-2 text-amber-200/70">ဒီ note ကို client message ထဲ auto မထည့်တော့ပါ။ လိုအပ်မှ ကိုယ်တိုင်ပြန်ထည့်ပါ။</p>
                </div>
              )}

              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { id: 'thanks', label: 'ကျေးဇူးတင် Message' },
                  { id: 'review', label: 'Review တောင်းရန်' },
                  { id: 'delivery', label: 'Delivery Update' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => changeFollowUpMode(item.id as FollowUpMode)}
                    className={`rounded-2xl px-4 py-3 text-sm font-black transition-colors ${
                      followUpMode === item.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <textarea
                value={followUpDraft}
                onChange={(event) => setFollowUpDraft(event.target.value)}
                className="min-h-[360px] w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-relaxed text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-800 p-6 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  if (selectedFollowUpBooking) {
                    setFollowUpDraft(buildFollowUpMessage(selectedFollowUpBooking, followUpMode));
                  }
                }}
                className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-black text-white hover:bg-slate-700"
              >
                Regenerate
              </button>
              <button
                onClick={copyFollowUp}
                className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
              >
                Copy & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
    {text}
  </div>
);

export default PosBookingTracker;
