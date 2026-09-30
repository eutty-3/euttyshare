import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  LogOut,
  LogIn,
  ShieldCheck,
  Clock,
  Download,
  Copy,
  Check,
  Trash2,
  FileText,
  AlertCircle,
  ExternalLink,
  Flame,
  ShieldAlert,
  Sparkles,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatBytes } from '../utils';

interface VaultDrop {
  id: string;
  pin: string;
  sanitizedName: string;
  size: number;
  mimeType: string;
  sha256?: string;
  burnAfterDownload?: boolean;
  createdAt?: any;
  status: string;
}

interface UserVaultViewProps {
  onNavigateToUpload: () => void;
}

export const UserVaultView: React.FC<UserVaultViewProps> = ({ onNavigateToUpload }) => {
  const { user, loading, loginGoogle, loginGuest, logoutUser } = useAuth();
  const [drops, setDrops] = useState<VaultDrop[]>([]);
  const [loadingDrops, setLoadingDrops] = useState<boolean>(true);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDrops([]);
      setLoadingDrops(false);
      return;
    }

    setLoadingDrops(true);
    // Listen to user's drops from Firestore
    try {
      const q = query(
        collection(db, 'user_drops'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: VaultDrop[] = [];
          snapshot.forEach((docSnap) => {
            fetched.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<VaultDrop, 'id'>),
            });
          });
          setDrops(fetched);
          setLoadingDrops(false);
        },
        (err) => {
          console.warn('Firestore query notice:', err);
          setLoadingDrops(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setLoadingDrops(false);
    }
  }, [user]);

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const handleDeleteDrop = async (id: string, pin: string) => {
    try {
      // Delete from server memory/disk
      await fetch(`/api/drop/${pin}`, { method: 'DELETE' });
      // Delete from Firestore
      await deleteDoc(doc(db, 'user_drops', id));
    } catch (err) {
      console.error('Failed to delete drop:', err);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await loginGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in was interrupted. Please try again.');
    }
  };

  const handleGuestLogin = async () => {
    setAuthError(null);
    try {
      await loginGuest();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate guest kiosk.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      {/* Auth Account Profile Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-14 h-14 rounded-2xl border-2 border-emerald-500/40 object-cover shadow-lg"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 shadow-inner">
                <UserIcon className="w-7 h-7 text-emerald-400" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {user ? user.displayName || (user.isAnonymous ? 'Lab Station Guest' : 'Campus User') : 'Student & Staff Account'}
                </h2>
                {user && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {user.isAnonymous ? 'Kiosk Mode' : 'Verified'}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {user ? user.email || 'Temporary guest session for library kiosk' : 'Sign in with Google to sync your transfer history and security audit logs.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={logoutUser}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google Sign In</span>
                </button>
                <button
                  onClick={handleGuestLogin}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
                >
                  Guest Kiosk
                </button>
              </div>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* Firestore Persistent Drops Vault */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Your Transfer Vault</h3>
              <p className="text-xs text-slate-400">
                Persistent Firestore audit logs of your active and past transfers.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Drop</span>
          </button>
        </div>

        {!user ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <Lock className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">Sign In to View Your Transfer History</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Connecting your Google account preserves an encrypted history of all files you stage and send across campus computer labs.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all"
            >
              Sign In with Google
            </button>
          </div>
        ) : loadingDrops ? (
          <div className="p-8 text-center text-slate-400 text-xs font-mono animate-pulse">
            Querying Firestore documents...
          </div>
        ) : drops.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">No Drops in Vault Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Whenever you stage files for safe transfer, their 4-digit PINs and checksums are stored here for easy tracking.
            </p>
            <button
              onClick={onNavigateToUpload}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs hover:bg-emerald-500/30 transition-all"
            >
              Send your first file now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {drops.map((drop) => (
              <div
                key={drop.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex-shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm truncate max-w-xs sm:max-w-md">
                        {drop.sanitizedName}
                      </span>
                      {drop.burnAfterDownload && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" /> Burn
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                      <span>{formatBytes(drop.size)}</span>
                      <span>•</span>
                      <span>PIN: <strong className="text-white tracking-widest text-sm">{drop.pin}</strong></span>
                      {drop.sha256 && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[120px]" title={drop.sha256}>
                            SHA: {drop.sha256.slice(0, 8)}...
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleCopyPin(drop.pin)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all"
                    title="Copy 4-digit PIN"
                  >
                    {copiedPin === drop.pin ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy PIN</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/api/drop/download/${drop.pin}`}
                    className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Direct Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  <button
                    onClick={() => handleDeleteDrop(drop.id, drop.pin)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all"
                    title="Purge drop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
