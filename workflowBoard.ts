import { AppTab } from './types';

export type ApprovalStatus = 'Draft' | 'Ready' | 'Scheduled' | 'Posted';

export type ApprovalItem = {
  id: string;
  title: string;
  subtitle: string;
  facebookCaption: string;
  tiktokCaption: string;
  sourceTopic: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  packageName?: string;
};

export const CONTENT_APPROVAL_KEY = 'wyps_content_approval_board_v1';

const safeJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const saveItems = (items: ApprovalItem[]) => {
  localStorage.setItem(CONTENT_APPROVAL_KEY, JSON.stringify(items.slice(0, 100)));
  window.dispatchEvent(new CustomEvent('wyps_content_board_updated'));
};

export const readApprovalItems = () => safeJson<ApprovalItem[]>(CONTENT_APPROVAL_KEY, []);

export const saveApprovalItem = (input: Omit<ApprovalItem, 'id' | 'status' | 'createdAt' | 'updatedAt'> & Partial<Pick<ApprovalItem, 'id' | 'status'>>) => {
  const current = readApprovalItems();
  const now = new Date().toLocaleString();
  const nextItem: ApprovalItem = {
    ...input,
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: input.status || 'Draft',
    createdAt: now,
    updatedAt: now,
  };
  saveItems([nextItem, ...current.filter((item) => item.id !== nextItem.id)]);
  return nextItem;
};

export const updateApprovalStatus = (id: string, status: ApprovalStatus) => {
  const next = readApprovalItems().map((item) => (
    item.id === id ? { ...item, status, updatedAt: new Date().toLocaleString() } : item
  ));
  saveItems(next);
};

export const deleteApprovalItem = (id: string) => {
  saveItems(readApprovalItems().filter((item) => item.id !== id));
};

export const reuseApprovalItem = (item: ApprovalItem) => {
  localStorage.setItem('wyp_content_topic', [
    item.sourceTopic || item.title,
    '',
    'အောက်က caption ကိုမတူအောင် fresh version ပြန်ရေးပါ။',
    item.facebookCaption,
  ].filter(Boolean).join('\n'));
  return AppTab.CONTENT_GEN;
};
