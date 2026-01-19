
import AnalysisLoading from './components/AnalysisLoading';
import React, { useState, useEffect } from 'react';
import { User, AppRoute, Document, QuizQuestion, MindMap, SourceFile } from './types';
import Login from './components/Login';
import GamificationDisplay from './components/GamificationDisplay';
import OCRScanner from './components/OCRScanner';
import RevisionHub from './components/RevisionHub';
import QuizModule from './components/QuizModule';
import MathModule from './components/MathModule';
import DictationModule from './components/DictationModule';
import LanguageModule from './components/LanguageModule';
import DirectStudyModule from './components/DirectStudyModule';
import ChatModule from './components/ChatModule';
import MindMapEditor from './components/MindMapEditor';
import Profile from './components/Profile';
import AdminMathTips from './components/AdminMathTips';
import AdminUserManagement from './components/AdminUserManagement';
import { LogOut, Brain, MessageCircle, BookOpen, X, Home, Calculator, Mic, Languages, Zap, Users, AlertTriangle, Grid, User as UserIcon, Camera, UploadCloud, CheckCircle2, GraduationCap, ChevronRight, FileText, ImageIcon } from 'lucide-react';
import { mergeAnalysis } from './services/geminiService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hubInitialView, setHubInitialView] = useState<'menu' | 'fiche'>('menu');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setPermissionError(false);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.email!);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            setUser(userSnap.data() as User);
          } else {
            const newUser: User = {
              email: firebaseUser.email!,
              firstName: firebaseUser.displayName || 'Élève',
              role: 'student',
              xp: 0,
              level: 1,
              streak: 0,
              lastActive: new Date().toISOString(),
              tokenHistory: []
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          }

          const docsQuery = query(collection(db, 'users', firebaseUser.email!, 'documents'), orderBy('date', 'desc'));
          const unsubscribeDocs = onSnapshot(docsQuery, 
            (snapshot) => {
              const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Document));
              setDocuments(docs);
            },
            (error) => {
              if (error.code === 'permission-denied') setPermissionError(true);
            }
          );

          setAuthLoading(false);
          return () => unsubscribeDocs();
        } catch (error: any) {
          if (error.code === 'permission-denied') setPermissionError(true);
          setAuthLoading(false);
        }
      } else {
        setUser(null);
        setDocuments([]);
        setAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  useEffect(() => {
  const timer = setTimeout(() => {
    setBooting(false);
  }, 1200); // 1.2s pour un effet smooth

  return () => clearTimeout(timer);
}, []);
  const handleLogout = async () => { 
    await signOut(auth);
    setCurrentRoute(AppRoute.DASHBOARD); 
  };
  
  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    try {
      await setDoc(doc(db, 'users', updatedUser.email), updatedUser, { merge: true });
    } catch (e: any) {
      if (e.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleXpGain = (amount: number) => {
    if (!user) return;
    const newXp = user.xp + amount;
    const newLevel = Math.floor(newXp / 1000) + 1;
    handleUpdateUser({ ...user, xp: newXp, level: newLevel });
  };

  const handleNewDocument = async (analysis: any) => {
    if (!user) return;
    setLoading(true);
    try {
      if (isAddingSource && selectedDoc) {
        const merged = await mergeAnalysis(selectedDoc, analysis);
        const newSource: SourceFile = { id: Date.now().toString(), name: analysis.title || `Scan ${selectedDoc.sources.length + 1}`, type: 'photo', date: new Date().toISOString() };
        const updated = { ...selectedDoc, ...merged, sources: [...(selectedDoc.sources || []), newSource] };
        await setDoc(doc(db, 'users', user.email, 'documents', selectedDoc.id), updated);
        handleXpGain(75);
        setIsAddingSource(false);
      } else {
        const id = Date.now().toString();
        const firstSource: SourceFile = { id: Date.now().toString(), name: analysis.title || "Document Initial", type: 'photo', date: new Date().toISOString() };
        const docData: Document = { ...analysis, id, date: new Date().toISOString(), sources: [firstSource] };
        await setDoc(doc(db, 'users', user.email, 'documents', id), docData);
        setSelectedDoc(docData);
        setHubInitialView('menu');
        setCurrentRoute(AppRoute.REVISION_CARDS);
      }
    } catch (err: any) { 
      if (err.code === 'permission-denied') setPermissionError(true);
      else alert(err.message || "Erreur sauvegarde."); 
    } finally { 
      setLoading(false); 
    }
  };

  if (booting) {
  return <AnalysisLoading progress={0} />;
}

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Brain className="w-12 h-12 text-indigo-500 animate-pulse" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Chargement de Réviz'IA...</p>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={() => {}} />;

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-4xl mx-auto relative overflow-x-hidden text-slate-100 shadow-2xl transition-all duration-500">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-indigo-600/10 blur-[150px] pointer-events-none"></div>

      <header className="p-4 sm:p-6 glass-effect sticky top-0 z-40 flex items-center justify-between rounded-b-[2.5rem] border-b border-slate-800/50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 group cursor-pointer active:scale-95 transition-all" onClick={() => setCurrentRoute(AppRoute.DASHBOARD)}>
            <Brain className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <GamificationDisplay user={user} />
          <button onClick={handleLogout} className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {permissionError && (
        <div className="m-4 p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl animate-fade-in flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
          <div>
            <h3 className="font-black uppercase tracking-tight text-rose-500">Erreur d'accès</h3>
            <p className="text-xs text-rose-400">Vérifiez les règles de sécurité Firebase.</p>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 relative z-10 pb-32 space-y-8">
        {currentRoute === AppRoute.DASHBOARD && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Section: Capture de Cours */}
            <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Capture de Cours</h2>
                <p className="text-slate-400 text-sm font-medium">Photos, PDF ou fichiers texte : l'IA s'occupe de tout.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setCurrentRoute(AppRoute.CAPTURE)}
                  className="p-8 bg-slate-800/30 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center gap-4 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group active:scale-95"
                >
                  <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Prendre Photo</h3>
                </button>

                <button 
                  onClick={() => setCurrentRoute(AppRoute.CAPTURE)}
                  className="p-8 bg-slate-800/30 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center gap-4 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group active:scale-95"
                >
                  <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Importer Doc</h3>
                </button>
              </div>

              <div className="flex justify-center gap-6 pt-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> IMAGES
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> PDF
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> TXT
                </span>
              </div>
            </section>

            {/* Section: Bases Scolaires */}
            <section className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-3 px-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Bases Scolaires</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setCurrentRoute(AppRoute.MATHS)}
                  className="p-8 bg-slate-800/20 border border-slate-800 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 group shadow-md"
                >
                  <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Calculator className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Maths</h3>
                </button>

                <button 
                  onClick={() => setCurrentRoute(AppRoute.DICTATION)}
                  className="p-8 bg-slate-800/20 border border-slate-800 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 group shadow-md"
                >
                  <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Mic className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Dictée</h3>
                </button>

                <button 
                  onClick={() => setCurrentRoute(AppRoute.LANGUAGES)}
                  className="p-8 bg-slate-800/20 border border-slate-800 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 group shadow-md"
                >
                  <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Languages className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Langues</h3>
                </button>

                <button 
                  onClick={() => setCurrentRoute(AppRoute.FLASH_REVISION)}
                  className="p-8 bg-slate-800/20 border border-slate-800 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 group shadow-md"
                >
                  <div className="p-4 bg-rose-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-rose-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Flash Réviz</h3>
                </button>
              </div>

              {isAdmin && (
                <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-800/50">
                   <button onClick={() => setCurrentRoute(AppRoute.ADMIN_MATH_TIPS)} className="py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all">
                      <Grid className="w-4 h-4 text-amber-400" /><span className="text-[9px] font-black uppercase text-amber-400 tracking-widest">Admin Tips</span>
                   </button>
                   <button onClick={() => setCurrentRoute(AppRoute.ADMIN_USERS)} className="py-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500/20 transition-all">
                      <Users className="w-4 h-4 text-indigo-400" /><span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Admin Users</span>
                   </button>
                </div>
              )}
            </section>

            {/* Section: Dernières Révisions */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Dernières Révisions</h2>
              </div>
              <div className="grid gap-3">
                {documents.slice(0, 3).map((doc) => (
                  <button 
                    key={doc.id}
                    onClick={() => { setSelectedDoc(doc); setCurrentRoute(AppRoute.REVISION_CARDS); setHubInitialView('menu'); }}
                    className="flex items-center gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl hover:border-indigo-500 transition-all text-left group shadow-lg active:scale-[0.98]"
                  >
                    <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform">
                      {doc.type === 'photo' ? <ImageIcon className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-black text-white uppercase truncate">{doc.title}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight mt-0.5">{new Date(doc.date).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
                {documents.length === 0 && (
                   <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 opacity-30">
                      <BookOpen className="w-8 h-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Aucune révision pour le moment</p>
                   </div>
                )}
              </div>
            </section>
          </div>
        )}

        {currentRoute === AppRoute.CAPTURE && <OCRScanner onCapture={handleNewDocument} onXpGain={handleXpGain} />}
        {currentRoute === AppRoute.MATHS && <MathModule onXpGain={handleXpGain} />}
        {currentRoute === AppRoute.DICTATION && <DictationModule onXpGain={handleXpGain} />}
        {currentRoute === AppRoute.LANGUAGES && <LanguageModule user={user} onXpGain={handleXpGain} />}
        {currentRoute === AppRoute.FLASH_REVISION && <DirectStudyModule user={user} onXpGain={handleXpGain} onClose={() => setCurrentRoute(AppRoute.DASHBOARD)} />}
        {currentRoute === AppRoute.REVISION_CARDS && selectedDoc && (
          <RevisionHub 
            document={selectedDoc} 
            onNavigate={setCurrentRoute} 
            onUpdateDocument={(d) => {
              setSelectedDoc(d);
              setDoc(doc(db, 'users', user.email, 'documents', d.id), d);
            }} 
            onAddSource={() => { setIsAddingSource(true); setCurrentRoute(AppRoute.CAPTURE); }}
            initialView={hubInitialView}
          />
        )}
        {currentRoute === AppRoute.QUIZ && selectedDoc && <QuizModule questions={quizQuestions} context={selectedDoc.summary || ""} onFinish={handleXpGain} />}
        {currentRoute === AppRoute.PROFILE && <Profile user={user} onUpdateUser={handleUpdateUser} />}
        {currentRoute === AppRoute.ADMIN_MATH_TIPS && <AdminMathTips />}
        {currentRoute === AppRoute.ADMIN_USERS && <AdminUserManagement users={[user]} currentUser={user} onUpdateUsers={() => {}} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 z-50 rounded-t-[3rem] no-print">
        <div className="max-w-md mx-auto flex items-center justify-between px-6">
          <button onClick={() => setCurrentRoute(AppRoute.DASHBOARD)} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${currentRoute === AppRoute.DASHBOARD ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-200'}`}>
            <Home className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest">ACCUEIL</span>
          </button>
          <div className="relative -top-6">
            <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 shadow-2xl transition-all hover:scale-110 active:scale-90 ${isChatOpen ? 'rotate-90' : ''}`}>
              {isChatOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
              {!isChatOpen && <span className="absolute top-full left-1/2 -translate-x-1/2 mt-3 text-[8px] font-black uppercase tracking-widest text-slate-500">TUTEUR</span>}
            </button>
          </div>
          <button onClick={() => setCurrentRoute(AppRoute.PROFILE)} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${currentRoute === AppRoute.PROFILE ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-200'}`}>
            <UserIcon className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest">PROFIL</span>
          </button>
        </div>
      </nav>

      {isChatOpen && (
        <div className="fixed inset-0 z-[60] p-4 sm:p-8 animate-fade-in flex flex-col no-print">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setIsChatOpen(false)}></div>
          <div className="relative flex-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-w-2xl mx-auto w-full">
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl"><MessageCircle className="w-4 h-4 text-white" /></div>
                  <h3 className="font-black uppercase tracking-tight text-sm">Tuteur IA Interactif</h3>
               </div>
               <button onClick={() => setIsChatOpen(false)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
            </header>
            <div className="flex-1 overflow-hidden p-4">
              <ChatModule selectedDoc={selectedDoc} onXpGain={handleXpGain} onUpdateDocument={(d) => {
                const updatedDocs = documents.map(doc => doc.id === d.id ? d : doc);
                setDocuments(updatedDocs);
                setSelectedDoc(d);
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
