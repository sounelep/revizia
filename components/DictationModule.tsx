
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Play, CheckCircle2, RotateCcw, Loader2, Camera, UploadCloud, Trash2, ChevronRight, BookOpen, Settings2, Sliders, AlertTriangle, Lightbulb, XCircle, Download, FileText, Shuffle, ListOrdered, Sparkles, Info, Gauge } from 'lucide-react';
// Fixed: Removed generateWordHint which is not exported from geminiService and not used in this file
import { extractWordsFromDocument, generateCoherentStory, analyzeDictationError } from '../services/geminiService';

interface Props {
  onXpGain: (amount: number) => void;
}

type ModuleStep = 'setup' | 'review' | 'mode-selection' | 'practice-word' | 'practice-phrases' | 'result';
type PracticeMode = 'word-by-word' | 'full-text';
type OrderPreference = 'sequential' | 'random';

interface ErrorSegment {
  text: string;
  status: 'correct' | 'spelling' | 'punctuation';
  explanation: string;
  correction: string;
  isTargetWord: boolean;
}

const DictationModule: React.FC<Props> = ({ onXpGain }) => {
  const [step, setStep] = useState<ModuleStep>('setup');
  const [words, setWords] = useState<string[]>([]);
  const [sessionWords, setSessionWords] = useState<string[]>([]);
  const [orderPreference, setOrderPreference] = useState<OrderPreference>('sequential');
  const [currentWordInput, setCurrentWordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speechRate, setSpeechRate] = useState(() => {
    const saved = localStorage.getItem('reviz_dictation_rate');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [results, setResults] = useState<{correct: boolean, user: string, expected: string, segments?: ErrorSegment[]}[]>([]);
  const [isCurrentValidated, setIsCurrentValidated] = useState(false);
  const [isPreparingSpeech, setIsPreparingSpeech] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sauvegarder la vitesse choisie
  useEffect(() => {
    localStorage.setItem('reviz_dictation_rate', speechRate.toString());
  }, [speechRate]);

  const speak = (text: string, pronouncePunctuation: boolean = false) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    setIsPreparingSpeech(true);

    let processedText = text;
    if (pronouncePunctuation) {
      processedText = text
        .replace(/,/g, ' , ... virgule ')
        .replace(/\./g, ' , ... point ')
        .replace(/\?/g, ' , ... point d\'interrogation ')
        .replace(/!/g, ' , ... point d\'exclamation ')
        .replace(/;/g, ' , ... point virgule ')
        .replace(/:/g, ' , ... deux points ');
    }
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.lang = 'fr-FR';
      utterance.rate = speechRate;
      utterance.onend = () => setIsPreparingSpeech(false);
      utterance.onerror = () => setIsPreparingSpeech(false);
      window.speechSynthesis.speak(utterance);
    }, 500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('text/')) {
      const text = await file.text();
      const extractedWords = text.split(/[;\n\r,]+/).map(w => w.trim()).filter(w => w.length > 0);
      if (extractedWords.length > 0) {
        setWords(prev => [...new Set([...prev, ...extractedWords])]);
        setStep('review');
        return;
      }
    }

    setLoading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const extracted = await extractWordsFromDocument(base64, file.type);
      if (Array.isArray(extracted)) {
        setWords(prev => [...new Set([...prev, ...extracted])]);
        setStep('review');
      }
    } catch (err) {
      alert("Erreur extraction.");
    } finally {
      setLoading(false);
    }
  };

  const removeWord = (idx: number) => setWords(words.filter((_, i) => i !== idx));
  
  const addWordManual = () => {
    const input = currentWordInput.trim();
    if (input) {
      const newWords = input.split(';').map(w => w.trim()).filter(w => w.length > 0);
      setWords(prev => [...prev, ...newWords]);
      setCurrentWordInput('');
    }
  };

  const startPractice = async (mode: PracticeMode) => {
    setLoading(true);
    setActiveIdx(0);
    setResults([]);
    setIsCurrentValidated(false);
    
    if (mode === 'word-by-word') {
      let finalWords = [...words];
      if (orderPreference === 'random') {
        finalWords.sort(() => Math.random() - 0.5);
      }
      setSessionWords(finalWords);
      setUserInputs(new Array(finalWords.length).fill(''));
      setStep('practice-word');
      setLoading(false);
    } else {
      try {
        const story = await generateCoherentStory(words);
        setSentences(story);
        setUserInputs(new Array(story.length).fill(''));
        setStep('practice-phrases');
      } catch (err) {
        alert("Erreur génération.");
      } finally {
        setLoading(false);
      }
    }
  };

  const validateCurrent = async () => {
    const currentInput = userInputs[activeIdx]?.trim() || "";
    const expected = step === 'practice-word' ? sessionWords[activeIdx] : sentences[activeIdx];
    
    setIsAnalyzing(true);
    try {
      const analysis: ErrorSegment[] = await analyzeDictationError(expected, currentInput, words);
      const isCorrect = !analysis.some(s => s.status !== 'correct');
      setResults(prev => [...prev, { correct: isCorrect, user: currentInput, expected, segments: analysis }]);
      if (isCorrect) onXpGain(step === 'practice-word' ? 20 : 50);
      setIsCurrentValidated(true);
    } catch (err) {
      const simpleCorrect = currentInput.toLowerCase() === expected.toLowerCase();
      setResults(prev => [...prev, { correct: simpleCorrect, user: currentInput, expected }]);
      setIsCurrentValidated(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    const totalCount = step === 'practice-word' ? sessionWords.length : sentences.length;
    if (activeIdx < totalCount - 1) {
      setActiveIdx(activeIdx + 1);
      setIsCurrentValidated(false);
      setShowSpeedPanel(false);
    } else {
      setStep('result');
    }
  };

  const lastResult = results.length > 0 ? results[results.length - 1] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* SETUP */}
      {step === 'setup' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              <Mic className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Nouvelle Dictée</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <button onClick={() => fileInputRef.current?.click()} className="p-8 bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center gap-3 hover:border-indigo-500 transition-all group">
               <Camera className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
               <span className="text-xs font-black uppercase tracking-widest">Photo</span>
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="p-8 bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center gap-3 hover:border-cyan-500 transition-all group">
               <UploadCloud className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
               <span className="text-xs font-black uppercase tracking-widest">Document</span>
             </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf,text/plain" className="hidden" />
          <div className="pt-4 border-t border-slate-800">
             {/* Fixed: Use setCurrentWordInput setter instead of the currentWordInput string variable */}
             <input type="text" value={currentWordInput} onChange={(e) => setCurrentWordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (addWordManual(), words.length > 0 || currentWordInput ? setStep('review') : null)} placeholder="Ou saisis tes mots ici..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
          </div>
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-400" /> Mots ({words.length})
            </h2>
            <button onClick={() => setStep('setup')} className="p-2 bg-slate-800 rounded-xl text-slate-400"><RotateCcw className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1">
            {words.map((w, i) => (
              <div key={i} className="group flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                 <span className="text-sm font-bold text-slate-200">{w}</span>
                 <button onClick={() => removeWord(i)} className="text-slate-600 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setStep('mode-selection')} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Continuer</button>
        </div>
      )}

      {/* PRACTICE */}
      {(step === 'practice-word' || step === 'practice-phrases') && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 animate-fade-in relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black uppercase text-slate-400">Question {activeIdx + 1} / {step === 'practice-word' ? sessionWords.length : sentences.length}</h2>
            <div className="relative">
               <button onClick={() => setShowSpeedPanel(!showSpeedPanel)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${showSpeedPanel ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                 <Gauge className="w-3 h-3" /> Vitesse {speechRate}x
               </button>
               {showSpeedPanel && (
                 <div className="absolute top-full right-0 mt-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 w-48 animate-fade-in">
                    <input 
                      type="range" min="0.2" max="1.5" step="0.1" 
                      value={speechRate} 
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    />
                    <div className="flex justify-between mt-2 text-[8px] font-black text-slate-500 uppercase">
                       <span>Lent</span>
                       <span>Normal</span>
                       <span>Rapide</span>
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 py-6">
            <button 
              disabled={isPreparingSpeech || isAnalyzing}
              onClick={() => speak(step === 'practice-word' ? sessionWords[activeIdx] : sentences[activeIdx], step === 'practice-phrases')}
              className={`w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50`}
            >
              <Volume2 className={`w-10 h-10 text-white ${isPreparingSpeech ? 'animate-pulse' : ''}`} />
            </button>

            <div className="w-full space-y-4">
              <textarea
                spellCheck="false"
                disabled={isCurrentValidated || isAnalyzing}
                rows={step === 'practice-word' ? 1 : 3}
                value={userInputs[activeIdx] || ""}
                onChange={(e) => {
                  const n = [...userInputs];
                  n[activeIdx] = e.target.value;
                  setUserInputs(n);
                }}
                className={`w-full p-6 bg-slate-950 border-2 border-slate-800 rounded-3xl text-center font-black focus:border-indigo-500 outline-none transition-all ${step === 'practice-word' ? 'text-2xl' : 'text-lg leading-relaxed text-left'}`}
                placeholder="Ta réponse..."
              />
              
              {!isCurrentValidated ? (
                <button 
                  onClick={validateCurrent}
                  disabled={isAnalyzing || !userInputs[activeIdx]?.trim()}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Vérifier
                </button>
              ) : (
                <button onClick={handleNext} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3">
                  Suivant <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {isCurrentValidated && lastResult && lastResult.segments && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-inner">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Correction de ta saisie :</h4>
                    <div className="flex flex-wrap gap-x-2 gap-y-3">
                      {lastResult.segments.map((seg, i) => (
                        <div key={i} className="group relative">
                          <span className={`text-lg font-black transition-all ${
                            seg.status === 'correct' ? (seg.isTargetWord ? 'text-indigo-400' : 'text-emerald-400') :
                            seg.status === 'punctuation' ? 'text-orange-400 underline decoration-orange-500/50 underline-offset-4' :
                            'text-rose-400 underline decoration-rose-500/50 underline-offset-4'
                          }`}>
                            {seg.text}
                          </span>
                          
                          {/* TOOLTIP systématique pour les mots cibles ou les erreurs */}
                          {(seg.status !== 'correct' || seg.isTargetWord) && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] space-y-2">
                               <p className={`font-black uppercase tracking-widest ${
                                 seg.status === 'punctuation' ? 'text-orange-400' : 
                                 seg.status === 'spelling' ? 'text-rose-400' : 
                                 'text-indigo-400'
                               }`}>
                                 {seg.status === 'punctuation' ? 'Ponctuation' : 
                                  seg.status === 'spelling' ? 'Orthographe' : 
                                  'Mot Cible'}
                               </p>
                               <p className="text-white font-medium leading-relaxed italic">"{seg.explanation}"</p>
                               <div className="pt-2 border-t border-slate-800">
                                  <p className="text-slate-500">Correct : <span className="text-emerald-400 font-black">{seg.correction}</span></p>
                               </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE SELECTION */}
      {step === 'mode-selection' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl text-center space-y-8 animate-fade-in">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Configuration</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Personnalise ton entraînement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SÉLECTEUR D'ORDRE */}
              <div className="space-y-3 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left px-1 flex items-center gap-2"><ListOrdered className="w-3 h-3" /> Ordre</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setOrderPreference('sequential')}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${orderPreference === 'sequential' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      Liste
                    </button>
                    <button 
                      onClick={() => setOrderPreference('random')}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${orderPreference === 'random' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      Mixte
                    </button>
                 </div>
              </div>

              {/* SÉLECTEUR DE VITESSE */}
              <div className="space-y-3 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left px-1 flex items-center gap-2"><Gauge className="w-3 h-3" /> Vitesse : {speechRate}x</h3>
                 <div className="pt-2 px-1">
                    <input 
                      type="range" min="0.2" max="1.5" step="0.1" 
                      value={speechRate} 
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    />
                    <div className="flex justify-between mt-2 text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                       <span>0.2x</span>
                       <span>Normal</span>
                       <span>1.5x</span>
                    </div>
                 </div>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
             <button onClick={() => startPractice('word-by-word')} className="p-8 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col items-center gap-4 hover:border-indigo-500 group shadow-lg">
               <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><ListOrdered className="w-8 h-8 text-indigo-400" /></div>
               <span className="font-black uppercase text-sm">Mot à mot</span>
             </button>
             <button onClick={() => startPractice('full-text')} className="p-8 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col items-center gap-4 hover:border-cyan-500 group shadow-lg">
               <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:scale-110 transition-transform"><Settings2 className="w-8 h-8 text-cyan-400" /></div>
               <span className="font-black uppercase text-sm">Phrases (Max 10 mots)</span>
             </button>
          </div>
          {loading && <div className="flex flex-col items-center gap-4 animate-pulse"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /><p className="text-[10px] font-black text-indigo-400 uppercase">Préparation de l'exercice...</p></div>}
        </div>
      )}

      {/* RESULTATS */}
      {step === 'result' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl text-center space-y-8 animate-fade-in">
           <div className="p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 w-24 h-24 mx-auto flex items-center justify-center">
             <CheckCircle2 className="w-12 h-12 text-emerald-400" />
           </div>
           <h2 className="text-3xl font-black uppercase tracking-tight">Dictée terminée !</h2>
           <div className="flex justify-center gap-12">
             <div><p className="text-4xl font-black text-indigo-400">{results.filter(r => r.correct).length}</p><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Succès</p></div>
             <div className="border-l border-slate-800"></div>
             <div><p className="text-4xl font-black text-rose-500">{results.filter(r => !r.correct).length}</p><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Erreurs</p></div>
           </div>
           <button onClick={() => setStep('setup')} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><RotateCcw className="w-5 h-5" /> Recommencer</button>
        </div>
      )}
    </div>
  );
};

export default DictationModule;
