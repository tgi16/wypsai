import React, { useState, useEffect, useRef } from 'react';
import { createStrategyChat, extractStrategyMemories } from '../geminiService';
import ReactMarkdown from 'react-markdown';
import {
  BrainCircuit,
  BookMarked,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Cloud,
  Copy,
  Database,
  FileText,
  Globe2,
  HardDrive,
  LoaderCircle,
  ListChecks,
  Palette,
  Paperclip,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from 'lucide-react';
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
import { buildBusinessBrainSnapshot, BUSINESS_BRAIN_UPDATED_EVENT } from '../businessBrain';
import {
  clearStrategyHistory,
  buildStrategyModelHistory,
  mergeStrategyMessages,
  readStrategyHistory,
  StrategyAnswerMode,
  StrategyMessage,
  writeStrategyHistory,
} from '../strategyHistory';
import {
  buildStrategyMemoryContext,
  containsSensitiveStrategyMemory,
  readStrategyMemories,
  removeStrategyMemory,
  STRATEGY_MEMORY_UPDATED_EVENT,
  upsertStrategyMemories,
} from '../strategyMemory';
import {
  prepareStrategyAttachment,
  PreparedStrategyAttachment,
  releaseStrategyAttachment,
  STRATEGY_ATTACHMENT_ACCEPT,
} from '../strategyAttachment';
import { AppTab } from '../types';
import { setStoryBookPrefill } from '../storyBook';

type Message = StrategyMessage;

const defaultGreeting: Message = {
  id: '1',
  role: 'model',
  content: 'မင်္ဂလာပါရှင်။ ကျွန်မက Strategy Partner AI ပါ။ Studio business, marketing, client message, tech, planning, writing, learning, everyday problem solving ဘာမေးမေး အကောင်းဆုံးအဖြေကို လက်တွေ့အသုံးချနိုင်အောင် ပြန်ပေးပါမယ်။\n\nမေးချင်တာကို တိုက်ရိုက်ရေးပါ။ အသေးစိတ်မပြည့်စုံရင်လည်း reasonable assumption နဲ့စပြီးကူညီပေးပါမယ်။'
};

const QUICK_ACTIONS = [
  { label: 'Today Priorities', prompt: 'WYPS Business Brain ထဲက လက်ရှိ data ကိုအခြေခံပြီး ဒီနေ့ အရေးကြီးဆုံးလုပ်ရမယ့် အလုပ် ၃ ခုကို priority, reason, expected outcome နဲ့ပေးပါ။' },
  { label: 'Booking Risk', prompt: 'WYPS Business Brain ထဲက booking, reminder, balance, overdue data ကိုစစ်ပြီး အခုချက်ချင်းကိုင်တွယ်ရမယ့် risk နဲ့ action plan ပေးပါ။' },
  { label: 'Content Gap', prompt: 'WYPS Business Brain ထဲက recent posts, approval pipeline, Facebook insights ကိုသုံးပြီး အခုလိုနေတဲ့ content angle နဲ့ ဒီနေ့ရေးသင့်တဲ့ post brief ကိုပေးပါ။' },
  { label: 'Best Answer', prompt: 'ဒီမေးခွန်းကို အကောင်းဆုံးဖြေပေးပါ။ အရင်ဆုံး တိုက်ရိုက်အဖြေ၊ ပြီးရင် လက်တွေ့လုပ်ရမယ့် steps နဲ့ example ပေးပါ။ မေးခွန်း - ' },
  { label: 'Decision Help', prompt: 'အောက်ကအခြေအနေမှာ ဘယ် option ကိုရွေးသင့်လဲ၊ pros/cons နဲ့ final recommendation ပေးပါ။ အခြေအနေ - ' },
  { label: 'Package Strategy', prompt: 'WYPS အတွက် ဒီ package ကို ပိုကောင်းအောင်ဆွဲပေးပါ။ Target customer, 3-tier structure, deliverables, estimated cost/margin assumptions, upsell, cannibalization risk, final recommendation နဲ့ 2-4 week test plan ပါစေ။ လက်ရှိအချက်အလက် - ' },
  { label: 'Business Fix', prompt: 'ဒီ business problem ကို consultant တစ်ယောက်လို ခွဲခြမ်းစိတ်ဖြာပြီး root cause, quick fix, long-term plan ပေးပါ။ Problem - ' },
  { label: 'Write Better', prompt: 'အောက်ကစာကို ပိုကောင်းအောင် ပြန်ရေးပေးပါ။ Tone က natural, premium, clear ဖြစ်ရမယ်။ စာ - ' },
  { label: 'Learn Fast', prompt: 'ဒီ topic ကို beginner နားလည်အောင် မြန်မြန်သင်ပေးပါ။ Core idea, example, mistakes to avoid, next practice ပေးပါ။ Topic - ' },
];

const ANSWER_MODES: Array<{
  value: StrategyAnswerMode;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'general', label: 'General Expert', shortLabel: 'General', icon: BrainCircuit },
  { value: 'business', label: 'Business Strategy', shortLabel: 'Business', icon: BriefcaseBusiness },
  { value: 'creative', label: 'Creative Partner', shortLabel: 'Creative', icon: Palette },
  { value: 'action', label: 'Action Plan', shortLabel: 'Action', icon: ListChecks },
];

const STRATEGY_MODE_KEY = 'wyps_strategy_answer_mode_v1';
const STRATEGY_SEARCH_KEY = 'wyps_strategy_live_search_v1';

const chatIdFor = (uid: string) => `${uid}_strategy`;

const chatMessagesFor = (uid: string) => collection(db, 'chats', chatIdFor(uid), 'messages');

const withoutGreeting = (messages: Message[]) => messages.filter((message) => message.id !== defaultGreeting.id);

const persistLocalMessages = (messages: Message[], uid?: string | null) => (
  writeStrategyHistory(withoutGreeting(messages), uid)
);

const migrateLocalMessages = async (uid: string, messages: Message[]) => {
  const localMessages = withoutGreeting(messages).slice(-160);
  if (!localMessages.length) return;

  const messagesRef = chatMessagesFor(uid);
  const existing = await getDocs(messagesRef);
  const existingIds = new Set(existing.docs.map((entry) => entry.id));
  const missing = localMessages.filter((message) => !existingIds.has(message.id));
  const startTime = Date.now() - missing.length * 1000;

  for (let index = 0; index < missing.length; index += 400) {
    const batch = writeBatch(db);
    missing.slice(index, index + 400).forEach((message, batchIndex) => {
      batch.set(doc(messagesRef, message.id), {
        role: message.role,
        text: message.content.slice(0, 30_000),
        uid,
        timestamp: Timestamp.fromMillis(startTime + index * 1000 + batchIndex * 1000),
      });
    });
    await batch.commit();
  }
};

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

const StrategyPartner: React.FC<{ onNavigate?: (tab: AppTab) => void }> = ({ onNavigate }) => {
  const { user, login } = useFirebase();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = readStrategyHistory(user?.uid);
    return saved.length ? saved : [defaultGreeting];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cancelNotice, setCancelNotice] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');
  const [showBrainSources, setShowBrainSources] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memoryInput, setMemoryInput] = useState('');
  const [memories, setMemories] = useState(() => readStrategyMemories(user?.uid));
  const [liveSearch, setLiveSearch] = useState(() => localStorage.getItem(STRATEGY_SEARCH_KEY) !== 'false');
  const [attachment, setAttachment] = useState<PreparedStrategyAttachment | null>(null);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [answerMode, setAnswerMode] = useState<StrategyAnswerMode>(() => {
    const savedMode = localStorage.getItem(STRATEGY_MODE_KEY) as StrategyAnswerMode | null;
    return ANSWER_MODES.some((mode) => mode.value === savedMode) ? savedMode! : 'general';
  });
  const [brain, setBrain] = useState(() => buildBusinessBrainSnapshot('strategy'));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRequestRef = useRef<{ controller: AbortController; message: Message; originalInput: string } | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setIsLoading(false);
    setIsInitializing(true);

    const loadHistory = async () => {
      if (!user) {
        const localMessages = readStrategyHistory();
        setMessages(localMessages.length ? localMessages : [defaultGreeting]);
        setIsInitializing(false);
        return;
      }

      try {
        const cachedMessages = readStrategyHistory(user.uid);
        const anonymousMessages = readStrategyHistory();
        const localMessages = mergeStrategyMessages(cachedMessages, anonymousMessages);
        if (localMessages.length) setMessages(localMessages);
        await migrateLegacyChat(user.uid);
        await migrateLocalMessages(user.uid, localMessages);
        if (anonymousMessages.length) clearStrategyHistory();
        if (!active) return;
        const messagesQuery = query(chatMessagesFor(user.uid), orderBy('timestamp', 'asc'), limitToLast(200));
        unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          if (!active) return;
          const cloudMessages = snapshot.docs.map((entry) => ({
            id: entry.id,
            role: entry.data().role as Message['role'],
            content: String(entry.data().text || ''),
          })).filter((message) => message.content.trim());
          const latestLocalMessages = readStrategyHistory(user.uid);
          const mergedMessages = mergeStrategyMessages(cloudMessages, latestLocalMessages);
          const nextMessages = mergedMessages.length ? mergedMessages : (localMessages.length ? localMessages : [defaultGreeting]);
          setMessages(nextMessages);
          persistLocalMessages(nextMessages, user.uid);
          setIsInitializing(false);
        }, (error) => {
          console.error('Error listening to Strategy chat history:', error);
          if (active) {
            const fallback = readStrategyHistory(user.uid);
            setMessages(fallback.length ? fallback : (localMessages.length ? localMessages : [defaultGreeting]));
            setIsInitializing(false);
          }
        });
      } catch (error) {
        console.error("Error loading chat history from Firebase:", error);
        if (active) {
          const fallback = readStrategyHistory(user.uid);
          setMessages(fallback.length ? fallback : [defaultGreeting]);
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

  useEffect(() => {
    const refreshMemory = () => setMemories(readStrategyMemories(user?.uid));
    refreshMemory();
    window.addEventListener(STRATEGY_MEMORY_UPDATED_EVENT, refreshMemory);
    window.addEventListener('storage', refreshMemory);
    return () => {
      window.removeEventListener(STRATEGY_MEMORY_UPDATED_EVENT, refreshMemory);
      window.removeEventListener('storage', refreshMemory);
    };
  }, [user]);

  const clearHistory = async () => {
    if (window.confirm('ဆွေးနွေးထားသမျှကို ဖျက်ပစ်မှာ သေချာပါသလား?')) {
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
      setIsLoading(false);
      const resetMessages = [defaultGreeting];
      setMessages(resetMessages);
      clearStrategyHistory(user?.uid);
      if (!user) clearStrategyHistory();

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

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [input]);

  useEffect(() => () => {
    activeRequestRef.current?.controller.abort();
  }, []);

  useEffect(() => () => releaseStrategyAttachment(attachment), [attachment]);

  useEffect(() => {
    const refreshBrain = () => setBrain(buildBusinessBrainSnapshot('strategy'));
    window.addEventListener('storage', refreshBrain);
    window.addEventListener('wyps_generated_history_updated', refreshBrain);
    window.addEventListener('wyps_content_board_updated', refreshBrain);
    window.addEventListener('gemini_usage_updated', refreshBrain);
    window.addEventListener(BUSINESS_BRAIN_UPDATED_EVENT, refreshBrain);
    return () => {
      window.removeEventListener('storage', refreshBrain);
      window.removeEventListener('wyps_generated_history_updated', refreshBrain);
      window.removeEventListener('wyps_content_board_updated', refreshBrain);
      window.removeEventListener('gemini_usage_updated', refreshBrain);
      window.removeEventListener(BUSINESS_BRAIN_UPDATED_EVENT, refreshBrain);
    };
  }, []);

  const handleAction = (prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const changeAnswerMode = (mode: StrategyAnswerMode) => {
    setAnswerMode(mode);
    localStorage.setItem(STRATEGY_MODE_KEY, mode);
    inputRef.current?.focus();
  };

  const toggleLiveSearch = () => {
    setLiveSearch((current) => {
      const next = !current;
      localStorage.setItem(STRATEGY_SEARCH_KEY, String(next));
      return next;
    });
    inputRef.current?.focus();
  };

  const addManualMemory = () => {
    const detail = memoryInput.trim();
    if (!detail) return;
    if (containsSensitiveStrategyMemory(detail)) {
      setCancelNotice('Password, token, phone သို့မဟုတ် email ကို Long-Term Memory ထဲမသိမ်းပါ။');
      window.setTimeout(() => setCancelNotice(''), 4000);
      return;
    }
    const next = upsertStrategyMemories([{
      category: 'fact',
      title: detail.split(/[။.!?\n]/)[0].trim().slice(0, 80) || 'Saved memory',
      detail: detail.slice(0, 600),
    }], user?.uid);
    setMemories(next);
    setMemoryInput('');
  };

  const deleteMemory = (id: string) => {
    setMemories(removeStrategyMemory(id, user?.uid));
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsPreparingAttachment(true);
    setCancelNotice('');
    try {
      setAttachment(await prepareStrategyAttachment(file));
    } catch (error: any) {
      setCancelNotice(error?.message || 'File ကိုပြင်ဆင်လို့မရပါ။');
      window.setTimeout(() => setCancelNotice(''), 4000);
    } finally {
      setIsPreparingAttachment(false);
    }
  };

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(''), 1800);
    } catch (error) {
      console.error('Unable to copy Strategy response:', error);
      setCancelNotice('Copy မလုပ်နိုင်သေးပါ။ စာကို select လုပ်ပြီး ပြန်စမ်းကြည့်ပါ။');
      window.setTimeout(() => setCancelNotice(''), 3000);
    }
  };

  const createStoryBookFromMessage = (message: Message) => {
    setStoryBookPrefill({
      source: message.content,
      sourceLabel: 'Strategy Partner AI answer',
      sourceType: 'strategy',
      suggestedTitle: message.content.replace(/[#*_`]/g, '').split(/[။.!?\n]/)[0].trim().slice(0, 90),
      bookType: 'strategy-book',
    });
    onNavigate?.(AppTab.STORY_BOOK);
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
    setMessages((current) => {
      const next = current.filter((message) => message.id !== activeRequest.message.id);
      persistLocalMessages(next, user?.uid);
      return next;
    });
    if (user) {
      void deleteDoc(doc(chatMessagesFor(user.uid), activeRequest.message.id))
        .catch((error) => console.error('Error removing canceled Strategy message:', error));
    }
    setInput((current) => current.trim() ? current : activeRequest.originalInput);
    setIsLoading(false);
    setCancelNotice('ပို့ထားတာကို Cancel လုပ်ပြီး စာကိုပြန်ထည့်ပေးထားပါတယ်။');
    setTimeout(() => setCancelNotice(''), 3000);
  };

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = (overrideInput || input).trim();
    if ((!finalInput && !attachment) || isInitializing || isLoading || isPreparingAttachment) return;

    const userMsg = (finalInput || 'ဒီ attachment ကိုအသေးစိတ်ခွဲခြမ်းပြီး အရေးကြီးတဲ့အချက်နဲ့ လက်တွေ့အသုံးချနိုင်မယ့်အကြံပေးချက်ပေးပါ။').slice(0, 30_000);
    const messageContent = attachment ? `${userMsg}\n\n[Attachment: ${attachment.name}]` : userMsg;
    setInput('');
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: messageContent
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    persistLocalMessages(updatedMessages, user?.uid);
    setIsLoading(true);
    setCancelNotice('');
    const controller = new AbortController();
    activeRequestRef.current = { controller, message: newUserMsg, originalInput: userMsg };

    try {
      const history = buildStrategyModelHistory(withoutGreeting(messages));
      const freshBrain = buildBusinessBrainSnapshot('strategy');
      setBrain(freshBrain);
      const memoryContext = buildStrategyMemoryContext(memories);
      const chatSession = createStrategyChat(history, freshBrain.context, answerMode, {
        memoryContext,
        liveSearch,
        attachment,
      });
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

      setMessages((current) => {
        const next = [...current.filter((message) => message.id !== modelMsg.id), modelMsg];
        persistLocalMessages(next, user?.uid);
        return next;
      });
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
      setAttachment(null);
      void extractStrategyMemories(userMsg, response.text || '', memoryContext)
        .then((extracted) => {
          if (!extracted.length) return;
          setMemories(upsertStrategyMemories(extracted, user?.uid));
        })
        .catch((error) => console.warn('Strategy memory extraction skipped:', error));
      
    } catch (error: any) {
      if (controller.signal.aborted || error?.name === 'AbortError') return;
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'ဆာဗာနှင့် ချိတ်ဆက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏနေမှ ပြန်လည်ကြိုးစားကြည့်ပါရှင်။'
      };
      setMessages((current) => {
        const next = [...current, errorMsg];
        persistLocalMessages(next, user?.uid);
        return next;
      });
    } finally {
      if (activeRequestRef.current?.controller === controller) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const activeMode = ANSWER_MODES.find((mode) => mode.value === answerMode) || ANSWER_MODES[0];

  return (
    <section className="relative flex h-[calc(100dvh-13.5rem)] min-h-[31rem] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#020617] shadow-2xl lg:h-[calc(100dvh-5rem)] lg:min-h-[40rem] lg:rounded-[1.5rem]">
      <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-3 py-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 sm:h-11 sm:w-11">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-white sm:text-lg">Strategy Partner AI</h2>
            <div className="mt-0.5 flex items-center gap-2 overflow-hidden text-[10px] font-bold uppercase text-slate-400">
              <span className="truncate text-amber-400">{activeMode.label}</span>
              <button
                type="button"
                onClick={() => {
                  setShowBrainSources((current) => !current);
                  setShowMemory(false);
                }}
                className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                aria-expanded={showBrainSources}
                aria-label="Business Brain data sources"
              >
                Brain {brain.sourceCount}/{brain.totalSources}
              </button>
              <span className="hidden shrink-0 items-center gap-1 text-slate-500 md:flex">
                {brain.origin === 'cloud' ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
                {brain.origin === 'cloud' ? 'Cloud brain' : user ? 'Cloud sync' : 'Device saved'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setShowMemory((current) => !current);
              setShowBrainSources(false);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-amber-500/40 hover:text-amber-300"
            title="Long-term memory"
            aria-label="Long-term memory"
            aria-expanded={showMemory}
          >
            <BookMarked className="h-4 w-4" aria-hidden="true" />
            {memories.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black text-slate-950">{memories.length}</span>}
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300"
            title="Clear chat history"
            aria-label="Clear chat history"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {showBrainSources && (
        <aside className="custom-scrollbar absolute right-3 top-[4.75rem] z-30 max-h-[calc(100%-5.5rem)] w-[calc(100%-1.5rem)] max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-black/50 sm:right-5" aria-label="Business Brain source health">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-black text-white">Business Brain Sources</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  {brain.origin === 'cloud' ? `Cloud snapshot · ${brain.cloudAgeHours || 0}h ago` : user ? 'ဒီ device data ကို private cloud နဲ့ sync လုပ်ထားပါတယ်' : 'ဒီ device မှာပဲ သိမ်းထားပါတယ်'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setShowBrainSources(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" title="Close" aria-label="Close source health">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-1.5">
            {brain.sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-200">{source.label}</p>
                  <p className="truncate text-[10px] text-slate-500">{source.detail}</p>
                </div>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${source.available ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]' : 'bg-slate-600'}`} title={source.available ? 'Available' : 'Missing'} />
              </div>
            ))}
          </div>
          {brain.sourceCount < brain.totalSources && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-bold leading-relaxed text-amber-300">
              Missing source ကို သက်ဆိုင်ရာ POS, Pricing, Content သို့မဟုတ် Dashboard စာမျက်နှာမှာ sync လုပ်ပါ။ AI က missing data ကို zero လို့မယူပါ။
            </p>
          )}
          {!user && (
            <button type="button" onClick={() => login()} className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400">Login to sync devices</button>
          )}
        </aside>
      )}

      {showMemory && (
        <aside className="custom-scrollbar absolute right-3 top-[4.75rem] z-30 flex max-h-[calc(100%-5.5rem)] w-[calc(100%-1.5rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 sm:right-5" aria-label="Long-term memory panel">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 p-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-black text-white">Long-Term Memory</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{user ? 'Private cloud sync · ' : 'Device only · '}{memories.length}/30 saved</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowMemory(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" title="Close" aria-label="Close memory panel">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {memories.length ? memories.map((memory) => (
              <div key={memory.id} className="group flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">{memory.category}</span>
                    <p className="truncate text-xs font-bold text-slate-200">{memory.title}</p>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">{memory.detail}</p>
                </div>
                <button type="button" onClick={() => deleteMemory(memory.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-red-500/10 hover:text-red-300" title="Delete memory" aria-label={`Delete memory: ${memory.title}`}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center">
                <BookMarked className="mx-auto h-5 w-5 text-slate-600" aria-hidden="true" />
                <p className="mt-2 text-xs font-bold text-slate-400">Memory မရှိသေးပါ</p>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <input value={memoryInput} onChange={(event) => setMemoryInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addManualMemory(); }} maxLength={600} placeholder="မှတ်ထားချင်တာ..." className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none" />
              <button type="button" onClick={addManualMemory} disabled={!memoryInput.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500" title="Add memory" aria-label="Add memory">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="custom-scrollbar burmese-text min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 lg:px-7">
        {!user && messages.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <p className="text-xs font-bold leading-relaxed text-amber-300">ဖုန်းနဲ့ Mac မှာ ဆွေးနွေးချက်တူတူမြင်ဖို့ Login ဝင်ပါ။</p>
            <button onClick={() => login()} className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400">Login with Google</button>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative max-w-[92%] rounded-xl px-4 py-3 sm:px-5 sm:py-4 md:max-w-[88%] xl:max-w-[82%] ${
              msg.role === 'user'
                ? 'rounded-tr-sm bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'rounded-tl-sm border border-slate-700 bg-slate-800 text-slate-200 shadow-lg shadow-black/20'
            }`}>
              {msg.role === 'model' && (
                <button
                  type="button"
                  onClick={() => createStoryBookFromMessage(msg)}
                  className="absolute right-11 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/80 text-slate-400 opacity-100 transition-colors hover:border-amber-500/50 hover:text-amber-300 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  title="Create Story Book"
                  aria-label="Create Story Book from answer"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
              )}
              {msg.role === 'model' && (
                <button
                  type="button"
                  onClick={() => void copyMessage(msg)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/80 text-slate-400 opacity-100 transition-colors hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  title="Copy answer"
                  aria-label="Copy answer"
                >
                  {copiedMessageId === msg.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
              {msg.role === 'model' ? (
                <div className="prose prose-invert prose-sm max-w-none pr-16 prose-p:leading-relaxed prose-a:text-amber-400 sm:prose-base">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-xl rounded-tl-sm border border-slate-700 bg-slate-800 px-4 py-3">
              <div className="flex items-center gap-2" aria-label="Strategy Partner AI က အဖြေစဉ်းစားနေသည်">
                {[0, 0.2, 0.4].map((delay) => <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: `${delay}s` }} />)}
              </div>
              <button type="button" onClick={cancelActiveRequest} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white" title="Cancel response" aria-label="Cancel response">
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="z-10 shrink-0 border-t border-slate-800 bg-slate-900/95 px-3 py-3 backdrop-blur-md sm:px-5">
        {cancelNotice && <div className="mb-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300" role="status">{cancelNotice}</div>}

        <div className="hide-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Answer mode">
          {ANSWER_MODES.map((mode) => {
            const Icon = mode.icon;
            const selected = answerMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => changeAnswerMode(mode.value)}
                aria-pressed={selected}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-black transition-colors ${selected ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {mode.shortLabel}
              </button>
            );
          })}
          <button
            type="button"
            onClick={toggleLiveSearch}
            aria-pressed={liveSearch}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-black transition-colors ${liveSearch ? 'border-sky-400/60 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}
            title="Live Google Search"
          >
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            Search {liveSearch ? 'On' : 'Off'}
          </button>
        </div>

        <div className="hide-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => (
            <button key={action.label} type="button" onClick={() => handleAction(action.prompt)} className="h-8 shrink-0 rounded-full border border-slate-700 bg-slate-800 px-3 text-[10px] font-bold text-slate-300 transition-colors hover:border-amber-500/50 hover:text-amber-400 sm:text-xs">
              {action.label}
            </button>
          ))}
        </div>

        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 p-2">
            {attachment.previewUrl ? (
              <img src={attachment.previewUrl} alt="Attached preview" className="h-11 w-11 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-400"><FileText className="h-5 w-5" aria-hidden="true" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-200">{attachment.name}</p>
              <p className="mt-0.5 text-[9px] uppercase text-slate-500">{attachment.mimeType} · {(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button type="button" onClick={() => setAttachment(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300" title="Remove attachment" aria-label="Remove attachment">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept={STRATEGY_ATTACHMENT_ACCEPT} onChange={handleAttachmentChange} className="hidden" aria-label="Choose image or file" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isPreparingAttachment} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-amber-500/50 hover:text-amber-300 disabled:text-slate-600" title="Attach image, PDF, TXT, or CSV" aria-label="Attach image or file">
            {isPreparingAttachment ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Paperclip className="h-5 w-5" aria-hidden="true" />}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="ဘာမေးမေး ရေးပါ..."
            maxLength={30000}
            rows={1}
            className="burmese-text min-h-[52px] max-h-36 flex-1 resize-none overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition-all focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            disabled={isLoading || isInitializing || isPreparingAttachment}
          />
          {isLoading ? (
            <button type="button" onClick={cancelActiveRequest} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500 hover:text-white" title="Cancel response" aria-label="Cancel response">
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" disabled={(!input.trim() && !attachment) || isInitializing || isPreparingAttachment} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500" title="Send message" aria-label="Send message">
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </form>
      </footer>
    </section>
  );
};

export default StrategyPartner;
