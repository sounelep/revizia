
import React, { useState, useRef } from 'react';
import { X, Plus, ArrowDown, Check, Trash2, MousePointer2, Palette, Zap, ArrowRight, Spline, Minus, Edit2, RotateCcw } from 'lucide-react';
import { MindMap, MindMapNode, MindMapLink } from '../types';

interface Props {
  initialData?: MindMap;
  onSave: (mindMap: MindMap) => void;
  onClose: () => void;
}

const MindMapEditor: React.FC<Props> = ({ initialData, onSave, onClose }) => {
  const [nodes, setNodes] = useState<MindMapNode[]>(initialData?.nodes || []);
  const [links, setLinks] = useState<MindMapLink[]>(initialData?.links || []);
  
  // États de création de noeud
  const [nodeText, setNodeText] = useState('');
  const [nodeType, setNodeType] = useState<MindMapNode['type']>('round');
  const [nodeColor, setNodeColor] = useState<MindMapNode['color']>('indigo');
  
  // États de liaison
  const [linkFrom, setLinkFrom] = useState('');
  const [linkTo, setLinkTo] = useState('');
  const [linkText, setLinkText] = useState('');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid');
  const [lineType, setLineType] = useState<'straight' | 'rounded'>('rounded');
  
  // État de sélection pour modification de flèche
  const [selectedLinkIdx, setSelectedLinkIdx] = useState<number | null>(null);

  const colorMap = {
    indigo: 'indigo-500',
    emerald: 'emerald-500',
    amber: 'amber-500',
    rose: 'rose-500',
    cyan: 'cyan-500',
  };

  const addNode = () => {
    if (!nodeText.trim()) return;
    
    let newX = 200;
    let newY = 200;
    let overlap = true;
    let attempts = 0;
    const gridX = 260;
    const gridY = 180;

    while (overlap && attempts < 150) {
      overlap = nodes.some(n => 
        Math.abs(n.x - newX) < gridX - 40 && 
        Math.abs(n.y - newY) < gridY - 40
      );
      if (overlap) {
        newX += gridX;
        if (newX > 1400) { 
          newX = 200; 
          newY += gridY; 
        }
      }
      attempts++;
    }

    const newNode: MindMapNode = {
      id: Math.random().toString(36).substr(2, 9),
      text: nodeText,
      type: nodeType,
      color: nodeColor,
      x: newX,
      y: newY,
    };
    setNodes([...nodes, newNode]);
    setNodeText('');
  };

  const handleLinkAction = () => {
    if (!linkFrom || !linkTo || linkFrom === linkTo) return;
    
    if (selectedLinkIdx !== null) {
      // Modification
      const updatedLinks = [...links];
      updatedLinks[selectedLinkIdx] = { from: linkFrom, to: linkTo, text: linkText, lineStyle, lineType };
      setLinks(updatedLinks);
      setSelectedLinkIdx(null);
    } else {
      // Création
      if (links.some(l => l.from === linkFrom && l.to === linkTo && l.lineType === lineType && l.lineStyle === lineStyle)) return;
      setLinks([...links, { from: linkFrom, to: linkTo, text: linkText, lineStyle, lineType }]);
    }
    resetLinkTool();
  };

  const resetLinkTool = () => {
    setLinkFrom('');
    setLinkTo('');
    setLinkText('');
    setSelectedLinkIdx(null);
  };

  const selectLink = (idx: number) => {
    const link = links[idx];
    setSelectedLinkIdx(idx);
    setLinkFrom(link.from);
    setLinkTo(link.to);
    setLinkText(link.text || '');
    setLineStyle(link.lineStyle || 'solid');
    setLineType(link.lineType || 'straight');
  };

  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
    if (selectedLinkIdx === idx) resetLinkTool();
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setLinks(links.filter(l => l.from !== id && l.to !== id));
  };

  const handleNodeDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const initialX = node.x;
    const initialY = node.y;
    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;
      setNodes(prev => prev.map(n => n.id === id ? { ...n, x: initialX + dx, y: initialY + dy } : n));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  };

  const getNodeColorClass = (colorName: string = 'indigo') => {
    switch(colorName) {
      case 'emerald': return 'bg-emerald-600/20 border-emerald-500 text-emerald-100';
      case 'amber': return 'bg-amber-600/20 border-amber-500 text-amber-100';
      case 'rose': return 'bg-rose-600/20 border-rose-500 text-rose-100';
      case 'cyan': return 'bg-cyan-600/20 border-cyan-500 text-cyan-100';
      default: return 'bg-indigo-600/20 border-indigo-500 text-indigo-100';
    }
  };

  const getPathData = (from: MindMapNode, to: MindMapNode, type: 'straight' | 'rounded') => {
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

    if (type === 'straight') {
      return { d: `M ${sx} ${sy} L ${ex} ${ey}`, mx: (sx+ex)/2, my: (sy+ey)/2 };
    } else {
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const dx = ex - sx;
      const dy = ey - sy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = dist * 0.15;
      const cpx = midX - (dy / dist) * offset;
      const cpy = midY + (dx / dist) * offset;
      const t = 0.5;
      const labelX = (1-t)*(1-t)*sx + 2*(1-t)*t*cpx + t*t*ex;
      const labelY = (1-t)*(1-t)*sy + 2*(1-t)*t*cpy + t*t*ey;
      return { d: `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`, mx: labelX, my: labelY };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col lg:flex-row overflow-hidden animate-fade-in">
      {/* Sidebar - Affichage côte à côte des outils de création */}
      <div className="w-full lg:w-[500px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-2xl z-20 overflow-y-auto custom-scrollbar">
        <div className="p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-white">
            <MousePointer2 className="w-4 h-4 text-indigo-400" /> Éditeur de Pensée
          </h2>
          <button onClick={onClose} className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Grille côte à côte pour les outils */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Nouveau Concept */}
          <section className="space-y-3 bg-slate-950/30 p-4 rounded-2xl border border-slate-800 flex flex-col">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" /> 1. Concept
            </h3>
            <input
              type="text"
              value={nodeText}
              onChange={(e) => setNodeText(e.target.value)}
              placeholder="Nom..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:border-indigo-500 outline-none text-white font-bold"
            />
            <div className="flex flex-wrap gap-1">
              {(['round', 'rect', 'circle', 'diamond'] as const).map(type => (
                <button key={type} onClick={() => setNodeType(type)} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-md border transition-all ${nodeType === type ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>{type}</button>
              ))}
            </div>
            <div className="flex gap-2 py-1">
              {(['indigo', 'emerald', 'amber', 'rose', 'cyan'] as const).map(color => (
                <button key={color} onClick={() => setNodeColor(color)} className={`w-5 h-5 rounded-full border-2 ${nodeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'} bg-${colorMap[color].split('-')[0]}-500`} />
              ))}
            </div>
            <button onClick={addNode} disabled={!nodeText.trim()} className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-600/10 active:scale-95 transition-all">Ajouter</button>
          </section>

          {/* 2. Liaison */}
          <section className="space-y-3 bg-slate-950/30 p-4 rounded-2xl border border-indigo-500/20 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" /> {selectedLinkIdx !== null ? 'Modifier' : '2. Flèche'}
              </h3>
              {selectedLinkIdx !== null && (
                <button onClick={resetLinkTool} className="text-[8px] font-black text-rose-500 uppercase flex items-center gap-1">
                   Annuler
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <select value={linkFrom} onChange={(e) => setLinkFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[9px] font-black outline-none text-slate-300">
                <option value="">De...</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.text}</option>)}
              </select>
              <select value={linkTo} onChange={(e) => setLinkTo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[9px] font-black outline-none text-slate-300">
                <option value="">À...</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.text}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => setLineType('straight')} className={`py-1.5 flex items-center justify-center gap-1 text-[8px] font-black uppercase rounded-lg border ${lineType === 'straight' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                <Minus className="w-2.5 h-2.5" /> Droite
              </button>
              <button onClick={() => setLineType('rounded')} className={`py-1.5 flex items-center justify-center gap-1 text-[8px] font-black uppercase rounded-lg border ${lineType === 'rounded' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                <Spline className="w-2.5 h-2.5" /> Courbe
              </button>
            </div>
            
            <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Note..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[9px] outline-none text-slate-400" />
            
            <button 
              onClick={handleLinkAction} 
              disabled={!linkFrom || !linkTo} 
              className={`mt-auto w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${
                selectedLinkIdx !== null ? 'bg-emerald-600 text-white' : 'bg-slate-800 border border-slate-700 text-indigo-400'
              }`}
            >
              {selectedLinkIdx !== null ? 'Valider' : 'Relier'}
            </button>
          </section>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-slate-950 overflow-auto custom-scrollbar pattern-dots">
        <div className="relative min-w-[2400px] min-h-[2400px] p-40" onClick={() => setSelectedLinkIdx(null)}>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
              </marker>
              <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
              </marker>
            </defs>
            {links.map((link, i) => {
              const fromNode = nodes.find(n => n.id === link.from);
              const toNode = nodes.find(n => n.id === link.to);
              if (!fromNode || !toNode) return null;
              
              const path = getPathData(fromNode, toNode, link.lineType || 'straight');
              const isSelected = selectedLinkIdx === i;

              return (
                <g key={i} className="pointer-events-auto cursor-pointer group" onClick={(e) => { e.stopPropagation(); selectLink(i); }}>
                  <path 
                    d={path.d}
                    fill="none"
                    stroke={isSelected ? "#10b981" : "#6366f1"} 
                    strokeWidth={isSelected ? "4" : "2.5"} 
                    strokeDasharray={link.lineStyle === 'dashed' ? "8,8" : "0"}
                    markerEnd={`url(#${isSelected ? 'arrowhead-selected' : 'arrowhead'})`}
                    className="transition-all duration-300"
                  />
                  
                  {/* Label interactif */}
                  <g transform={`translate(${path.mx}, ${path.my})`}>
                    <rect 
                      x={isSelected ? "-45" : "-35"} y="-12" 
                      width={isSelected ? "90" : "70"} height="24" 
                      rx="8" fill="#0f172a" 
                      stroke={isSelected ? "#10b981" : "#4f46e5"} 
                      strokeWidth={isSelected ? "2" : "1"} 
                      className="shadow-2xl" 
                    />
                    <text y="4" fill={isSelected ? "#10b981" : "#818cf8"} fontSize="8" fontWeight="black" textAnchor="middle" className="uppercase tracking-tight select-none">
                      {link.text || 'LIEN'}
                    </text>
                    
                    {/* Bouton supprimer spécifique au lien si sélectionné */}
                    {isSelected && (
                      <g transform="translate(35, -12)" onClick={(e) => { e.stopPropagation(); removeLink(i); }}>
                        <circle r="8" fill="#ef4444" className="hover:scale-110 transition-transform" />
                        <line x1="-3" y1="-3" x2="3" y2="3" stroke="white" strokeWidth="1.5" />
                        <line x1="3" y1="-3" x2="-3" y2="3" stroke="white" strokeWidth="1.5" />
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>

          {nodes.map(node => (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeDrag(node.id, e)}
              onTouchStart={(e) => handleNodeDrag(node.id, e)}
              style={{ left: node.x, top: node.y }}
              className={`absolute w-32 h-[60px] flex items-center justify-center p-4 text-center cursor-move shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all border-2 group select-none z-10 active:scale-95 active:shadow-indigo-500/40 ${
                getNodeColorClass(node.color)
              } ${
                node.type === 'round' ? 'rounded-2xl' :
                node.type === 'rect' ? 'rounded-none' :
                node.type === 'circle' ? 'rounded-full' :
                'rotate-45'
              }`}
            >
              <div className={node.type === 'diamond' ? '-rotate-45' : ''}>
                <span className="text-[10px] font-black uppercase leading-tight text-white drop-shadow-md">
                  {node.text}
                </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} 
                className="absolute -top-3 -right-3 bg-rose-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-90"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-8 text-slate-800 pointer-events-none opacity-20">
              <MousePointer2 className="w-24 h-24" />
              <p className="text-sm font-black uppercase tracking-[0.4em]">Zone de dessin libre</p>
            </div>
          )}
        </div>

        {/* Action Button - Floating */}
        <div className="fixed bottom-24 lg:bottom-12 right-6 lg:right-12 z-30">
           <button
            onClick={() => onSave({ id: initialData?.id || Date.now().toString(), title: "Carte Mentale IA", nodes, links })}
            className="flex items-center gap-4 px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-[0_25px_60px_rgba(16,185,129,0.4)] transition-all active:scale-95 group border border-emerald-400/20"
          >
            <Check className="w-5 h-5 group-hover:scale-125 transition-transform" />
            Enregistrer la Carte
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -12; } }
        .pattern-dots {
          background-image: radial-gradient(rgba(79, 70, 229, 0.1) 1.5px, transparent 1.5px);
          background-size: 40px 40px;
        }
        .truncate-multiline {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default MindMapEditor;
