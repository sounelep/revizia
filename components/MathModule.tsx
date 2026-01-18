
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Brain, Zap, Trophy, AlertTriangle, Lightbulb, ChevronRight, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { MathTip } from '../types';

interface Props {
  onXpGain: (amount: number) => void;
}

const MathModule: React.FC<Props> = ({ onXpGain }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [errors, setErrors] = useState<{n1: number, n2: number, given: string, correct: number}[]>([]);
  const timerRef = useRef<any>(null);

  const durations = [
    { label: '30s', value: 30 },
    { label: '1 min', value: 60 },
    { label: '1min 30', value: 90 },
    { label: '2 min', value: 120 }
  ];

  const getTipObj = (n1: number, n2: number): MathTip | null => {
    const savedTips = JSON.parse(localStorage.getItem('math_tips') || '[]');
    const found = savedTips.find((t: MathTip) => 
      (t.n1 === n1 && t.n2 === n2) || (t.n1 === n2 && t.n2 === n1)
    );
    return found || null;
  };

  const startNewRound = () => {
    setNum1(Math.floor(Math.random() * 11)); // 0 to 10
    setNum2(Math.floor(Math.random() * 11)); // 0 to 10
    setAnswer('');
  };

  const startSession = () => {
    setIsActive(true);
    setIsFinished(false);
    setScore(0);
    setErrors([]);
    setTimeLeft(selectedDuration);
    startNewRound();
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsFinished(true);
      onXpGain(score * 10);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = num1 * num2;
    if (parseInt(answer) === correct) {
      setScore(score + 1);
      startNewRound();
    } else {
      setErrors(prev => [...prev, { n1: num1, n2: num2, given: answer, correct }]);
      startNewRound();
    }
  };

  if (isFinished) {
    return (
      <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 animate-fade-in shadow-2xl text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="p-5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <Trophy className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Session terminée !</h2>
          <div className="text-5xl font-black text-indigo-400">{score} calculs</div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Points gagnés : +{score * 10} XP</p>
        </div>

        {errors.length > 0 && (
          <div className="text-left space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Analyse de tes erreurs
            </h3>
            <div className="grid gap-4">
              {errors.slice(0, 5).map((err, i) => {
                const tipObj = getTipObj(err.n1, err.n2);
                return (
                  <div key={i} className="p-5 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xl">{err.n1} × {err.n2} = <span className="text-emerald-400">{err.correct}</span></span>
                      <span className="text-[10px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-500/10 rounded-lg">Tu as dit: {err.given || "?"}</span>
                    </div>
                    
                    {tipObj && (
                      <div className="space-y-4 bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl">
                        {tipObj.tip && (
                          <div className="flex gap-3 items-start">
                            <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-indigo-100 leading-relaxed italic">{tipObj.tip}</p>
                          </div>
                        )}
                        {tipObj.image && (
                          <div className="rounded-xl overflow-hidden border border-indigo-500/10">
                            <img src={tipObj.image} alt="Astuce visuelle" className="w-full max-h-48 object-contain bg-slate-900" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {errors.length > 5 && <p className="text-center text-[10px] text-slate-600 font-black uppercase">Et {errors.length - 5} autres erreurs...</p>}
            </div>
          </div>
        )}

        <button 
          onClick={() => setIsFinished(false)}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
        >
          <RotateCcw className="w-5 h-5" /> Recommencer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 animate-fade-in shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full"></div>

      <div className="flex justify-between items-center mb-8 relative">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            Sprint Multiplication
          </h2>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded-md">
            Tables de 0 à 10
          </span>
        </div>
        
        {isActive && (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-amber-400 font-black text-2xl">
                <Timer className="w-5 h-5" />
                {timeLeft}s
              </div>
              <span className="text-[8px] font-black uppercase text-slate-500">Temps</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-emerald-400 font-black text-2xl">{score}</div>
              <span className="text-[8px] font-black uppercase text-slate-500">Score</span>
            </div>
          </div>
        )}
      </div>

      {!isActive ? (
        <div className="space-y-8 py-4 relative text-center">
          <div className="space-y-4">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Choisis la durée du sprint</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {durations.map(d => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDuration(d.value)}
                  className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${selectedDuration === d.value ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={startSession}
            className="w-full sm:w-auto px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-3 mx-auto active:scale-95 group"
          >
            <Zap className="w-6 h-6 group-hover:scale-125 transition-transform" />
            DÉMARRER LE SPRINT
          </button>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Entraîne-toi à répondre le plus vite possible !</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="text-center space-y-8 animate-fade-in relative py-10">
          <div className="text-6xl sm:text-8xl font-black text-white flex items-center justify-center gap-4 sm:gap-8 select-none">
            <span className="tabular-nums">{num1}</span>
            <span className="text-indigo-500 text-4xl sm:text-6xl">×</span>
            <span className="tabular-nums">{num2}</span>
            <span className="text-indigo-500 text-4xl sm:text-6xl">=</span>
          </div>
          <div className="max-w-xs mx-auto relative">
            <input
              autoFocus
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full text-center text-5xl p-8 bg-slate-950 rounded-[2.5rem] border-4 border-slate-800 outline-none focus:border-indigo-500 transition-all font-black text-indigo-400 shadow-inner"
              placeholder="?"
            />
            <button type="submit" className="absolute -right-4 top-1/2 -translate-y-1/2 p-4 bg-emerald-500 text-white rounded-full shadow-xl active:scale-90 transition-transform">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MathModule;
