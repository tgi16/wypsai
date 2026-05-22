import React, { useEffect, useMemo, useState } from 'react';
import { AppTab } from '../types';
import { readGeneratedHistory } from '../generatedHistory';
import { readApprovalItems } from '../workflowBoard';

interface ClientTimelineProps {
  onNavigate: (tab: AppTab) => void;
}

type PosBooking = {
  id: string;
  source: string;
  clientName: string;
  phone: string;
  packageName: string;
  packageCategory: string;
  date: string;
  time: string;
  status: string;
  workStatus: string;
  notes: string;
  balance: number;
};

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  detail: string;
  tone: 'amber' | 'sky' | 'emerald' | 'rose' | 'slate';
};

const POS_CACHE_KEY = 'wyps_pos_bookings_cache_v1';
const POS_REMINDER_STATUS_KEY = 'wyps_pos_reminder_status_v1';

const safeJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const dateValue = (value: string) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toneClass: Record<TimelineEvent['tone'], string> = {
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  slate: 'border-slate-700 bg-slate-900 text-slate-300',
};

const getBookingKey = (booking: PosBooking) => `${booking.source}:${booking.id}`;

const ClientTimeline: React.FC<ClientTimelineProps> = ({ onNavigate }) => {
  const [bookings, setBookings] = useState<PosBooking[]>([]);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [toast, setToast] = useState('');

  const refresh = () => setBookings(safeJson<PosBooking[]>(POS_CACHE_KEY, []));

  useEffect(() => {
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const sorted = [...bookings].sort((a, b) => dateValue(b.date) - dateValue(a.date));
    if (!keyword) return sorted;
    return sorted.filter((booking) => [
      booking.clientName,
      booking.phone,
      booking.packageName,
      booking.status,
      booking.workStatus,
      booking.notes,
    ].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [bookings, search]);

  const selectedBooking = useMemo(() => (
    filteredBookings.find((booking) => getBookingKey(booking) === selectedKey) || filteredBookings[0] || null
  ), [filteredBookings, selectedKey]);

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!selectedBooking) return [];
    const reminderStatus = safeJson<Record<string, boolean>>(POS_REMINDER_STATUS_KEY, {});
    const history = readGeneratedHistory();
    const board = readApprovalItems();
    const key = getBookingKey(selectedBooking);
    const client = selectedBooking.clientName.toLowerCase();

    const events: TimelineEvent[] = [
      {
        id: 'booking',
        date: selectedBooking.date || selectedBooking.time || 'No date',
        title: 'Booking Created / POS Record',
        detail: `${selectedBooking.packageName || 'Package'} · ${selectedBooking.status || 'Open'} · Balance ${Number(selectedBooking.balance || 0).toLocaleString()} Ks`,
        tone: 'sky',
      },
      {
        id: 'shoot',
        date: selectedBooking.date || 'No date',
        title: 'Shoot Date',
        detail: `${selectedBooking.time || 'No time'} · ${selectedBooking.workStatus || 'Work status မရှိသေးပါ'}`,
        tone: selectedBooking.workStatus ? 'emerald' : 'amber',
      },
    ];

    events.push({
      id: 'reminder',
      date: selectedBooking.date || 'No date',
      title: reminderStatus[key] ? 'Reminder Sent' : 'Reminder မပို့ရသေး',
      detail: reminderStatus[key] ? 'Client reminder sent status မှတ်ထားပြီးပါပြီ။' : 'Client care အတွက် reminder ပြင်ပြီးပို့ရန်လိုနိုင်ပါတယ်။',
      tone: reminderStatus[key] ? 'emerald' : 'amber',
    });

    history
      .filter((item) => item.content.toLowerCase().includes(client) || item.title.toLowerCase().includes(client))
      .slice(0, 8)
      .forEach((item) => events.push({
        id: `history-${item.id}`,
        date: item.createdAt,
        title: `${item.type} Generated`,
        detail: item.title,
        tone: item.type === 'Follow-up' ? 'emerald' : item.type === 'Content' ? 'rose' : 'slate',
      }));

    board
      .filter((item) => [item.clientName, item.title, item.facebookCaption].some((value) => String(value || '').toLowerCase().includes(client)))
      .slice(0, 6)
      .forEach((item) => events.push({
        id: `board-${item.id}`,
        date: item.updatedAt || item.createdAt,
        title: `Content ${item.status}`,
        detail: item.title,
        tone: item.status === 'Posted' ? 'emerald' : item.status === 'Scheduled' ? 'sky' : 'rose',
      }));

    if (selectedBooking.notes) {
      events.push({
        id: 'notes',
        date: selectedBooking.date || '',
        title: 'Internal POS Note',
        detail: selectedBooking.notes,
        tone: 'slate',
      });
    }

    return events.sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [selectedBooking]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  const sendToReminder = () => {
    if (!selectedBooking) return;
    localStorage.setItem('wyps_client_reminder_prefill', JSON.stringify({
      clientName: selectedBooking.clientName,
      shootDate: selectedBooking.date,
      shootTime: selectedBooking.time,
      extraNote: [selectedBooking.packageName, selectedBooking.notes].filter(Boolean).join('\n'),
    }));
    onNavigate(AppTab.CLIENT_REMINDER);
  };

  const sendToContent = () => {
    if (!selectedBooking) return;
    localStorage.setItem('wyp_content_topic', [
      `${selectedBooking.clientName} အတွက် ${selectedBooking.packageName} shoot/post content ရေးရန်။`,
      selectedBooking.date ? `Shoot date: ${selectedBooking.date} ${selectedBooking.time || ''}` : '',
      selectedBooking.notes ? `POS note: ${selectedBooking.notes}` : '',
      'Facebook post + TikTok short caption ကို client privacy လေးစားပြီး premium storytelling နဲ့ရေးပါ။',
    ].filter(Boolean).join('\n'));
    onNavigate(AppTab.CONTENT_GEN);
  };

  return (
    <div className="space-y-6 burmese-text pb-12">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl">
          {toast}
        </div>
      )}
      <header className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/25 p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-300">Client Operations</p>
        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Client <span className="text-sky-300">Timeline</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Client တစ်ယောက်ချင်းစီအတွက် booking, reminder, shoot, follow-up, generated content status တွေကို timeline ပုံစံနဲ့မြင်နိုင်ပါတယ်။
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-sky-400"
            placeholder="Client name, phone, package ဖြင့်ရှာရန်..."
          />
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {filteredBookings.map((booking) => {
              const key = getBookingKey(booking);
              const active = selectedBooking && getBookingKey(selectedBooking) === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-sky-400 bg-sky-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}
                >
                  <div className="font-black text-white">{booking.clientName}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-slate-500">{booking.packageName}</div>
                  <div className="mt-2 text-[10px] font-bold text-slate-500">{booking.date || 'No date'} · {booking.status || 'Open'}</div>
                </button>
              );
            })}
            {!filteredBookings.length && (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                POS booking cache မရှိသေးပါ။ POS Booking Tracker ထဲက Refresh လုပ်ပါ။
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5 md:p-6">
          {selectedBooking ? (
            <>
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedBooking.clientName}</h2>
                  <p className="mt-1 text-sm text-slate-400">{selectedBooking.packageName}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedBooking.phone || 'Phone မရှိသေးပါ'} · {selectedBooking.source}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={sendToReminder} className="rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-slate-950">Reminder</button>
                  <button onClick={sendToContent} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-black text-white">Post ရေးမယ်</button>
                  <button onClick={() => onNavigate(AppTab.POS_BOOKING_TRACKER)} className="col-span-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-black text-white">POS Detail ကြည့်မယ်</button>
                </div>
              </div>

              <div className="space-y-3">
                {timeline.map((event) => (
                  <div key={event.id} className={`rounded-2xl border p-4 ${toneClass[event.tone]}`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{event.date || 'Recent'}</div>
                    <h3 className="mt-2 font-black text-white">{event.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{event.detail}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
              Client တစ်ယောက်ကိုရွေးပါ။
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ClientTimeline;
