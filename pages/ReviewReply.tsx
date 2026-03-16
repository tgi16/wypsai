
import React, { useState } from 'react';
import { generateReviewReply } from '../geminiService';
import Feedback from '../components/Feedback';

const ReviewReply: React.FC = () => {
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reply: string, engagementTip: string } | null>(null);

  const handleGenerate = async () => {
    if (!review.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await generateReviewReply(review, rating);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Reply ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 burmese-text pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Review <span className="text-amber-500">Reply</span></h1>
          <p className="text-slate-400 font-medium mt-1">Client များ၏ Review များကို Professional ဆန်စွာ ပြန်လည်ဖြေကြားပါ။</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* INPUT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="mb-6">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] block mb-3">Client Review</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Client ရေးထားတဲ့ Review ကို ဒီမှာ Copy ကူးထည့်ပါ..."
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm leading-relaxed text-slate-200 resize-none"
              />
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] block mb-3">Rating Given</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-all ${rating >= star ? 'grayscale-0 scale-110' : 'grayscale opacity-30'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !review.trim()}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-amber-900/20"
            >
              {loading ? "WRITING REPLY..." : "GENERATE REPLY ✨"}
            </button>
          </div>
        </div>

        {/* RESULTS */}
        <div className="lg:col-span-7">
          {!result && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">💬</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Paste a review to generate a response</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-48 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-32 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 text-9xl text-amber-500/5 pointer-events-none">💬</div>
                
                <h4 className="text-amber-500 font-black uppercase tracking-widest text-[10px] mb-6">Suggested Reply</h4>
                
                <div className="bg-slate-950/80 p-8 rounded-3xl text-slate-200 text-sm md:text-base leading-relaxed border border-slate-800 mb-8 whitespace-pre-wrap font-medium shadow-inner">
                  {result.reply}
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl mb-8">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium"><strong>Engagement Tip:</strong> {result.engagementTip}</p>
                </div>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(result.reply);
                    alert("Reply ကို Copy ကူးပြီးပါပြီ!");
                  }}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs transition-all border border-slate-700 shadow-lg"
                >
                  📋 COPY REPLY TO CLIPBOARD
                </button>

                <Feedback 
                  contentId={`review-${Date.now()}`} 
                  contentType="sales" 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewReply;
