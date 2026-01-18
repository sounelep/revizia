
import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import AnalysisLoading from './AnalysisLoading';

interface Props {
  onCapture: (doc: any) => void;
  onXpGain: (amount: number) => void;
}

const OCRScanner: React.FC<Props> = ({ onCapture, onXpGain }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulation de progression fluide
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return prev;
          const next = prev + (Math.random() * 2);
          return next >= 95 ? 95 : next;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const resizeImage = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject("Canvas context unavailable");
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg' });
        };
        img.onerror = () => reject("Failed to load image");
      };
      reader.onerror = () => reject("Failed to read file");
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setError(null);

    try {
      let analysis;

      if (file.type.startsWith('image/')) {
        const { base64, mimeType } = await resizeImage(file);
        analysis = await analyzeDocument(base64, undefined, mimeType);
      } 
      else if (file.type === 'application/pdf') {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        analysis = await analyzeDocument(base64, undefined, 'application/pdf');
      } 
      else if (file.type === 'text/plain') {
        const text = await file.text();
        analysis = await analyzeDocument(undefined, text);
      } 
      else {
        setError("Format non supporté. Utilise PDF, Image ou Texte.");
        setIsAnalyzing(false);
        return;
      }

      if (analysis) {
        setAnalysisProgress(100);
        setTimeout(() => {
          onCapture({ ...analysis, id: Date.now().toString(), date: new Date().toISOString() });
          onXpGain(50);
          setIsAnalyzing(false);
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de l'analyse IA. Réessaye avec un autre fichier.");
      setIsAnalyzing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isAnalyzing) {
    return <AnalysisLoading progress={analysisProgress} customWords={["Lecture", "Extraction", "Synthèse"]} />;
  }

  return (
    <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 animate-fade-in shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Capture de Cours</h2>
        <p className="text-slate-400 text-sm">Photos, PDF ou fichiers texte : l'IA s'occupe de tout.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 transition-colors group"
        >
          <Camera className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Prendre Photo</span>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 transition-colors group"
        >
          <UploadCloud className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Importer Doc</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-indigo-500" /> Images</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-cyan-500" /> PDF</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> TXT</span>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*,application/pdf,text/plain" 
        className="hidden" 
      />

      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/50 rounded-xl flex items-center justify-center gap-2 text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};

export default OCRScanner;
