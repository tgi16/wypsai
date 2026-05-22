import React, { useEffect, useMemo, useState } from 'react';
import { generateClientReminder } from '../geminiService';
import { AppTab } from '../types';
import { saveGeneratedHistory } from '../generatedHistory';

type PackageKey = 'indoor' | 'prewedding' | 'wedding' | 'family' | 'birthday' | 'donation';

const PACKAGE_OPTIONS: Array<{
  id: PackageKey;
  label: string;
  subtitle: string;
  dos: string[];
  donts: string[];
}> = [
  {
    id: 'indoor',
    label: 'Indoor Photo Shoot',
    subtitle: 'Solo, Couple, Birthday, Portrait',
    dos: [
      'ရိုက်မယ့် outfit ကို ကြိုတင်ပြင်ဆင်ထားပေးပါ',
      'Makeup / hair style ကို shoot time မတိုင်ခင်ပြီးအောင်စီစဉ်ပေးပါ',
      'Reference pose သို့မဟုတ် mood ပုံလေးတွေရှိရင်ယူလာပေးပါ',
      'အချိန်မီရောက်လာပေးရင် ပိုအေးဆေးရိုက်နိုင်ပါတယ်',
    ],
    donts: [
      'အလွန်တောက်တဲ့ pattern များတဲ့ outfit ကိုရှောင်ပေးပါ',
      'Shoot မတိုင်ခင် အိပ်ရေးပျက်တာကို အတတ်နိုင်ဆုံးရှောင်ပေးပါ',
      'အချိန်နီးမှ outfit ပြောင်းဆုံးဖြတ်တာကိုရှောင်ပေးပါ',
    ],
  },
  {
    id: 'prewedding',
    label: 'Pre-wedding',
    subtitle: 'Pre Wedding Indoor / Outdoor packages from POS master data',
    dos: [
      'Couple outfit / accessories ကိုတစ်စုံချင်းစီခွဲပြီးထည့်ထားပေးပါ',
      'အချိန်ဇယားအတိုင်းရောက်လာပေးရင် look တစ်ခုချင်းစီကိုပိုသေချာရိုက်နိုင်ပါတယ်',
      'Reference mood, preferred pose, မကြိုက်တဲ့ angle ရှိရင်ကြိုပြောပေးပါ',
      'Softcopy/package detail ကို booking chat ထဲကအတိုင်းပြန်စစ်ပေးပါ',
    ],
    donts: [
      'Heavy meal စားပြီးချက်ချင်း shoot ဝင်တာကိုရှောင်ပေးပါ',
      'အဝတ်အစားများလွန်းပြီး plan မရှိဘဲယူလာတာကိုရှောင်ပေးပါ',
      'Shoot day မှာ schedule အပြောင်းအလဲကြီးကြီးမားမားကိုအတတ်နိုင်ဆုံးရှောင်ပေးပါ',
    ],
  },
  {
    id: 'wedding',
    label: 'Wedding Day',
    subtitle: 'Ceremony and reception coverage',
    dos: [
      'ပွဲအစီအစဉ်အချိန်ဇယားကို ကြိုပို့ပေးပါ',
      'မဖြစ်မနေလိုချင်တဲ့ family/group photo list ကိုပြင်ထားပေးပါ',
      'သတို့သား/သတို့သမီး contact person တစ်ယောက်သတ်မှတ်ပေးပါ',
      'ပွဲနေရာ, parking, room access အချက်အလက်လေးတွေကြိုပေးပါ',
    ],
    donts: [
      'အရေးကြီး family photo list ကိုပွဲနေ့မှစစဉ်းစားတာရှောင်ပေးပါ',
      'Photographer team ကိုမသိဘဲ stage/light အပြောင်းအလဲလုပ်တာကိုရှောင်ပေးပါ',
      'အချိန်နီးမှ location ပြောင်းတာကိုအတတ်နိုင်ဆုံးရှောင်ပေးပါ',
    ],
  },
  {
    id: 'family',
    label: 'Family Shoot',
    subtitle: 'Family portrait and group session',
    dos: [
      'Family outfit color tone ကို ကြိုတူညီအောင်ညှိထားပေးပါ',
      'ကလေးပါရင် favorite toy / snack လေးယူလာပေးပါ',
      'အဖွဲ့ဝင်အရေအတွက်နဲ့လိုချင်တဲ့ group pose ကိုကြိုပြောပေးပါ',
    ],
    donts: [
      'ကလေးအိပ်ချိန်နဲ့တိုက်တဲ့ schedule ကိုရှောင်ပေးပါ',
      'အရောင်တအားမကိုက်တဲ့ outfit တွေကိုရှောင်ပေးပါ',
      'အချိန်နီးမှ family member အများကြီးထပ်တိုးတာကိုရှောင်ပေးပါ',
    ],
  },
  {
    id: 'birthday',
    label: 'Birthday / Sweet 17',
    subtitle: 'Birthday concept and studio setup',
    dos: [
      'Birthday dress, shoes, accessories ကိုကြိုပြင်ထားပေးပါ',
      'Cake / bouquet / props ပါရင် shoot time မတိုင်ခင်ရောက်အောင်စီစဉ်ပေးပါ',
      'လိုချင်တဲ့ mood ကို reference ပုံ 2-3 ပုံလောက်ပို့ပေးပါ',
    ],
    donts: [
      'Shoot မတိုင်ခင် dress fitting မစမ်းထားတာကိုရှောင်ပေးပါ',
      'Props ကိုအချိန်နီးမှစီစဉ်တာကိုရှောင်ပေးပါ',
      'Makeup အရမ်းနောက်ကျတာကိုရှောင်ပေးပါ',
    ],
  },
  {
    id: 'donation',
    label: 'Donation / Monk Offering',
    subtitle: 'Taunggyi event coverage',
    dos: [
      'ပွဲအစီအစဉ်နဲ့အချိန်ဇယားကိုကြိုပို့ပေးပါ',
      'အဓိကရိုက်စေချင်တဲ့ moment / လူပုဂ္ဂိုလ်များကိုကြိုပြောပေးပါ',
      'နေရာအပြောင်းအလဲရှိရင် photographer team ကိုကြိုအသိပေးပါ',
    ],
    donts: [
      'ပွဲစပြီးမှ အရေးကြီးအစီအစဉ်ပြောင်းတာကိုအတတ်နိုင်ဆုံးရှောင်ပေးပါ',
      'Photographer access မရနိုင်တဲ့နေရာကိုကြိုမပြောဘဲထားတာကိုရှောင်ပေးပါ',
      'CD / Raw / Edit detail ကို package နဲ့မကိုက်ဘဲမျှော်လင့်တာမဖြစ်အောင်ကြိုစစ်ပေးပါ',
    ],
  },
];

const ClientReminder: React.FC = () => {
  const [clientName, setClientName] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [shootTime, setShootTime] = useState('');
  const [packageKey, setPackageKey] = useState<PackageKey>('indoor');
  const [extraNote, setExtraNote] = useState('');
  const [aiReminder, setAiReminder] = useState('');
  const [editableReminder, setEditableReminder] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const selectedPackage = PACKAGE_OPTIONS.find((item) => item.id === packageKey) || PACKAGE_OPTIONS[0];

  useEffect(() => {
    const savedPrefill = localStorage.getItem('wyps_client_reminder_prefill');
    if (!savedPrefill) return;

    try {
      const prefill = JSON.parse(savedPrefill);
      if (typeof prefill.clientName === 'string') setClientName(prefill.clientName);
      if (typeof prefill.shootDate === 'string') setShootDate(prefill.shootDate);
      if (typeof prefill.shootTime === 'string') setShootTime(prefill.shootTime);
      if (PACKAGE_OPTIONS.some((item) => item.id === prefill.packageKey)) {
        setPackageKey(prefill.packageKey);
      }
      if (typeof prefill.extraNote === 'string') setExtraNote(prefill.extraNote);
      setToast('POS booking data ကို Client Reminder ထဲဖြည့်ပြီးပါပြီ။');
      window.setTimeout(() => setToast(''), 2600);
    } catch (error) {
      console.error('Failed to load POS reminder prefill:', error);
    } finally {
      localStorage.removeItem('wyps_client_reminder_prefill');
    }
  }, []);

  const reminderText = useMemo(() => {
    const greetingName = clientName.trim() ? `${clientName.trim()} ရေ` : 'မင်္ဂလာပါရှင်';
    const dateLine = shootDate || shootTime
      ? `မနက်ဖြန် ရိုက်ကူးရေးအတွက် ${shootDate ? `နေ့ရက်: ${shootDate}` : ''}${shootDate && shootTime ? '၊ ' : ''}${shootTime ? `အချိန်: ${shootTime}` : ''} လေးကို ပြန်သတိပေးလိုက်ပါတယ်။`
      : 'မနက်ဖြန် ရိုက်ကူးရေးရှိတာလေးကို နွေးနွေးထွေးထွေး ပြန်သတိပေးလိုက်ပါတယ်။';

    return [
      `${greetingName}။`,
      '',
      dateLine,
      `Package: ${selectedPackage.label}`,
      '',
      'အေးအေးဆေးဆေးနဲ့ လှလှပပရိုက်နိုင်ဖို့ အောက်ကအချက်လေးတွေကို ကြိုပြင်ထားပေးပါနော်။',
      '',
      'ဆောင်ရန်',
      ...selectedPackage.dos.map((item) => `- ${item}`),
      '',
      'ရှောင်ရန်',
      ...selectedPackage.donts.map((item) => `- ${item}`),
      extraNote.trim() ? `\nထပ်မံအသိပေးလိုတာလေး\n${extraNote.trim()}` : '',
      '',
      'မေးချင်တာရှိရင် Message မှာ အချိန်မရွေးမေးလို့ရပါတယ်ရှင်။',
      'With You Photo Studio မှ သေချာလေးဂရုစိုက်ပေးပါမယ်။',
    ].filter(Boolean).join('\n');
  }, [clientName, extraNote, selectedPackage, shootDate, shootTime]);

  const finalReminderText = editableReminder || aiReminder || reminderText;
  const hasAiReminder = Boolean(aiReminder);

  useEffect(() => {
    setAiReminder('');
    setEditableReminder('');
    setError('');
  }, [clientName, shootDate, shootTime, packageKey, extraNote]);

  const generateWarmReminder = async () => {
    setGenerating(true);
    setError('');

    try {
      const message = await generateClientReminder({
        clientName,
        shootDate,
        shootTime,
        packageLabel: selectedPackage.label,
        packageSubtitle: selectedPackage.subtitle,
        dos: selectedPackage.dos,
        donts: selectedPackage.donts,
        extraNote,
        baseReminder: reminderText,
      });
      setAiReminder(message);
      setEditableReminder(message);
      saveGeneratedHistory({
        type: 'Reminder',
        title: `${clientName || 'Client'} - Shoot Reminder`,
        subtitle: `${selectedPackage.label}${shootDate ? ` · ${shootDate}` : ''}`,
        content: message,
        tab: AppTab.CLIENT_REMINDER,
      });
      setToast('AI reminder ကိုရေးပြီးပါပြီ။ လိုသလိုပြင်ပြီး copy လုပ်နိုင်ပါပြီ။');
      window.setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'AI reminder ရေးရာတွင် အခက်အခဲရှိနေပါသည်။ Local draft ကိုတော့ copy လုပ်နိုင်ပါတယ်။');
    } finally {
      setGenerating(false);
    }
  };

  const copyReminder = async () => {
    await navigator.clipboard.writeText(finalReminderText);
    saveGeneratedHistory({
      type: 'Reminder',
      title: `${clientName || 'Client'} - Copied Reminder`,
      subtitle: `${selectedPackage.label}${shootDate ? ` · ${shootDate}` : ''}`,
      content: finalReminderText,
      tab: AppTab.CLIENT_REMINDER,
    });
    setToast('Client reminder ကို copy လုပ်ပြီးပါပြီ။');
    window.setTimeout(() => setToast(''), 2600);
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm">
          {toast}
        </div>
      )}

      <header>
        <h1 className="text-3xl md:text-5xl font-black text-white">Client <span className="text-amber-500">Reminder</span></h1>
        <p className="text-slate-400 font-medium mt-2">
          မနက်ဖြန်ရိုက်ကူးရေးအတွက် client ကိုနွေးထွေးပြီး ဂရုစိုက်မှုမြင်သာတဲ့ reminder ပို့ရန်။
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-5 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Client Name</label>
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="ဥပမာ - မစုစု"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Shoot Date</label>
              <input
                type="date"
                value={shootDate}
                onChange={(event) => setShootDate(event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Shoot Time</label>
              <input
                type="time"
                value={shootTime}
                onChange={(event) => setShootTime(event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Package Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PACKAGE_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPackageKey(item.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    packageKey === item.id
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <p className="font-black text-sm">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Extra Note</label>
            <textarea
              value={extraNote}
              onChange={(event) => setExtraNote(event.target.value)}
              placeholder="ဥပမာ - အဝတ်အစား ၂ စုံယူလာပေးပါ / Studio ကို 15 မိနစ်စောရောက်ပေးပါ"
              className="w-full min-h-[120px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 outline-none focus:border-amber-500 resize-y"
            />
          </div>
        </section>

        <section className="xl:col-span-7 bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-black text-white">Reminder Message</h2>
              <p className="text-slate-500 text-sm mt-1">
                Basic draft မဟုတ်ဘဲ API နဲ့ အစအဆုံးအသစ်ရေးပြီး Messenger / Viber / SMS မှာ တန်းပို့နိုင်ပါတယ်။
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={generateWarmReminder}
                disabled={generating}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-black text-sm transition-colors"
              >
                {generating ? 'AI ရေးနေပါပြီ...' : 'AI နဲ့ အစအဆုံးရေးမယ်'}
              </button>
              <button
                onClick={copyReminder}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-colors"
              >
                COPY REMINDER
              </button>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 leading-relaxed">
            <span className="font-black">အသုံးပြုပုံ:</span> အရင် basic draft ကို reference အနေနဲ့ကြည့်ပါ။ ပိုကောင်းတဲ့ final message လိုချင်ရင် AI ခလုတ်နှိပ်ပါ။ AI က အစအဆုံးအသစ်ရေးပေးပြီး ထွက်လာတဲ့စာသားကို လိုသလိုပြင်ပြီး Copy လုပ်နိုင်ပါတယ်။
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[10px] font-black tracking-[0.18em] ${
              hasAiReminder ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {hasAiReminder ? 'AI ENHANCED' : 'LOCAL DRAFT'}
            </span>
            <span className="text-xs text-slate-500">API မရရင် local draft ကို fallback အနေနဲ့သုံးနိုင်ပါတယ်။</span>
          </div>

          <textarea
            value={finalReminderText}
            onChange={(event) => {
              setEditableReminder(event.target.value);
            }}
            className="w-full min-h-[520px] bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-slate-200 leading-relaxed whitespace-pre-wrap text-sm outline-none focus:border-amber-500 resize-y"
          />
        </section>
      </div>
    </div>
  );
};

export default ClientReminder;
