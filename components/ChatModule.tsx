
import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Sparkles, Loader2, User as UserIcon, Bot, Link as LinkIcon, PlusCircle, Maximize2, FileText, Check } from 'lucide-react';
import { tutorChat, integrateToRevisionCard } from '../services/geminiService';
import { Document } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  source?: 'web' | 'doc';
  grounding?: any[];
  isSuccinct?: boolean;
}

interface Props {
  selectedDoc: Document | null;
  onXpGain: (amount: number) => void;
  onUpdateDocument?: (doc: Document) => void;
}

const ChatModule: React.FC<Props> = ({ selectedDoc, onXpGain, onUpdateDocument }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: selectedDoc 
        ? `Bonjour ! Je suis ton tuteur. Je connais bien ton cours sur **${selectedDoc.title}**. Pose-moi n'importe quelle question !` 
        : "Bonjour ! Je suis ton assistant de révision. Comment puis-je t'aider aujourd'hui ? Tu peux charger un document pour que mes réponses soient plus précises." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [integrating, setIntegrating] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string, mode: 'succinct' | 'detailed' = 'succinct', searchOverride?: boolean) => {
    if (e) e.preventDefault();
    const query = customPrompt || input.trim();
    if (!query || loading) return;

    if (!customPrompt) setInput('');
    if (!customPrompt) setMessages(prev => [...prev, { role: 'user', text: query }]);
    
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const context = selectedDoc 
        ? `Titre: ${selectedDoc.title}\nRésumé: ${selectedDoc.summary}\nPoints clés: ${selectedDoc.keyPoints?.join(', ')}`
        : "Pas de document spécifique chargé.";

      const response = await tutorChat(history, query, context, mode, searchOverride ?? useSearch);
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text, 
        source: response.source as any,
        grounding: response.grounding,
        isSuccinct: mode === 'succinct'
      }]);
      
      onXpGain(customPrompt ? 5 : 10);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Oups, j'ai eu un petit problème technique. Peux-tu reformuler ?" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrate = async (text: string, msgId: number) => {
    if (!selectedDoc || !onUpdateDocument || integrating) return;
    setIntegrating(true);
    try {
      const updatedDoc = await integrateToRevisionCard(selectedDoc, text);
      onUpdateDocument({ ...updatedDoc, id: selectedDoc.id, date: selectedDoc.date });
      onXpGain(30);
      setJustAdded(msgId.toString());
      setTimeout(() => setJustAdded(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIntegrating(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden">
      {/* Context Bar */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-2xl mb-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`p-1.5 rounded-lg ${selectedDoc ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-500'}`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Source active</p>
            <p className="text-xs font-black truncate text-slate-200 uppercase tracking-tight">
              {selectedDoc ? selectedDoc.title : "Connaissances générales"}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setUseSearch(!useSearch)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
            useSearch 
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
              : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}
        >
          <Globe className={`w-3.5 h-3.5 ${useSearch ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-tight">Recherche Web</span>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-6 px-1 pb-4 scroll-smooth custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xl ${
                m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800 border border-slate-700'
              }`}>
                {m.role === 'user' ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className="space-y-2">
                <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-xl border ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' 
                    : 'bg-slate-800 border-slate-700 text-slate-200 rounded-tl-none'
                }`}>
                  {/* Source Badge */}
                  {m.role === 'model' && m.source && (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md mb-2 text-[9px] font-black uppercase tracking-widest ${
                      m.source === 'doc' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {m.source === 'doc' ? <FileText className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      Source : {m.source === 'doc' ? 'Document' : 'Internet'}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{m.text}</div>
                  
                  {m.grounding && m.grounding.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-700 space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest">
                        <LinkIcon className="w-3 h-3 text-cyan-500" /> Liens utiles
                      </p>
                      <div className="grid gap-1">
                        {m.grounding.map((chunk, idx) => (
                          chunk.web && (
                            <a 
                              key={idx} 
                              href={chunk.web.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors truncate pl-2 border-l border-cyan-500/30"
                            >
                              {chunk.web.title || chunk.web.uri}
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Succinct Model Responses */}
                {m.role === 'model' && m.isSuccinct && i === messages.length - 1 && !loading && (
                  <div className="flex flex-wrap gap-2 animate-fade-in pl-1">
                    <button 
                      onClick={() => handleSend(undefined, "Peux-tu approfondir ce point à partir de mon document ?", 'detailed', false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-tight text-indigo-400 transition-all active:scale-95"
                    >
                      <FileText className="w-3 h-3" />
                      Approfondir (Document)
                    </button>
                    <button 
                      onClick={() => handleSend(undefined, "Peux-tu approfondir ce point avec des recherches sur Internet ?", 'detailed', true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-tight text-cyan-400 transition-all active:scale-95"
                    >
                      <Globe className="w-3 h-3" />
                      Approfondir (Web)
                    </button>
                    {selectedDoc && (
                      <button 
                        onClick={() => handleIntegrate(m.text, i)}
                        disabled={integrating || justAdded === i.toString()}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 ${
                          justAdded === i.toString() 
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                            : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'
                        }`}
                      >
                        {integrating ? <Loader2 className="w-3 h-3 animate-spin" /> : (justAdded === i.toString() ? <Check className="w-3 h-3" /> : <PlusCircle className="w-3 h-3" />)}
                        {justAdded === i.toString() ? 'Ajouté !' : 'Ajouter à ma fiche'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
             <div className="flex gap-3 max-w-[85%]">
              <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
              <div className="p-4 bg-slate-800 border border-slate-700 text-slate-400 rounded-3xl rounded-tl-none text-xs italic shadow-lg">
                Réflexion en cours...
              </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={(e) => handleSend(e)} className="relative py-4 shrink-0 bg-slate-900 z-10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedDoc ? "Une question sur ce cours ? (Réponse courte)" : "Pose une question..."}
          className="w-full py-4.5 pl-6 pr-16 bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm text-white placeholder:text-slate-500 shadow-inner"
        />
        <button 
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatModule;
