export type StrategyMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

type StorageRead = (key: string) => string | null;
type StorageWrite = (key: string, value: string) => void;

const STRATEGY_HISTORY_PREFIX = 'wyps_strategy_chat_v2_';
const MAX_MESSAGES = 160;
const MAX_STORED_CHARACTERS = 1_500_000;

export const strategyHistoryKey = (uid?: string | null) => `${STRATEGY_HISTORY_PREFIX}${uid || 'local'}`;

const normalizeMessages = (value: unknown): StrategyMessage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message) => (
      message &&
      typeof message.id === 'string' &&
      (message.role === 'user' || message.role === 'model') &&
      typeof message.content === 'string' &&
      message.content.trim()
    ))
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content.slice(0, 30_000),
    }));
};

export const mergeStrategyMessages = (...groups: StrategyMessage[][]) => {
  const seen = new Set<string>();
  return groups.flat().filter((message) => {
    if (!message?.id || seen.has(message.id)) return false;
    seen.add(message.id);
    return Boolean(message.content?.trim());
  }).slice(-MAX_MESSAGES);
};

const trimForStorage = (messages: StrategyMessage[]) => {
  const recent = mergeStrategyMessages(messages).slice(-MAX_MESSAGES);
  const kept: StrategyMessage[] = [];
  let characters = 0;

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const message = recent[index];
    const size = message.id.length + message.role.length + message.content.length;
    if (kept.length && characters + size > MAX_STORED_CHARACTERS) break;
    characters += size;
    kept.unshift(message);
  }

  return kept;
};

export const readStrategyHistory = (
  uid?: string | null,
  read: StorageRead = (key) => {
    if (typeof localStorage === 'undefined') return null;
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
    }
  },
): StrategyMessage[] => {
  try {
    const raw = read(strategyHistoryKey(uid));
    return raw ? normalizeMessages(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

export const writeStrategyHistory = (
  messages: StrategyMessage[],
  uid?: string | null,
  write: StorageWrite = (key, value) => {
    try {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } catch {
      sessionStorage.setItem(key, value);
    }
  },
) => {
  const trimmed = trimForStorage(messages);
  try {
    write(strategyHistoryKey(uid), JSON.stringify(trimmed));
  } catch {
    // Chat submission must continue even when browser storage is unavailable.
  }
  return trimmed;
};

export const clearStrategyHistory = (
  uid?: string | null,
  remove: (key: string) => void = (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
) => remove(strategyHistoryKey(uid));
