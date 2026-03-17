import React, { useState, useEffect, useRef } from 'react';
import { createStrategyChat } from '../geminiService';
import ReactMarkdown from 'react-markdown';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

const defaultGreeting: Message = {
  id: '1',
  role: 'model',
  content: 'မင်္ဂလာပါရှင်။ ကျွန်မက With You Photo Studio အတွက် Business & Marketing Strategy Partner ပါ။ ဒီနေ့ ဘယ်လိုကိစ္စလေးတွေ တိုင်ပင်ချင်ပါသလဲရှင်? \n\nအောက်က Quick Actions တွေကို သုံးပြီးတော့လည်း စတင်နိုင်ပါတယ်နော်။'
};

const QUICK_ACTIONS = [
  { label: 'Viral TikTok Hooks', prompt: 'TikTok မှာ Viral ဖြစ်ဖို့ အတွက် အခု လက်ရှိ ခေတ်စားနေတဲ့ Hook ၅ ခုနဲ့ အဲ့ဒါကို စတူဒီယိုမှာ ဘယ်လို အသုံးချရမလဲ ဆိုတာ အကြံပေးပါ။' },
  { label: 'Promotion Ideas', prompt: 'လာမည့်လအတွက် စတူဒီယိုမှာ လုပ်လို့ရမယ့် ဆန်းသစ်တဲ့ Promotion Idea ၃ ခုလောက် အကြံပေးပါ။' },
  { label: 'Customer Script', prompt: 'Customer တစ်ယောက်က ဓာတ်ပုံတွေ ကြာနေလို့ စိတ်ဆိုးနေပါတယ်။ Professional ဆန်ဆန် ဘယ်လို ပြန်ဖြေရမလဲ Script ရေးပေးပါ။' },
  { label: 'Brand Positioning', prompt: 'တောင်ကြီးမြို့မှာ တခြားစတူဒီယိုတွေထက် ပိုသာလွန်အောင် Brand ကို ဘယ်လို နေရာချသင့်သလဲ?' },
];

const StrategyPartner: React.FC = () => {
  const { user, login } = useFirebase();
  const [messages, setMessages] = useState<Message[]>([defaultGreeting]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setMessages([defaultGreeting]);
        const session = createStrategyChat([{ role: 'model', parts: [{ text: defaultGreeting.content }] }]);
        setChatSession(session);
        setIsInitializing(false);
        return;
      }

      try {
        const docRef = doc(db, 'chats', `${user.uid}_strategy`);
        const docSnap = await getDoc(docRef);
        
        let loadedMessages = [defaultGreeting];
        if (docSnap.exists() && docSnap.data().messages) {
          loadedMessages = docSnap.data().messages;
        }
        
        setMessages(loadedMessages);

        // Convert messages to Gemini history format
        const history = loadedMessages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }));
        
        // Initialize chat session with history
        const session = createStrategyChat(history);
        setChatSession(session);
      } catch (error) {
        console.error("Error loading chat history from Firebase:", error);
        // Fallback to default
        const session = createStrategyChat([{ role: 'model', parts: [{ text: defaultGreeting.content }] }]);
        setChatSession(session);
      } finally {
        setIsInitializing(false);
      }
    };

    loadHistory();
  }, [user]);

  const clearHistory = async () => {
    if (window.confirm('ဆွေးနွေးထားသမျှကို ဖျက်ပစ်မှာ သေချာပါသလား?')) {
      const resetMessages = [defaultGreeting];
      setMessages(resetMessages);
      const session = createStrategyChat([{ role: 'model', parts: [{ text: defaultGreeting.content }] }]);
      setChatSession(session);
      
      if (user) {
        try {
          await setDoc(doc(db, 'chats', `${user.uid}_strategy`), { messages: resetMessages });
        } catch (error) {
          console.error("Error clearing history in Firebase:", error);
        }
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = overrideInput || input;
    if (!finalInput.trim() || !chatSession || isLoading) return;

    const userMsg = finalInput.trim();
    setInput('');
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Save user message to Firebase
    if (user) {
      try {
        await setDoc(doc(db, 'chats', `${user.uid}_strategy`), { messages: updatedMessages });
      } catch (error) {
        console.error("Error saving to Firebase:", error);
      }
    }

    try {
      // Send to Gemini
      const response = await chatSession.sendMessage(userMsg);
      
      // Add model response to UI
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text
      };
      
      const finalMessages = [...updatedMessages, modelMsg];
      setMessages(finalMessages);
      
      // Save model message to Firebase
      if (user) {
        try {
          await setDoc(doc(db, 'chats', `${user.uid}_strategy`), { messages: finalMessages });
        } catch (error) {
          console.error("Error saving to Firebase:", error);
        }
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'ဆာဗာနှင့် ချိတ်ဆက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏနေမှ ပြန်လည်ကြိုးစားကြည့်ပါရှင်။'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] md:h-[80vh] bg-[#020617] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 md:p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
            🧠
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Strategy Partner AI</h2>
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase">Your 24/7 Consultant</p>
          </div>
        </div>
        <button 
          onClick={clearHistory}
          className="text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-800/80 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
          title="Clear Chat History"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <span className="hidden sm:inline">Clear History</span>
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar burmese-text">
        {!user && messages.length > 1 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 text-center space-y-3">
            <p className="text-xs font-bold text-amber-500">ဆွေးနွေးချက်များကို Mac နှင့် ဖုန်းတို့တွင် သိမ်းဆည်းထားနိုင်ရန် Login ဝင်ပေးပါ</p>
            <button onClick={() => login()} className="bg-amber-500 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black">Login with Google</button>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 md:p-5 ${
                msg.role === 'user' 
                  ? 'bg-amber-500 text-slate-950 rounded-tr-sm shadow-lg shadow-amber-500/20' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700 shadow-lg shadow-black/20'
              }`}
            >
              {msg.role === 'model' ? (
                <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-a:text-amber-400">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-5 flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions & Input Area */}
      <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 z-10">
        <div className="flex flex-wrap gap-2 mb-4 max-w-4xl mx-auto">
          {QUICK_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleAction(action.prompt)}
              className="text-[10px] md:text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full transition-all hover:border-amber-500/50 hover:text-amber-500"
            >
              {action.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="မေးခွန်းများ၊ အကြံဉာဏ်များကို ဤနေရာတွင် ရိုက်ထည့်ပါ..."
            className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-5 py-4 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all burmese-text"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 px-6 rounded-xl font-black transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default StrategyPartner;
