
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Sparkles } from 'lucide-react';

interface Props {
  progress: number;
  customWords?: string[];
}

const DEFAULT_WORDS = [
  "#révision", 
  "#analyse", 
  "#synthèse", 
  "#mémoire", 
  "#focus", 
  "#succès", 
  "#organisation", 
  "#méthode", 
  "#apprentissage", 
  "#cerveau",
  "#examen",
  "#fiche",
  "#intelligence",
  "#concentration"
];

const AnalysisLoading: React.FC<Props> = ({ progress, customWords }) => {
  const [bubbles, setBubbles] = useState<{ id: number; text: string; x: number; y: number; scale: number; duration: number; delay: number }[]>([]);
  
  // Ensure words have hashtags and memoize based on stringified content to avoid reset on every parent re-render
  const displayWords = useMemo(() => {
    const rawWords = (customWords && customWords.length > 0) 
      ? [...customWords, "IA", "RévizIA"] 
      : DEFAULT_WORDS;

    return rawWords.map(w => w.startsWith('#') ? w : `#${w}`);
  }, [JSON.stringify(customWords)]);

  const wordsRef = useRef(displayWords);
  useEffect(() => {
    wordsRef.current = displayWords;
  }, [displayWords]);

  useEffect(() => {
    // Initial batch of bubbles
    const initialBubbles = Array.from({ length: 8 }).map((_, i) => ({
      id: Math.random() + i,
      text: wordsRef.current[Math.floor(Math.random() * wordsRef.current.length)],
      x: Math.random() * 90 + 5,
      y: 100,
      scale: Math.random() * 0.4 + 0.7,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 3
    }));
    setBubbles(initialBubbles);

    const interval = setInterval(() => {
      setBubbles(prev => {
        const newBubble = {
          id: Date.now() + Math.random(),
          text: wordsRef.current[Math.floor(Math.random() * wordsRef.current.length)],
          x: Math.random() * 90 + 5,
          y: 100,
          scale: Math.random() * 0.4 + 0.7,
          duration: Math.random() * 5 + 3,
          delay: 0
        };
        // Keep up to 25 bubbles
        return [...prev.slice(-24), newBubble];
      });
    }, 700);

    return () => clearInterval(interval);
  }, [JSON.stringify(customWords)]); // Only restart simulation if words actually change

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center overflow-hidden no-print">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.25),transparent_70%)] pointer-events-none"></div>
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            className="absolute bg-indigo-500/15 backdrop-blur-md border border-indigo-500/30 px-5 py-2.5 rounded-full text-indigo-300 text-[10px] font-black whitespace-nowrap shadow-[0_0_25px_rgba(79,70,229,0.2)] flex items-center gap-2 z-0"
            style={{
              left: `${bubble.x}%`,
              bottom: `-15%`,
              transform: `scale(${bubble.scale})`,
              animation: `floatUpAnimation ${bubble.duration}s linear ${bubble.delay}s forwards`
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {bubble.text}
          </div>
        ))}
      </div>

      <div className="relative mb-12 z-10 scale-90 sm:scale-100">
        <div className="absolute -inset-20 border-2 border-dashed border-indigo-500/10 rounded-full animate-[spin_30s_linear_infinite]"></div>
        <div className="absolute -inset-14 border-2 border-dashed border-indigo-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
        
        <div className="relative w-44 h-44 bg-slate-900 rounded-full border-2 border-indigo-500/50 flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-transparent"></div>
          <Brain className="w-24 h-24 text-indigo-400 animate-pulse relative z-10" />
          <div className="absolute inset-0 animate-[spin_5s_linear_infinite]">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-400 rounded-full shadow-[0_0_20px_rgba(129,140,248,1)]"></div>
          </div>
        </div>
      </div>

      <div className="text-center z-10 space-y-3 px-6">
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Analyse IA</h2>
        <div className="flex items-center justify-center gap-6">
           <div className="w-16 h-[2px] bg-gradient-to-r from-transparent to-indigo-500"></div>
           <div className="text-7xl font-black text-indigo-400 tabular-nums">
             {Math.round(progress)}%
           </div>
           <div className="w-16 h-[2px] bg-gradient-to-l from-transparent to-indigo-500"></div>
        </div>
        <p className="pt-6 text-slate-400 text-xs font-black tracking-[0.3em] uppercase animate-pulse">
          Traitement intelligent en cours...
        </p>
      </div>

      <style>{`
        @keyframes floatUpAnimation {
          0% { 
            transform: translateY(0) scale(0.6) rotate(-5deg); 
            opacity: 0; 
          }
          10% { 
            opacity: 1; 
          }
          90% { 
            opacity: 1; 
          }
          100% { 
            transform: translateY(-130vh) scale(1.1) rotate(5deg); 
            opacity: 0; 
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default AnalysisLoading;
