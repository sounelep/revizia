
import React from 'react';
import { Flame, Star } from 'lucide-react';
import { User } from '../types';

interface Props {
  user: User;
}

const GamificationDisplay: React.FC<Props> = ({ user }) => {
  const xpForNextLevel = 1000;
  const progress = (user.xp % xpForNextLevel) / xpForNextLevel * 100;
  
  // Paramètres optimisés pour éviter le clipping
  // On utilise un viewBox de 44x44 avec un centre à 22,22 pour laisser 4px de marge
  const radius = 18;
  const strokeWidth = 3.5;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-2 sm:gap-6 animate-fade-in">
      {/* Niveau et Cercle XP */}
      <div className="relative h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center shrink-0">
        <svg 
          className="absolute inset-0 h-full w-full -rotate-90 overflow-visible"
          viewBox="0 0 44 44"
        >
          {/* Track (fond gris) */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
          />
          {/* Progress (trait indigo) */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.6)]"
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10">
          <span className="text-[9px] sm:text-[10px] font-black leading-none text-slate-400 uppercase">Lvl</span>
          <span className="text-sm sm:text-base font-black leading-none text-white">{user.level}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Stats Série */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            <span className="text-xs sm:text-sm font-black text-slate-100">{user.streak}j</span>
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Série</div>
        </div>

        {/* Stats XP Totale */}
        <div className="flex flex-col items-start border-l border-slate-800 pl-3 sm:pl-5">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
            <span className="text-xs sm:text-sm font-black text-slate-100">{user.xp}</span>
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Points</div>
        </div>
      </div>
    </div>
  );
};

export default GamificationDisplay;
