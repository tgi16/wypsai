
import React, { useState } from 'react';

const PricingGuide: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'pre-wedding' | 'monk-offering' | 'donation'>('pre-wedding');

  const shareToViber = (pkgName: string, price: string, tag: string, details: string[]) => {
    const studioLink = "https://www.facebook.com/wypstudio";
    
    // Constructing the full message as requested
    const message = `📸 With You Photo Studio, Taunggyi\n\n🎁 Package: ${pkgName}\nℹ️ အမျိုးအစား: ${tag}\n💰 စျေးနှုန်း: ${price}\n\n✨ အသေးစိတ်အချက်အလက်များ:\n${details.map(d => `✦ ${d}`).join('\n')}\n\n📍 တည်နေရာ: တောင်ကြီးမြို့\n🔗 Page: ${studioLink}`;
    
    const viberUrl = `viber://forward?text=${encodeURIComponent(message)}`;
    window.location.href = viberUrl;
    
    // Fallback if Viber doesn't open immediately
    setTimeout(() => {
      const confirmCopy = confirm("Viber App ကို မဖွင့်နိုင်ပါက စာသားကို Copy ကူးယူပြီး Viber တွင် Paste လုပ်ပေးပို့မလား?");
      if (confirmCopy) {
        navigator.clipboard.writeText(message);
        alert("စာသားကို Copy ကူးယူပြီးပါပြီ။");
      }
    }, 1500);
  };

  const preWeddingPackages = [
    {
      name: "Sweet Memo",
      price: "350,000 MMK",
      tag: "၁ စုံ (Limited Softcopy)",
      items: ["စတူဒီယို ဝတ်စုံ ၁ စုံ", "Professional Makeup ၁ ကြိမ်", "Selected 15 Soft Copy (Edit)", "12x18 With Love Frame", "8x10 Table Stand"],
    },
    {
      name: "Style Fusion",
      price: "500,000 MMK",
      tag: "၁+၁ (Limited Softcopy)",
      items: ["စတူဒီယို ၁ စုံ + ကိုယ်ပိုင် ၁ စုံ", "Professional Makeup ၁ ကြိမ်", "Selected 20 Soft Copy (Edit)", "12x18 With Love Frame", "8x10 Table Stand"],
    },
    {
      name: "Elegance Duo",
      price: "650,000 MMK",
      tag: "၂ စုံ (Limited Softcopy)",
      items: ["စတူဒီယို ဝတ်စုံ ၂ စုံ", "Professional Makeup ၂ ကြိမ်", "Selected 25 Soft Copy (Edit)", "20x30 With Love Frame", "10x14 With Frame"],
    },
    {
      name: "Grand Royal",
      price: "1,000,000 MMK",
      tag: "၃ စုံ (Limited Softcopy)",
      items: ["စတူဒီယို ဝတ်စုံ ၃ စုံ", "Professional Makeup ၃ ကြိမ်", "Selected 35 Soft Copy (Edit)", "20x30 With Love Frame", "12x18 With Love Frame", "8x10 Table Stand"],
    }
  ];

  const monkOfferingPackage = {
    name: "မင်္ဂလာဆွမ်းကပ် (TGI Only)",
    price: "480,000 MMK",
    tag: "Camera 2 Units",
    desc: "ကင်မရာ ရိုက်ကူးသူ ၂ ယောက်နှင့် စနစ်တကျ မှတ်တမ်းတင်ပေးပါမည်။",
    options: [
      "Option 1: Softcopy (No Print) 70 Pic + 16x24 With Love Frame",
      "Option 2: Print Photo 50 Pic + 16x24 With Love Frame"
    ],
    features: [
      "ပွဲအစအဆုံး ရိုက်သမျှ Softcopy CD ဖြင့် ပေးအပ်မည်",
      "ရိုက်ကူးချိန် ၃ နာရီအထိ",
      "Unlimited Raw & Edit Files ပါဝင်ပြီးဖြစ်သည်"
    ],
    extra: "အချိန်ပို ၃၀ မိနစ် (၃ သောင်း) ၊ ၁ နာရီ (၅ သောင်း)"
  };

  const donationPackages = [
    {
      name: "အလှူပွဲနေ့ (1 Camera)",
      price: "390,000 MMK",
      tag: "Standard Coverage",
      desc: "၁ ဦးတည်းသော ဓာတ်ပုံဆရာမှ အနုပညာဆန်ဆန် မှတ်တမ်းတင်ပေးခြင်း။",
      options: [
        "Option 1: Softcopy (No Print) 60 Pic + 12x18 Frame",
        "Option 2: Print Photo 40 Pic + 12x18 Frame"
      ],
      features: ["ပွဲအစအဆုံး Raw/Softcopy CD ပေးမည်", "ရိုက်ကူးချိန် ၃ နာရီအထိ"],
      extra: "အချိန်ပို ၃၀ မိနစ် (၃ သောင်း) ၊ ၁ နာရီ (၅ သောင်း)"
    },
    {
      name: "အလှူပွဲနေ့ (2 Camera)",
      price: "500,000 MMK",
      tag: "Premium Coverage",
      desc: "ကင်မရာ ၂ လုံးဖြင့် တစ်ပြိုင်နက် ရိုက်ကူးပေးခြင်း။",
      options: [
        "Option 1: Softcopy (No Print) 70 Pic + 16x24 Frame",
        "Option 2: Print Photo 50 Pic + 16x24 Frame"
      ],
      features: ["ပွဲအစအဆုံး Raw/Softcopy CD ပေးမည်", "ရိုက်ကူးချိန် ၃ နာရီအထိ"],
      extra: "အချိန်ပို ၃၀ မိနစ် (၃ သောင်း) ၊ ၁ နာရီ (၅ သောင်း)"
    }
  ];

  return (
    <div className="space-y-10 burmese-text pb-20 animate-in fade-in duration-500">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent uppercase tracking-tighter">
          Service Packages
        </h1>
        
        <div className="flex flex-wrap justify-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-3xl mb-8">
          <button 
            onClick={() => setActiveCategory('pre-wedding')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'pre-wedding' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Indoor Pre-Wedding
          </button>
          <button 
            onClick={() => setActiveCategory('monk-offering')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'monk-offering' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            မင်္ဂလာဆွမ်းကပ်
          </button>
          <button 
            onClick={() => setActiveCategory('donation')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'donation' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            အလှူပွဲနေ့
          </button>
        </div>
      </header>

      {/* CATEGORY RENDERING */}
      {activeCategory === 'pre-wedding' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
          {preWeddingPackages.map((pkg, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col hover:border-amber-500/30 transition-all shadow-xl group">
              <div className="mb-6">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{pkg.tag}</span>
                 <h3 className="text-xl font-black text-white mb-2 group-hover:text-amber-500 transition-colors">{pkg.name}</h3>
                 <div className="text-2xl font-black text-amber-500 tracking-tight">{pkg.price}</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8 text-[11px] text-slate-400">
                {pkg.items.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-amber-500/50">✦</span> 
                    <span className={item.includes("Soft Copy") ? "text-amber-200 font-bold" : ""}>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-3">
                <button className="w-full py-4 bg-slate-800 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-amber-500">Book Memo</button>
                <button 
                  onClick={() => shareToViber(pkg.name, pkg.price, pkg.tag, pkg.items)}
                  className="w-full py-3 bg-[#7360f2]/10 hover:bg-[#7360f2] text-[#7360f2] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-[#7360f2]/20 flex items-center justify-center gap-2"
                >
                  🟣 Share to Viber
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCategory === 'monk-offering' && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 text-[150px] text-amber-500/5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">🕯️</div>
            <div className="relative z-10">
              <span className="bg-amber-500/10 text-amber-500 text-[10px] px-4 py-1 rounded-full font-black uppercase tracking-widest mb-6 inline-block border border-amber-500/20">{monkOfferingPackage.tag}</span>
              <h3 className="text-3xl md:text-5xl font-black text-white mb-4">{monkOfferingPackage.name}</h3>
              <div className="text-4xl font-black text-amber-500 mb-6">{monkOfferingPackage.price}</div>
              <p className="text-sm text-slate-400 italic mb-10 leading-relaxed max-w-xl">"{monkOfferingPackage.desc}"</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ဓာတ်ပုံ ရွေးချယ်စရာများ:</h4>
                  {monkOfferingPackage.options.map((opt, i) => (
                    <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] text-slate-300 font-bold">{opt}</div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">အပိုဆောင်း အချက်အလက်များ:</h4>
                  <ul className="space-y-2">
                    {monkOfferingPackage.features.map((f, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-400"><span className="text-amber-500">✓</span> {f}</li>
                    ))}
                  </ul>
                  <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-bold">⚠️ {monkOfferingPackage.extra}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/30 transition-all">Check Availability</button>
                <button 
                  onClick={() => shareToViber(monkOfferingPackage.name, monkOfferingPackage.price, monkOfferingPackage.tag, [...monkOfferingPackage.options, ...monkOfferingPackage.features, monkOfferingPackage.extra])}
                  className="py-5 bg-[#7360f2] hover:bg-[#6250d1] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#7360f2]/20 transition-all flex items-center justify-center gap-2"
                >
                  🟣 Share to Viber
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'donation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-4">
          {donationPackages.map((pkg, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 flex flex-col hover:border-amber-500/30 shadow-2xl transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 text-9xl text-amber-500/5 pointer-events-none group-hover:scale-110 transition-transform">📸</div>
              <div className="mb-8 relative z-10">
                <span className="bg-amber-500/10 text-amber-500 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest mb-4 inline-block border border-amber-500/20">{pkg.tag}</span>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">{pkg.name}</h3>
                <div className="text-3xl font-black text-amber-500">{pkg.price}</div>
                <p className="text-xs text-slate-500 mt-4 italic leading-relaxed">"{pkg.desc}"</p>
              </div>
              <div className="space-y-6 flex-1 mb-10 relative z-10">
                <div className="space-y-3">
                   {pkg.options.map((opt, idx) => (
                     <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-bold">{opt}</div>
                   ))}
                </div>
                <ul className="space-y-3 text-xs text-slate-400">
                  {pkg.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-3"><span className="text-amber-500 font-black">✓</span> {f}</li>
                  ))}
                  <li className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-bold uppercase tracking-widest">⚠️ {pkg.extra}</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 relative z-10">
                <button className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/30 transition-all">Book Donation Event</button>
                <button 
                  onClick={() => shareToViber(pkg.name, pkg.price, pkg.tag, [...pkg.options, ...pkg.features, pkg.extra])}
                  className="w-full py-4 bg-[#7360f2]/10 hover:bg-[#7360f2] text-[#7360f2] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-[#7360f2]/20 flex items-center justify-center gap-2"
                >
                  🟣 Share to Viber
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER INFO */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center">
        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center text-5xl shrink-0 shadow-inner shadow-amber-500/20 animate-pulse">✨</div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-4 tracking-tight">With You Studio Policy Update</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            ကျွန်တော်တို့ With You Studio မှာ အမှတ်တရတွေကို အလှပဆုံးဖြစ်အောင် အတတ်နိုင်ဆုံး ကြိုးစားပေးပါတယ်။ 
            <span className="text-amber-500 font-bold"> ဆွမ်းကပ် နှင့် အလှူပွဲ </span> များအတွက် စျေးနှုန်းအသစ်များကို ယခုဇယားအတိုင်း ပြောင်းလဲသတ်မှတ်လိုက်ပါသည်။ 
            အဆိုပါပွဲများတွင် <span className="text-amber-200 font-bold italic">Unlimited Raw CD</span> ကို အခမဲ့ ပေးအပ်သွားမည်ဖြစ်ပြီး၊ သတ်မှတ်ချိန်ထက် ကျော်လွန်ပါက အချိန်ပိုကြေးများကို စနစ်တကျ သတ်မှတ်ထားပါသည်ဗျာ။
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingGuide;
