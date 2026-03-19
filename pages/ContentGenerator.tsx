
import React, { useState, useEffect } from 'react';
import { generateMarketingContent, refineMarketingText } from '../geminiService';
import { MarketingContent, AppTab } from '../types';
import Feedback from '../components/Feedback';
import imageCompression from 'browser-image-compression';

interface ContentHistory {
  id: string;
  date: string;
  description: string;
  content: MarketingContent;
}

interface ContentGeneratorProps {
  onNavigate?: (tab: AppTab) => void;
}

const QUICK_HINTS = [
  'အစစာကြောင်း ပိုဆွဲဆောင်စေပါ',
  'စာပိုဒ်တိုတိုနဲ့ ဖတ်ရလွယ်အောင်',
  'storytelling ပိုပါစေ',
  'soft booking CTA ပါစေ',
  'customer pain point ထည့်ပါ',
] as const;

const ContentGenerator: React.FC<ContentGeneratorProps> = ({ onNavigate }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketingContent | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedHints, setSelectedHints] = useState<string[]>([]);
  const [refiningAction, setRefiningAction] = useState('');
  
  const [fbToken, setFbToken] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [posting, setPosting] = useState(false);

  const [history, setHistory] = useState<ContentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('fb_page_token');
    const savedPageId = localStorage.getItem('fb_page_id');
    const pendingTopic = localStorage.getItem('wyp_content_topic');
    const savedHints = localStorage.getItem('wyp_content_hints');
    if (savedToken) setFbToken(savedToken);
    if (savedPageId) setFbPageId(savedPageId);
    if (pendingTopic) {
      setDescription(pendingTopic);
      localStorage.removeItem('wyp_content_topic');
    }
    if (savedHints) {
      try {
        setSelectedHints(JSON.parse(savedHints));
      } catch (e) {
        console.error('Failed to parse content hints', e);
      }
    }

    const savedHistory = localStorage.getItem('wyp_content_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (content: MarketingContent) => {
    const newEntry: ContentHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      description,
      content
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('wyp_content_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('wyp_content_history', JSON.stringify(updated));
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFbToken(val);
    localStorage.setItem('fb_page_token', val);
  };

  const handlePageIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFbPageId(val);
    localStorage.setItem('fb_page_id', val);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      setErrorMsg('');
      setStatusMsg('ပုံကို post အတွက် ပြင်ဆင်နေပါသည်...');
      const options = {
        maxSizeMB: 3.5,
        maxWidthOrHeight: 2048,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setCompressedImageFile(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error(error);
      setErrorMsg("ပုံကို ချုံ့ရာတွင် အခက်အခဲရှိနေပါသည်။");
    } finally {
      setCompressing(false);
      setStatusMsg('');
    }
  };

  const postToFacebook = async () => {
    if (!fbToken || !fbPageId) {
      alert("Facebook Page ID နှင့် Page Access Token ထည့်ပေးပါ။ (User Access Token အသုံးပြု၍ မရပါ။)");
      setShowTokenInput(true);
      return;
    }
    if (!compressedImageFile) {
      alert("Facebook သို့ တိုက်ရိုက်တင်ရန် ပုံရွေးချယ်ပေးပါ။");
      return;
    }
    if (!result?.facebookCaption) return;

    setPosting(true);
    setErrorMsg('');
    setStatusMsg('Facebook သို့ post တင်နေပါသည်...');
    try {
      const formData = new FormData();
      formData.append('source', compressedImageFile);
      formData.append('message', result.facebookCaption);
      formData.append('access_token', fbToken);

      const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      setToastMsg("Facebook သို့ အောင်မြင်စွာ တင်ပြီးပါပြီ! 🎉");
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message;
      if (errorMessage.includes("Unsupported post request") || errorMessage.includes("missing permissions")) {
        errorMessage = "Page Access Token အမှန် မဟုတ်ပါ (သို့) Permission မပြည့်စုံပါ။\n\nကျေးဇူးပြု၍ Graph API Explorer တွင်:\n1. User Token အစား 'Get Page Access Token' ကို ရွေးပါ။\n2. 'pages_manage_posts' နှင့် 'pages_read_engagement' permission များ ထည့်ပါ။\n3. Generate လုပ်ထားသော Token အသစ်ကို ပြန်ထည့်ပါ။";
      }
      setErrorMsg("Facebook သို့ တင်ရာတွင် အခက်အခဲရှိနေပါသည်: " + errorMessage);
    } finally {
      setPosting(false);
      setStatusMsg('');
    }
  };

  const buildGenerationPrompt = () => {
    if (!selectedHints.length) return description;
    return `${description}\n\nExtra directions:\n- ${selectedHints.join('\n- ')}`;
  };

  const toggleHint = (hint: string) => {
    const updated = selectedHints.includes(hint)
      ? selectedHints.filter((item) => item !== hint)
      : [...selectedHints, hint];
    setSelectedHints(updated);
    localStorage.setItem('wyp_content_hints', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!description && !image) return;
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    setStatusMsg('Caption နဲ့ TikTok plan ကို generate လုပ်နေပါသည်...');
    try {
      const data = await generateMarketingContent(buildGenerationPrompt(), image || undefined);
      setResult(data);
      saveToHistory(data);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "အကြောင်းအရာ ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const refineFacebookCaption = async (instruction: string, label: string) => {
    if (!result?.facebookCaption || refiningAction) return;
    setRefiningAction(label);
    setErrorMsg('');
    setStatusMsg(`${label} အတွက် caption ကို ပြန်ညှိနေပါသည်...`);
    try {
      const refinedCaption = await refineMarketingText(result.facebookCaption, instruction, description);
      setResult({ ...result, facebookCaption: refinedCaption });
      setToastMsg(`${label} version ကို ပြန်ထုတ်ပြီးပါပြီ!`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "Caption ကို ပြန်ညှိလို့ မရပါဘူး။");
    } finally {
      setRefiningAction('');
      setStatusMsg('');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMsg(`${label} ကို ကူးယူပြီးပါပြီ!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const goToVoiceover = (script: string) => {
    localStorage.setItem('wyp_tts_script', script);
    if (onNavigate) {
      onNavigate(AppTab.VOICEOVER_GEN);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 burmese-text pb-10">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-amber-500 text-slate-950 px-6 py-3 rounded-full shadow-2xl font-black text-sm animate-in fade-in slide-in-from-top-4">
          ✨ {toastMsg}
        </div>
      )}

      {(statusMsg || errorMsg) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${errorMsg ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-blue-500/10 border-blue-500/20 text-blue-100'}`}>
          <div className="font-bold">{errorMsg ? 'Action Needed' : 'Working'}</div>
          <p className="mt-1">{errorMsg || statusMsg}</p>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Content <span className="text-amber-500">Factory</span></h1>
          <p className="text-slate-400 font-medium mt-1">Viral ဖြစ်မည့် Post များ တစ်ခါတည်း ရေးသားရန်</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-colors border border-slate-700"
        >
          {showHistory ? '🔙 အသစ်ရေးမည်' : '📜 History ကြည့်မည်'}
        </button>
      </header>

      {showHistory ? (
        <div className="space-y-6 animate-in fade-in">
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော ပိုစ့်များ</h2>
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500">
              မှတ်တမ်း မရှိသေးပါ။
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {history.map((h) => (
                <div key={h.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] relative group">
                  <button 
                    onClick={() => deleteHistoryItem(h.id)}
                    className="absolute top-4 right-4 w-8 h-8 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                  <div className="text-[10px] text-slate-500 mb-2">{h.date}</div>
                  <div className="mb-4">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">Topic: {h.description || 'Image Upload'}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 max-h-48 overflow-y-auto">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{h.content.facebookCaption}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(h.content.facebookCaption, 'Facebook Caption')}
                    className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    COPY CAPTION
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
        {/* INPUT BOX */}
        <div className="lg:col-span-5 space-y-6 sticky top-8">
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Content Topic</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ဥပမာ- ဒီနေ့ တောင်ကြီးစတူဒီယိုမှာ ရိုက်ဖြစ်တဲ့ Pre-wedding လေးအကြောင်း..."
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm leading-relaxed text-slate-200 resize-none"
              />
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Quick Add</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_HINTS.map((hint) => {
                  const active = selectedHints.includes(hint);
                  return (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => toggleHint(hint)}
                      className={`px-3 py-2 rounded-full text-[10px] font-black transition-all border ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {hint}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Reference Photo (Auto-compressed to ~3.5MB)</label>
              {!image ? (
                <label className="w-full h-32 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-all group relative">
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={compressing} />
                  {compressing ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full mb-2" />
                      <span className="text-[9px] font-black text-amber-500 uppercase">Compressing...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">🖼️</span>
                      <span className="text-[9px] font-black text-slate-600 uppercase">Upload to analyze & post</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
                  <img src={image} className="w-full h-48 object-cover" />
                  <button onClick={() => { setImage(null); setCompressedImageFile(null); }} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all">✕</button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <button 
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-blue-400 transition-colors"
              >
                <span>⚙️</span> Facebook Page Setup {showTokenInput ? '(Hide)' : '(Setup)'}
              </button>
              {showTokenInput && (
                <div className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Page ID</label>
                    <input
                      type="text"
                      value={fbPageId}
                      onChange={handlePageIdChange}
                      placeholder="e.g. 1234567890"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Page Access Token</label>
                    <input
                      type="password"
                      value={fbToken}
                      onChange={handleTokenChange}
                      placeholder="Paste your Page Access Token here..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-[9px] text-amber-500 leading-relaxed font-medium">
                      ⚠️ အရေးကြီး: <b>User Access Token</b> အသုံးပြု၍ မရပါ။ <b>Page Access Token</b> သာ အသုံးပြုရပါမည်။<br/><br/>
                      <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline text-blue-400">Graph API Explorer</a> တွင် <b>User or Page</b> နေရာ၌ <b>သင့် Page အမည်</b> ကို ရွေးပါ။<br/>
                      ❌ <b>publish_actions</b> permission ကို လုံးဝ မသုံးပါနဲ့ (ဖျက်ပစ်ပါ)။<br/>
                      ✅ <b>pages_manage_posts</b> နှင့် <b>pages_read_engagement</b> ကိုသာ ထည့်သွင်းပြီး Generate လုပ်ပါ။
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || (!description && !image) || compressing}
              className="w-full py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" /> : "MAGIC GENERATE ✨"}
            </button>
          </div>
        </div>

        {/* RESULTS AREA */}
        <div className="lg:col-span-7 space-y-6">
          {!result && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">🖋️</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Write something to start the magic</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-96 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              {/* FACEBOOK CARD */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 text-9xl text-blue-500/5 rotate-12 group-hover:scale-110 transition-transform">f</div>
                 <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 font-black">f</div>
                    <h3 className="font-black text-white text-xl uppercase tracking-tight">Facebook Master</h3>
                 </div>
                 <div className="bg-slate-950/80 p-6 rounded-2xl text-slate-200 text-sm leading-relaxed border border-slate-800/50 mb-6 font-medium whitespace-pre-wrap">
                    {result.facebookCaption}
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                   <button 
                    onClick={() => refineFacebookCaption('Make the opening hook stronger and more thumb-stopping, while keeping the rest natural.', 'ပိုဆွဲဆောင်တဲ့ Hook')}
                    disabled={!!refiningAction}
                    className="py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-200 rounded-xl font-black text-[10px] border border-slate-800 transition-colors"
                   >
                     {refiningAction === 'ပိုဆွဲဆောင်တဲ့ Hook' ? 'REFINING...' : 'HOOK ပိုကောင်းအောင်'}
                   </button>
                   <button 
                    onClick={() => refineFacebookCaption('Keep the post warm but make the CTA softer and more natural for booking inquiries.', 'ပိုနူးညံ့တဲ့ CTA')}
                    disabled={!!refiningAction}
                    className="py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-200 rounded-xl font-black text-[10px] border border-slate-800 transition-colors"
                   >
                     {refiningAction === 'ပိုနူးညံ့တဲ့ CTA' ? 'REFINING...' : 'CTA ပိုနူးညံ့အောင်'}
                   </button>
                   <button 
                    onClick={() => refineFacebookCaption('Shorten the caption slightly so it is easier to read quickly, without losing the main message.', 'ပိုတိုတဲ့ Version')}
                    disabled={!!refiningAction}
                    className="py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-200 rounded-xl font-black text-[10px] border border-slate-800 transition-colors"
                   >
                     {refiningAction === 'ပိုတိုတဲ့ Version' ? 'REFINING...' : 'SHORTER VERSION'}
                   </button>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <button 
                    onClick={() => copyToClipboard(result.facebookCaption, "FB Caption")}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs transition-all border border-slate-700"
                   >
                     COPY FB CAPTION
                   </button>
                   <button 
                    onClick={postToFacebook}
                    disabled={posting || !compressedImageFile}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                   >
                     {posting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : "🚀 POST TO FACEBOOK"}
                   </button>
                 </div>
                 {!compressedImageFile && (
                   <p className="text-[9px] text-slate-500 mt-3 text-center">Facebook သို့ တိုက်ရိုက်တင်ရန် ဘယ်ဘက်တွင် ပုံရွေးချယ်ပေးပါ။</p>
                 )}
              </div>

              {/* TIKTOK CARD */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 text-9xl text-pink-500/5 -rotate-12 group-hover:scale-110 transition-transform">♪</div>
                 <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="w-10 h-10 bg-pink-600/10 rounded-xl flex items-center justify-center text-pink-500 text-2xl">♪</div>
                    <h3 className="font-black text-white text-xl uppercase tracking-tight">TikTok Viral Blueprint</h3>
                 </div>
                 
                 <div className="space-y-6 mb-8 relative z-10">
                    {/* Visual Section */}
                    <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">1. Visual Script (ဘာရိုက်မလဲ)</span>
                        <div className="flex gap-4">
                          <button onClick={() => goToVoiceover(result.tiktokVisualScript)} className="text-[10px] font-black text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                            <span>🎙️</span> GENERATE VOICEOVER
                          </button>
                          <button onClick={() => copyToClipboard(result.tiktokVisualScript, "TikTok Script")} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors">COPY SCRIPT</button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic">"{result.tiktokVisualScript}"</p>
                    </div>

                    {/* Scene Breakdown */}
                    <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                      <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-4">2. Scene Breakdown (အဆင့်ဆင့် ရိုက်ကူးရန်)</span>
                      <div className="space-y-3">
                        {result.tiktokSceneBreakdown.map((scene, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="text-pink-500 font-black text-xs">{i + 1}.</span>
                            <p className="text-xs text-slate-300">{scene}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Style Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Audio Style</span>
                        <p className="text-xs text-slate-400">{result.tiktokAudioStyle}</p>
                      </div>
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-2">Editing Style</span>
                        <p className="text-xs text-slate-400">{result.tiktokEditingStyle}</p>
                      </div>
                    </div>

                    {/* Caption Section */}
                    <div className="bg-slate-950/80 p-6 rounded-2xl border border-amber-500/10 shadow-inner">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">3. Post Caption (Copy & Paste)</span>
                      </div>
                      <p className="text-sm text-slate-100 font-bold mb-4">{result.tiktokCaption}</p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {result.hashtags.map((tag, i) => (
                          <span key={i} className="text-[10px] font-black text-amber-400 bg-amber-500/5 px-2 py-1 rounded-md">#{tag}</span>
                        ))}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${result.tiktokCaption}\n\n${result.hashtags.map(t => '#' + t).join(' ')}`, "TikTok Post")}
                        className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-pink-900/20"
                      >
                        COPY TIKTOK CAPTION + TAGS
                      </button>
                    </div>
                 </div>

                 <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                   <span className="text-blue-400">💡</span>
                   <p className="text-[10px] text-slate-400 leading-relaxed font-medium"><strong>Engagement Pro:</strong> {result.engagementTips}</p>
                 </div>
              </div>
              <Feedback 
                contentId={`content-${Date.now()}`} 
                contentType="marketing" 
              />
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;
