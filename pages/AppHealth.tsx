import React, { useMemo, useState } from 'react';
import { getGeminiRequestHeaders } from '../geminiService';
import { POS_SESSION_KEY } from '../pricingCatalog';
import { getAuthorizedJsonHeaders } from '../apiClient';

type CheckStatus = 'idle' | 'checking' | 'ok' | 'warn' | 'fail';

interface CheckItem {
  id: string;
  title: string;
  detail: string;
  status: CheckStatus;
  action?: string;
  latencyMs?: number;
}

const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const statusStyle: Record<CheckStatus, string> = {
  idle: 'border-slate-800 bg-slate-900/45 text-slate-400',
  checking: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  fail: 'border-red-500/30 bg-red-500/10 text-red-200',
};

const statusLabel: Record<CheckStatus, string> = {
  idle: 'WAIT',
  checking: 'CHECKING',
  ok: 'OK',
  warn: 'CHECK',
  fail: 'FAILED',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown error');
};

const timedFetch = async (url: string, init?: RequestInit) => {
  const started = performance.now();
  const response = await fetch(url, init);
  const latencyMs = Math.round(performance.now() - started);
  return { response, latencyMs };
};

const AppHealth: React.FC = () => {
  const [items, setItems] = useState<CheckItem[]>([
    {
      id: 'browser',
      title: 'Browser Network',
      detail: 'ဖုန်း/ကွန်ပျူတာက internet request ထွက်နိုင်လား စစ်ရန်။',
      status: 'idle',
    },
    {
      id: 'gemini',
      title: 'Gemini API via Vercel',
      detail: 'AI content generate အတွက် backend route အလုပ်လုပ်လား စစ်ရန်။',
      status: 'idle',
    },
    {
      id: 'insights',
      title: 'Facebook Insights',
      detail: 'Sai Lao ad account insights token နဲ့ data ဖတ်နိုင်လား စစ်ရန်။',
      status: 'idle',
    },
    {
      id: 'facebookPost',
      title: 'Facebook Page Post Token',
      detail: 'Page ID/Page Access Token မှန်လား စစ်ရန်။',
      status: 'idle',
    },
    {
      id: 'pos',
      title: 'POS Saved Session',
      detail: 'POS Booking Tracker login session ရှိ/မရှိ စစ်ရန်။',
      status: 'idle',
    },
  ]);
  const [lastChecked, setLastChecked] = useState('');

  const summary = useMemo(() => {
    const fail = items.filter((item) => item.status === 'fail').length;
    const warn = items.filter((item) => item.status === 'warn').length;
    const ok = items.filter((item) => item.status === 'ok').length;
    if (fail > 0) return { label: 'Action လိုနေပါတယ်', tone: 'text-red-300', icon: '⚠️' };
    if (warn > 0) return { label: 'သုံးလို့ရပေမယ့် စစ်ရန်ရှိပါတယ်', tone: 'text-amber-300', icon: '🟡' };
    if (ok === items.length) return { label: 'အကုန် အဆင်ပြေပါတယ်', tone: 'text-emerald-300', icon: '✅' };
    return { label: 'စစ်ဆေးရန် အသင့်ပါ', tone: 'text-slate-300', icon: '🩺' };
  }, [items]);

  const patchItem = (id: string, patch: Partial<CheckItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const runChecks = async () => {
    setLastChecked('');
    items.forEach((item) => patchItem(item.id, { status: 'checking', latencyMs: undefined }));

    try {
      const { response, latencyMs } = await timedFetch(`${window.location.origin}/`, { cache: 'no-store' });
      patchItem('browser', {
        status: response.ok ? 'ok' : 'fail',
        detail: response.ok ? `App shell ပြန်လာပါတယ်။ ${latencyMs}ms` : `App shell status ${response.status}`,
        action: response.ok ? '' : 'လိုင်းမကောင်းတာ၊ DNS/Vercel route issue ဖြစ်နိုင်ပါတယ်။ ခဏနေမှပြန်စမ်းပါ။',
        latencyMs,
      });
    } catch (error) {
      patchItem('browser', {
        status: 'fail',
        detail: getErrorMessage(error),
        action: 'Internet line/DNS/Vercel route ကိုစစ်ပါ။ VPN မဟုတ်ဘဲ local line issue ဖြစ်နိုင်ပါတယ်။',
      });
    }

    try {
      const { response, latencyMs } = await timedFetch('/api/gemini', {
        method: 'POST',
        headers: await getGeminiRequestHeaders(),
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: 'Reply OK only.' }] },
        }),
      });
      const data = await response.json().catch(() => ({}));
      patchItem('gemini', {
        status: response.ok && !data.error ? 'ok' : 'fail',
        detail: response.ok && !data.error ? `AI backend OK. ${latencyMs}ms` : (data.error || `Status ${response.status}`),
        action: response.ok && !data.error
          ? ''
          : response.status === 401
            ? 'ဘေးဘက် menu မှ owner Google Login ဝင်ပြီး ပြန်စစ်ပါ။'
            : 'Gemini API key/Vercel backend route ကိုစစ်ရန်လိုပါတယ်။',
        latencyMs,
      });
    } catch (error) {
      patchItem('gemini', {
        status: 'fail',
        detail: getErrorMessage(error),
        action: 'လိုင်းမကောင်းတာ သို့မဟုတ် /api/gemini route timeout ဖြစ်နိုင်ပါတယ်။',
      });
    }

    try {
      const { response, latencyMs } = await timedFetch('/api/facebook-insights', {
        method: 'POST',
        headers: await getAuthorizedJsonHeaders(),
        body: JSON.stringify({ source: 'ad_account', days: 30, limit: 3 }),
      });
      const data = await response.json().catch(() => ({}));
      const fallback = data.source === 'Fallback content direction';
      patchItem('insights', {
        status: response.ok && !data.error ? (fallback ? 'warn' : 'ok') : 'fail',
        detail: response.ok && !data.error
          ? `${data.source || 'Insights'}: ${data.postsAnalyzed || 0} rows. ${latencyMs}ms`
          : (data.error || `Status ${response.status}`),
        action: data.warning || (fallback ? 'Insights token ကို ads_read ပါတဲ့ token နဲ့ပြန် update လုပ်ပါ။' : ''),
        latencyMs,
      });
    } catch (error) {
      patchItem('insights', {
        status: 'fail',
        detail: getErrorMessage(error),
        action: 'Insights token/Vercel env သို့မဟုတ် network route ကိုစစ်ပါ။',
      });
    }

    const fbPageId = localStorage.getItem('fb_page_id') || '';
    const fbPageToken = localStorage.getItem('fb_page_token') || '';
    if (!fbPageId || !fbPageToken) {
      patchItem('facebookPost', {
        status: 'warn',
        detail: 'Page ID သို့မဟုတ် Page Access Token ကို ဒီ browser ထဲမှာမတွေ့ပါ။',
        action: 'Content Factory > Facebook Page Setup မှာ Page ID/Token ထည့်ပါ။',
      });
    } else {
      try {
        const { response, latencyMs } = await timedFetch('/api/facebook-token-check', {
          method: 'POST',
          headers: await getAuthorizedJsonHeaders(),
          body: JSON.stringify({ pageId: fbPageId, pageToken: fbPageToken }),
        });
        const data = await response.json().catch(() => ({}));
        patchItem('facebookPost', {
          status: response.ok && data.ok ? 'ok' : 'fail',
          detail: response.ok && data.ok ? `${data.pageName} (${data.pageId}) OK. ${latencyMs}ms` : (data.error || `Status ${response.status}`),
          action: response.ok && data.ok ? '' : 'Page Access Token အသစ်ပြန်ထုတ်ပြီး Content Factory ထဲပြန်ထည့်ပါ။',
          latencyMs,
        });
      } catch (error) {
        patchItem('facebookPost', {
          status: 'fail',
          detail: getErrorMessage(error),
          action: 'Facebook token check route သို့မဟုတ် local line ကိုစစ်ပါ။',
        });
      }
    }

    const posSession = localStorage.getItem(POS_SESSION_KEY);
    if (!posSession) {
      patchItem('pos', {
        status: 'warn',
        detail: 'POS saved session မတွေ့ပါ။',
        action: 'POS Booking Tracker ထဲမှာ login တစ်ခါဝင်ထားပါ။',
      });
    } else {
      try {
        const session = JSON.parse(posSession);
        patchItem('pos', {
          status: session.refreshToken ? 'ok' : 'warn',
          detail: session.email ? `${session.email} session သိမ်းထားပါတယ်။` : 'POS session သိမ်းထားပါတယ်။',
          action: session.refreshToken ? '' : 'Refresh token မတွေ့လို့ POS ထဲမှာ login ပြန်ဝင်ပါ။',
        });
      } catch {
        patchItem('pos', {
          status: 'warn',
          detail: 'POS saved session ဖတ်မရပါ။',
          action: 'POS Booking Tracker မှာ login ပြန်ဝင်ပါ။',
        });
      }
    }

    setLastChecked(nowTime());
  };

  return (
    <div className="space-y-6 burmese-text pb-10">
      <header className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Main App Reliability</div>
            <h1 className="mt-2 text-3xl md:text-5xl font-black text-white">App Health <span className="text-amber-400">Check</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              App မတက်တာ, AI မထွက်တာ, Facebook token ပြဿနာ, POS session ပြဿနာတွေကို တစ်ခါတည်းခွဲစစ်ဖို့ပါ။
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left md:text-right">
            <div className={`text-sm font-black ${summary.tone}`}>{summary.icon} {summary.label}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {lastChecked ? `Last checked ${lastChecked}` : 'Not checked yet'}
            </div>
          </div>
        </div>
        <button
          onClick={runChecks}
          className="mt-6 w-full rounded-2xl bg-amber-500 px-6 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all hover:bg-amber-400 active:scale-[0.98] md:w-auto"
        >
          RUN HEALTH CHECK
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className={`rounded-[1.5rem] border p-5 shadow-xl ${statusStyle[item.status]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{statusLabel[item.status]}</div>
                <h2 className="mt-2 text-lg font-black text-white">{item.title}</h2>
              </div>
              {item.status === 'checking' && <div className="h-6 w-6 rounded-full border-2 border-blue-300 border-t-transparent animate-spin" />}
              {item.status === 'ok' && <div className="text-2xl">✅</div>}
              {item.status === 'warn' && <div className="text-2xl">🟡</div>}
              {item.status === 'fail' && <div className="text-2xl">⚠️</div>}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{item.detail}</p>
            {item.action && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-slate-100">
                {item.action}
              </div>
            )}
            {item.latencyMs !== undefined && (
              <div className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-60">Latency {item.latencyMs}ms</div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/5 p-5 text-sm leading-relaxed text-slate-300">
        <div className="font-black text-blue-300">မှတ်ချက်</div>
        <p className="mt-2">
          Health Check က VPN လို/မလို တိုက်ရိုက်မဆုံးဖြတ်ပါဘူး။ ဒါပေမယ့် Browser Network OK ဖြစ်ပြီး API တွေ fail ဖြစ်ရင် token/backend issue ဖြစ်နိုင်ပြီး,
          Browser Network fail ဖြစ်ရင် local line/DNS/ISP route issue ဖြစ်နိုင်ပါတယ်။
        </p>
      </div>
    </div>
  );
};

export default AppHealth;
