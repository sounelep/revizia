
import React, { useState, useEffect } from 'react';
import { Zap, Brain, MessageSquare, ListOrdered, Sparkles, ChevronRight, RotateCcw, CheckCircle2, XCircle, Sliders, Play, Info, GraduationCap, Lightbulb, Loader2, LayoutDashboard, HelpCircle, ImageIcon, Type as TypeIcon } from 'lucide-react';
import { generateTopicExplanation, generateTopicQuiz, simplifyExplanation, generateIllustration, generateGeometrySVG, evaluateResponse } from '../services/geminiService';
import { User } from '../types';
import AnalysisLoading from './AnalysisLoading';

interface Props {
  user: User;
  onXpGain: (amount: number) => void;
  onClose?: () => void;
}

type DirectStep = 'topic-input' | 'choice' | 'explain-steps' | 'quiz-config' | 'quiz-active' | 'results';

const DirectStudyModule: React.FC<Props> = ({ user, onXpGain, onClose }) => {
  const [step, setStep] = useState<DirectStep>('topic-input');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States Explication
  const [explanation, setExplanation] = useState<{title: string, steps: any[], keyPoints: string[], isAmbiguous?: boolean} | null>(null);
  const [currentExplainIdx, setCurrentExplainIdx] = useState(0);
  const [simplifiedSteps, setSimplifiedSteps] = useState<Set<number>>(new Set());
  const [currentIllustration, setCurrentIllustration] = useState<string | null>(null);
  const [currentSVG, setCurrentSVG] = useState<string | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);

  // States Quiz
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcqRatio, setMcqRatio] = useState(50);
  const [quizItems, setQuizItems] = useState<any[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isQuestionCorrect, setIsQuestionCorrect] = useState<boolean | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizIllustration, setQuizIllustration] = useState<string | null>(null);
  const [quizSVG, setQuizSVG] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Reset des illustrations lors du changement d'étape ou de question
  useEffect(() => {
    setCurrentIllustration(null);
    setCurrentSVG(null);
  }, [currentExplainIdx]);

  useEffect(() => {
    setQuizIllustration(null);
    setQuizSVG(null);
    setQuizFeedback(null);
  }, [currentQuizIdx]);

  // Simulation de progression fluide
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          const next = prev + (Math.random() * 4);
          return next >= 95 ? 95 : next;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const isGeometryTopic = (text: string) => {
    const keywords = ['triangle', 'angle', 'cercle', 'parallélo', 'pythagore', 'thalès', 'segment', 'droite', 'géométrie', 'carré', 'rectangle', 'losange', 'trapèze', 'bissectrice', 'médiatrice'];
    return keywords.some(k => text.toLowerCase().includes(k));
  };

  const handleGenerateIllustration = async (prompt?: string, fallbackContext?: string, isQuiz: boolean = false) => {
    setIsIllustrating(true);
    try {
      const finalPrompt = prompt || `Illustration pédagogique pour : ${fallbackContext}`;
      
      // Choix du format : SVG pour géométrie, Image pour le reste
      if (isGeometryTopic(finalPrompt) || isGeometryTopic(topic)) {
        const svg = await generateGeometrySVG(finalPrompt);
        if (isQuiz) setQuizSVG(svg);
        else setCurrentSVG(svg);
      } else {
        const url = await generateIllustration(finalPrompt);
        if (isQuiz) setQuizIllustration(url);
        else setCurrentIllustration(url);
      }
    } catch (err) {
      console.error("Illustration failed", err);
    } finally {
      setIsIllustrating(false);
    }
  };

  const startExplain = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setSimplifiedSteps(new Set());
    try {
      const data = await generateTopicExplanation(topic, user.gradeLevel || '4ème');
      
      if (data.isAmbiguous) {
        setError("Désolé, je n'ai pas pu générer l'explication, le thème est trop vaste, donne moi plus d'information.");
        setLoading(false);
        return;
      }

      setLoadingProgress(100);
      setTimeout(() => {
        setExplanation(data);
        setCurrentExplainIdx(0);
        setStep('explain-steps');
        setLoading(false);
      }, 500);
    } catch (err) {
      setError("Désolé, je n'ai pas pu générer l'explication.");
      setLoading(false);
    }
  };

  const handleSimplify = async () => {
    if (!explanation || isSimplifying) return;
    setIsSimplifying(true);
    try {
      const currentStep = explanation.steps[currentExplainIdx];
      const simplified = await simplifyExplanation(currentStep.content, topic, user.gradeLevel || '4ème');
      const newSteps = [...explanation.steps];
      newSteps[currentExplainIdx] = { ...currentStep, content: simplified };
      setExplanation({ ...explanation, steps: newSteps });
      setSimplifiedSteps(prev => new Set(prev).add(currentExplainIdx));
    } catch (err) {
      console.error("Erreur simplification:", err);
    } finally {
      setIsSimplifying(false);
    }
  };

  const startQuizGen = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await generateTopicQuiz(topic, user.gradeLevel || '4ème', numQuestions, mcqRatio);
      setLoadingProgress(100);
      setTimeout(() => {
        setQuizItems(items);
        setCurrentQuizIdx(0);
        setStep('quiz-active');
        setUserAnswer('');
        setIsQuestionCorrect(null);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError("Échec de la génération du quiz.");
      setLoading(false);
    }
  };

  const checkAnswer = async () => {
    const current = quizItems[currentQuizIdx];
    
    if (current.type === 'mcq') {
      const isCorrect = userAnswer === current.correctAnswer;
      setIsQuestionCorrect(isCorrect);
      setQuizFeedback(isCorrect ? "Bravo !" : `Mauvaise pioche. La bonne réponse était : ${current.correctAnswer}`);
      if (isCorrect) onXpGain(15);
    } else {
      setIsChecking(true);
      try {
        const result = await evaluateResponse(current.question, current.correctAnswer, userAnswer);
        setIsQuestionCorrect(result.status === 'correct');
        setQuizFeedback(result.feedback);
        if (result.status === 'correct') onXpGain(15);
        else if (result.status === 'partial') onXpGain(5);
      } catch (err) {
        // Fallback en cas d'erreur API
        const cleanUser = userAnswer.trim().toLowerCase();
        const cleanCorrect = current.correctAnswer.trim().toLowerCase();
        const isCorrect = cleanUser === cleanCorrect || cleanCorrect.includes(cleanUser) && cleanUser.length > 3;
        setIsQuestionCorrect(isCorrect);
        setQuizFeedback(isCorrect ? "Correct !" : `Pas tout à fait. La réponse attendue était : ${current.correctAnswer}`);
      } finally {
        setIsChecking(false);
      }
    }
  };

  const nextQuestion = () => {
    if (currentQuizIdx < quizItems.length - 1) {
      setCurrentQuizIdx(prev => prev + 1);
      setUserAnswer('');
      setIsQuestionCorrect(null);
      setQuizFeedback(null);
    } else {
      onXpGain(50);
      setStep('results');
    }
  };

  const handleMenuReturn = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      window.location.href = window.location.origin;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in">
      {loading && <AnalysisLoading progress={loadingProgress} customWords={["Analyse", "Concepts", "Pédagogie", "Synthèse"]} />}

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-indigo-600 rounded-xl shadow-lg"><Zap className="w-5 h-5 text-white" /></div>
           <h2 className="text-sm font-black uppercase tracking-widest text-white">Flash Révisions</h2>
        </div>
        <button onClick={() => setStep('topic-input')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {step === 'topic-input' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">Que veux-tu réviser ?</h3>
            <p className="text-slate-500 text-sm font-medium italic">Saisis une notion, un théorème ou un événement...</p>
          </div>
          
          <div className="space-y-4">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Les parallélogrammes particuliers, la Révolution Française, le théorème de Pythagore..."
              className="w-full p-6 bg-slate-950 border border-slate-800 rounded-3xl outline-none focus:border-indigo-500 transition-all shadow-inner text-white font-medium resize-none"
              rows={3}
            />
            
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 animate-fade-in">
                <Info className="w-5 h-5 shrink-0" />
                <p className="text-[11px] font-black uppercase leading-tight tracking-tight">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button 
                 onClick={() => { if(topic.trim()) startExplain(); }}
                 className="group flex flex-col items-center gap-3 p-6 bg-slate-800/50 rounded-3xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 transition-all active:scale-95 shadow-md"
               >
                 <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><Lightbulb className="w-8 h-8 text-indigo-400" /></div>
                 <span className="text-sm font-black uppercase tracking-tight text-white">Explique-moi</span>
               </button>
               <button 
                 onClick={() => { if(topic.trim()) setStep('quiz-config'); }}
                 className="group flex flex-col items-center gap-3 p-6 bg-slate-800/50 rounded-3xl border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all active:scale-95 shadow-md"
               >
                 <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform"><Play className="w-8 h-8 text-emerald-400" /></div>
                 <span className="text-sm font-black uppercase tracking-tight text-white">Quiz Express</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {step === 'explain-steps' && explanation && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
             
             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    Concept {currentExplainIdx + 1} / {explanation.steps.length}
                  </span>
                  {simplifiedSteps.has(currentExplainIdx) && (
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Version simplifiée
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentExplainIdx + 1) / explanation.steps.length) * 100}%` }}></div>
                </div>
             </div>

             <div className="space-y-4 animate-fade-in" key={currentExplainIdx}>
                <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">{explanation.steps[currentExplainIdx].title}</h3>
                
                {/* Illustration Visuelle à la demande (SVG ou Image) */}
                {(isIllustrating || currentIllustration || currentSVG) ? (
                  <div className="relative w-full aspect-video bg-white rounded-3xl border border-slate-800 overflow-hidden shadow-inner group mb-4 flex items-center justify-center p-4">
                    {isIllustrating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Génération du schéma...</p>
                      </div>
                    ) : currentSVG ? (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: currentSVG }} 
                      />
                    ) : (
                      <img src={currentIllustration!} alt="Illustration" className="max-w-full max-h-full object-contain" />
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => handleGenerateIllustration(explanation.steps[currentExplainIdx].imagePrompt, explanation.steps[currentExplainIdx].content)}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 hover:bg-indigo-500/20 transition-all group"
                  >
                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Aide-moi avec un {isGeometryTopic(explanation.steps[currentExplainIdx].content) ? 'schéma SVG précis' : 'dessin'}
                    </span>
                  </button>
                )}

                <p className="text-slate-300 leading-relaxed text-base font-medium whitespace-pre-wrap">{explanation.steps[currentExplainIdx].content}</p>
             </div>

             <div className="pt-8 border-t border-slate-800">
                {currentExplainIdx < explanation.steps.length - 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={handleSimplify}
                      disabled={isSimplifying}
                      className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all border border-slate-700"
                    >
                      {isSimplifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                      Je n'ai pas compris
                    </button>
                    <button 
                      onClick={() => setCurrentExplainIdx(prev => prev + 1)}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      J'ai compris, suite ! <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl space-y-4 animate-fade-in">
                       <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4" /> À retenir absolument</h4>
                       <ul className="space-y-2">
                          {explanation.keyPoints.map((kp, i) => (
                            <li key={i} className="text-xs font-bold text-slate-300 flex items-start gap-2 italic">
                               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                               {kp}
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={handleSimplify}
                        disabled={isSimplifying}
                        className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all border border-slate-700"
                      >
                        {isSimplifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                        Toujours pas compris
                      </button>
                      <button 
                        onClick={() => setStep('quiz-config')}
                        className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                      >
                        Prêt pour un quiz ? <Play className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {step === 'quiz-config' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 animate-fade-in">
           <div className="text-center space-y-2">
             <h2 className="text-xl font-black uppercase tracking-tight text-white">Préparation du Quiz</h2>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sujet : {topic}</p>
           </div>

           <div className="space-y-6">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volume de questions</label>
                 <div className="grid grid-cols-5 gap-2">
                    {[1, 5, 10, 15, 20].map(n => (
                      <button 
                        key={n} 
                        onClick={() => setNumQuestions(n)} 
                        className={`py-4 rounded-xl font-black text-sm border-2 transition-all ${numQuestions === n ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                      >
                        {n}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                 <div className="flex justify-between px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Types de réponses</label>
                    <span className="text-[10px] font-black text-indigo-400">{mcqRatio}% QCM / {100 - mcqRatio}% Libre</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" max="100" step="25" 
                   value={mcqRatio}
                   onChange={() => {}} 
                   onInput={(e) => setMcqRatio(parseInt((e.target as HTMLInputElement).value))}
                   className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
              </div>

              <button 
                onClick={startQuizGen}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                Générer mon quiz <Sparkles className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

      {step === 'quiz-active' && quizItems[currentQuizIdx] && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl space-y-8 animate-fade-in overflow-hidden">
           <div className="flex justify-between items-center px-1">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Défi Express</span>
                <span className="text-xs font-black text-indigo-400">{currentQuizIdx + 1} / {quizItems.length}</span>
              </div>
              <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentQuizIdx + 1) / quizItems.length) * 100}%` }}></div>
              </div>
           </div>

           <div className="space-y-6 animate-fade-in" key={currentQuizIdx}>
              {/* Illustration Quiz à la demande (SVG ou Image) */}
              {(isIllustrating || quizIllustration || quizSVG) ? (
                <div className="relative w-full aspect-square max-w-[300px] mx-auto bg-white rounded-3xl border border-slate-800 overflow-hidden shadow-inner group flex items-center justify-center p-4">
                  {isIllustrating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm z-10">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Génération Image...</p>
                    </div>
                  ) : quizSVG ? (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: quizSVG }} 
                    />
                  ) : (
                    <img src={quizIllustration!} alt="Question visuelle" className="max-w-full max-h-full object-contain p-4" />
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => handleGenerateIllustration(quizItems[currentQuizIdx].imagePrompt, quizItems[currentQuizIdx].question, true)}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 hover:bg-emerald-500/20 transition-all group"
                >
                  <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    Aide-moi avec un {isGeometryTopic(quizItems[currentQuizIdx].question) ? 'schéma SVG' : 'dessin'}
                  </span>
                </button>
              )}

              <h3 className="text-xl font-black text-white leading-tight">{quizItems[currentQuizIdx].question}</h3>

              {quizItems[currentQuizIdx].type === 'mcq' ? (
                <div className="grid gap-2">
                   {quizItems[currentQuizIdx].options?.map((opt: string, i: number) => (
                     <button 
                       key={i} 
                       onClick={() => isQuestionCorrect === null && setUserAnswer(opt)}
                       className={`p-5 rounded-2xl text-left text-sm font-bold border-2 transition-all ${
                         userAnswer === opt 
                          ? (isQuestionCorrect === null ? 'border-indigo-500 bg-indigo-500/10' : (isQuestionCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'))
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                       } ${isQuestionCorrect !== null && opt === quizItems[currentQuizIdx].correctAnswer ? 'border-emerald-500 bg-emerald-500/10' : ''}`}
                     >
                        {opt}
                     </button>
                   ))}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={isQuestionCorrect !== null || isChecking}
                  placeholder="Écris ta réponse ici..."
                  className={`w-full p-6 bg-slate-950 border-2 rounded-[2rem] outline-none transition-all font-medium text-white ${
                    isQuestionCorrect === null ? 'border-slate-800 focus:border-indigo-500' : (isQuestionCorrect ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]')
                  }`}
                />
              )}

              {isQuestionCorrect !== null && quizFeedback && (
                <div className={`p-6 rounded-3xl animate-fade-in space-y-3 ${isQuestionCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'}`}>
                   <div className="flex items-center gap-3">
                      {isQuestionCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">{isQuestionCorrect ? 'Excellent !' : 'À revoir'}</span>
                   </div>
                   <p className="text-xs font-bold text-slate-300 italic">"{quizFeedback}"</p>
                </div>
              )}

              <div className="pt-4">
                 {isQuestionCorrect === null ? (
                   <button 
                     onClick={checkAnswer}
                     disabled={!userAnswer.trim() || isChecking}
                     className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                     {isChecking ? "Analyse..." : "Vérifier"}
                   </button>
                 ) : (
                   <button 
                     onClick={nextQuestion}
                     className="w-full py-5 bg-slate-800 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     {currentQuizIdx < quizItems.length - 1 ? 'Question suivante' : 'Terminer'} <ChevronRight className="w-4 h-4" />
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {step === 'results' && (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-12 shadow-2xl text-center space-y-10 animate-fade-in">
           <div className="w-28 h-28 bg-indigo-500/10 border border-indigo-500/20 rounded-full mx-auto flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles className="w-14 h-14 text-indigo-400" />
           </div>
           <div className="space-y-2 text-white">
              <h2 className="text-3xl font-black uppercase tracking-tight">Objectif Atteint !</h2>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Tu as maîtrisé la notion : {topic}</p>
              <div className="mt-4 text-3xl font-black text-indigo-400">+50 XP</div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setStep('topic-input')} className="flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                <Zap className="w-5 h-5" /> Autre notion
              </button>
              <button onClick={handleMenuReturn} className="flex items-center justify-center gap-3 py-5 bg-slate-800 border border-slate-700 text-slate-300 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-all">
                <LayoutDashboard className="w-5 h-5" /> Menu
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default DirectStudyModule;
