import React, { useMemo, useState } from 'react';
import { getAuthorizedJsonHeaders } from '../apiClient';

type TokenStatus = 'ok' | 'warn' | 'fail';

type TokenReport = {
  key: string;
  label: string;
  status: TokenStatus;
  configured: boolean;
  valid: boolean;
  tokenMask?: string;
  pageId?: string;
  pageName?: string;
  adAccountId?: string;
  adAccountName?: string;
  ownerName?: string;
  tokenType?: string;
  appId?: string;
  expiresAt?: string;
  dataAccessExpiresAt?: string;
  daysLeft?: number | null;
  scopes?: string[];
  canDebugExpiry?: boolean;
  message?: string;
  action?: string;
  warnings?: string[];
  checkedAt?: string;
};

type TokenManagerResponse = {
  ok: boolean;
  canDebugExpiry: boolean;
  checkedAt: string;
  tokens: TokenReport[];
  error?: string;
};

const statusStyles: Record<TokenStatus, string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  fail: 'border-red-500/30 bg-red-500/10 text-red-200',
};

const statusLabel: Record<TokenStatus, string> = {
  ok: 'OK',
  warn: 'CHECK',
  fail: 'FAILED',
};

const formatDate = (value?: string) => {
  if (!value) return 'မသိရသေးပါ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'မသိရသေးပါ';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getLocalTokenInfo = () => ({
  pageId: localStorage.getItem('fb_page_id') || '',
  pageToken: localStorage.getItem('fb_page_token') || '',
});

const TokenManager: React.FC = () => {
  const [pageId, setPageId] = useState(() => getLocalTokenInfo().pageId);
  const [pageToken, setPageToken] = useState(() => getLocalTokenInfo().pageToken);
  const [report, setReport] = useState<TokenManagerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    const tokens = report?.tokens || [];
    const fail = tokens.filter((token) => token.status === 'fail').length;
    const warn = tokens.filter((token) => token.status === 'warn').length;
    if (!tokens.length) return { label: 'စစ်ဆေးရန် အသင့်ပါ', tone: 'text-slate-300' };
    if (fail) return { label: `${fail} ခု အရေးယူရန်လိုပါတယ်`, tone: 'text-red-300' };
    if (warn) return { label: `${warn} ခု စစ်ရန်ရှိပါတယ်`, tone: 'text-amber-300' };
    return { label: 'Token အားလုံး အလုပ်လုပ်နေပါတယ်', tone: 'text-emerald-300' };
  }, [report]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const savePageToken = () => {
    localStorage.setItem('fb_page_id', pageId.trim());
    localStorage.setItem('fb_page_token', pageToken.trim());
    showToast('Page token ကို ဒီ browser ထဲသိမ်းပြီးပါပြီ။');
  };

  const clearPageToken = () => {
    localStorage.removeItem('fb_page_id');
    localStorage.removeItem('fb_page_token');
    setPageId('');
    setPageToken('');
    showToast('Page token ကို browser ထဲကနေဖျက်ပြီးပါပြီ။');
  };

  const runCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/token-manager', {
        method: 'POST',
        headers: await getAuthorizedJsonHeaders(),
        body: JSON.stringify({
          pageId: pageId.trim(),
          pageToken: pageToken.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || 'Token Manager check failed.');
      setReport(data);
      showToast('Token status ကို update လုပ်ပြီးပါပြီ။');
    } catch (err: any) {
      setError(err?.message || 'Token status စစ်ရာတွင် အခက်အခဲရှိနေပါသည်။');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 burmese-text pb-12">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-2xl">
          {toast}
        </div>
      )}

      <header className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/30 p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-300">Security & API Control</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Token <span className="text-blue-300">Manager</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Facebook Page post token, Insights token expiry/permission/status တွေကို တစ်နေရာတည်းမှာစစ်ရန်ပါ။ Token အပြည့်အစုံကို UI မှာမပြပါ။
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className={`text-sm font-black ${summary.tone}`}>{summary.label}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {report?.checkedAt ? `Checked ${formatDate(report.checkedAt)}` : 'Not checked yet'}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            onClick={runCheck}
            disabled={loading}
            className="rounded-2xl bg-blue-500 px-5 py-4 text-sm font-black text-white hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {loading ? 'CHECKING...' : 'CHECK TOKENS'}
          </button>
          <button
            onClick={savePageToken}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black text-white hover:bg-slate-800"
          >
            SAVE PAGE TOKEN
          </button>
          <button
            onClick={clearPageToken}
            className="rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm font-black text-red-200 hover:bg-red-500/15"
          >
            CLEAR PAGE TOKEN
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5 md:p-6">
        <h2 className="text-xl font-black text-white">Facebook Page Post Token</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          ဒီ token က Post to Facebook / Schedule Facebook အတွက်သုံးတာပါ။ Browser ထဲမှာသိမ်းထားတာကိုစစ်ပေးမယ်။
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Page ID</label>
            <input
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-blue-400"
              placeholder="1864899403632386"
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Page Access Token</label>
            <input
              value={pageToken}
              onChange={(event) => setPageToken(event.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-blue-400"
              placeholder="EA..."
              type="password"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {(report?.tokens || []).map((token) => (
          <article key={token.key} className={`rounded-[2rem] border p-5 md:p-6 ${statusStyles[token.status]}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{statusLabel[token.status]}</div>
                <h2 className="mt-2 text-xl font-black text-white">{token.label}</h2>
                <p className="mt-2 text-sm leading-relaxed">{token.message || 'စစ်ဆေးပြီးပါပြီ။'}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                {token.valid ? 'VALID' : 'INVALID'}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Token" value={token.tokenMask || 'မရှိသေးပါ'} />
              <Info label="Type" value={token.tokenType || 'မသိရသေးပါ'} />
              <Info label="Page / Account" value={token.pageName || token.adAccountName || token.adAccountId || 'မသိရသေးပါ'} />
              <Info label="Owner" value={token.ownerName || token.pageId || 'မသိရသေးပါ'} />
              <Info label="Expires" value={formatDate(token.expiresAt)} emphasis={token.daysLeft !== null && token.daysLeft !== undefined ? `${token.daysLeft} days left` : 'unknown'} />
              <Info label="Data Access" value={formatDate(token.dataAccessExpiresAt)} />
            </div>

            {token.scopes?.length ? (
              <div className="mt-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Permissions</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {token.scopes.map((scope) => (
                    <span key={scope} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black text-slate-100">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(token.action || token.warnings?.length) && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-slate-100">
                {token.action || token.warnings?.join('\n')}
              </div>
            )}
          </article>
        ))}

        {!report && (
          <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-sm leading-relaxed text-slate-500 lg:col-span-2">
            `CHECK TOKENS` နှိပ်လိုက်ရင် Page token နဲ့ Insights token status ကိုစစ်ပေးပါမယ်။
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-relaxed text-slate-300">
        <div className="font-black text-amber-300">Expiry အကြောင်း</div>
        <p className="mt-2">
          Meta token expiry ကိုတိတိကျကျပြဖို့ Vercel env ထဲမှာ `FACEBOOK_APP_ACCESS_TOKEN` သို့မဟုတ် `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` ရှိရပါမယ်။
          မရှိသေးရင် Token Manager က valid/invalid, page/ad account access, permission issue ကိုစစ်ပေးနိုင်ပြီး expiry ကို “မသိရသေးပါ” လို့ပြပါမယ်။
        </p>
      </section>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string; emphasis?: string }> = ({ label, value, emphasis }) => (
  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
    <div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-60">{label}</div>
    <div className="mt-1 break-words text-sm font-black text-white">{value}</div>
    {emphasis && <div className="mt-1 text-[10px] font-bold opacity-70">{emphasis}</div>}
  </div>
);

export default TokenManager;
