export type StoryBookType = 'visual-concept' | 'client-presentation' | 'social-carousel' | 'strategy-book';
export type StoryBookVisualStyle = 'cinematic' | 'soft-editorial' | 'premium-minimal' | 'illustrated';

export type StoryBookPage = {
  id: string;
  order: number;
  title: string;
  narrative: string;
  visualPrompt: string;
  shotNote: string;
  imageUrl?: string;
  imagePath?: string;
  imageDataUrl?: string;
  imageStatus?: 'idle' | 'generating' | 'ready' | 'error';
  imageError?: string;
};

export type StoryBookProject = {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  sourceLabel: string;
  sourceType: 'moodboard' | 'strategy' | 'manual' | 'library';
  bookType: StoryBookType;
  visualStyle: StoryBookVisualStyle;
  styleBible: string;
  pageCount: 6 | 8;
  pages: StoryBookPage[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'device' | 'cloud';
};

export type StoryBookPrefill = Pick<StoryBookProject, 'source' | 'sourceLabel' | 'sourceType'> & {
  suggestedTitle?: string;
  bookType?: StoryBookType;
};

export const STORY_BOOK_PREFILL_KEY = 'wyps_storybook_prefill_v1';
export const STORY_BOOK_LOCAL_KEY = 'wyps_storybooks_v1';
export const STORY_BOOK_UPDATED_EVENT = 'wyps_storybooks_updated';
export const MAX_STORY_BOOK_PROJECTS = 20;

const text = (value: unknown, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export const buildMoodboardStoryBookSource = (vibe: string, concept: string) => [
  `Customer vibe:\n${text(vibe, 4000)}`,
  `Moodboard & Concept recommendation:\n${text(concept, 16_000)}`,
].filter((section) => !section.endsWith('\n')).join('\n\n').slice(0, 20_000);

export const buildStrategyStoryBookSource = (answer: string, originalRequest?: string) => [
  originalRequest ? `Owner request:\n${text(originalRequest, 6000)}` : '',
  `Strategy Partner recommendation:\n${text(answer, 14_000)}`,
].filter(Boolean).join('\n\n').slice(0, 20_000);

const iso = (value: unknown) => {
  const parsed = new Date(typeof value === 'string' ? value : 0);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
};
const validBookType = (value: unknown): StoryBookType => (
  ['visual-concept', 'client-presentation', 'social-carousel', 'strategy-book'].includes(String(value))
    ? value as StoryBookType
    : 'visual-concept'
);
const validStyle = (value: unknown): StoryBookVisualStyle => (
  ['cinematic', 'soft-editorial', 'premium-minimal', 'illustrated'].includes(String(value))
    ? value as StoryBookVisualStyle
    : 'cinematic'
);

export const normalizeStoryBookProject = (value: unknown): StoryBookProject | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<StoryBookProject>;
  const id = text(raw.id, 120);
  const source = text(raw.source, 20_000);
  if (!id || !source || !Array.isArray(raw.pages)) return null;

  const pages = raw.pages.slice(0, 8).map((page, index): StoryBookPage | null => {
    if (!page || typeof page !== 'object') return null;
    const item = page as Partial<StoryBookPage>;
    const title = text(item.title, 180);
    const visualPrompt = text(item.visualPrompt, 3000);
    if (!title || !visualPrompt) return null;
    const imageUrl = text(item.imageUrl, 5000);
    const imagePath = text(item.imagePath, 500);
    return {
      id: text(item.id, 120) || `${id}-page-${index + 1}`,
      order: index,
      title,
      narrative: text(item.narrative, 1800),
      visualPrompt,
      shotNote: text(item.shotNote, 1000),
      ...(imageUrl ? { imageUrl } : {}),
      ...(imagePath ? { imagePath } : {}),
      imageStatus: imageUrl ? 'ready' : 'idle',
    };
  }).filter((page): page is StoryBookPage => Boolean(page));

  if (!pages.length) return null;
  const pageCount = raw.pageCount === 8 ? 8 : 6;
  return {
    id,
    title: text(raw.title, 180) || 'WYPS Visual Story Book',
    subtitle: text(raw.subtitle, 300),
    source,
    sourceLabel: text(raw.sourceLabel, 180) || 'Manual idea',
    sourceType: ['moodboard', 'strategy', 'manual', 'library'].includes(String(raw.sourceType))
      ? raw.sourceType as StoryBookProject['sourceType']
      : 'manual',
    bookType: validBookType(raw.bookType),
    visualStyle: validStyle(raw.visualStyle),
    styleBible: text(raw.styleBible, 2500),
    pageCount,
    pages: pages.slice(0, pageCount).map((page, order) => ({ ...page, order })),
    createdAt: iso(raw.createdAt),
    updatedAt: iso(raw.updatedAt),
    syncStatus: raw.syncStatus === 'cloud' ? 'cloud' : 'device',
  };
};

export const stripStoryBookTransientData = (project: StoryBookProject): StoryBookProject => ({
  ...project,
  pages: project.pages.map(({ imageDataUrl: _imageDataUrl, imageError: _imageError, ...page }) => ({
    ...page,
    imageStatus: page.imageUrl ? 'ready' : 'idle',
  })),
});

const storageKey = (uid?: string) => uid ? `${STORY_BOOK_LOCAL_KEY}_${uid}` : STORY_BOOK_LOCAL_KEY;

export const readStoryBooks = (uid?: string): StoryBookProject[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(uid)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .map(normalizeStoryBookProject)
      .filter((item): item is StoryBookProject => Boolean(item))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_STORY_BOOK_PROJECTS);
  } catch {
    return [];
  }
};

export const writeStoryBooks = (projects: StoryBookProject[], uid?: string, action = 'local') => {
  const normalized = projects
    .map((project) => normalizeStoryBookProject(stripStoryBookTransientData(project)))
    .filter((item): item is StoryBookProject => Boolean(item))
    .slice(0, MAX_STORY_BOOK_PROJECTS);
  localStorage.setItem(storageKey(uid), JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(STORY_BOOK_UPDATED_EVENT, { detail: { action } }));
  return normalized;
};

export const upsertStoryBook = (project: StoryBookProject, uid?: string, action = 'upsert') => {
  const current = readStoryBooks(uid);
  return writeStoryBooks([project, ...current.filter((item) => item.id !== project.id)], uid, action)[0];
};

export const removeStoryBook = (id: string, uid?: string, action = 'delete') => {
  const next = writeStoryBooks(readStoryBooks(uid).filter((item) => item.id !== id), uid, action);
  window.dispatchEvent(new CustomEvent(STORY_BOOK_UPDATED_EVENT, { detail: { action, id } }));
  return next;
};

export const setStoryBookPrefill = (prefill: StoryBookPrefill) => {
  localStorage.setItem(STORY_BOOK_PREFILL_KEY, JSON.stringify({
    source: text(prefill.source, 20_000),
    sourceLabel: text(prefill.sourceLabel, 180),
    sourceType: prefill.sourceType,
    suggestedTitle: text(prefill.suggestedTitle, 180),
    bookType: prefill.bookType,
  }));
};

export const consumeStoryBookPrefill = (): StoryBookPrefill | null => {
  try {
    const value = JSON.parse(localStorage.getItem(STORY_BOOK_PREFILL_KEY) || 'null');
    localStorage.removeItem(STORY_BOOK_PREFILL_KEY);
    if (!value?.source || !value?.sourceLabel) return null;
    return value as StoryBookPrefill;
  } catch {
    localStorage.removeItem(STORY_BOOK_PREFILL_KEY);
    return null;
  }
};

export const storyBookHistoryContent = (project: StoryBookProject) => [
  project.subtitle,
  `Visual style: ${project.visualStyle}`,
  project.styleBible,
  ...project.pages.map((page, index) => [
    `${index + 1}. ${page.title}`,
    page.narrative,
    page.shotNote ? `Direction: ${page.shotNote}` : '',
  ].filter(Boolean).join('\n')),
].filter(Boolean).join('\n\n');
