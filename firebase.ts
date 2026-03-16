import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEqE5lWdLWIZOO_M3RYY35e17VMTGk-G0",
  authDomain: "saiai-content-generator.firebaseapp.com",
  projectId: "saiai-content-generator",
  storageBucket: "saiai-content-generator.firebasestorage.app",
  messagingSenderId: "574947512372",
  appId: "1:574947512372:web:fc1c8eb3bb83d924493a61",
  measurementId: "G-YVDTQ01MR8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const saveToLibrary = async (title: string, type: string, content: string) => {
  try {
    await addDoc(collection(db, 'saved_library'), {
      title,
      type,
      content,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving to library:", error);
    return false;
  }
};
