import React, { useEffect, useMemo, useState } from 'react';
import { getAuthorizedJsonHeaders } from '../apiClient';
import {
  buildPricingContext,
  FALLBACK_STUDIO_PACKAGES,
  formatMmk,
  normalizeStudioPackages,
  POS_PACKAGE_CACHE_KEY,
  POS_PRICING_CONTEXT_KEY,
  POS_PRICING_SOURCE_LABEL,
  POS_SESSION_KEY,
  splitPackageDetails,
  StudioPackage,
} from '../pricingCatalog';

type PricingSource = 'live' | 'cache' | 'fallback';

const readCachedPackages = (): StudioPackage[] | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_PACKAGE_CACHE_KEY) || 'null');
    return Array.isArray(parsed?.packages) ? parsed.packages : null;
  } catch {
    return null;
  }
};

const PricingGuide: React.FC = () => {
  const [packages, setPackages] = useState<StudioPackage[]>(() => (
    normalizeStudioPackages(readCachedPackages() || FALLBACK_STUDIO_PACKAGES)
  ));
  const [source, setSource] = useState<PricingSource>(() => (readCachedPackages() ? 'cache' : 'fallback'));
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const context = buildPricingContext(packages, source === 'live' ? POS_PRICING_SOURCE_LABEL : `${POS_PRICING_SOURCE_LABEL} ${source}`);
    localStorage.setItem(POS_PRICING_CONTEXT_KEY, context);
  }, [packages, source]);

  useEffect(() => {
    const session = (() => {
      try {
        return JSON.parse(localStorage.getItem(POS_SESSION_KEY) || 'null');
      } catch {
        return null;
      }
    })();

    if (!session?.refreshToken) return;

    const loadLivePackages = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/pos-packages', {
          method: 'POST',
          headers: await getAuthorizedJsonHeaders(),
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'POS package data မယူနိုင်ပါ။');

        const livePackages = normalizeStudioPackages(data.packages || []);
        if (livePackages.length > 0) {
          setPackages(livePackages);
          setSource('live');
          setLastUpdated(data.lastUpdated || new Date().toISOString());
          localStorage.setItem(POS_PACKAGE_CACHE_KEY, JSON.stringify({
            packages: livePackages,
            lastUpdated: data.lastUpdated || new Date().toISOString(),
          }));
          if (data.session?.refreshToken) {
            localStorage.setItem(POS_SESSION_KEY, JSON.stringify(data.session));
          }
        }
      } catch (error) {
        console.warn('POS package catalog fallback:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLivePackages();
  }, []);

  const categories = useMemo(() => (
    Array.from(new Set(packages.map((pkg) => pkg.category))).sort()
  ), [packages]);

  useEffect(() => {
    if (!activeCategory && categories.length > 0) setActiveCategory(categories[0]);
  }, [activeCategory, categories]);

  const visiblePackages = useMemo(() => (
    packages.filter((pkg) => pkg.category === activeCategory)
  ), [activeCategory, packages]);

  const sourceLabel = source === 'live'
    ? 'POS live price'
    : source === 'cache'
      ? 'POS cached price'
      : 'POS fallback price';

  const shareToViber = (pkg: StudioPackage) => {
    const studioLink = 'https://www.facebook.com/wypstudio';
    const detailLines = splitPackageDetails(pkg.details);
    const message = `📸 With You Photo Studio, Taunggyi\n\n🎁 Package: ${pkg.name}\nℹ️ အမျိုးအစား: ${pkg.category} / ${pkg.subcategory}\n💰 စျေးနှုန်း: ${formatMmk(pkg.price)}\n\n✨ အသေးစိတ်အချက်အလက်များ:\n${detailLines.map((item) => `✦ ${item}`).join('\n') || '✦ အသေးစိတ်ကို Message မှာ မေးမြန်းနိုင်ပါပြီ'}\n\n📍 တည်နေရာ: တောင်ကြီးမြို့\n🔗 Page: ${studioLink}`;

    window.location.href = `viber://forward?text=${encodeURIComponent(message)}`;
    setTimeout(() => {
      const confirmCopy = confirm('Viber App ကို မဖွင့်နိုင်ပါက စာသားကို Copy ကူးယူပြီး Viber တွင် Paste လုပ်ပေးပို့မလား?');
      if (confirmCopy) {
        navigator.clipboard.writeText(message);
        alert('စာသားကို Copy ကူးယူပြီးပါပြီ။');
      }
    }, 1500);
  };

  return (
    <div className="space-y-10 burmese-text pb-20 animate-in fade-in duration-500">
      <header className="text-center max-w-5xl mx-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400 mb-3">POS Master Pricing</p>
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent uppercase tracking-tighter">
          Service Packages
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-3xl mx-auto">
          စျေးနှုန်းသတ်မှတ်ချက်အားလုံးကို WYPS-POS ရဲ့ <span className="text-amber-300 font-bold">master-data.js / Firestore packages</span> direction ကို အတည်ယူထားပါတယ်။
          POS Booking Tracker login ဝင်ထားရင် live price ကို Vercel proxy ကနေ refresh လုပ်ပေးပါတယ်။
        </p>

        <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-3 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{sourceLabel}</span>
          {loading && <span className="text-amber-300">Refreshing...</span>}
          {lastUpdated && <span>Updated: {new Date(lastUpdated).toLocaleString()}</span>}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-3xl">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeCategory === category
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
        {visiblePackages.map((pkg) => {
          const detailItems = splitPackageDetails(pkg.details).slice(0, 7);
          return (
            <div key={pkg.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col hover:border-amber-500/30 transition-all shadow-xl group">
              <div className="mb-6">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{pkg.subcategory}</span>
                <h3 className="text-xl font-black text-white mb-2 group-hover:text-amber-500 transition-colors">{pkg.name}</h3>
                <div className="text-2xl font-black text-amber-500 tracking-tight">{formatMmk(pkg.price)}</div>
              </div>

              <ul className="space-y-3 flex-1 mb-8 text-[11px] text-slate-400">
                {detailItems.length > 0 ? detailItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-amber-500/50">✦</span>
                    <span className={/soft\s*copy|softcopy|print/i.test(item) ? 'text-amber-200 font-bold' : ''}>{item}</span>
                  </li>
                )) : (
                  <li className="text-slate-500">အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။</li>
                )}
              </ul>

              <div className="space-y-3">
                <button className="w-full py-4 bg-slate-800 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-amber-500">
                  Book Memo
                </button>
                <button
                  onClick={() => shareToViber(pkg)}
                  className="w-full py-3 bg-[#7360f2]/10 hover:bg-[#7360f2] text-[#7360f2] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-[#7360f2]/20 flex items-center justify-center gap-2"
                >
                  🟣 Share to Viber
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center">
        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center text-5xl shrink-0 shadow-inner shadow-amber-500/20">💰</div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-4 tracking-tight">စျေးနှုန်းအတည်ယူရာ Source</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            App ထဲမှာ စျေးနှုန်းကိစ္စပါလာတိုင်း POS master data ကို အခြေခံအဖြစ်ယူထားပါတယ်။ POS ထဲက package price ပြောင်းပြီးနောက် Pricing tab ကိုဖွင့်ရင် login session ရှိသရွေ့ live data ပြန်ယူပြီး AI context ထဲကိုလည်း update လုပ်ပေးပါမယ်။
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingGuide;
