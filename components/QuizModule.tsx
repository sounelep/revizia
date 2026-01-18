
import React, { useState, useRef, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { evaluateResponse, explainQuizTopic } from '../services/geminiService';
import { CheckCircle2, XCircle, HelpCircle, Loader2, Sparkles, BrainCircuit, ChevronRight, HelpCircle as HelpIcon, Info, MessageSquareQuote, Lightbulb } from 'lucide-react';

interface Props {
  questions: QuizQuestion[];
  context: string;
  onFinish: (xp: number) => void;
}

const QuizModule: React.FC<Props> = ({ questions, context, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [totalXp, setTotalXp] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentIndex];

  // Auto-scroll to feedback or explanation when they appear
  useEffect(() => {
    if ((feedback || aiExplanation) && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 150);
    }
  }, [feedback, aiExplanation]);

  const handleCheck = async () => {
    if (!userAnswer.trim()) return;
    setLoading(true);
    setAiExplanation(null);
    try {
      if (currentQuestion.type === 'mcq') {
        const isCorrect = userAnswer === currentQuestion.correctAnswer;
        setFeedback({
          status: isCorrect ? 'correct' : 'incorrect',
          feedback: isCorrect ? 'Bravo ! C\'est la bonne réponse.' : `Ce n'est pas tout à fait ça.`,
          xpGained: isCorrect ? 20 : 0
        });
        if (isCorrect) setTotalXp(prev => prev + 20);
      } else {
        const result = await evaluateResponse(currentQuestion.question, currentQuestion.correctAnswer, userAnswer);
        setFeedback(result);
        setTotalXp(prev => prev + result.xpGained);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDontKnow = async () => {
    setLoading(true);
    setAiExplanation(null);
    try {
      const explanation = await explainQuizTopic(currentQuestion.question, currentQuestion.correctAnswer, context);
      setFeedback({
        status: 'incorrect',
        feedback: "On apprend tous les jours ! Découvrons la réponse ensemble.",
        xpGained: 0
      });
      setAiExplanation(explanation);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainMore = async () => {
    setExplaining(true);
    try {
      const explanation = await explainQuizTopic(
        currentQuestion.question, 
        currentQuestion.correctAnswer, 
        context, 
        userAnswer
      );
      setAiExplanation(explanation);
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setFeedback(null);
      setAiExplanation(null);
      scrollContainerRef.current?.scrollTo(0, 0);
    } else {
      onFinish(totalXp);
    }
  };

  // Helper to split explanation and summary
  const renderFormattedExplanation = (text: string) => {
    const parts = text.split(/💡 EN RÉSUMÉ ?:?/i);
    const body = parts[0];
    const summary = parts[1];

    return (
      <div className="space-y-6">
        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
          {body.trim()}
        </div>
        {summary && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-2xl shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
               <Lightbulb className="w-8 h-8 text-indigo-400" />
            </div>
            <h4 className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> En résumé
            </h4>
            <p className="text-slate-100 font-bold italic text-sm leading-snug">
              {summary.trim()}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto overflow-hidden">
      {/* Header Progress (Fixed) */}
      <div className="flex justify-between items-center mb-4 px-1 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progression</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-slate-300">{currentIndex + 1} / {questions.length}</span>
          </div>
        </div>
        <div className="bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-black text-indigo-400">{totalXp} XP</span>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-1 space-y-6 pb-40 custom-scrollbar scroll-smooth"
      >
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
          
          <div className="flex items-center gap-3 relative">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
               <BrainCircuit className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Question {currentIndex + 1}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black leading-tight text-white relative">{currentQuestion.question}</h3>

          {currentQuestion.type === 'mcq' ? (
            <div className="grid gap-3 pt-2 relative">
              {currentQuestion.options?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => !feedback && setUserAnswer(opt)}
                  disabled={!!feedback}
                  className={`w-full p-5 rounded-2xl text-left font-bold border-2 transition-all active:scale-[0.98] ${
                    userAnswer === opt 
                      ? (feedback ? (opt === currentQuestion.correctAnswer ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10') : 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10') 
                      : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800'
                  } ${feedback && opt === currentQuestion.correctAnswer ? 'border-emerald-500 bg-emerald-500/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {feedback && opt === currentQuestion.correctAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {feedback && userAnswer === opt && opt !== currentQuestion.correctAnswer && <XCircle className="w-5 h-5 text-rose-500" />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="pt-2 relative">
              <textarea
                rows={4}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={!!feedback}
                className="w-full p-5 bg-slate-800/50 rounded-2xl border-2 border-slate-800 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                placeholder="Écris ta réponse ici..."
              />
            </div>
          )}

          {/* Feedback Area */}
          {feedback && (
            <div className={`p-5 rounded-3xl border animate-fade-in space-y-5 relative ${
              feedback.status === 'correct' ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400' :
              feedback.status === 'partial' ? 'bg-amber-500/5 border-amber-500/30 text-amber-400' :
              'bg-rose-500/5 border-rose-500/30 text-rose-400'
            }`}>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {feedback.status === 'correct' ? <CheckCircle2 className="w-6 h-6" /> :
                   feedback.status === 'partial' ? <HelpCircle className="w-6 h-6" /> :
                   <XCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm uppercase tracking-tight mb-2 leading-relaxed">{feedback.feedback}</p>
                  {feedback.status !== 'correct' && !aiExplanation && (
                    <button 
                      onClick={handleExplainMore}
                      disabled={explaining}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 mt-2"
                    >
                      {explaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Info className="w-3 h-3" />}
                      Explique-moi davantage
                    </button>
                  )}
                </div>
              </div>

              {aiExplanation && (
                <div className="mt-4 p-5 bg-slate-950/70 rounded-3xl border border-white/5 shadow-inner animate-fade-in">
                  <div className="flex items-center gap-2 mb-4 text-indigo-400 font-black uppercase tracking-widest text-[10px]">
                    <MessageSquareQuote className="w-3 h-3" />
                    Tuteur IA
                  </div>
                  {renderFormattedExplanation(aiExplanation)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions (Sticky Bottom) */}
      <div className="shrink-0 pt-4 pb-32 bg-slate-950/80 backdrop-blur-md z-10 px-1">
        {!feedback ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleDontKnow}
              disabled={loading}
              className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <HelpIcon className="w-3.5 h-3.5" />
              Je ne sais pas
            </button>
            <button
              onClick={handleCheck}
              disabled={loading || !userAnswer.trim()}
              className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Vérifier
            </button>
          </div>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 border border-slate-700 transition-all active:scale-95 shadow-lg"
          >
            {currentIndex < questions.length - 1 ? (
              <>
                Question Suivante
                <ChevronRight className="w-5 h-5" />
              </>
            ) : 'Terminer le Quiz'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizModule;
