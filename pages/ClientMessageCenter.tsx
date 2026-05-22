import React, { useMemo, useState } from 'react';
import { generateClientReminder, generateReviewReply, generateSalesScripts } from '../geminiService';
import { GeneratedHistoryType, saveGeneratedHistory } from '../generatedHistory';
import { AppTab } from '../types';

type MessageMode = 'reminder' | 'followup' | 'review' | 'inquiry';

const MESSAGE_MODES: Array<{
  id: MessageMode;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  {
    id: 'reminder',
    title: 'Shoot Reminder',
    subtitle: 'မနက်ဖြန် ရိုက်ကူးရေးအတွက် care message',
    icon: '🔔',
  },
  {
    id: 'followup',
    title: 'After Shoot Follow-up',
    subtitle: 'ရိုက်ကူးပြီး client ကိုကျေးဇူးတင် / update ပို့ရန်',
    icon: '🤝',
  },
  {
    id: 'review',
    title: 'Review Request / Reply',
    subtitle: 'Review တောင်းရန် သို့မဟုတ် review ကိုပြန်ဖြေကြားရန်',
    icon: '⭐',
  },
  {
    id: 'inquiry',
    title: 'Inquiry Reply',
    subtitle: 'ဈေးနှုန်း / package / booking မေးလာရင်ပြန်ဖြေရန်',
    icon: '💬',
  },
];

const QUICK_NOTES: Record<MessageMode, string[]> = {
  reminder: [
    'Studio ကို 15 မိနစ်လောက်စောရောက်ပေးပါ',
    'Outfit / accessories ကိုကြိုပြင်ထားပေးပါ',
    'Reference pose ပုံလေးတွေရှိရင်ယူလာပေးပါ',
  ],
  followup: [
    'ဒီနေ့ရိုက်ကူးရေးအတွက် ကျေးဇူးတင်ပါတယ်',
    'ပုံအပ်မယ့် update ကို ဒီ Message မှာပဲဆက်ပို့ပါမယ်',
    'လိုချင်တဲ့ retouch note ရှိရင်ပြောပေးပါ',
  ],
  review: [
    'Service ကိုကျေနပ်တယ်ဆိုရင် review လေးပေးခဲ့ပါနော်',
    'အားနည်းချက်ရှိရင်လည်း ပြောပြပေးပါ',
    'နောက်တစ်ခါထပ်ဆုံချင်ပါတယ်',
  ],
  inquiry: [
    'Package detail ကိုနူးညံ့စွာရှင်းပြပါ',
    'Price မသေချာရင် Message မှာ detail မေးရန်ပဲပြောပါ',
    'Booking date ရနိုင်မရနိုင်မေးပါ',
  ],
};

const PACKAGE_PREP = {
  label: 'General Studio / Event Shoot',
  subtitle: 'With You Photo Studio client care message',
  dos: [
    'ရိုက်ကူးရေးအချိန်မတိုင်ခင် အေးအေးဆေးဆေးရောက်လာပေးပါ',
    'Outfit, accessories, reference mood ပုံလေးတွေရှိရင်ကြိုပြင်ထားပေးပါ',
    'လိုချင်တဲ့ pose / angle / mood ရှိရင် team ကိုကြိုပြောပေးပါ',
  ],
  donts: [
    'အချိန်နီးမှ schedule အပြောင်းအလဲကြီးကြီးမားမားမလုပ်ပေးပါနဲ့',
    'မသေချာတဲ့ package promise / delivery detail ကို booking chat ထဲမှာပြန်စစ်ပေးပါ',
  ],
};

const modeLabel = (mode: MessageMode) => MESSAGE_MODES.find((item) => item.id === mode)?.title || 'Client Message';

const historyTypeForMode = (mode: MessageMode): GeneratedHistoryType => {
  if (mode === 'reminder') return 'Reminder';
  if (mode === 'followup') return 'Follow-up';
  return 'Other';
};

const ClientMessageCenter: React.FC = () => {
  const [mode, setMode] = useState<MessageMode>('reminder');
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [shootTime, setShootTime] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const selectedMode = useMemo(() => MESSAGE_MODES.find((item) => item.id === mode) || MESSAGE_MODES[0], [mode]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const addNote = (note: string) => {
    setNotes((current) => current.trim() ? `${current.trim()}\n- ${note}` : `- ${note}`);
  };

  const buildContext = () => [
    clientName.trim() ? `Client: ${clientName.trim()}` : '',
    service.trim() ? `Service/package: ${service.trim()}` : '',
    shootDate ? `Shoot date: ${shootDate}` : '',
    shootTime ? `Shoot time: ${shootTime}` : '',
    clientMessage.trim() ? `Client message/review:\n${clientMessage.trim()}` : '',
    notes.trim() ? `Studio note:\n${notes.trim()}` : '',
  ].filter(Boolean).join('\n\n');

  const generateMessage = async () => {
    setLoading(true);
    setError('');
    setOutput('');

    try {
      let resultText = '';
      const context = buildContext();

      if (mode === 'reminder') {
        resultText = await generateClientReminder({
          clientName,
          shootDate,
          shootTime,
          packageLabel: service.trim() || PACKAGE_PREP.label,
          packageSubtitle: PACKAGE_PREP.subtitle,
          dos: PACKAGE_PREP.dos,
          donts: PACKAGE_PREP.donts,
          extraNote: notes,
          baseReminder: context,
        });
      } else if (mode === 'review') {
        if (clientMessage.trim()) {
          const review = await generateReviewReply(clientMessage, rating);
          resultText = review.reply;
        } else {
          const script = await generateSalesScripts('ရိုက်ကူးရေးပြီးသွားတဲ့ Client ကို Review တောင်းနည်း', context);
          resultText = script.script;
        }
      } else if (mode === 'followup') {
        const script = await generateSalesScripts(
          'Shoot ပြီးတဲ့ client အတွက် ကျေးဇူးတင် / delivery update / retouch note message ရေးရန်',
          context || 'Shoot ပြီးတဲ့ client အတွက် follow-up message ရေးပါ။'
        );
        resultText = script.script;
      } else {
        const script = await generateSalesScripts(
          'Client inquiry ကို professional ဆန်ဆန်ပြန်ဖြေရန်',
          context || 'Client က package / booking / price မေးလာသောအခါ ပြန်ဖြေရန် message ရေးပါ။'
        );
        resultText = script.script;
      }

      const cleanText = resultText.trim();
      setOutput(cleanText);
      saveGeneratedHistory({
        type: historyTypeForMode(mode),
        title: `${clientName || 'Client'} - ${modeLabel(mode)}`,
        subtitle: service || selectedMode.subtitle,
        content: cleanText,
        tab: AppTab.CLIENT_MESSAGE_CENTER,
      });
      showToast('Message ကိုရေးပြီးပါပြီ။ လိုသလိုပြင်ပြီး copy လုပ်နိုင်ပါတယ်။');
    } catch (err: any) {
      setError(err?.message || 'Message ထုတ်ရာတွင် အခက်အခဲရှိနေပါသည်။');
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async () => {
    if (!output.trim()) return;
    await navigator.clipboard.writeText(output);
    saveGeneratedHistory({
      type: historyTypeForMode(mode),
      title: `${clientName || 'Client'} - Copied ${modeLabel(mode)}`,
      subtitle: service || selectedMode.subtitle,
      content: output,
      tab: AppTab.CLIENT_MESSAGE_CENTER,
    });
    showToast('Message ကို copy လုပ်ပြီးပါပြီ။');
  };

  return (
    <div className="space-y-6 burmese-text pb-10">
      {toast && (
        <div className="fixed top-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-2xl">
          {toast}
        </div>
      )}

      <header className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Client Care Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Client Message Center</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-400">
          Reminder, follow-up, review, inquiry reply တွေကို တစ်နေရာတည်းကနေရေးပြီး Messenger / Viber / SMS မှာတန်းပို့နိုင်အောင် စုထားပါတယ်။
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MESSAGE_MODES.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setOutput('');
                setError('');
              }}
              className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                active
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                  : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="text-2xl">{item.icon}</div>
              <div className="mt-3 text-sm font-black">{item.title}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.subtitle}</p>
            </button>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-4 rounded-[2rem] border border-slate-800 bg-slate-900/50 p-5 md:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Client Name</label>
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-amber-500"
                placeholder="ဥပမာ - မစုစု"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Service / Package</label>
              <input
                value={service}
                onChange={(event) => setService(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-amber-500"
                placeholder="ဥပမာ - Pre-wedding / Sweet 17 / Donation"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Shoot Date</label>
              <input
                type="date"
                value={shootDate}
                onChange={(event) => setShootDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Shoot Time</label>
              <input
                type="time"
                value={shootTime}
                onChange={(event) => setShootTime(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {mode === 'review' && (
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-all ${rating >= star ? 'scale-110 grayscale-0' : 'grayscale opacity-30'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {mode === 'review' ? 'Client Review / Blank ဆို Review Request ရေးမယ်' : 'Client Message / Context'}
            </label>
            <textarea
              value={clientMessage}
              onChange={(event) => setClientMessage(event.target.value)}
              className="min-h-[120px] w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100 outline-none focus:border-amber-500"
              placeholder="Client မေးလာတဲ့စာ / review / booking context ကိုထည့်ပါ..."
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Studio Notes</label>
              {notes && (
                <button type="button" onClick={() => setNotes('')} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-400">Clear</button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[110px] w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100 outline-none focus:border-amber-500"
              placeholder="ထည့်ပြောချင်တဲ့အချက်တွေ..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_NOTES[mode].map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => addNote(note)}
                  className="rounded-full border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-bold text-slate-400 hover:border-amber-500/40 hover:text-amber-300"
                >
                  + {note}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={generateMessage}
            disabled={loading}
            className="w-full rounded-2xl bg-amber-500 px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all hover:bg-amber-400 disabled:opacity-40"
          >
            {loading ? 'AI က Message ရေးနေပါတယ်...' : `${selectedMode.title} ရေးမယ်`}
          </button>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-5 md:p-7">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Ready To Copy</p>
              <h2 className="mt-1 text-2xl font-black text-white">{selectedMode.title}</h2>
            </div>
            <button
              type="button"
              onClick={copyMessage}
              disabled={!output.trim()}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-30"
            >
              COPY MESSAGE
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-relaxed text-red-200">
              {error}
            </div>
          )}

          {!output && !loading && (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-800 bg-slate-950/30 p-8 text-center">
              <div className="text-5xl opacity-20">{selectedMode.icon}</div>
              <p className="mt-5 max-w-sm text-sm font-bold leading-relaxed text-slate-500">
                ဘယ်ဘက်မှာ client info ထည့်ပြီး generate နှိပ်ပါ။ Output ထွက်လာရင် ဒီနေရာကနေပြင်၊ copy လုပ်ပြီး Messenger/Viber/SMS မှာတန်းပို့နိုင်ပါတယ်။
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="h-56 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-950/60" />
              <div className="h-24 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-950/60" />
            </div>
          )}

          {output && (
            <textarea
              value={output}
              onChange={(event) => setOutput(event.target.value)}
              className="min-h-[520px] w-full resize-y rounded-[2rem] border border-slate-800 bg-slate-950/80 p-5 text-sm leading-relaxed text-slate-100 outline-none focus:border-emerald-500"
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default ClientMessageCenter;
