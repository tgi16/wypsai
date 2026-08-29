import imageCompression from 'browser-image-compression';
import type { User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeStoryBookProject, StoryBookProject, stripStoryBookTransientData } from './storyBook';

const MAX_IMAGE_DOCUMENT_BYTES = 620 * 1024;
const projectRef = (uid: string, projectId: string) => doc(db, 'users', uid, 'wyps_storybooks', projectId);
const pagesRef = (uid: string, projectId: string) => collection(db, 'users', uid, 'wyps_storybooks', projectId, 'pages');
const pageRef = (uid: string, projectId: string, pageId: string) => doc(db, 'users', uid, 'wyps_storybooks', projectId, 'pages', pageId);

const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
};

const fileToDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Story Book image ကို cloud save အတွက်ပြင်လို့မရသေးပါ။'));
  reader.readAsDataURL(file);
});

const firestoreImage = async (dataUrl: string, pageId: string) => {
  const estimatedBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (estimatedBytes <= MAX_IMAGE_DOCUMENT_BYTES) return dataUrl;
  const source = await dataUrlToFile(dataUrl, `${pageId}.jpg`);
  const compressed = await imageCompression(source, {
    maxSizeMB: 0.56,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
  });
  const prepared = await fileToDataUrl(compressed);
  if (prepared.length >= 850_000) throw new Error('Story Book image က cloud save limit ထက်ကြီးနေပါတယ်။ Own photo ကို အနည်းငယ်ချုံ့ပြီးပြန်စမ်းပါ။');
  return prepared;
};

const hydrateProjectImages = async (uid: string, project: StoryBookProject) => {
  const snapshot = await getDocs(pagesRef(uid, project.id));
  const images = new Map(snapshot.docs.map((entry) => [entry.id, String(entry.data()?.imageDataUrl || '')]));
  return {
    ...project,
    pages: project.pages.map((page) => ({
      ...page,
      imageDataUrl: images.get(page.id) || undefined,
      imageStatus: images.has(page.id) ? 'ready' as const : page.imageStatus,
    })),
    syncStatus: 'cloud' as const,
  };
};

export const subscribeStoryBooks = (
  uid: string,
  onProjects: (projects: StoryBookProject[]) => void,
  onError?: (error: Error) => void,
) => onSnapshot(
  collection(db, 'users', uid, 'wyps_storybooks'),
  async (snapshot) => {
    try {
      const projects = snapshot.docs
        .map((entry) => normalizeStoryBookProject(entry.data()?.project))
        .filter((item): item is StoryBookProject => Boolean(item));
      onProjects(await Promise.all(projects.map((project) => hydrateProjectImages(uid, project))));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Story Book cloud sync failed'));
    }
  },
  (error) => onError?.(error),
);

const writeStoryBookCloud = async (project: StoryBookProject, user: User) => {
  const uploadedPages = await Promise.all(project.pages.map(async (page) => {
    if (page.imageDataUrl?.startsWith('data:image/')) {
      const imageDataUrl = await firestoreImage(page.imageDataUrl, page.id);
      await setDoc(pageRef(user.uid, project.id, page.id), {
        uid: user.uid,
        projectId: project.id,
        imageDataUrl,
        updatedAt: serverTimestamp(),
      });
      return { ...page, imageDataUrl, imagePath: `firestore:${page.id}`, imageStatus: 'ready' as const };
    }
    return page;
  }));

  const cloudProject = stripStoryBookTransientData({
    ...project,
    pages: uploadedPages,
    syncStatus: 'cloud',
    updatedAt: new Date().toISOString(),
  });
  await setDoc(projectRef(user.uid, project.id), {
    uid: user.uid,
    project: cloudProject,
    updatedAt: serverTimestamp(),
  });
  return { ...cloudProject, pages: uploadedPages };
};

export const saveStoryBookCloud = async (project: StoryBookProject, user: User) => {
  try {
    return await writeStoryBookCloud(project, user);
  } catch (error: any) {
    if (error?.code !== 'permission-denied' && !/insufficient permissions/i.test(error?.message || '')) throw error;
    await user.getIdToken(true);
    return writeStoryBookCloud(project, user);
  }
};

export const deleteStoryBookCloud = async (project: StoryBookProject, user: User) => {
  const images = await getDocs(pagesRef(user.uid, project.id));
  await Promise.all(images.docs.map((entry) => deleteDoc(entry.ref)));
  await deleteDoc(projectRef(user.uid, project.id));
};
