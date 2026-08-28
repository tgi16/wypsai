import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { GENERATED_HISTORY_KEY, GeneratedHistoryItem, readGeneratedHistory } from '../generatedHistory';
import { ApprovalItem, CONTENT_APPROVAL_KEY, readApprovalItems } from '../workflowBoard';
import {
  buildBusinessBrainSnapshot,
  BUSINESS_BRAIN_CLOUD_KEY,
  BUSINESS_BRAIN_UPDATED_EVENT,
  BusinessBrainSnapshot,
  persistBusinessBrainCloudSnapshot,
} from '../businessBrain';
import {
  clearStrategyMemories,
  mergeStrategyMemories,
  readStrategyMemories,
  STRATEGY_MEMORY_UPDATED_EVENT,
  StrategyMemory,
  writeStrategyMemories,
} from '../strategyMemory';

const FAVORITES_KEY = 'wyps_saved_library_favorites_v1';
const MIGRATION_KEY_PREFIX = 'wyps_firestore_sync_migrated_v2_';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const dateValue = (value?: string) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const persistHistory = (items: GeneratedHistoryItem[]) => {
  const sorted = uniqueById(items)
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))
    .slice(0, 80);
  localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(sorted));
  window.dispatchEvent(new CustomEvent('wyps_generated_history_updated', { detail: { action: 'remote' } }));
};

const persistApprovals = (items: ApprovalItem[]) => {
  const sorted = uniqueById(items)
    .sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt))
    .slice(0, 100);
  localStorage.setItem(CONTENT_APPROVAL_KEY, JSON.stringify(sorted));
  window.dispatchEvent(new CustomEvent('wyps_content_board_updated', { detail: { action: 'remote' } }));
};

const syncInitialData = async (user: User) => {
  const migrationKey = `${MIGRATION_KEY_PREFIX}${user.uid}`;
  if (localStorage.getItem(migrationKey)) return;

  const userRef = doc(db, 'users', user.uid);
  const historyRef = collection(userRef, 'wyps_history');
  const approvalsRef = collection(userRef, 'wyps_approvals');
  const settingsRef = doc(userRef, 'wyps_settings', 'library');
  const [remoteHistory, remoteApprovals, remoteSettings] = await Promise.all([
    getDocs(historyRef),
    getDocs(approvalsRef),
    getDoc(settingsRef),
  ]);

  const remoteHistoryIds = new Set(remoteHistory.docs.map((entry) => entry.id));
  const remoteApprovalIds = new Set(remoteApprovals.docs.map((entry) => entry.id));
  const batch = writeBatch(db);
  let writes = 0;

  readGeneratedHistory().slice(0, 80).forEach((item) => {
    if (remoteHistoryIds.has(item.id)) return;
    const { sourceKey, legacyId, ...cloudItem } = item;
    batch.set(doc(historyRef, cloudItem.id), cloudItem);
    writes += 1;
  });

  readApprovalItems().slice(0, 100).forEach((item) => {
    if (remoteApprovalIds.has(item.id)) return;
    batch.set(doc(approvalsRef, item.id), item);
    writes += 1;
  });

  const localFavorites = readJson<string[]>(FAVORITES_KEY, []);
  const cloudFavorites = remoteSettings.exists() && Array.isArray(remoteSettings.data()?.favorites)
    ? remoteSettings.data()!.favorites as string[]
    : [];
  const mergedFavorites = Array.from(new Set([...cloudFavorites, ...localFavorites])).slice(0, 24);
  if (!remoteSettings.exists() || JSON.stringify(mergedFavorites) !== JSON.stringify(cloudFavorites.slice(0, 24))) {
    batch.set(settingsRef, { favorites: mergedFavorites }, { merge: true });
    writes += 1;
  }

  if (writes > 0) await batch.commit();
  localStorage.setItem(migrationKey, '1');
};

const FirestoreSync: React.FC<{ user: User | null }> = ({ user }) => {
  useEffect(() => {
    if (!user) return;
    let active = true;
    let stopListeners = () => {};
    const userRef = doc(db, 'users', user.uid);
    const historyRef = collection(userRef, 'wyps_history');
    const approvalsRef = collection(userRef, 'wyps_approvals');
    const settingsRef = doc(userRef, 'wyps_settings', 'library');
    const brainRef = doc(userRef, 'wyps_settings', 'business_brain');
    const memoryRef = doc(userRef, 'wyps_settings', 'strategy_memory');
    let lastBrainFingerprint = '';

    const brainFingerprint = (snapshot: BusinessBrainSnapshot) => JSON.stringify({
      sourceCount: snapshot.sourceCount,
      sources: snapshot.sources,
      metrics: snapshot.metrics,
      priorities: snapshot.priorities,
      contentSignals: snapshot.contentSignals,
      suggestions: snapshot.suggestions,
      context: snapshot.context.replace(/^Generated:.*$/m, ''),
    });

    const syncLocalBrain = async () => {
      const localSnapshot = buildBusinessBrainSnapshot('strategy', undefined, new Date(), false);
      if (!localSnapshot.sourceCount) return;

      const cloudSnapshot = readJson<BusinessBrainSnapshot | null>(BUSINESS_BRAIN_CLOUD_KEY, null);
      const localSourceIds = new Set(localSnapshot.sources.filter((source) => source.available).map((source) => source.id));
      const cloudGeneratedAt = new Date(cloudSnapshot?.generatedAt || 0).getTime();
      const cloudIsFresh = Number.isFinite(cloudGeneratedAt)
        && Date.now() - cloudGeneratedAt >= 0
        && Date.now() - cloudGeneratedAt <= 7 * 24 * 60 * 60 * 1000;
      const cloudHasMissingLocalSource = cloudIsFresh && Array.isArray(cloudSnapshot?.sources)
        && cloudSnapshot.sources.some((source) => source.available && !localSourceIds.has(source.id));
      if (cloudHasMissingLocalSource) return;

      const fingerprint = brainFingerprint(localSnapshot);
      if (fingerprint === lastBrainFingerprint) return;
      await setDoc(brainRef, {
        uid: user.uid,
        snapshot: localSnapshot,
        updatedAt: serverTimestamp(),
      });
      lastBrainFingerprint = fingerprint;
    };

    const onHistoryUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.action === 'remote') return;
      if (detail.action === 'delete' && detail.id) {
        void deleteDoc(doc(historyRef, detail.id)).catch((error) => console.error('Firestore history delete failed:', error));
      } else if (detail.action === 'clear') {
        const batch = writeBatch(db);
        (Array.isArray(detail.ids) ? detail.ids : []).forEach((id) => batch.delete(doc(historyRef, id)));
        void batch.commit().catch((error) => console.error('Firestore history clear failed:', error));
      } else if (detail.item?.id) {
        const { sourceKey, legacyId, ...cloudItem } = detail.item;
        void setDoc(doc(historyRef, cloudItem.id), cloudItem).catch((error) => console.error('Firestore history save failed:', error));
      }
    };

    const onApprovalUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.action === 'remote') return;
      if (detail.action === 'delete' && detail.id) {
        void deleteDoc(doc(approvalsRef, detail.id)).catch((error) => console.error('Firestore approval delete failed:', error));
      } else if (detail.item?.id) {
        void setDoc(doc(approvalsRef, detail.item.id), detail.item).catch((error) => console.error('Firestore approval save failed:', error));
      }
    };

    const onFavoritesUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.action === 'remote') return;
      const favorites = readJson<string[]>(FAVORITES_KEY, []);
      void setDoc(settingsRef, { favorites: favorites.slice(0, 24) }, { merge: true })
        .catch((error) => console.error('Firestore favorites save failed:', error));
    };

    const onBusinessBrainUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.action === 'remote') return;
      void syncLocalBrain().catch((error) => console.error('Firestore Business Brain sync failed:', error));
    };

    const onStrategyMemoryUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.action === 'remote') return;
      void setDoc(memoryRef, {
        uid: user.uid,
        memories: readStrategyMemories(user.uid),
        updatedAt: serverTimestamp(),
      }).catch((error) => console.error('Firestore Strategy memory save failed:', error));
    };

    const syncInitialMemory = async () => {
      const remoteMemory = await getDoc(memoryRef);
      const remoteMemories = Array.isArray(remoteMemory.data()?.memories)
        ? remoteMemory.data()!.memories as StrategyMemory[]
        : [];
      const localMemories = readStrategyMemories(user.uid);
      const anonymousMemories = readStrategyMemories();
      const mergedMemories = mergeStrategyMemories(remoteMemories, localMemories, anonymousMemories);
      writeStrategyMemories(mergedMemories, user.uid, { action: 'remote' });
      if (anonymousMemories.length) clearStrategyMemories(undefined, false);

      if (JSON.stringify(mergedMemories) !== JSON.stringify(remoteMemories)) {
        await setDoc(memoryRef, {
          uid: user.uid,
          memories: mergedMemories,
          updatedAt: serverTimestamp(),
        });
      }
    };

    const start = async () => {
      try {
        await syncInitialData(user);
        await syncInitialMemory();
        const remoteBrain = await getDoc(brainRef);
        const remoteSnapshot = remoteBrain.data()?.snapshot as BusinessBrainSnapshot | undefined;
        if (remoteSnapshot?.generatedAt && Array.isArray(remoteSnapshot.sources)) {
          lastBrainFingerprint = brainFingerprint(remoteSnapshot);
          persistBusinessBrainCloudSnapshot(remoteSnapshot);
        }
      } catch (error) {
        console.error('Firestore initial sync failed:', error);
      }
      if (!active) return;

      const unsubscribeHistory = onSnapshot(historyRef, (snapshot) => {
        if (!active) return;
        persistHistory(snapshot.docs.map((entry) => entry.data() as GeneratedHistoryItem));
      }, (error) => console.error('Firestore history listener failed:', error));

      const unsubscribeApprovals = onSnapshot(approvalsRef, (snapshot) => {
        if (!active) return;
        persistApprovals(snapshot.docs.map((entry) => entry.data() as ApprovalItem));
      }, (error) => console.error('Firestore approval listener failed:', error));

      const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
        if (!active || !snapshot.exists()) return;
        const favorites = snapshot.data()?.favorites;
        if (!Array.isArray(favorites)) return;
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.slice(0, 24)));
        window.dispatchEvent(new CustomEvent('wyps_saved_library_favorites_updated', { detail: { action: 'remote' } }));
      }, (error) => console.error('Firestore settings listener failed:', error));

      const unsubscribeBrain = onSnapshot(brainRef, (snapshot) => {
        if (!active || !snapshot.exists()) return;
        const remoteSnapshot = snapshot.data()?.snapshot as BusinessBrainSnapshot | undefined;
        if (!remoteSnapshot?.generatedAt || !Array.isArray(remoteSnapshot.sources)) return;
        lastBrainFingerprint = brainFingerprint(remoteSnapshot);
        persistBusinessBrainCloudSnapshot(remoteSnapshot);
      }, (error) => console.error('Firestore Business Brain listener failed:', error));

      const unsubscribeMemory = onSnapshot(memoryRef, (snapshot) => {
        if (!active || !snapshot.exists()) return;
        const memories = Array.isArray(snapshot.data()?.memories)
          ? snapshot.data()!.memories as StrategyMemory[]
          : [];
        writeStrategyMemories(memories, user.uid, { action: 'remote' });
      }, (error) => console.error('Firestore Strategy memory listener failed:', error));

      window.addEventListener('wyps_generated_history_updated', onHistoryUpdate);
      window.addEventListener('wyps_content_board_updated', onApprovalUpdate);
      window.addEventListener('wyps_saved_library_favorites_updated', onFavoritesUpdate);
      window.addEventListener('wyps_generated_history_updated', onBusinessBrainUpdate);
      window.addEventListener('wyps_content_board_updated', onBusinessBrainUpdate);
      window.addEventListener(BUSINESS_BRAIN_UPDATED_EVENT, onBusinessBrainUpdate);
      window.addEventListener('gemini_usage_updated', onBusinessBrainUpdate);
      window.addEventListener(STRATEGY_MEMORY_UPDATED_EVENT, onStrategyMemoryUpdate);
      void syncLocalBrain().catch((error) => console.error('Firestore Business Brain initial save failed:', error));
      stopListeners = () => {
        unsubscribeHistory();
        unsubscribeApprovals();
        unsubscribeSettings();
        unsubscribeBrain();
        unsubscribeMemory();
        window.removeEventListener('wyps_generated_history_updated', onHistoryUpdate);
        window.removeEventListener('wyps_content_board_updated', onApprovalUpdate);
        window.removeEventListener('wyps_saved_library_favorites_updated', onFavoritesUpdate);
        window.removeEventListener('wyps_generated_history_updated', onBusinessBrainUpdate);
        window.removeEventListener('wyps_content_board_updated', onBusinessBrainUpdate);
        window.removeEventListener(BUSINESS_BRAIN_UPDATED_EVENT, onBusinessBrainUpdate);
        window.removeEventListener('gemini_usage_updated', onBusinessBrainUpdate);
        window.removeEventListener(STRATEGY_MEMORY_UPDATED_EVENT, onStrategyMemoryUpdate);
      };
    };

    void start();
    return () => {
      active = false;
      stopListeners();
    };
  }, [user]);

  return null;
};

export default FirestoreSync;
