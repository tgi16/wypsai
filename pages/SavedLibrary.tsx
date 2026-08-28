import React, { useEffect, useMemo, useState } from 'react';
import { AppTab } from '../types';
import {
  clearGeneratedHistory,
  deleteGeneratedHistory,
  GeneratedHistoryItem,
  GeneratedHistoryType,
  readGeneratedHistory,
} from '../generatedHistory';

interface SavedLibraryProps {
  onNavigate?: (tab: AppTab) => void;
}

const TYPE_FILTERS: Array<GeneratedHistoryType | 'All'> = [
  'All',
  'Content',
  'Reminder',
  'Follow-up',
  'Client Guide',
  'Promotion',
  'Engagement',
  '7-Day Plan',
  'Contract',
  'Concept',
  'Story Book',
];

const typeStyle: Record<string, string> = {
  Content: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  Reminder: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  'Follow-up': 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  'Client Guide': 'border-blue-500/25 bg-blue-500/10 text-blue-300',
  Promotion: 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300',
  Engagement: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  '7-Day Plan': 'border-purple-500/25 bg-purple-500/10 text-purple-300',
  Contract: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  Concept: 'border-lime-500/25 bg-lime-500/10 text-lime-300',
  'Story Book': 'border-yellow-500/25 bg-yellow-500/10 text-yellow-200',
  Other: 'border-slate-700 bg-slate-900 text-slate-300',
};

const FAVORITE_HISTORY_KEY = 'wyps_saved_library_favorites_v1';

const readFavoriteIds = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_HISTORY_KEY) || '[]') as string[];
  } catch {
    return [];
  }
};

const SavedLibrary: React.FC<SavedLibraryProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<GeneratedHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GeneratedHistoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GeneratedHistoryType | 'All'>('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toast, setToast] = useState('');

  const refresh = () => setItems(readGeneratedHistory());

  useEffect(() => {
    refresh();
    setFavorites(readFavoriteIds());
    window.addEventListener('storage', refresh);
    window.addEventListener('wyps_generated_history_updated', refresh);
    const refreshFavorites = () => setFavorites(readFavoriteIds());
    window.addEventListener('wyps_saved_library_favorites_updated', refreshFavorites);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('wyps_generated_history_updated', refresh);
      window.removeEventListener('wyps_saved_library_favorites_updated', refreshFavorites);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items
      .filter((item) => {
      const matchType = filter === 'All' || item.type === filter;
      const matchSearch = !keyword || [item.title, item.subtitle, item.type, item.content]
        .some((value) => value.toLowerCase().includes(keyword));
      return matchType && matchSearch;
    })
      .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  }, [favorites, filter, items, search]);

  const favoriteItems = useMemo(
    () => items.filter((item) => favorites.includes(item.id)).slice(0, 4),
    [favorites, items]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const copyItem = async (item: GeneratedHistoryItem) => {
    await navigator.clipboard.writeText(item.content);
    showToast('စာသားကို copy လုပ်ပြီးပါပြီ။');
  };

  const reuseItem = (item: GeneratedHistoryItem) => {
    if (item.tab === AppTab.CONTENT_GEN) {
      localStorage.setItem('wyp_content_topic', item.content);
    }
    if (item.tab === AppTab.CLIENT_REMINDER) {
      localStorage.setItem('wyps_client_reminder_prefill', JSON.stringify({
        extraNote: item.content,
      }));
    }
    onNavigate?.(item.tab);
  };

  const useAsReference = (item: GeneratedHistoryItem) => {
    localStorage.setItem('wyp_content_topic', [
      'အောက်က reference output ကို tone/sample အဖြစ်ယူပါ။',
      'ထပ်တူမရေးပါနှင့်။ Fresh angle, fresh hook, copy-ready Facebook/TikTok content ပြန်ရေးပါ။',
      '',
      item.content,
    ].join('\n'));
    showToast('Reference အဖြစ် Content Factory ထဲပို့ပြီးပါပြီ။');
    onNavigate?.(AppTab.CONTENT_GEN);
  };

  const sendToPhotoshop = async (item: GeneratedHistoryItem) => {
    const prompt = [
      'WYPS Photoshop AI handoff',
      `Source: ${item.title}`,
      'Use this marketing direction only as creative context. Keep the client identity, pose, and important outfit details natural.',
      item.content,
    ].join('\n\n');
    localStorage.setItem('wyps_photoshop_ai_prompt', prompt);
    await navigator.clipboard.writeText(prompt);
    showToast('Photoshop AI prompt ကို copy + handoff အဖြစ်သိမ်းပြီးပါပြီ။');
  };

  const toggleFavorite = (item: GeneratedHistoryItem) => {
    const next = favorites.includes(item.id)
      ? favorites.filter((id) => id !== item.id)
      : [item.id, ...favorites].slice(0, 24);
    setFavorites(next);
    localStorage.setItem(FAVORITE_HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('wyps_saved_library_favorites_updated'));
    showToast(next.includes(item.id) ? 'Favorite ထဲသိမ်းပြီးပါပြီ။' : 'Favorite မှဖယ်ပြီးပါပြီ။');
  };

  const removeItem = (item: GeneratedHistoryItem) => {
    if (!window.confirm('ဒီ history ကိုဖျက်မလား?')) return;
    deleteGeneratedHistory(item);
    if (selectedItem?.id === item.id) setSelectedItem(null);
    showToast('History item ကိုဖျက်ပြီးပါပြီ။');
  };

  const clearAll = () => {
    if (!window.confirm('Generated history အားလုံးဖျက်မလား?')) return;
    clearGeneratedHistory();
    setSelectedItem(null);
    showToast('Generated history အားလုံးဖျက်ပြီးပါပြီ။');
  };

  return (
    <div className="space-y-6 burmese-text pb-12">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl">
          {toast}
        </div>
      )}

      <header className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">Generated History + Reuse</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Saved <span className="text-amber-400">Library</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              AI ထုတ်ထားတဲ့ post, reminder, follow-up, guide, promo, plan, contract နဲ့ concept တွေကို ဒီမှာပြန်ရှာ, copy, reuse လုပ်နိုင်ပါတယ်။ Google Login ဝင်ထားရင် Mac နဲ့ mobile ကြား sync ဖြစ်ပါမယ်။
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={refresh} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-white">
              Refresh
            </button>
            <button onClick={clearAll} className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-black text-red-200">
              Clear All
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-2xl font-black text-white">{items.length}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Total Saved</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="text-2xl font-black text-amber-300">{favoriteItems.length}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-200/60">Favorites</div>
        </div>
        <button onClick={() => setFilter('Content')} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-left">
          <div className="text-2xl font-black text-white">{items.filter((item) => item.type === 'Content').length}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Content</div>
        </button>
        <button onClick={() => setFilter('Follow-up')} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-left">
          <div className="text-2xl font-black text-white">{items.filter((item) => item.type === 'Follow-up' || item.type === 'Reminder').length}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Client Msg</div>
        </button>
      </section>

      {favoriteItems.length > 0 && (
        <section className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-black text-white">Favorite References</h2>
            <p className="mt-1 text-xs text-slate-500">အမြဲကြိုက်တဲ့ tone/sample တွေကို Content Factory ထဲ reference အဖြစ်ပြန်ပို့နိုင်ပါတယ်။</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {favoriteItems.map((item) => (
              <button
                key={`favorite-${item.id}`}
                onClick={() => useAsReference(item)}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-amber-400/40"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">{item.type}</div>
                <div className="mt-2 line-clamp-1 text-sm font-black text-white">{item.title}</div>
                <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{item.content}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 outline-none focus:border-amber-500"
            placeholder="စာသား, title, type ဖြင့်ရှာရန်..."
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-xs font-black transition ${
                  filter === type
                    ? 'border-amber-500 bg-amber-500 text-slate-950'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredItems.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-sm leading-relaxed text-slate-500">
          History မရှိသေးပါ။ Content / Reminder / Follow-up တစ်ခု generate သို့မဟုတ် copy/save လုပ်ပြီးရင် ဒီမှာပြန်ပေါ်ပါမယ်။
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${typeStyle[item.type] || typeStyle.Other}`}>
                      {item.type}
                    </span>
                    {favorites.includes(item.id) && (
                      <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
                        Favorite
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-lg font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{item.subtitle} · {item.createdAt || 'recent'}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{item.content}</p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-7">
                <button onClick={() => setSelectedItem(item)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-white">View</button>
                <button onClick={() => copyItem(item)} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-white">Copy</button>
                <button onClick={() => reuseItem(item)} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">Reuse</button>
                <button onClick={() => useAsReference(item)} className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-200">Ref</button>
                <button onClick={() => sendToPhotoshop(item)} className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-200">PS</button>
                <button onClick={() => toggleFavorite(item)} className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-200">
                  {favorites.includes(item.id) ? 'Unfav' : 'Fav'}
                </button>
                <button onClick={() => removeItem(item)} className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200">Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${typeStyle[selectedItem.type] || typeStyle.Other}`}>
                  {selectedItem.type}
                </span>
                <h2 className="mt-3 text-xl font-black text-white">{selectedItem.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedItem.createdAt}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-2xl text-slate-500 hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-relaxed text-slate-100">
                {selectedItem.content}
              </pre>
            </div>
            <div className="grid gap-3 border-t border-slate-800 p-5 sm:grid-cols-6">
              <button onClick={() => copyItem(selectedItem)} className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white">Copy</button>
              <button onClick={() => reuseItem(selectedItem)} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950">Reuse</button>
              <button onClick={() => useAsReference(selectedItem)} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-200">Reference</button>
              <button onClick={() => sendToPhotoshop(selectedItem)} className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-5 py-3 text-sm font-black text-fuchsia-200">Photoshop</button>
              <button onClick={() => toggleFavorite(selectedItem)} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-black text-amber-200">
                {favorites.includes(selectedItem.id) ? 'Unfavorite' : 'Favorite'}
              </button>
              <button onClick={() => setSelectedItem(null)} className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLibrary;
