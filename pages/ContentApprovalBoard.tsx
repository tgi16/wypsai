import React, { useEffect, useMemo, useState } from 'react';
import { AppTab } from '../types';
import { ApprovalItem, ApprovalStatus, deleteApprovalItem, readApprovalItems, reuseApprovalItem, updateApprovalStatus } from '../workflowBoard';

interface ContentApprovalBoardProps {
  onNavigate: (tab: AppTab) => void;
}

const STATUSES: ApprovalStatus[] = ['Draft', 'Ready', 'Scheduled', 'Posted'];

const statusStyle: Record<ApprovalStatus, string> = {
  Draft: 'border-slate-700 bg-slate-900 text-slate-300',
  Ready: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Scheduled: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  Posted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const ContentApprovalBoard: React.FC<ContentApprovalBoardProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [toast, setToast] = useState('');

  const refresh = () => setItems(readApprovalItems());

  useEffect(() => {
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('wyps_content_board_updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('wyps_content_board_updated', refresh);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => [
      item.title,
      item.subtitle,
      item.facebookCaption,
      item.tiktokCaption,
      item.status,
      item.clientName || '',
      item.packageName || '',
    ].some((value) => value.toLowerCase().includes(keyword)));
  }, [items, search]);

  const grouped = useMemo(() => Object.fromEntries(
    STATUSES.map((status) => [status, filteredItems.filter((item) => item.status === status)])
  ) as Record<ApprovalStatus, ApprovalItem[]>, [filteredItems]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copy လုပ်ပြီးပါပြီ။`);
  };

  const setStatus = (item: ApprovalItem, status: ApprovalStatus) => {
    updateApprovalStatus(item.id, status);
    if (selectedItem?.id === item.id) setSelectedItem({ ...item, status });
    showToast(`${item.title} ကို ${status} အဖြစ်မှတ်ပြီးပါပြီ။`);
  };

  return (
    <div className="space-y-6 burmese-text pb-12">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl">
          {toast}
        </div>
      )}

      <header className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20 p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300">Content Workflow</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white md:text-5xl">Content <span className="text-emerald-300">Approval Board</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Generated posts တွေကို Draft, Ready, Scheduled, Posted အဖြစ်ခွဲထားနိုင်ပါတယ်။ တင်ပြီး/မတင်ရသေးတာမရှုပ်တော့အောင်ပါ။
            </p>
          </div>
          <button onClick={() => onNavigate(AppTab.CONTENT_GEN)} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950">
            New Content
          </button>
        </div>
      </header>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-emerald-400"
        placeholder="Client, package, caption, status ဖြင့်ရှာရန်..."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <div key={status} className="rounded-[1.75rem] border border-slate-800 bg-slate-900/35 p-4">
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-black ${statusStyle[status]}`}>
              {status} · {grouped[status].length}
            </div>
            <div className="space-y-3">
              {grouped[status].map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <h2 className="line-clamp-2 text-sm font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{item.subtitle || item.createdAt}</p>
                  <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{item.facebookCaption}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => setSelectedItem(item)} className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black text-white">View</button>
                    <button onClick={() => copy(item.facebookCaption, 'Facebook Caption')} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-black text-white">Copy</button>
                    <button
                      onClick={() => {
                        const tab = reuseApprovalItem(item);
                        onNavigate(tab);
                      }}
                      className="rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-slate-950"
                    >
                      Reuse
                    </button>
                    <button
                      onClick={() => {
                        deleteApprovalItem(item.id);
                        showToast('Content item ကိုဖျက်ပြီးပါပြီ။');
                      }}
                      className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {grouped[status].length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-600">Empty</div>
              )}
            </div>
          </div>
        ))}
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusStyle[selectedItem.status]}`}>{selectedItem.status}</span>
                <h2 className="mt-3 text-xl font-black text-white">{selectedItem.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedItem.subtitle}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-2xl text-slate-500 hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Facebook Caption</div>
                  <pre className="whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-relaxed text-slate-100">{selectedItem.facebookCaption}</pre>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">TikTok Caption</div>
                  <pre className="whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-relaxed text-slate-100">{selectedItem.tiktokCaption || 'TikTok caption မရှိသေးပါ။'}</pre>
                </div>
              </div>
            </div>
            <div className="grid gap-2 border-t border-slate-800 p-5 sm:grid-cols-4">
              {STATUSES.map((status) => (
                <button key={status} onClick={() => setStatus(selectedItem, status)} className={`rounded-2xl border px-4 py-3 text-xs font-black ${statusStyle[status]}`}>
                  Mark {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentApprovalBoard;
