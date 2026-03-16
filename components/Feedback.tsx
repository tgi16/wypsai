
import React, { useState } from 'react';

interface FeedbackProps {
  contentId: string;
  contentType: 'marketing' | 'sales' | 'strategy';
  onFeedback?: (helpful: boolean) => void;
}

const Feedback: React.FC<FeedbackProps> = ({ contentId, contentType, onFeedback }) => {
  const [voted, setVoted] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);

  const handleVote = (helpful: boolean) => {
    setVoted(true);
    setIsHelpful(helpful);
    
    // Store in localStorage for future AI refinement (mocking the "refinement" part)
    const feedbackData = JSON.parse(localStorage.getItem('app_feedback') || '[]');
    feedbackData.push({
      id: contentId,
      type: contentType,
      helpful,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('app_feedback', JSON.stringify(feedbackData));

    if (onFeedback) onFeedback(helpful);
  };

  if (voted) {
    return (
      <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
        <span className="text-xl">✨</span>
        <p className="text-sm font-bold text-emerald-400 burmese-text">
          ကျေးဇူးတင်ပါတယ်! သင့်ရဲ့ တုံ့ပြန်မှုက AI ကို ပိုကောင်းအောင် ကူညီပေးပါတယ်။
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col items-center gap-4">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] burmese-text">
        ဒီအကြောင်းအရာက သင့်အတွက် အသုံးဝင်ရဲ့လား?
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => handleVote(true)}
          className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/50 border border-slate-700 rounded-full transition-all text-xs font-black group"
        >
          <span className="text-lg group-hover:scale-125 transition-transform">👍</span>
          အသုံးဝင်တယ်
        </button>
        <button
          onClick={() => handleVote(false)}
          className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 border border-slate-700 rounded-full transition-all text-xs font-black group"
        >
          <span className="text-lg group-hover:scale-125 transition-transform">👎</span>
          မကြိုက်ဘူး
        </button>
      </div>
    </div>
  );
};

export default Feedback;
