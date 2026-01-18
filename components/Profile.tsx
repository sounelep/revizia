
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, GraduationCap, Save, CheckCircle2, ShieldCheck, Star, Trophy, Target, Zap, ChevronDown } from 'lucide-react';

interface Props {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const Profile: React.FC<Props> = ({ user, onUpdateUser }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [gradeLevel, setGradeLevel] = useState(user.gradeLevel || '6ème');
  const [message, setMessage] = useState('');

  const isAdmin = user.role === 'admin';

  const gradeLevels = [
    'CP', 'CE1', 'CE2', 'CM1', 'CM2', 
    '6ème', '5ème', '4ème', '3ème', 
    '2nde', '1ère', 'Terminale', 
    'Etudes Supérieures', 'Autres'
  ];

  const handleSaveBasic = () => {
    onUpdateUser({ ...user, firstName, gradeLevel });
    setMessage('Profil mis à jour !');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full"></div>
        <div className="flex flex-col sm:flex-row items-center gap-6 relative">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <UserIcon className="w-12 h-12 text-white" />
          </div>
          <div className="text-center sm:text-left space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 justify-center sm:justify-start">
              {user.firstName || "Élève"}
              {/* Fixed: Removed title prop as it's not supported directly on Lucide icon components */}
              {isAdmin && <ShieldCheck className="w-6 h-6 text-amber-500" />}
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Niveau {user.level}
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-3 h-3" /> {user.xp} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 space-y-6 shadow-xl">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" /> Paramètres Scolaires
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Prénom / Pseudo</label>
              <input 
                type="text" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all shadow-inner" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Niveau d'études</label>
              <div className="relative">
                <select 
                  value={gradeLevel} 
                  onChange={(e) => setGradeLevel(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-bold focus:border-indigo-500 outline-none transition-all appearance-none"
                >
                  {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
            <button 
              onClick={handleSaveBasic} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Enregistrer les modifications
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl flex flex-col space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400" /> Objectifs de la semaine
          </h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
             <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Série actuelle</p>
                   <p className="text-lg font-black text-white">{user.streak} jours consécutifs</p>
                </div>
             </div>
             <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prochain Niveau</p>
                   <p className="text-lg font-black text-white">{1000 - (user.xp % 1000)} XP restants</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-600 text-white rounded-full font-bold text-xs shadow-2xl flex items-center gap-2 z-[60] animate-fade-in">
          <CheckCircle2 className="w-4 h-4" /> {message}
        </div>
      )}
    </div>
  );
};

export default Profile;
