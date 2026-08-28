import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowUp,
  BookImage,
  Check,
  Cloud,
  Download,
  FileImage,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useFirebase } from '../components/FirebaseContext';
import { generateStoryBookImage, generateStoryBookPlan } from '../geminiService';
import { prepareStrategyAttachment, PreparedStrategyAttachment, releaseStrategyAttachment } from '../strategyAttachment';
import {
  consumeStoryBookPrefill,
  readStoryBooks,
  removeStoryBook,
  StoryBookPage,
  StoryBookProject,
  StoryBookType,
  StoryBookVisualStyle,
  STORY_BOOK_UPDATED_EVENT,
  storyBookHistoryContent,
  upsertStoryBook,
  writeStoryBooks,
} from '../storyBook';
import { deleteStoryBookCloud, saveStoryBookCloud, subscribeStoryBooks } from '../storyBookCloud';
import { saveGeneratedHistory } from '../generatedHistory';
import { AppTab } from '../types';

const BOOK_TYPES: Array<{ value: StoryBookType; label: string; note: string }> = [
  { value: 'visual-concept', label: 'Visual Concept', note: 'Shoot mood, look, lighting, poses' },
  { value: 'client-presentation', label: 'Client Book', note: 'Client ကိုပြမယ့် concept proposal' },
  { value: 'social-carousel', label: 'Social Story', note: 'Carousel / Story progression' },
  { value: 'strategy-book', label: 'Strategy Book', note: 'Idea ကို visual action plan ပြောင်းရန်' },
];

const VISUAL_STYLES: Array<{ value: StoryBookVisualStyle; label: string }> = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'soft-editorial', label: 'Soft Editorial' },
  { value: 'premium-minimal', label: 'Premium Minimal' },
  { value: 'illustrated', label: 'Illustrated' },
];

const mergeProjects = (...groups: StoryBookProject[][]) => {
  const byId = new Map<string, StoryBookProject>();
  groups.flat().forEach((project) => {
    const current = byId.get(project.id);
    if (!current || new Date(project.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) byId.set(project.id, project);
  });
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20);
};

const pageImage = (page: StoryBookPage) => page.imageDataUrl || page.imageUrl || '';
const projectId = () => `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const StoryPage: React.FC<{ page: StoryBookPage; project: StoryBookProject; exportMode?: boolean }> = ({ page, project, exportMode }) => {
  const image = pageImage(page);
  return (
    <article className={`${exportMode ? 'h-[1000px] w-[800px]' : 'aspect-[4/5] w-full'} relative overflow-hidden bg-[#080d19] text-white`}>
      <div className="absolute inset-x-0 top-0 h-[64%] overflow-hidden bg-slate-900">
        {image ? (
          <img src={image} crossOrigin="anonymous" alt="Story page visual" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#101827,#1f2937,#35200b)] px-8 text-center">
            <ImagePlus className="h-10 w-10 text-amber-400/70" aria-hidden="true" />
            <p className="text-xs font-black uppercase text-amber-300">Rough visual pending</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-400">{page.visualPrompt}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d19] via-transparent to-black/15" />
        <div className="absolute left-5 top-5 rounded-md border border-white/20 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
          WITH YOU STUDIO
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[#080d19] px-[7%] pb-[6%] pt-[5%]">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">{String(page.order + 1).padStart(2, '0')}</span>
          <span className="h-px flex-1 bg-amber-400/30" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{project.visualStyle}</span>
        </div>
        <h2 className={`${exportMode ? 'text-4xl' : 'text-[clamp(1.05rem,3vw,2rem)]'} font-black leading-tight`}>{page.title}</h2>
        <p className={`${exportMode ? 'mt-5 text-xl' : 'mt-3 text-[clamp(0.65rem,1.7vw,1rem)]'} burmese-text whitespace-pre-wrap leading-relaxed text-slate-300`}>{page.narrative}</p>
        {page.shotNote && <p className={`${exportMode ? 'mt-5 text-base' : 'mt-3 text-[clamp(0.55rem,1.4vw,0.8rem)]'} line-clamp-2 border-l-2 border-amber-400/60 pl-3 font-bold leading-relaxed text-amber-100/70`}>{page.shotNote}</p>}
      </div>
    </article>
  );
};

const StoryBookStudio: React.FC = () => {
  const { user, login } = useFirebase();
  const [source, setSource] = useState('');
  const [sourceLabel, setSourceLabel] = useState('Manual idea');
  const [sourceType, setSourceType] = useState<StoryBookProject['sourceType']>('manual');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [bookType, setBookType] = useState<StoryBookType>('visual-concept');
  const [visualStyle, setVisualStyle] = useState<StoryBookVisualStyle>('cinematic');
  const [pageCount, setPageCount] = useState<6 | 8>(6);
  const [autoImages, setAutoImages] = useState(true);
  const [reference, setReference] = useState<PreparedStrategyAttachment | null>(null);
  const [project, setProject] = useState<StoryBookProject | null>(null);
  const [projects, setProjects] = useState<StoryBookProject[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [showProjects, setShowProjects] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [generatingPageId, setGeneratingPageId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const pageImageInputRef = useRef<HTMLInputElement>(null);

  const selectedPage = useMemo(
    () => project?.pages.find((page) => page.id === selectedPageId) || project?.pages[0] || null,
    [project, selectedPageId],
  );

  useEffect(() => {
    const prefill = consumeStoryBookPrefill();
    if (prefill) {
      setSource(prefill.source);
      setSourceLabel(prefill.sourceLabel);
      setSourceType(prefill.sourceType);
      setSuggestedTitle(prefill.suggestedTitle || '');
      setBookType(prefill.bookType || (prefill.sourceType === 'strategy' ? 'strategy-book' : 'visual-concept'));
    }
  }, []);

  useEffect(() => {
    const refresh = () => setProjects(readStoryBooks(user?.uid));
    refresh();
    window.addEventListener(STORY_BOOK_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(STORY_BOOK_UPDATED_EVENT, refresh);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeStoryBooks(user.uid, (cloudProjects) => {
      const merged = mergeProjects(cloudProjects, readStoryBooks(user.uid));
      writeStoryBooks(merged, user.uid, 'remote');
      setProjects(merged);
      setProject((current) => current ? merged.find((item) => item.id === current.id) || current : current);
    }, (cloudError) => console.error('Story Book cloud sync failed:', cloudError));
    return unsubscribe;
  }, [user]);

  useEffect(() => () => {
    abortRef.current?.abort();
    releaseStrategyAttachment(reference);
  }, [reference]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const cancelActiveGeneration = () => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    showNotice('Story Book ဖန်တီးနေမှုကို ရပ်လိုက်ပါပြီ။');
  };

  const updateProject = (updater: (current: StoryBookProject) => StoryBookProject) => {
    setProject((current) => current ? { ...updater(current), updatedAt: new Date().toISOString() } : current);
  };

  const updatePage = (patch: Partial<StoryBookPage>) => {
    if (!selectedPage) return;
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === selectedPage.id ? { ...page, ...patch } : page),
    }));
  };

  const handleReference = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const prepared = await prepareStrategyAttachment(file);
      if (!prepared.mimeType.startsWith('image/')) throw new Error('Reference အတွက် image file ပဲရွေးပေးပါ။');
      releaseStrategyAttachment(reference);
      setReference(prepared);
    } catch (attachmentError: any) {
      setError(attachmentError?.message || 'Reference image ပြင်ဆင်လို့မရသေးပါ။');
    }
  };

  const generateImageForPage = async (
    currentProject: StoryBookProject,
    page: StoryBookPage,
    controller: AbortController,
  ) => {
    setGeneratingPageId(page.id);
    setProject({
      ...currentProject,
      pages: currentProject.pages.map((item) => item.id === page.id ? { ...item, imageStatus: 'generating', imageError: '' } : item),
    });
    try {
      const generated = await generateStoryBookImage(page, currentProject.styleBible, reference, { signal: controller.signal });
      return {
        ...currentProject,
        pages: currentProject.pages.map((item) => item.id === page.id ? {
          ...item,
          imageDataUrl: generated.dataUrl,
          imageStatus: 'ready' as const,
          imageError: '',
        } : item),
        updatedAt: new Date().toISOString(),
      };
    } catch (imageError: any) {
      if (imageError?.name === 'AbortError') throw imageError;
      return {
        ...currentProject,
        pages: currentProject.pages.map((item) => item.id === page.id ? {
          ...item,
          imageStatus: 'error' as const,
          imageError: imageError?.message || 'Image generation မအောင်မြင်ပါ။',
        } : item),
      };
    } finally {
      setGeneratingPageId('');
    }
  };

  const persistProject = async (target: StoryBookProject, silent = false, account: User | null = user) => {
    setIsSaving(true);
    try {
      let saved = upsertStoryBook(target, account?.uid);
      if (account) {
        saved = await saveStoryBookCloud(target, account);
        upsertStoryBook(saved, account.uid, 'remote');
      }
      setProject(saved);
      setProjects((current) => mergeProjects([saved], current));
      saveGeneratedHistory({
        id: `storybook-${saved.id}`,
        type: 'Story Book',
        title: saved.title,
        subtitle: `${saved.pages.length}-page ${saved.bookType}`,
        content: storyBookHistoryContent(saved),
        tab: AppTab.STORY_BOOK,
      });
      if (!silent) showNotice(account ? 'Story Book ကို private cloud မှာသိမ်းပြီးပါပြီ။' : 'စာသား project ကို device မှာသိမ်းပြီးပါပြီ။');
      return saved;
    } catch (saveError: any) {
      setError(saveError?.message || 'Story Book သိမ်းလို့မရသေးပါ။');
      return target;
    } finally {
      setIsSaving(false);
    }
  };

  const createStoryBook = async () => {
    if (!source.trim() || isPlanning) return;
    setError('');
    let activeUser = user;
    if (!activeUser) {
      activeUser = await login();
      if (!activeUser) {
        setError('Story Book AI နဲ့ private image save သုံးရန် Google Login အရင်ဝင်ပေးပါ။');
        return;
      }
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPlanning(true);
    try {
      const plan = await generateStoryBookPlan(
        { source, sourceLabel, bookType, visualStyle, pageCount, suggestedTitle, reference },
        { signal: controller.signal },
      );
      let nextProject: StoryBookProject = {
        id: projectId(),
        title: plan.title,
        subtitle: plan.subtitle,
        source: source.trim(),
        sourceLabel,
        sourceType,
        bookType,
        visualStyle,
        styleBible: plan.styleBible,
        pageCount,
        pages: plan.pages.map((page, index) => ({
          ...page,
          id: `page-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
          order: index,
          imageStatus: 'idle',
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'device',
      };
      setProject(nextProject);
      setSelectedPageId(nextProject.pages[0].id);

      if (autoImages) {
        for (const page of nextProject.pages) {
          if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          setSelectedPageId(page.id);
          nextProject = await generateImageForPage(nextProject, page, controller);
          setProject(nextProject);
        }
      }
      await persistProject(nextProject, true, activeUser);
      showNotice(autoImages ? 'Story Book နဲ့ ပုံအကြမ်းတွေ အဆင်သင့်ဖြစ်ပါပြီ။' : 'Story Book page plan အဆင်သင့်ဖြစ်ပါပြီ။');
    } catch (planError: any) {
      if (planError?.name !== 'AbortError') setError(planError?.message || 'Story Book ဖန်တီးလို့မရသေးပါ။');
    } finally {
      abortRef.current = null;
      setIsPlanning(false);
      setGeneratingPageId('');
    }
  };

  const regenerateSelected = async () => {
    if (!project || !selectedPage || generatingPageId) return;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const next = await generateImageForPage(project, selectedPage, controller);
      setProject(next);
    } catch (regenerateError: any) {
      if (regenerateError?.name !== 'AbortError') setError(regenerateError?.message || 'Image generation မအောင်မြင်ပါ။');
    } finally {
      abortRef.current = null;
    }
  };

  const useOwnPageImage = async (file?: File) => {
    if (!file || !selectedPage) return;
    try {
      const prepared = await prepareStrategyAttachment(file);
      if (!prepared.mimeType.startsWith('image/')) throw new Error('Image file ပဲရွေးပေးပါ။');
      updatePage({ imageDataUrl: `data:${prepared.mimeType};base64,${prepared.data}`, imageStatus: 'ready', imageError: '' });
      releaseStrategyAttachment(prepared);
    } catch (ownImageError: any) {
      setError(ownImageError?.message || 'ပုံထည့်လို့မရသေးပါ။');
    }
  };

  const moveSelected = (direction: -1 | 1) => {
    if (!project || !selectedPage) return;
    const from = project.pages.findIndex((page) => page.id === selectedPage.id);
    const to = from + direction;
    if (to < 0 || to >= project.pages.length) return;
    const pages = [...project.pages];
    [pages[from], pages[to]] = [pages[to], pages[from]];
    updateProject((current) => ({ ...current, pages: pages.map((page, order) => ({ ...page, order })) }));
  };

  const downloadCurrentPng = async () => {
    if (!previewRef.current || !selectedPage) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, { backgroundColor: '#080d19', scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${project?.title || 'WYPS-Story'}-${selectedPage.order + 1}.png`;
      link.click();
    } catch {
      setError('PNG export မအောင်မြင်သေးပါ။');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPdf = async () => {
    if (!project || !exportRef.current) return;
    setIsExporting(true);
    setError('');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const nodes = Array.from(exportRef.current.children) as HTMLElement[];
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [200, 250], compress: true });
      for (let index = 0; index < nodes.length; index += 1) {
        const canvas = await html2canvas(nodes[index], { backgroundColor: '#080d19', scale: 1.5, useCORS: true });
        if (index > 0) pdf.addPage([200, 250], 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 200, 250, undefined, 'FAST');
      }
      pdf.save(`${project.title || 'WYPS-Story-Book'}.pdf`);
    } catch (exportError) {
      console.error(exportError);
      setError('PDF export မအောင်မြင်သေးပါ။ ပုံအားလုံး load ပြီးမှ ပြန်စမ်းပါ။');
    } finally {
      setIsExporting(false);
    }
  };

  const openProject = (item: StoryBookProject) => {
    setProject(item);
    setSelectedPageId(item.pages[0]?.id || '');
    setShowProjects(false);
  };

  const deleteProject = async (item: StoryBookProject) => {
    if (!window.confirm('ဒီ Story Book ကိုဖျက်မလား?')) return;
    try {
      if (user && item.syncStatus === 'cloud') await deleteStoryBookCloud(item, user);
      removeStoryBook(item.id, user?.uid);
      setProjects((current) => current.filter((projectItem) => projectItem.id !== item.id));
      if (project?.id === item.id) setProject(null);
      showNotice('Story Book ကိုဖျက်ပြီးပါပြီ။');
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Story Book ဖျက်လို့မရသေးပါ။');
    }
  };

  const resetComposer = () => {
    abortRef.current?.abort();
    setProject(null);
    setSource('');
    setSourceLabel('Manual idea');
    setSourceType('manual');
    setSuggestedTitle('');
    setSelectedPageId('');
    setError('');
  };

  if (!project) {
    return (
      <div className="space-y-5 pb-12 burmese-text">
        {notice && <div className="fixed left-1/2 top-4 z-[150] -translate-x-1/2 rounded-lg bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 shadow-2xl">{notice}</div>}
        <header className="border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">WYPS Visual Production</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Story Book <span className="text-amber-400">Studio</span></h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">Moodboard သို့မဟုတ် Strategy idea ကို ပုံအကြမ်းပါတဲ့ coherent visual story အဖြစ်ပြောင်းပါ။</p>
            </div>
            <button type="button" onClick={() => setShowProjects(!showProjects)} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-xs font-black text-white">
              <FolderOpen className="h-4 w-4" /> Projects {projects.length ? `(${projects.length})` : ''}
            </button>
          </div>
        </header>

        {showProjects && (
          <section className="border-b border-slate-800 pb-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.length ? projects.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <button type="button" onClick={() => openProject(item)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">{item.pages.length} pages</span>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">{item.syncStatus === 'cloud' && <Cloud className="h-3 w-3" />} {item.syncStatus || 'device'}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-1 text-sm font-black text-white">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.subtitle}</p>
                  </button>
                  <button type="button" onClick={() => void deleteProject(item)} className="mt-3 flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${item.title}`} title="Delete story book"><Trash2 className="h-4 w-4" /></button>
                </div>
              )) : <p className="text-sm text-slate-500">သိမ်းထားတဲ့ Story Book မရှိသေးပါ။</p>}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Source idea</label>
              {sourceType !== 'manual' && (
                <div className="mb-3 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div><p className="text-xs font-black text-emerald-300">{sourceLabel} ထည့်ပြီးပါပြီ</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">အောက်က idea ကို page-by-page story စာသားနဲ့ visual direction အဖြစ် AI က ပြန်ရေးပေးပါမယ်။ မဖန်တီးခင် လိုတာထပ်ဖြည့်နိုင်ပါတယ်။</p></div>
                </div>
              )}
              <textarea value={source} onChange={(event) => setSource(event.target.value)} maxLength={20000} rows={10} placeholder="Moodboard idea, Strategy answer သို့မဟုတ် ကိုယ်တိုင်စဉ်းစားထားတဲ့ concept ကိုရေးပါ..." className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm leading-relaxed text-white outline-none focus:border-amber-500" />
              <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-600"><span>{sourceLabel}</span><span>{source.length}/20,000</span></div>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Book type</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {BOOK_TYPES.map((type) => <button key={type.value} type="button" onClick={() => setBookType(type.value)} className={`rounded-lg border p-4 text-left ${bookType === type.value ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900'}`}><span className={`text-xs font-black ${bookType === type.value ? 'text-amber-300' : 'text-white'}`}>{type.label}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{type.note}</span></button>)}
              </div>
            </div>
          </div>

          <div className="space-y-5 border-l-0 border-slate-800 lg:border-l lg:pl-6">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Visual style</label>
              <div className="grid grid-cols-2 gap-2">{VISUAL_STYLES.map((style) => <button key={style.value} type="button" onClick={() => setVisualStyle(style.value)} className={`h-10 rounded-lg border text-[11px] font-black ${visualStyle === style.value ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>{style.label}</button>)}</div>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pages</label>
              <div className="grid grid-cols-2 gap-2">{([6, 8] as const).map((count) => <button key={count} type="button" onClick={() => setPageCount(count)} className={`h-11 rounded-lg border text-sm font-black ${pageCount === count ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>{count} pages</button>)}</div>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Visual reference</label>
              <input ref={referenceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleReference(event.target.files?.[0])} />
              {reference ? <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3"><img src={reference.previewUrl} alt="Visual reference" className="h-14 w-14 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-white">{reference.name}</p><p className="mt-1 text-[9px] text-slate-500">Mood, scene, color reference</p></div><button type="button" onClick={() => { releaseStrategyAttachment(reference); setReference(null); }} className="h-8 w-8 text-slate-500" aria-label="Remove reference"><X className="h-4 w-4" /></button></div> : <button type="button" onClick={() => referenceInputRef.current?.click()} className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 text-xs font-bold text-slate-400"><ImagePlus className="h-4 w-4" /> Reference ပုံထည့်မယ်</button>}
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4"><span><span className="block text-xs font-black text-white">AI rough images</span><span className="mt-1 block text-[10px] text-slate-500">{pageCount} ပုံ ခန့်မှန်း ${pageCount === 6 ? '0.23' : '0.31'}</span></span><input type="checkbox" checked={autoImages} onChange={(event) => setAutoImages(event.target.checked)} className="h-5 w-5 accent-amber-500" /></label>
            {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold leading-relaxed text-red-300" role="alert">{error}</p>}
            <button type="button" onClick={() => void createStoryBook()} disabled={!source.trim() || isPlanning} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500">
              {isPlanning ? <><LoaderCircle className="h-5 w-5 animate-spin" /> {generatingPageId ? 'ပုံအကြမ်းတွေ ဖန်တီးနေပါတယ်...' : 'Story structure တည်ဆောက်နေပါတယ်...'}</> : <><Sparkles className="h-5 w-5" /> Story Book ဖန်တီးမယ်</>}
            </button>
            {isPlanning && <button type="button" onClick={cancelActiveGeneration} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 text-xs font-black text-red-300"><Square className="h-3.5 w-3.5 fill-current" /> ဖန်တီးမှု ရပ်မယ်</button>}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 burmese-text">
      {notice && <div className="fixed left-1/2 top-4 z-[150] -translate-x-1/2 rounded-lg bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 shadow-2xl">{notice}</div>}
      <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-400">{project.pages.length}-page {project.bookType}</p><h1 className="mt-1 truncate text-2xl font-black text-white">{project.title}</h1><p className="mt-1 truncate text-xs text-slate-500">{project.subtitle}</p></div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(isPlanning || generatingPageId) && <button type="button" onClick={cancelActiveGeneration} className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-red-400/50 bg-red-500/15 px-3 text-xs font-black text-red-300"><Square className="h-3.5 w-3.5 fill-current" /> Cancel AI</button>}
          <button type="button" onClick={resetComposer} className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-black text-white"><Plus className="h-4 w-4" /> New</button>
          <button type="button" onClick={() => void persistProject(project)} disabled={isSaving} className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-black text-amber-300"><Save className="h-4 w-4" /> {isSaving ? 'Saving' : 'Save'}</button>
          <button type="button" onClick={() => void downloadCurrentPng()} disabled={isExporting} className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-black text-white"><FileImage className="h-4 w-4" /> PNG</button>
          <button type="button" onClick={() => void downloadPdf()} disabled={isExporting} className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-3 text-xs font-black text-slate-950"><Download className="h-4 w-4" /> {isExporting ? 'Exporting' : 'PDF'}</button>
        </div>
      </header>

      {error && <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold leading-relaxed text-red-300" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Close error"><X className="h-4 w-4" /></button></div>}

      <div className="grid min-h-0 gap-4 xl:grid-cols-[190px_minmax(360px,1fr)_340px]">
        <aside className="order-2 xl:order-1">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2 xl:max-h-[calc(100dvh-13rem)] xl:flex-col xl:overflow-y-auto xl:pr-1">
            {project.pages.map((page) => <button key={page.id} type="button" onClick={() => setSelectedPageId(page.id)} className={`w-28 shrink-0 overflow-hidden rounded-lg border text-left xl:w-full ${selectedPage?.id === page.id ? 'border-amber-400' : 'border-slate-800'}`}><div className="aspect-[4/3] bg-slate-900">{pageImage(page) ? <img src={pageImage(page)} alt="Page thumbnail" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><BookImage className="h-5 w-5 text-slate-600" /></div>}</div><div className="bg-slate-900 p-2"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black text-amber-400">{String(page.order + 1).padStart(2, '0')}</span>{page.imageStatus === 'ready' && <Check className="h-3 w-3 text-emerald-400" />}{page.imageStatus === 'generating' && <LoaderCircle className="h-3 w-3 animate-spin text-amber-400" />}</div><p className="mt-1 line-clamp-1 text-[10px] font-bold text-slate-300">{page.title}</p></div></button>)}
          </div>
        </aside>

        <main className="order-1 mx-auto w-full max-w-2xl xl:order-2">
          {selectedPage && <div ref={previewRef} className="overflow-hidden rounded-lg border border-slate-700 shadow-2xl shadow-black/30"><StoryPage page={selectedPage} project={project} /></div>}
          {selectedPage?.imageError && <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">{selectedPage.imageError}</p>}
        </main>

        <aside className="order-3 space-y-4 xl:max-h-[calc(100dvh-13rem)] xl:overflow-y-auto xl:pr-1">
          {selectedPage && <>
            <div className="flex items-center justify-between gap-2"><div><p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Page {selectedPage.order + 1}</p><p className="mt-1 text-xs text-slate-500">စာနဲ့ပုံကို တစ်မျက်နှာချင်းပြင်ပါ</p></div><div className="flex gap-1"><button type="button" onClick={() => moveSelected(-1)} disabled={selectedPage.order === 0} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-400 disabled:opacity-30" title="Move page up"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => moveSelected(1)} disabled={selectedPage.order === project.pages.length - 1} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-400 disabled:opacity-30" title="Move page down"><ArrowDown className="h-4 w-4" /></button></div></div>
            <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-500">Title</span><input value={selectedPage.title} onChange={(event) => updatePage({ title: event.target.value })} maxLength={180} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm font-black text-white outline-none focus:border-amber-500" /></label>
            <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-500">Story text</span><textarea value={selectedPage.narrative} onChange={(event) => updatePage({ narrative: event.target.value })} rows={5} maxLength={1800} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-white outline-none focus:border-amber-500" /></label>
            <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-500">Direction note</span><textarea value={selectedPage.shotNote} onChange={(event) => updatePage({ shotNote: event.target.value })} rows={3} maxLength={1000} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-white outline-none focus:border-amber-500" /></label>
            <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-500">AI visual prompt</span><textarea value={selectedPage.visualPrompt} onChange={(event) => updatePage({ visualPrompt: event.target.value })} rows={6} maxLength={3000} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300 outline-none focus:border-amber-500" /></label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void regenerateSelected()} disabled={Boolean(generatingPageId)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 text-xs font-black text-slate-950 disabled:bg-slate-700"><RefreshCw className={`h-4 w-4 ${generatingPageId === selectedPage.id ? 'animate-spin' : ''}`} /> Regenerate</button>
              <input ref={pageImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void useOwnPageImage(event.target.files?.[0])} />
              <button type="button" onClick={() => pageImageInputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-xs font-black text-white"><ImagePlus className="h-4 w-4" /> Own photo</button>
            </div>
          </>}
        </aside>
      </div>

      <div ref={exportRef} className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true">
        {project.pages.map((page) => <StoryPage key={`export-${page.id}`} page={page} project={project} exportMode />)}
      </div>
    </div>
  );
};

export default StoryBookStudio;
