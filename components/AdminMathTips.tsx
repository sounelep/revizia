
import React, { useState, useEffect, useRef } from 'react';
import { Save, HelpCircle, X, Lightbulb, ChevronRight, Grid, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { MathTip } from '../types';

const AdminMathTips: React.FC = () => {
  const [tips, setTips] = useState<MathTip[]>([]);
  const [editingCell, setEditingCell] = useState<{n1: number, n2: number} | null>(null);
  const [currentTipText, setCurrentTipText] = useState('');
  const [currentTipImage, setCurrentTipImage] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('math_tips');
    if (saved) setTips(JSON.parse(saved));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Small size for localStorage
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setCurrentTipImage(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  const saveTip = () => {
    if (!editingCell) return;
    
    const newTips = tips.filter(t => !(t.n1 === editingCell.n1 && t.n2 === editingCell.n2));
    if (currentTipText.trim() || currentTipImage) {
      newTips.push({ 
        n1: editingCell.n1, 
        n2: editingCell.n2, 
        tip: currentTipText,
        image: currentTipImage
      });
    }
    
    setTips(newTips);
    localStorage.setItem('math_tips', JSON.stringify(newTips));
    setEditingCell(null);
    setMessage('Astuce enregistrée !');
    setTimeout(() => setMessage(''), 3000);
  };

  const getTipObj = (n1: number, n2: number): MathTip | undefined => {
    return tips.find(t => (t.n1 === n1 && t.n2 === n2) || (t.n1 === n2 && t.n2 === n1));
  };

  const numbers = Array.from({ length: 11 }, (_, i) => i);

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Grid className="w-7 h-7 text-indigo-400" />
              Gestion des Astuces Maths
            </h2>
            <p className="text-slate-500 text-sm font-medium italic">Tables de 0 à 10. Ajoute du texte et une image pour aider l'élève.</p>
          </div>
          {message && (
             <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest animate-fade-in border border-emerald-500/30">
               {message}
             </div>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-4">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[50px_repeat(11,1fr)] gap-1">
              <div className="h-10"></div>
              {numbers.map(n => (
                <div key={n} className="h-10 flex items-center justify-center font-black text-indigo-400 text-sm bg-slate-800 rounded-lg">{n}</div>
              ))}

              {numbers.map(n1 => (
                <React.Fragment key={n1}>
                  <div className="h-14 flex items-center justify-center font-black text-indigo-400 text-sm bg-slate-800 rounded-lg">{n1}</div>
                  {numbers.map(n2 => {
                    const t = getTipObj(n1, n2);
                    return (
                      <button
                        key={`${n1}-${n2}`}
                        onClick={() => {
                          setEditingCell({ n1, n2 });
                          setCurrentTipText(t?.tip || '');
                          setCurrentTipImage(t?.image);
                        }}
                        className={`h-14 rounded-lg border flex flex-col items-center justify-center transition-all group ${t ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                      >
                        <span className="text-xs font-black text-slate-300 group-hover:scale-110 transition-transform">{n1 * n2}</span>
                        <div className="flex gap-0.5 mt-1">
                          {t?.tip && <Lightbulb className="w-2.5 h-2.5 text-indigo-400" />}
                          {t?.image && <ImageIcon className="w-2.5 h-2.5 text-cyan-400" />}
                        </div>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edition Astuce */}
      {editingCell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 no-print">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setEditingCell(null)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center sticky top-0 bg-slate-900 z-10 pb-4">
               <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                 <Lightbulb className="w-6 h-6 text-amber-500" /> Aide pour {editingCell.n1} × {editingCell.n2}
               </h3>
               <button onClick={() => setEditingCell(null)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-6">
               <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
                  <span className="text-5xl font-black text-indigo-400">{editingCell.n1 * editingCell.n2}</span>
               </div>
               
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Explication texte</label>
                 <textarea
                   rows={3}
                   value={currentTipText}
                   onChange={(e) => setCurrentTipText(e.target.value)}
                   className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                   placeholder="Ex: Astuce des doigts pour la table de 9..."
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Support visuel (Image)</label>
                 {currentTipImage ? (
                   <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                      <img src={currentTipImage} className="w-full h-auto object-contain max-h-48" alt="Tip preview" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="p-3 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all"
                         >
                           <Upload className="w-5 h-5 text-white" />
                         </button>
                         <button 
                           onClick={() => setCurrentTipImage(undefined)}
                           className="p-3 bg-rose-600 rounded-full hover:bg-rose-500 transition-all"
                         >
                           <Trash2 className="w-5 h-5 text-white" />
                         </button>
                      </div>
                   </div>
                 ) : (
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-10 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                   >
                     <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ajouter une image</span>
                   </button>
                 )}
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                 />
               </div>

               <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                 <button onClick={() => setEditingCell(null)} className="py-4 bg-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-700 transition-all">Annuler</button>
                 <button onClick={saveTip} className="py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
                   <Save className="w-4 h-4" /> Enregistrer
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMathTips;
