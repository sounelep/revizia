
import React, { useState, useRef, useEffect } from 'react';
import { Document, AppRoute, MindMap, MindMapNode, SourceFile } from '../types';
import { BookOpen, FileQuestion, MessageCircle, ChevronRight, Hash, Sparkles, ArrowLeft, Lightbulb, Check, X, Loader2, FileSearch, Trash2, Edit3, Wand2, Save, ShieldCheck, PlusCircle, Calendar, Network, Plus, Share2, Eye, Zap, AlertCircle, RefreshCw, FileText, Download, FileUp, File, Image as ImageIcon } from 'lucide-react';
import { processUserContribution, compareWithTeacherSheet, analyzeDocument, elaboratePoint } from '../services/geminiService';
import { exportToDoc, exportToTxt } from '../services/exportService';
import AnalysisLoading from './AnalysisLoading';

const MindMapPreview: React.FC<{ mindMap: MindMap }> = ({ mindMap }) => {
  if (!mindMap.nodes || mindMap.nodes.length === 0) return null;
  const padding = 40;
  const nodeWidth = 128;
  const nodeHeight = 60;
  const minX = Math.min(...mindMap.nodes.map(n => n.x)) - padding;
  const minY = Math.min(...mindMap.nodes.map(n => n.y)) - padding;
  const maxX = Math.max(...mindMap.nodes.map(n => n.x)) + nodeWidth + padding;
  const maxY = Math.max(...mindMap.nodes.map(n => n.y)) + nodeHeight + padding;
  const width = maxX - minX;
  const height = maxY - minY;

  const getPathData = (from: MindMapNode, to: MindMapNode, type: 'straight' | 'rounded' = 'rounded') => {
    const w = 128;
    const h = 60;
    const x1 = from.x + w/2;
    const y1 = from.y + h/2;
    const x2 = to.x + w/2;
    const y2 = to.y + h/2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const sx = x1 + Math.cos(angle) * (w/2 + 5);
    const sy = y1 + Math.sin(angle) * (h/2 + 5);
    const ex = x2 - Math.cos(angle) * (w/2 + 10);
    const ey = y2 - Math.sin(angle) * (h/2 + 10);
    if (type === 'straight') return `M ${sx} ${sy} L ${ex} ${ey}`;
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const offset = dist * 0.15;
    const cpx = midX - (dy / dist) * offset;
    const cpy = midY + (dx / dist) * offset;
    return `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`;
  };

  const getNodeColor = (color: string = 'indigo') => {
    const colors: Record<string, string> = { indigo: '#6366f1', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e', cyan: '#06b6d4' };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group shadow-inner">
      <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="w-full h-full p-2" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead-preview" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#4f46e5" />
          </marker>
        </defs>
        {mindMap.links.map((link, i) => {
          const from = mindMap.nodes.find(n => n.id === link.from);
          const to = mindMap.nodes.find(n => n.id === link.to);
          if (!from || !to) return null;
          return <path key={i} d={getPathData(from, to, link.lineType)} fill="none" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrowhead-preview)" strokeDasharray={link.lineStyle === 'dashed' ? "4,4" : "0"} opacity="0.3" />;
        })}
        {mindMap.nodes.map(node => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <rect width={nodeWidth} height={nodeHeight} rx={node.type === 'round' ? "12" : "0"} fill={getNodeColor(node.color)} fillOpacity="0.1" stroke={getNodeColor(node.color)} strokeWidth="1.5" />
            <text x={nodeWidth/2} y={nodeHeight/2 + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="900" className="uppercase tracking-tighter opacity-70">{node.text.length > 15 ? node.text.substring(0, 12) + '...' : node.text}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

interface Props {
  document: Document;
  onNavigate: (route: AppRoute, data?: any) => void;
  onUpdateDocument?: (doc: Document) => void;
  onAddSource?: () => void;
  initialView?: 'menu' | 'fiche';
}

const RevisionHub: React.FC<Props> = ({ document: docProp, onNavigate, onUpdateDocument, onAddSource, initialView = 'menu' }) => {
  const [view, setView] = useState<'menu' | 'fiche'>(initialView);
  const [newInfo, setNewInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'note' | 'compare' | 'elaborate' | null>(null);
  const [progress, setProgress] = useState(0);
  const [pendingContribution, setPendingContribution] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = docProp;

  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView, activeDoc.id]);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      setProgress(5);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          const next = prev + (Math.random() * 5);
          return next >= 95 ? 95 : next;
        });
      }, 300);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleProcessNote = async () => {
    if (!newInfo.trim() || isProcessing) return;
    setIsProcessing(true);
    setProcessingType('note');
    setPendingContribution(null);
    setError(null);
    try {
      const result = await processUserContribution(activeDoc, newInfo);
      setPendingContribution(result);
      setProgress(100);
      setTimeout(() => setIsProcessing(false), 800);
      setNewInfo('');
    } catch (err: any) { 
      setError(err.message || "Une erreur est survenue lors de l'analyse.");
      setIsProcessing(false);
    } finally { 
      setProcessingType(null);
    }
  };

  const confirmContribution = () => {
    if (!pendingContribution || !onUpdateDocument) return;
    const { category, content } = pendingContribution;
    const updatedDoc = { ...activeDoc };
    
    if (category === 'keyPoint') {
      updatedDoc.keyPoints = [...(updatedDoc.keyPoints || []), content.text];
    } else if (category === 'definition') {
      updatedDoc.definitions = [...(updatedDoc.definitions || []), { 
        term: content.term, 
        definition: content.definition 
      }];
    } else if (category === 'formula') {
      updatedDoc.formulas = [...(updatedDoc.formulas || []), content.text];
    }
    
    onUpdateDocument(updatedDoc);
    setPendingContribution(null);
  };

  const handleTeacherCompare = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProcessingType('compare');
    setError(null);
    try {
      let content = "";
      if (file.type === 'text/plain') {
        content = await file.text();
      } else {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const analysis = await analyzeDocument(base64, undefined, file.type);
        content = `${analysis.summary} ${analysis.keyPoints?.join(' ')} ${analysis.definitions?.map((d:any)=>`${d.term} ${d.definition}`).join(' ')} ${analysis.formulas?.join(' ')}`;
      }
      const results = await compareWithTeacherSheet(activeDoc, content);
      setComparisonResults(results);
      setIsComparing(true);
      setProgress(100);
      setTimeout(() => setIsProcessing(false), 800);
    } catch (err: any) { 
      setError(err.message || "Une erreur est survenue.");
      setIsProcessing(false);
    } finally { 
      setProcessingType(null);
      if (teacherFileInputRef.current) teacherFileInputRef.current.value = '';
    }
  };

  const handleElaborate = async (section: string, index: number, currentText: string) => {
    setIsProcessing(true);
    setProcessingType('elaborate');
    setError(null);
    try {
      const context = `${activeDoc.summary} ${activeDoc.keyPoints?.join(' ')} ${activeDoc.formulas?.join(' ')}`;
      const enriched = await elaboratePoint(currentText, context);
      if (enriched && onUpdateDocument) {
        const newDoc = { ...activeDoc };
        if (section === 'summary') newDoc.summary = enriched;
        if (section === 'keyPoints') newDoc.keyPoints![index] = enriched;
        if (section === 'formulas') newDoc.formulas![index] = enriched;
        if (section === 'definitions') newDoc.definitions![index].definition = enriched;
        onUpdateDocument(newDoc);
        setProgress(100);
        setTimeout(() => setIsProcessing(false), 800);
      }
    } catch (err: any) { 
      setError(err.message || "Erreur Gemini.");
      setIsProcessing(false);
    } finally { 
      setProcessingType(null);
    }
  };

  const getItemStatus = (section: string, index: number) => {
    if (!isComparing || !comparisonResults || !comparisonResults.comparisonResults) return null;
    const res = comparisonResults.comparisonResults[section];
    if (section === 'summary') return res;
    return res?.[index] || null;
  };

  const handlePrint = () => {
    setIsExportMenuOpen(false);
    setTimeout(() => window.print(), 100);
  };

  if (view === 'fiche') {
    return (
      <div className="space-y-6 animate-fade-in pb-80 w-full max-w-full relative">
        {isProcessing && <AnalysisLoading progress={progress} />}

        <div className="flex items-center justify-between no-print">
          <button onClick={() => { setView('menu'); setIsComparing(false); setPendingContribution(null); }} className="flex items-center gap-2 text-indigo-400 text-sm font-bold transition-all hover:translate-x-[-2px]"><ArrowLeft className="w-4 h-4" /> Retour au menu</button>
          
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-700"
            >
              <Share2 className="w-4 h-4 text-indigo-400" /> Exporter
            </button>
            
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                <button onClick={handlePrint} className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors border-b border-slate-800">
                  <FileText className="w-4 h-4 text-indigo-400" /> Export PDF
                </button>
                <button onClick={() => { exportToDoc(activeDoc); setIsExportMenuOpen(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors border-b border-slate-800">
                  <FileUp className="w-4 h-4 text-cyan-400" /> Export Word
                </button>
                <button onClick={() => { exportToTxt(activeDoc); setIsExportMenuOpen(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                  <Download className="w-4 h-4 text-emerald-400" /> Export TXT
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl relative">
          <div className="p-6 sm:p-8 space-y-8 print:p-0 print-container">
            {/* RÉSUMÉ (L'ESSENTIEL) */}
            <section className="space-y-4 print-section-summary">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 print:text-amber-600"><Sparkles className="w-4 h-4 print:hidden" /> Résumé</h3>
              <div className={`relative p-5 rounded-3xl border transition-all duration-300 ${isComparing ? (getItemStatus('summary', 0) === 'match' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5') : 'border-slate-800 bg-slate-950/50'} print:bg-slate-50 print:border-slate-200`}>
                <p className="text-slate-300 text-sm leading-relaxed print:text-slate-800">{activeDoc.summary}</p>
                {!isComparing && (
                  <button onClick={() => handleElaborate('summary', 0, activeDoc.summary || '')} className="absolute bottom-3 right-3 p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 shadow-lg active:scale-90 transition-transform no-print"><Wand2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </section>

            <div className="print-grid grid grid-cols-1 gap-8">
              {/* LEXIQUE (VOCABULAIRE) */}
              <section className="space-y-4 print-section-vocabulary">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 print:text-blue-600"><Lightbulb className="w-4 h-4 print:hidden" /> Lexique</h3>
                <div className="grid gap-3">
                  {activeDoc.definitions?.map((d, i) => {
                    const status = getItemStatus('definitions', i);
                    return (
                      <div key={i} className={`p-4 rounded-2xl border space-y-2 transition-all ${isComparing ? (status === 'match' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5') : 'border-slate-800 bg-slate-800/30'} print:bg-white print:border-slate-100`}>
                        <p className="text-sm print:text-slate-800"><span className="font-bold text-indigo-300 print:text-blue-800 uppercase tracking-tight text-[10px]">{d.term}</span>: {d.definition}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* TITRE CENTRAL POUR L'IMPRESSION UNIQUEMENT */}
              <div className="hidden print:flex print-title-box">
                <div className="print-star">
                  {activeDoc.title}
                </div>
              </div>

              <div className="flex flex-col gap-6 print-col-right">
                {/* FORMULES (À RETENIR) */}
                <section className="space-y-4 print-section-formulas">
                  <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 print:text-pink-600"><Calendar className="w-4 h-4 print:hidden" /> Formules & Dates</h3>
                  <div className="grid gap-3">
                    {activeDoc.formulas?.map((f, i) => {
                      const status = getItemStatus('formulas', i);
                      return (
                        <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${isComparing ? (status === 'match' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5') : 'border-slate-800 bg-slate-800/30'} print:bg-white print:border-slate-100`}>
                          <p className="text-sm flex-1 font-mono text-emerald-300 print:text-pink-700">{f}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* CARTE MENTALE */}
                {activeDoc.mindMaps && activeDoc.mindMaps.length > 0 && (
                  <section className="space-y-4 print-section-mindmap">
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 print:text-purple-600"><Network className="w-4 h-4 print:hidden" /> Carte Mentale</h3>
                    <div className="grid grid-cols-1 gap-6">
                      {activeDoc.mindMaps.map((map) => (
                        <div key={map.id} className="space-y-3 print:bg-white">
                          <div onClick={() => onNavigate(AppRoute.MIND_MAP_EDITOR, map)} className="cursor-pointer transition-transform active:scale-95 shadow-xl rounded-2xl no-print"><MindMapPreview mindMap={map} /></div>
                          <h4 className="font-black uppercase text-[10px] text-slate-500 tracking-widest px-2 print:text-purple-800 print:font-black">Carte : {map.title}</h4>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* POINTS CLÉS (BAS DE PAGE) */}
            <section className="space-y-4 print-section-keypoints">
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2 print:text-emerald-600"><Hash className="w-4 h-4 print:hidden" /> Points Clés</h3>
              <div className="grid gap-3">
                {activeDoc.keyPoints?.map((p, i) => {
                  const status = getItemStatus('keyPoints', i);
                  return (
                    <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${isComparing ? (status === 'match' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5') : 'border-slate-800 bg-slate-800/30'} print:bg-white print:border-slate-100`}>
                      <p className="text-sm flex-1 font-medium print:text-slate-800">{p}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Actions bas de fiche (no-print) */}
            <div className="pt-8 border-t border-slate-800 space-y-6 no-print">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col gap-3 text-rose-400 animate-fade-in shadow-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold leading-tight flex-1">{error}</p>
                  </div>
                  <button onClick={() => { setError(null); handleProcessNote(); }} className="self-end flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                    <RefreshCw className="w-3 h-3" /> Réessayer
                  </button>
                </div>
              )}

              {pendingContribution && (
                <div className={`p-6 rounded-3xl border animate-fade-in space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] mb-4 ${pendingContribution.isDuplicate ? 'bg-emerald-500/10 border-emerald-500/50 shadow-emerald-500/10' : 'bg-amber-500/10 border-amber-500/50 shadow-amber-500/10'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {pendingContribution.isDuplicate ? <Check className="w-4 h-4 text-emerald-400" /> : <PlusCircle className="w-4 h-4 text-amber-400" />}
                      <h4 className={`text-[10px] font-black uppercase tracking-widest ${pendingContribution.isDuplicate ? "text-emerald-400" : "text-amber-400"}`}>
                        {pendingContribution.isDuplicate ? "Info déjà présente (Doublon)" : "Nouvelle note identifiée"}
                      </h4>
                    </div>
                    <button onClick={() => setPendingContribution(null)} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                     {pendingContribution.category === 'definition' ? (
                       <p className="text-sm leading-relaxed">
                         <span className="font-black text-indigo-300 uppercase text-[10px] block mb-1">Nouveau Terme</span>
                         <span className="font-bold text-white">{pendingContribution.content.term}</span> : {pendingContribution.content.definition || pendingContribution.content.text}
                       </p>
                     ) : (
                       <p className="text-sm text-slate-200 leading-relaxed">
                         <span className="font-black text-indigo-300 uppercase text-[10px] block mb-1">{pendingContribution.category === 'formula' ? 'Formule / Date' : 'Point Clé'}</span>
                         {pendingContribution.content.text}
                       </p>
                     )}
                  </div>
                  {!pendingContribution.isDuplicate && (
                    <div className="flex gap-2">
                      <button onClick={confirmContribution} className="flex-1 py-3 bg-amber-500 text-black font-black uppercase text-[10px] rounded-xl shadow-lg active:scale-95 transition-all hover:bg-amber-400">Valider l'ajout</button>
                      <button onClick={() => setPendingContribution(null)} className="px-6 py-3 bg-slate-800 text-slate-400 font-black uppercase text-[10px] rounded-xl hover:bg-slate-700 transition-all">Annuler</button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Edit3 className="w-3 h-3" /> Note Personnelle Rapide</h4>
                <div className="flex gap-2">
                  <input type="text" value={newInfo} onChange={(e) => setNewInfo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleProcessNote()} placeholder="Ex: 'Féodalité' ou une date importante..." className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all shadow-inner placeholder:text-slate-700" />
                  <button onClick={handleProcessNote} disabled={!newInfo.trim() || isProcessing} className="p-4 bg-indigo-600 rounded-2xl disabled:opacity-50 shadow-xl active:scale-90 transition-transform">
                    {isProcessing && processingType === 'note' ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <PlusCircle className="w-6 h-6 text-white" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isComparing ? (
                  <button onClick={() => teacherFileInputRef.current?.click()} disabled={isProcessing} className="flex items-center justify-center gap-3 py-5 bg-slate-800 border border-slate-700 rounded-3xl text-xs font-black uppercase tracking-widest text-indigo-400 hover:bg-slate-700 active:scale-95 transition-all shadow-lg">
                    {isProcessing && processingType === 'compare' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />} Vérifier avec le prof
                  </button>
                ) : (
                  <button onClick={() => { setIsComparing(false); setComparisonResults(null); }} className="flex items-center justify-center gap-3 py-5 bg-rose-600/10 border border-rose-500/30 rounded-3xl text-xs font-black uppercase tracking-widest text-rose-400 hover:bg-rose-600 hover:text-white transition-all"><X className="w-4 h-4" /> Fermer comparaison</button>
                )}
                <button onClick={() => onNavigate(AppRoute.MIND_MAP_EDITOR)} className="flex items-center justify-center gap-3 py-5 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl text-xs font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all shadow-lg"><Network className="w-4 h-4" /> Créer Carte Mentale</button>
              </div>
              <input type="file" ref={teacherFileInputRef} onChange={handleTeacherCompare} className="hidden" accept="image/*,application/pdf,text/plain" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in py-4 pb-52 max-w-lg mx-auto w-full text-center">
      {isProcessing && <AnalysisLoading progress={progress} />}
      <h2 className="text-2xl font-black uppercase text-white mb-6 tracking-tighter">Révision Intelligente</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 mb-8 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <File className="w-3 h-3 text-indigo-400" /> Documents Sources ({activeDoc.sources?.length || 1})
           </h3>
           <button onClick={onAddSource} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/10">
             <Plus className="w-3 h-3" /> Ajouter
           </button>
        </div>
        <div className="grid gap-2">
           {activeDoc.sources?.map((s, i) => (
             <div key={s.id} className="flex items-center gap-4 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-all">
                <div className="p-2.5 bg-slate-900 rounded-xl group-hover:scale-110 transition-transform">
                  {s.type.includes('image') ? <ImageIcon className="w-4 h-4 text-cyan-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold text-slate-200 truncate uppercase tracking-tight">{s.name}</p>
                  <p className="text-[8px] text-slate-500 font-black uppercase mt-0.5">{new Date(s.date).toLocaleDateString()}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
      <div className="grid gap-5 px-4">
        <button onClick={() => setView('fiche')} className="group flex items-center gap-5 p-7 bg-slate-900 border border-slate-800 rounded-[2.5rem] hover:bg-slate-800 transition-all text-left shadow-2xl active:scale-95">
          <div className="p-4 bg-indigo-500/10 rounded-[1.5rem] group-hover:scale-110 transition-transform"><BookOpen className="w-8 h-8 text-indigo-400" /></div>
          <div><h4 className="font-black text-xl uppercase tracking-tight">Fiche Interactive</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Étudier, Enrichir, Comparer</p></div>
          <ChevronRight className="w-6 h-6 text-slate-700 ml-auto group-hover:translate-x-1 transition-transform" />
        </button>
        <button onClick={() => onNavigate(AppRoute.QUIZ)} className="group flex items-center gap-5 p-7 bg-slate-900 border border-slate-800 rounded-[2.5rem] hover:bg-slate-800 transition-all text-left shadow-2xl active:scale-95">
          <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] group-hover:scale-110 transition-transform"><FileQuestion className="w-8 h-8 text-emerald-400" /></div>
          <div><h4 className="font-black text-xl uppercase tracking-tight">Test de Connaissance</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Gagner de l'XP & valider</p></div>
          <ChevronRight className="w-6 h-6 text-slate-700 ml-auto group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default RevisionHub;
