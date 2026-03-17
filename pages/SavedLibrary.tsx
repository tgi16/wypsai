import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseContext';
import ReactMarkdown from 'react-markdown';

interface SavedContent {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: any;
  uid: string;
}

const SavedLibrary: React.FC = () => {
  const { user, login } = useFirebase();
  const [savedItems, setSavedItems] = useState<SavedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SavedContent | null>(null);

  useEffect(() => {
    if (!user) {
      setSavedItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'saved_library'), 
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: SavedContent[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SavedContent);
      });
      setSavedItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching saved library:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('ဤမှတ်တမ်းကို ဖျက်ပစ်ရန် သေချာပါသလား?')) {
      try {
        await deleteDoc(doc(db, 'saved_library', id));
        if (selectedItem?.id === id) setSelectedItem(null);
      } catch (error) {
        console.error("Error deleting saved item:", error);
      }
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'Contract': return '📝';
      case 'Concept': return '✨';
      case 'Content': return '✍️';
      case 'Auto-Reply': return '🤖';
      default: return '💾';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
            💾
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Saved Library</h2>
            <p className="text-slate-400">သိမ်းဆည်းထားသော စာချုပ်များ၊ အိုင်ဒီယာများနှင့် စာသားများ</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800/50 space-y-4">
            <p className="text-slate-400">မှတ်တမ်းများကို Mac နှင့် ဖုန်းတို့တွင် အတူတူကြည့်နိုင်ရန် Login ဝင်ပေးပါ</p>
            <button 
              onClick={() => login()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-3 rounded-xl font-bold transition-colors"
            >
              Google ဖြင့် Login ဝင်ရန်
            </button>
          </div>
        ) : savedItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <p className="text-slate-400">သိမ်းဆည်းထားသော မှတ်တမ်း မရှိသေးပါ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedItems.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 cursor-pointer transition-colors group relative"
              >
                <button 
                  onClick={(e) => handleDelete(item.id, e)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{getIconForType(item.type)}</span>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">{item.type}</span>
                </div>
                <h3 className="text-white font-medium mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-slate-500 text-xs">{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing content */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getIconForType(selectedItem.type)}</span>
                <h3 className="text-xl font-bold text-white">{selectedItem.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 prose prose-invert max-w-none burmese-text">
                <ReactMarkdown>{selectedItem.content}</ReactMarkdown>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedItem.content);
                  alert('Copied to clipboard!');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Copy Text
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLibrary;
