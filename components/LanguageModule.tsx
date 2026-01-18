
import React, { useState, useRef, useEffect } from 'react';
// Added LayoutDashboard to imports
import { Mic, Volume2, CheckCircle2, RotateCcw, Loader2, Languages, X, Sparkles, MessageSquare, Bot, AudioLines, Globe, Gauge, Lightbulb, Handshake, Send, PlayCircle, Headphones, Type as TypeIcon, Mic2, Download, Keyboard, HelpCircle, AlertCircle, LayoutDashboard } from 'lucide-react';
import { generateLanguageExercise, analyzeUserSpeechPhonetically, analyzeFreeSpeech, startRoleplay, continueRoleplay, generateEmotionalTTS } from '../services/geminiService';
import { User } from '../types';
import AnalysisLoading from './AnalysisLoading';

interface Props {
  user: User;
  onXpGain: (amount: number) => void;
}

type Lang = 'Anglais' | 'Espagnol';
type LangStep = 'lang-selection' | 'mode-selection' | 'exercise' | 'result';
type Mode = 'oral-listen' | 'oral-speak' | 'oral-free' | 'roleplay';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  emotion?: string;
  translations?: { word: string; trans: string }[];
}

const AI_TIMEOUT_MS = 60000;

const LanguageModule: React.FC<Props> = ({ user, onXpGain }) => {
  const [step, setStep] = useState<LangStep>('lang-selection');
  const [selectedLang, setSelectedLang] = useState<Lang>('Anglais');
  const [selectedMode, setSelectedMode] = useState<Mode>('oral-listen');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [exercise, setExercise] = useState<any>(null);
  const [roleplayData, setRoleplayData] = useState<any>(null);
  const [rpMessages, setRpMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [roleplayModality, setRoleplayModality] = useState<'écrit' | 'oral'>('écrit');

  const [speechRate, setSpeechRate] = useState(0.8);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [feedback, setFeedback] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [manualContext, setManualContext] = useState('');
  const [showManualContext, setShowManualContext] = useState(false);
  
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const langCode = selectedLang === 'Anglais' ? 'en-US' : 'es-ES';
  const voiceName = selectedLang === 'Anglais' ? 'Kore' : 'Puck';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rpMessages]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return prev;
          const increment = prev < 60 ? (Math.random() * 8) : (Math.random() * 2);
          const next = prev + increment;
          return next >= 95 ? 95 : next;
        });
      }, 500);
    } else {
      setAnalysisProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Changed to function declaration to avoid JSX ambiguity with <T> in arrow functions
  function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms)
      ),
    ]);
  }

  const speak = async (text: string, emotion: string = "calme") => {
    if (!text) return;
    try {
      const base64Audio = await generateEmotionalTTS(text, emotion, voiceName);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = speechRate; 
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = speechRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startModule = async (mode: Mode) => {
    if (mode === 'oral-free') {
      setSelectedMode(mode);
      setStep('exercise');
      setTranscript('');
      setFeedback(null);
      setAudioBlobUrl(null);
      setManualContext('');
      setShowManualContext(false);
      setLoading(false);
      setError(null);
      return;
    }

    if (!theme.trim()) {
      setError("Merci de saisir un thème.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedMode(mode);
    setTranscript('');
    setFeedback(null);
    setAudioBlobUrl(null);
    setInputText('');

    try {
      if (mode === 'oral-listen' || mode === 'oral-speak') {
        const data = await withTimeout(
          generateLanguageExercise(selectedLang, theme, user.gradeLevel || '4ème'),
          AI_TIMEOUT_MS,
          "L'IA met trop de temps à générer l'exercice. Réessaye."
        );
        setExercise(data);
        setStep('exercise');
        if (mode === 'oral-listen') setTimeout(() => speak(data.sentence), 800);
      } else if (mode === 'roleplay') {
        const data = await withTimeout(
          startRoleplay(selectedLang, theme, user.gradeLevel || '4ème'),
          AI_TIMEOUT_MS,
          "L'IA met trop de temps à préparer le jeu de rôle."
        );
        setRoleplayData(data);
        setRpMessages([{ role: 'model', text: data.firstLine, emotion: data.emotion, translations: data.translations }]);
        setStep('exercise');
        if (roleplayModality === 'oral') {
          setTimeout(() => speak(data.firstLine, data.emotion), 800);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erreur de communication avec l'IA.");
    } finally {
      setLoading(false);
    }
  };

  const initRecognition = (continuous: boolean = false) => {
    const Recognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    if (!Recognition) return null;
    const r = new Recognition();
    r.lang = langCode;
    r.continuous = continuous;
    r.interimResults = true;
    r.onstart = () => setIsRecording(true);
    r.onresult = (e: any) => {
      const current = Array.from(e.results).map((res: any) => res[0].transcript).join('');
      setTranscript(current);
    };
    r.onend = () => {
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
    return r;
  };

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) { console.error("Mic error:", err); }
  };

  const toggleRecording = async (continuous: boolean = false) => {
    if (isRecording) { recognitionRef.current?.stop(); } else {
      setTranscript('');
      setError(null);
      setAudioBlobUrl(null);
      recognitionRef.current = initRecognition(continuous);
      recognitionRef.current?.start();
      if (continuous) await startMediaRecording();
    }
  };

  const handleFreeAnalysis = async () => {
    if (!transcript.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await withTimeout(
        analyzeFreeSpeech(selectedLang, transcript, manualContext),
        AI_TIMEOUT_MS,
        "L'analyse a pris trop de temps (plus d'une minute). Veuillez réessayer."
      );
      setAnalysisProgress(100);
      setTimeout(() => {
        setFeedback(result);
        onXpGain(35);
        setIsAnalyzing(false);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'analyse.");
      setIsAnalyzing(false);
    }
  };

  const handleMessageSend = async (contentOverride?: string) => {
    const finalInput = contentOverride || inputText;
    if (!finalInput.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      if (selectedMode === 'roleplay') {
        setRpMessages(prev => [...prev, { role: 'user', text: finalInput }]);
        setInputText('');
        setTranscript('');
        const result = await withTimeout(
          continueRoleplay(selectedLang, rpMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), finalInput, roleplayData.aiRole, roleplayData.scenario),
          AI_TIMEOUT_MS,
          "L'IA est trop lente à répondre. Réessaye."
        );
        let phoneticAnalysis = null;
        if (contentOverride) {
          phoneticAnalysis = await analyzeUserSpeechPhonetically(selectedLang, finalInput);
          setFeedback(phoneticAnalysis);
        }
        setRpMessages(prev => [...prev, { role: 'model', text: result.reply, emotion: result.emotion, translations: result.translations }]);
        onXpGain(contentOverride ? 20 : 10);
        if (roleplayModality === 'oral') speak(result.reply, result.emotion);
        setIsAnalyzing(false);
      } else {
        const result = await withTimeout(
          analyzeUserSpeechPhonetically(selectedLang, finalInput, exercise?.sentence),
          AI_TIMEOUT_MS,
          "L'analyse de prononciation a dépassé le délai."
        );
        setAnalysisProgress(100);
        setTimeout(() => {
          setFeedback(result);
          onXpGain(result.score > 50 ? 25 : 10);
          setIsAnalyzing(false);
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || "Délai dépassé ou erreur réseau.");
      setIsAnalyzing(false);
    }
  };

  const renderWordWithTranslation = (text: string, translations?: { word: string; trans: string }[]) => {
    if (!translations || !translationEnabled) return <span className="relative z-10">{text}</span>;
    const wordsArray = text.split(/\s+/);
    return wordsArray.map((word, i) => {
      // Changed to more compatible regex to avoid potential "Cannot find name 'L'" parser crashes
      const cleanWord = word.replace(/[^a-zA-Z\u00C0-\u00FF0-9]/g, "").toLowerCase();
      const transObj = translations.find(t => t.word.replace(/[^a-zA-Z\u00C0-\u00FF0-9]/g, "").toLowerCase() === cleanWord && cleanWord.length > 0);
      return (
        <span key={i} className="group relative inline-block mx-0.5">
          <span className="cursor-help border-b border-indigo-500/40 hover:text-indigo-400 transition-colors relative z-20">{word}</span>
          {transObj && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-indigo-600 text-white text-[11px] font-black uppercase rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[9999] border border-indigo-400/50 min-w-[60px] text-center backdrop-blur-md">
              {transObj.trans}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-indigo-600"></div>
            </div>
          )}
        </span>
      );
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in overflow-visible">
      {(loading || isAnalyzing) && (
        <AnalysisLoading 
          progress={isAnalyzing ? analysisProgress : 50} 
          customWords={isAnalyzing ? ["Analyse...", "Correction...", "Bilingue...", "Phonétique...", "Attente..."] : ["Immersion", "Prononciation", "Dialogue"]} 
        />
      )}

      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl z-50">
        <button onClick={() => setStep('lang-selection')} className="flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-widest">
          <Languages className="w-4 h-4" /> Langues Étrangères
        </button>
        {step !== 'lang-selection' && (
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedLang === 'Anglais' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            {selectedLang}
          </span>
        )}
      </div>

      {step === 'lang-selection' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl text-center space-y-8">
           <h2 className="text-2xl font-black uppercase tracking-tight text-white">Quelle langue étudions-nous ?</h2>
           <div className="grid grid-cols-2 gap-6">
              <button onClick={() => { setSelectedLang('Anglais'); setStep('mode-selection'); }} className="p-8 bg-slate-950 border border-slate-800 rounded-[2rem] hover:border-cyan-500 transition-all flex flex-col items-center gap-4 group">
                 <Languages className="w-10 h-10 text-cyan-400" /><span className="font-black uppercase tracking-widest text-sm text-white">Anglais</span>
              </button>
              <button onClick={() => { setSelectedLang('Espagnol'); setStep('mode-selection'); }} className="p-8 bg-slate-950 border border-slate-800 rounded-[2rem] hover:border-amber-500 transition-all flex flex-col items-center gap-4 group">
                 <Languages className="w-10 h-10 text-amber-400" /><span className="font-black uppercase tracking-widest text-sm text-white">Espagnol</span>
              </button>
           </div>
        </div>
      )}

      {step === 'mode-selection' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Mode d'entraînement</h2>
            <input 
              type="text" value={theme} onChange={(e) => setTheme(e.target.value)}
              placeholder="Thème (ex: À l'aéroport)..."
              className="w-full max-w-sm mx-auto p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center text-white focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => startModule('roleplay')} className="flex flex-col items-center gap-2 p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-emerald-500/10 transition-all shadow-md text-white border-emerald-500/30 group">
               <Bot className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Jeu de Rôle IA</span>
             </button>
             <button onClick={() => startModule('oral-free')} className="flex flex-col items-center gap-2 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl hover:bg-emerald-500/20 transition-all shadow-md text-white group">
               <Mic2 className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Pratique Libre</span>
             </button>
             <button onClick={() => startModule('oral-listen')} className="flex flex-col items-center gap-2 p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all shadow-md text-white">
               <Volume2 className="w-6 h-6 text-indigo-400" /><span className="text-[10px] font-black uppercase tracking-widest">Écoute Active</span>
             </button>
             <button onClick={() => startModule('oral-speak')} className="flex flex-col items-center gap-2 p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all shadow-md text-white">
               <Mic className="w-6 h-6 text-cyan-400" /><span className="text-[10px] font-black uppercase tracking-widest">Prononciation</span>
             </button>
          </div>
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-bold animate-fade-in"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        </div>
      )}

      {step === 'exercise' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-6 min-h-[500px] flex flex-col overflow-visible">
           <div className="flex flex-col gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl z-50 overflow-visible">
              <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setRoleplayModality('écrit')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${roleplayModality === 'écrit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><TypeIcon className="w-3 h-3" /> Écrit</button>
                    <button onClick={() => setRoleplayModality('oral')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${roleplayModality === 'oral' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Headphones className="w-3 h-3" /> Oral</button>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setTranslationEnabled(!translationEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${translationEnabled ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}><Globe className="w-3 h-3" /> Traduction {translationEnabled ? 'ON' : 'OFF'}</button>
                    {selectedMode !== 'roleplay' && selectedMode !== 'oral-free' && <button onClick={() => speak(exercise.sentence)} className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xl active:scale-95 transition-all"><Volume2 className="w-4 h-4" /></button>}
                 </div>
              </div>
              <div className="flex items-center gap-4 border-t border-slate-800 pt-3">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 shrink-0"><Gauge className="w-3 h-3" /> Vitesse</span>
                 <input type="range" min="0.2" max="1.5" step="0.1" value={speechRate} onChange={(e) => setSpeechRate(parseFloat(e.target.value))} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                 <span className="text-[9px] font-black text-indigo-400 w-8">{speechRate}x</span>
              </div>
           </div>

           {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-400 animate-fade-in shadow-lg"><div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-xs font-bold leading-tight">{error}</p></div><button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/10 rounded-full transition-colors"><X className="w-4 h-4" /></button></div>}

           {selectedMode === 'oral-free' ? (
             <div className="flex-1 flex flex-col space-y-8 py-6">
                <div className="text-center space-y-4"><h3 className="text-xl font-black text-white uppercase tracking-tight">Pratique Libre</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic px-4">Parle librement, lis un texte ou raconte ta journée. Je corrigerai tout !</p></div>
                <div className="flex flex-col items-center gap-10">
                   <button onClick={() => toggleRecording(true)} className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 ${isRecording ? 'bg-rose-500 border-rose-400 animate-pulse scale-110' : 'bg-emerald-600 border-emerald-400 hover:scale-105 active:scale-95'}`}>{isRecording ? <Mic className="w-12 h-12 text-white" /> : <Mic2 className="w-12 h-12 text-white" />}</button>
                   <div className="w-full space-y-6 text-center">
                      <div className="p-8 bg-slate-950 border-2 border-slate-800 rounded-[2.5rem] min-h-[150px] shadow-inner relative overflow-hidden text-left"><div className="absolute top-0 right-0 p-3 opacity-10"><MessageSquare className="w-6 h-6 text-indigo-400" /></div><p className="text-sm font-bold text-slate-300 leading-relaxed italic">{transcript || "Appuie sur le micro et commence à parler..."}</p></div>
                      <div className="flex flex-col gap-3">
                         <div className="space-y-3 text-left">
                            <button onClick={() => setShowManualContext(!showManualContext)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showManualContext ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}><Keyboard className="w-4 h-4" /> {showManualContext ? 'Masquer aide contextuelle' : 'Aider l\'IA (Prénoms, Villes...)'}</button>
                            {showManualContext && <div className="space-y-2 animate-fade-in"><p className="text-[9px] text-slate-500 font-medium leading-tight px-1 flex items-start gap-1.5"><HelpCircle className="w-3 h-3 text-indigo-400 shrink-0" />L'IA a du mal avec les prénoms ou villes ? Ajoute-les ici pour l'aider :</p><textarea value={manualContext} onChange={(e) => setManualContext(e.target.value)} placeholder="HUGO (prénom)&#10;DINAN (ville française)&#10;XXXX (Nom de famille)" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 min-h-[80px]"/></div>}
                         </div>
                         {audioBlobUrl && !isRecording && <a href={audioBlobUrl} download="mon_exercice_oral.webm" className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 border border-slate-700 transition-all active:scale-95"><Download className="w-4 h-4" /> Télécharger mon audio</a>}
                         {transcript && !isRecording && <button onClick={handleFreeAnalysis} disabled={isAnalyzing} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">{isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}Analyser ma production</button>}
                      </div>
                   </div>
                </div>
                {feedback && (
                  <div className="space-y-6 animate-fade-in pt-8 border-t border-slate-800">
                     <div className="bg-slate-800/50 p-6 rounded-3xl border border-indigo-500/20 space-y-4">
                        <div className="flex justify-between items-center"><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Correction Proposée</h4><span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[9px] font-black uppercase">Score : {feedback.score}/100</span></div>
                        <p className="text-sm font-bold text-slate-100 leading-relaxed italic">"{feedback.correctedText}"</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">English Feedback</p><p className="text-[10px] text-slate-300 font-medium leading-relaxed italic">"{feedback.grammarFeedbackEn}"</p><p className="text-[10px] text-cyan-400 font-medium leading-relaxed">{feedback.phoneticFeedbackEn}</p></div>
                           <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Feedback Français</p><p className="text-[10px] text-slate-300 font-medium leading-relaxed italic">"{feedback.grammarFeedbackFr}"</p><p className="text-[10px] text-cyan-400 font-medium leading-relaxed">{feedback.phoneticFeedbackFr}</p></div>
                        </div>
                     </div>
                     <div className="grid gap-4"><h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 px-2"><Lightbulb className="w-4 h-4" /> Mots à pratiquer</h4>{feedback.wordsToPractice?.map((item: any, i: number) => (<div key={i} className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-amber-500/50 transition-all group"><div className="flex-1 space-y-1"><p className="text-sm font-black text-white">{item.word}</p><div className="flex flex-col gap-1"><p className="text-[9px] text-slate-400 font-medium leading-tight">🇬🇧 {item.tipEn}</p><p className="text-[9px] text-slate-400 font-medium leading-tight">🇫🇷 {item.tipFr}</p></div></div><button onClick={() => speak(item.word)} className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-xl text-indigo-400 hover:text-white transition-all shadow-lg active:scale-90"><Volume2 className="w-4 h-4" /></button></div>))}</div>
                     <button onClick={() => setStep('result')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border border-slate-700">Terminer la session</button>
                  </div>
                )}
             </div>
           ) : selectedMode === 'roleplay' ? (
             <div className="flex-1 flex flex-col space-y-6 overflow-visible">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-1"><Handshake className="w-3.5 h-3.5" /> Scénario : {roleplayData.aiRole} vs {roleplayData.userRole}</p><p className="text-xs text-slate-400 font-medium italic">"{roleplayData.scenario}"</p></div>
                <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pt-20 px-1 custom-scrollbar overflow-x-visible">
                   {rpMessages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in overflow-visible`}><div className={`flex items-start gap-2 max-w-[85%] overflow-visible ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}><div className={`p-4 rounded-2xl text-sm leading-relaxed overflow-visible relative ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none shadow-lg'}`}>{msg.role === 'model' ? renderWordWithTranslation(msg.text, msg.translations) : msg.text}</div>{msg.role === 'model' && <button onClick={() => speak(msg.text, msg.emotion)} className="p-2 bg-slate-900 rounded-full text-indigo-400 hover:text-white transition-colors shrink-0"><PlayCircle className="w-4 h-4" /></button>}</div></div>))}
                   {isAnalyzing && <div className="flex justify-start animate-pulse"><div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none"><Loader2 className="w-4 h-4 text-indigo-400 animate-spin" /></div></div>}
                   <div ref={chatEndRef} />
                </div>
                <div className="pt-4 border-t border-slate-800 space-y-4 z-50 bg-slate-900">
                   <div className="flex gap-2">
                      <div className="flex-1 relative"><input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMessageSend()} disabled={isAnalyzing} placeholder="Réponds par écrit ou oral..." className="w-full py-4 pl-5 pr-12 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:border-indigo-500 outline-none transition-all shadow-inner" /><button onClick={() => handleMessageSend()} disabled={!inputText.trim() || isAnalyzing} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-30"><Send className="w-4 h-4" /></button></div>
                      <button onClick={() => toggleRecording(false)} disabled={isAnalyzing} className={`p-4 rounded-2xl transition-all shadow-xl flex items-center justify-center ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-800 text-indigo-400 border border-slate-700 hover:border-indigo-500'}`}><Mic className={`w-6 h-6 ${isRecording ? 'text-white' : ''}`} /></button>
                   </div>
                   {transcript && <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl animate-fade-in flex items-center justify-between gap-4"><p className="text-xs font-bold text-slate-300 italic flex-1">"{transcript}"</p><button onClick={() => handleMessageSend(transcript)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95">Envoyer l'audio</button></div>}
                </div>
                {feedback && feedback.phoneticTips && (
                   <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-fade-in space-y-3 z-50"><div className="flex justify-between items-center"><h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><AudioLines className="w-3.5 h-3.5" /> Prononciation Effort</h4><span className="text-[10px] font-black text-emerald-400">Score : {feedback.score}/100</span></div><div className="grid gap-2">{feedback.phoneticTips.map((tip: any, i: number) => (<div key={i} className="flex items-start gap-3 bg-slate-900/50 p-2 rounded-lg border border-white/5"><span className="text-indigo-400 font-black text-xs shrink-0">[{tip.sound}]</span><p className="text-[10px] text-slate-300 font-medium italic">{tip.tip}</p></div>))}</div></div>
                )}
             </div>
           ) : (
             <div className="space-y-8 flex-1 flex flex-col justify-center text-center overflow-visible">
                <div className="p-10 bg-slate-950 border border-slate-800 rounded-[3rem] relative overflow-visible shadow-2xl"><div className="text-2xl font-black text-slate-100 leading-relaxed tracking-tight flex flex-wrap justify-center overflow-visible pt-16">{renderWordWithTranslation(exercise.sentence, exercise.translations)}</div><p className="absolute bottom-4 right-6 text-[9px] font-black uppercase text-slate-700 tracking-widest">Phrase cible</p></div>
                <div className="space-y-6 pt-6 border-t border-slate-800">
                   {selectedMode === 'oral-speak' && (
                     <div className="flex flex-col items-center gap-6"><button onClick={() => toggleRecording(false)} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-cyan-600 hover:scale-105 active:scale-95'}`}><Mic className="w-10 h-10 text-white" /></button>{transcript && (
                          <div className="w-full space-y-4 animate-fade-in"><div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold italic">"{transcript}"</div>{!feedback ? (<button onClick={() => handleMessageSend(transcript)} disabled={isAnalyzing} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95">{isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Analyser</button>) : (<div className="p-6 bg-slate-800 border border-slate-700 rounded-3xl text-left space-y-4 animate-fade-in"><div className="flex justify-between items-center"><p className="text-[10px] font-black text-indigo-400 uppercase">Score : {feedback.score}/100</p><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div><p className="text-sm italic text-slate-300">"{feedback.feedback}"</p><button onClick={() => setStep('result')} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">Terminer</button></div>)}</div>)}</div>
                   )}
                   {selectedMode === 'oral-listen' && (
                     <div className="space-y-6"><div className="flex flex-col gap-2 text-left"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Question de compréhension</span><p className="text-lg font-bold text-white px-2">{exercise.questionTarget}</p></div><input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ta réponse..." className="w-full p-5 bg-slate-950 border border-slate-800 rounded-[2rem] outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-inner" /><button onClick={() => { onXpGain(25); setStep('result'); }} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">Vérifier</button></div>
                   )}
                </div>
             </div>
           )}
        </div>
      )}

      {step === 'result' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-12 shadow-2xl text-center space-y-10 animate-fade-in"><div className="w-28 h-28 bg-emerald-500/10 border border-emerald-500/20 rounded-full mx-auto flex items-center justify-center shadow-lg"><CheckCircle2 className="w-14 h-14 text-emerald-400" /></div><div className="space-y-2 text-white"><h2 className="text-3xl font-black uppercase tracking-tight">Excellent travail !</h2><p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Ta confiance en langue étrangère growit à chaque session.</p><div className="mt-4 text-3xl font-black text-emerald-400">+25 XP</div></div><div className="grid grid-cols-2 gap-4"><button onClick={() => setStep('mode-selection')} className="flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"><RotateCcw className="w-5 h-5" /> Autre Thème</button><button onClick={() => setStep('lang-selection')} className="flex items-center justify-center gap-3 py-5 bg-slate-800 border border-slate-700 text-slate-300 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-all"><LayoutDashboard className="w-5 h-5" /> Menu</button></div></div>
      )}
    </div>
  );
};

export default LanguageModule;
