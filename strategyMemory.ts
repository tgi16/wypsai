export type StrategyMemoryCategory = 'preference' | 'goal' | 'decision' | 'fact' | 'workflow';

export type StrategyMemory = {
  id: string;
  category: StrategyMemoryCategory;
  title: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
};

type StorageRead = (key: string) => string | null;
type StorageWrite = (key: string, value: string) => void;

const MEMORY_PREFIX = 'wyps_strategy_memory_v1_';
const MAX_MEMORIES = 30;
export const STRATEGY_MEMORY_UPDATED_EVENT = 'wyps_strategy_memory_updated';

const categories = new Set<StrategyMemoryCategory>(['preference', 'goal', 'decision', 'fact', 'workflow']);

export const containsSensitiveStrategyMemory = (value: string) => (
  /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|passcode|secret)\b/i.test(value)
  || /စကားဝှက်|လျှို့ဝှက်/i.test(value)
  || /09\d{7,10}/.test(value.replace(/[\s-]/g, ''))
  || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
);

export const strategyMemoryKey = (uid?: string | null) => `${MEMORY_PREFIX}${uid || 'local'}`;

const cleanText = (value: unknown, maxLength: number) => String(value || '')
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .slice(0, maxLength);

const dateValue = (value: string) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMemory = (value: any): StrategyMemory | null => {
  if (!value || !categories.has(value.category)) return null;
  const title = cleanText(value.title, 100);
  const detail = cleanText(value.detail, 600);
  if (!title || !detail || containsSensitiveStrategyMemory(`${title} ${detail}`)) return null;
  const now = new Date().toISOString();
  return {
    id: cleanText(value.id, 100) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: value.category,
    title,
    detail,
    createdAt: cleanText(value.createdAt, 40) || now,
    updatedAt: cleanText(value.updatedAt, 40) || now,
  };
};

export const mergeStrategyMemories = (...groups: StrategyMemory[][]): StrategyMemory[] => {
  const byIdentity = new Map<string, StrategyMemory>();
  groups.flat().forEach((rawMemory) => {
    const memory = normalizeMemory(rawMemory);
    if (!memory) return;
    const identity = `${memory.category}:${memory.title.toLowerCase().replace(/\s+/g, ' ')}`;
    const existing = byIdentity.get(identity);
    if (!existing || dateValue(memory.updatedAt) >= dateValue(existing.updatedAt)) {
      byIdentity.set(identity, memory);
    }
  });
  return [...byIdentity.values()]
    .sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt))
    .slice(0, MAX_MEMORIES);
};

export const readStrategyMemories = (
  uid?: string | null,
  read: StorageRead = (key) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
): StrategyMemory[] => {
  try {
    const raw = read(strategyMemoryKey(uid));
    return raw ? mergeStrategyMemories(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

export const writeStrategyMemories = (
  memories: StrategyMemory[],
  uid?: string | null,
  options: { action?: 'local' | 'remote'; write?: StorageWrite; broadcast?: boolean } = {},
) => {
  const normalized = mergeStrategyMemories(memories);
  try {
    const write = options.write || ((key: string, value: string) => localStorage.setItem(key, value));
    write(strategyMemoryKey(uid), JSON.stringify(normalized));
    if (options.broadcast !== false && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STRATEGY_MEMORY_UPDATED_EVENT, {
        detail: { action: options.action || 'local' },
      }));
    }
  } catch {
    // Memory storage failure must never block Strategy chat.
  }
  return normalized;
};

export const upsertStrategyMemories = (
  inputs: Array<Pick<StrategyMemory, 'category' | 'title' | 'detail'> & Partial<Pick<StrategyMemory, 'id' | 'createdAt' | 'updatedAt'>>>,
  uid?: string | null,
) => {
  const now = new Date().toISOString();
  const next = inputs.map((input, index) => normalizeMemory({
    ...input,
    id: input.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: input.createdAt || now,
    updatedAt: now,
  })).filter((memory): memory is StrategyMemory => Boolean(memory));
  return writeStrategyMemories(mergeStrategyMemories(readStrategyMemories(uid), next), uid);
};

export const removeStrategyMemory = (id: string, uid?: string | null) => (
  writeStrategyMemories(readStrategyMemories(uid).filter((memory) => memory.id !== id), uid)
);

export const clearStrategyMemories = (uid?: string | null, broadcast = true) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(strategyMemoryKey(uid));
    if (broadcast && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STRATEGY_MEMORY_UPDATED_EVENT, { detail: { action: 'local' } }));
    }
  } catch {
    // Clearing memory should stay best-effort.
  }
};

export const buildStrategyMemoryContext = (memories: StrategyMemory[]) => {
  if (!memories.length) return 'No durable memories saved yet.';
  return [
    '[LONG-TERM MEMORY]',
    'Use only when relevant. Current user instructions override memory. Never treat a memory as a live business metric.',
    ...mergeStrategyMemories(memories).map((memory, index) => (
      `${index + 1}. [${memory.category}] ${memory.title}: ${memory.detail}`
    )),
  ].join('\n').slice(0, 10_000);
};
