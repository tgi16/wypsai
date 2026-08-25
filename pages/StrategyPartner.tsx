import React, { useState, useEffect, useRef } from 'react';
import { createStrategyChat } from '../geminiService';
import ReactMarkdown from 'react-markdown';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
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
  content: 'မင်္ဂလာပါရှင်။ ကျွန်မက Strategy Partner AI ပါ။ Studio business, marketing, client message, tech, planning, writing, learning, everyday problem solving ဘာမေးမေး အကောင်းဆုံးအဖြေကို လက်တွေ့အသုံးချနိုင်အောင် ပြန်ပေးပါမယ်။\n\nမေးချင်တာကို တိုက်ရိုက်ရေးပါ။ အသေးစိတ်မပြည့်စုံရင်လည်း reasonable assumption နဲ့စပြီးကူညီပေးပါမယ်။'
};

const QUICK_ACTIONS = [
  { label: 'Best Answer', prompt: 'ဒီမေးခွန်းကို အကောင်းဆုံးဖြေပေးပါ။ အရင်ဆုံး တိုက်ရိုက်အဖြေ၊ ပြီးရင် လက်တွေ့လုပ်ရမယ့် steps နဲ့ example ပေးပါ။ မေးခွန်း - ' },
  { label: 'Decision Help', prompt: 'အောက်ကအခြေအနေမှာ ဘယ် option ကိုရွေးသင့်လဲ၊ pros/cons နဲ့ final recommendation ပေးပါ။ အခြေအနေ - ' },
  { label: 'Package Strategy', prompt: 'WYPS အတွက် ဒီ package ကို ပိုကောင်းအောင်ဆွဲပေးပါ။ Target customer, 3-tier structure, deliverables, estimated cost/margin assumptions, upsell, cannibalization risk, final recommendation နဲ့ 2-4 week test plan ပါစေ။ လက်ရှိအချက်အလက် - ' },
  { label: 'Business Fix', prompt: 'ဒီ business problem ကို consultant တစ်ယောက်လို ခွဲခြမ်းစိတ်ဖြာပြီး root cause, quick fix, long-term plan ပေးပါ။ Problem - ' },
  { label: 'Write Better', prompt: 'အောက်ကစာကို ပိုကောင်းအောင် ပြန်ရေးပေးပါ။ Tone က natural, premium, clear ဖြစ်ရမယ်။ စာ - ' },
  { label: 'Learn Fast', prompt: 'ဒီ topic ကို beginner နားလည်အောင် မြန်မြန်သင်ပေးပါ။ Core idea, example, mistakes to avoid, next practice ပေးပါ။ Topic - ' },
];

const chatIdFor = (uid: string) => `${uid}_strategy`;

const chatMessagesFor = (uid: string) => collection(db, 'chats', chatIdFor(uid), 'messages');

const migrateLegacyChat = async (uid: string) => {
  const messagesRef = chatMessagesFor(uid);
  const existing = await getDocs(query(messagesRef, limit(1)));
  if (!existing.empty) return;

  const legacySnapshot = await getDoc(doc(db, 'chats', chatIdFor(uid)));
  const legacyMessages = legacySnapshot.exists() && Array.isArray(legacySnapshot.data()?.messages)
    ? legacySnapshot.data()!.messages.slice(-450) as Message[]
    : [];
  if (!legacyMessages.length) return;

  const batch = writeBatch(db);
  const startTime = Date.now() - legacyMessages.length * 1000;
  legacyMessages.forEach((message, index) => {
    const messageId = String(message.id || `legacy-${index}`);
    batch.set(doc(messagesRef, messageId), {
      role: message.role,
      text: String(message.content || '').slice(0, 30_000),
      uid,
      timestamp: Timestamp.fromMillis(startTime + index * 1000),
    });
  });
  await batch.commit();
};

const deleteAllChatMessages = async (uid: string) => {
  const snapshot = await getDocs(chatMessagesFor(uid));
  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + 400).forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
};

const StrategyPartner: React.FC = () => {
  const { user, login } = useFirebase();
  const [messages, setMessages] = useState<Message[]>([defaultGreeting]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cancelNotice, setCancelNotice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<{ controller: AbortController; message: Message } | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setIsLoading(false);
    setIsInitializing(true);

    const loadHistory = async () => {
      if (!user) {
        setMessages([defaultGreeting]);
        setIsInitializing(false);
        return;
      }

      try {
        await migrateLegacyChat(user.uid);
        if (!active) return;
        const messagesQuery = query(chatMessagesFor(user.uid), orderBy('timestamp', 'asc'), limitToLast(200));
        unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          if (!active) return;
          const cloudMessages = snapshot.docs.map((entry) => ({
            id: entry.id,
            role: entry.data().role as Message['role'],
            content: String(entry.data().text || ''),
          })).filter((message) => message.content.trim());
          setMessages(cloudMessages.length ? cloudMessages : [defaultGreeting]);
          setIsInitializing(false);
        }, (error) => {
          console.error('Error listening to Strategy chat history:', error);
          if (active) setIsInitializing(false);
        });
      } catch (error) {
        console.error("Error loading chat history from Firebase:", error);
        if (active) {
          setMessages([defaultGreeting]);
          setIsInitializing(false);
        }
      }
    };

    void loadHistory();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const clearHistory = async () => {
    if (window.confirm('ဆွေးနွေးထားသမျှကို ဖျက်ပစ်မှာ သေချာပါသလား?')) {
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
      setIsLoading(false);
      const resetMessages = [defaultGreeting];
      setMessages(resetMessages);

      if (user) {
        try {
          await deleteAllChatMessages(user.uid);
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

  useEffect(() => () => {
    activeRequestRef.current?.controller.abort();
  }, []);

  const handleAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const cancelActiveRequest = () => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest) return;

    activeRequest.controller.abort();
    activeRequestRef.current = null;
    setMessages((current) => current.filter((message) => message.id !== activeRequest.message.id));
    if (user) {
      void deleteDoc(doc(chatMessagesFor(user.uid), activeRequest.message.id))
        .catch((error) => console.error('Error removing canceled Strategy message:', error));
    }
    setInput((current) => current.trim() ? current : activeRequest.message.content);
    setIsLoading(false);
    setCancelNotice('ပို့ထားတာကို Cancel လုပ်ပြီး စာကိုပြန်ထည့်ပေးထားပါတယ်။');
    setTimeout(() => setCancelNotice(''), 3000);
  };

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = overrideInput || input;
    if (!finalInput.trim() || isInitializing || isLoading) return;

    const userMsg = finalInput.trim().slice(0, 30_000);
    setInput('');
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: userMsg
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setCancelNotice('');
    const controller = new AbortController();
    activeRequestRef.current = { controller, message: newUserMsg };

    try {
      const history = messages.slice(-80).map((message) => ({
        role: message.role,
        parts: [{ text: message.content }],
      }));
      const chatSession = createStrategyChat(history);
      if (user) {
        await setDoc(doc(chatMessagesFor(user.uid), newUserMsg.id), {
          role: newUserMsg.role,
          text: newUserMsg.content,
          uid: user.uid,
          timestamp: serverTimestamp(),
        });
      }
      if (controller.signal.aborted || activeRequestRef.current?.controller !== controller) {
        if (user) await deleteDoc(doc(chatMessagesFor(user.uid), newUserMsg.id));
        return;
      }

      const response = await chatSession.sendMessage(userMsg, { signal: controller.signal });
      if (controller.signal.aborted || activeRequestRef.current?.controller !== controller) return;

      const modelMsg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'model',
        content: String(response.text || '').slice(0, 30_000),
      };

      setMessages((current) => [...current.filter((message) => message.id !== modelMsg.id), modelMsg]);
      if (user) {
        try {
          await setDoc(doc(chatMessagesFor(user.uid), modelMsg.id), {
            role: modelMsg.role,
            text: modelMsg.content,
            uid: user.uid,
            timestamp: serverTimestamp(),
          });
        } catch (error) {
          console.error("Error saving to Firebase:", error);
        }
      }
      
    } catch (error: any) {
      if (controller.signal.aborted || error?.name === 'AbortError') return;
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'ဆာဗာနှင့် ချိတ်ဆက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏနေမှ ပြန်လည်ကြိုးစားကြည့်ပါရှင်။'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (activeRequestRef.current?.controller === controller) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
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
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase">General + Studio Consultant</p>
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
            <div className="flex items-center gap-4 rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-center gap-2" aria-label="Strategy Partner AI က အဖြေစဉ်းစားနေသည်">
                <div className="h-2 w-2 animate-bounce rounded-full bg-amber-500"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <button
                type="button"
                onClick={cancelActiveRequest}
                className="min-h-10 rounded-lg border border-red-400/30 bg-red-500/10 px-4 text-xs font-black text-red-300 transition-colors hover:bg-red-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions & Input Area */}
      <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 z-10">
        {cancelNotice && (
          <div className="mx-auto mb-3 max-w-4xl rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300" role="status">
            {cancelNotice}
          </div>
        )}
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
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="ဘာမေးမေးရေးပါ... business, tech, client message, planning, writing, everyday problem solving"
            maxLength={30000}
            rows={2}
            className="min-h-[56px] max-h-32 flex-1 resize-none bg-slate-950 border border-slate-700 text-white rounded-xl px-5 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all burmese-text"
            disabled={isLoading || isInitializing}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={cancelActiveRequest}
              className="min-w-20 rounded-xl border border-red-400/30 bg-red-500/10 px-4 text-xs font-black text-red-300 transition-colors hover:bg-red-500 hover:text-white"
              aria-label="AI request ကို Cancel လုပ်ရန်"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isInitializing}
              className="flex min-w-14 items-center justify-center rounded-xl bg-amber-500 px-5 text-slate-950 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
              aria-label="Strategy Partner AI ထံပို့ရန်"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default StrategyPartner;
