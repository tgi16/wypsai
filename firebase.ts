import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google:", error);
    return null;
  }
};

export const logout = () => signOut(auth);

export const saveToLibrary = async (title: string, type: string, content: string) => {
  if (!auth.currentUser) return false;
  
  try {
    await addDoc(collection(db, 'saved_library'), {
      title,
      type,
      content,
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving to library:", error);
    return false;
  }
};

export const deleteFromLibrary = async (itemId: string) => {
  try {
    await deleteDoc(doc(db, 'saved_library', itemId));
    return true;
  } catch (error) {
    console.error("Error deleting from library:", error);
    return false;
  }
};
