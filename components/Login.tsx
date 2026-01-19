
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Brain, Mail, Lock, LogIn, Loader2, UserPlus, ArrowLeft, CheckCircle2, Send } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

const Login: React.FC<Props> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetMessage('');

    try {
      if (isResetting) {
        if (!email) throw new Error('Veuillez entrer votre email.');
        await sendPasswordResetEmail(auth, email);
        setResetMessage('Email de réinitialisation envoyé ! Vérifiez votre boîte mail (et spams).');
      } else if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Identifiants incorrects.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Cet email est déjà utilisé.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email invalide.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessayez plus tard.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/20 mb-4 animate-bounce">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Réviz'IA</h1>
          <p className="text-slate-400 text-sm">
            {isResetting ? "Récupération de compte" : "Apprentissage intelligent & sécurisé."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-inner"
                placeholder="Email"
                required
              />
            </div>
          </div>

          {!isResetting && (
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="Mot de passe"
                  required
                />
              </div>
              {!isRegistering && (
                <div className="flex justify-end px-2">
                  <button
                    type="button"
                    onClick={() => { setIsResetting(true); setError(''); setResetMessage(''); }}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-rose-500 text-center font-bold animate-shake">{error}</p>}
          {resetMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-400 font-bold">{resetMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isResetting && resetMessage !== '')}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isResetting ? (
                  <><Send className="w-5 h-5" /> Envoyer le lien</>
                ) : isRegistering ? (
                  <><UserPlus className="w-5 h-5" /> Créer un compte</>
                ) : (
                  <><LogIn className="w-5 h-5" /> Se connecter</>
                )}
              </>
            )}
          </button>
        </form>

        <div className="space-y-3">
          {isResetting ? (
            <button
              onClick={() => { setIsResetting(false); setError(''); setResetMessage(''); }}
              className="w-full text-center text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Retour à la connexion
            </button>
          ) : (
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="w-full text-center text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
            >
              {isRegistering ? "Déjà un compte ? Connecte-toi" : "Pas encore de compte ? Inscris-toi"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
