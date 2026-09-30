import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Key,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Flame,
  FileText,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import { CleanDrop } from '../types';
import { formatBytes, formatTimeRemaining } from '../utils';

interface ReceiveViewProps {
  initialPin?: string;
  onClearInitialPin?: () => void;
}

export const ReceiveView: React.FC<ReceiveViewProps> = ({ initialPin, onClearInitialPin }) => {
  const [pin, setPin] = useState<string>(initialPin || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dropData, setDropData] = useState<CleanDrop | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // If initialPin provided, populate and fetch
  useEffect(() => {
    if (initialPin && initialPin.length === 4) {
      setPin(initialPin);
      fetchDrop(initialPin);
    }
  }, [initialPin]);

  // Live countdown timer for active drop
  useEffect(() => {
    if (!dropData) return;

    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((dropData.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(left);
      if (left <= 0) {
        setDropData(null);
        setErrorMsg('This secure file drop has exceeded its 10-minute lifetime and was automatically unlinked and wiped from campus storage.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dropData]);

  const fetchDrop = async (lookupPin: string) => {
    if (lookupPin.length < 4) return;
    setIsLoading(true);
    setErrorMsg(null);
    setHasDownloaded(false);

    try {
      const response = await fetch(`/api/drop/info/${lookupPin}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Drop not found or expired.');
      }

      setDropData(data);
      setSecondsRemaining(data.secondsRemaining || 0);
    } catch (err: any) {
      setDropData(null);
      setErrorMsg(err.message || 'Unable to retrieve file. It may have expired or was burned.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of 4 digits
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 4);
      if (cleanDigits.length > 0) {
        setPin(cleanDigits);
        if (cleanDigits.length === 4) {
          fetchDrop(cleanDigits);
          inputRefs[3].current?.focus();
        }
      }
      return;
    }

    const cleanDigit = value.replace(/\D/g, '');
    const pinArray = pin.padEnd(4, ' ').split('');
    pinArray[index] = cleanDigit || ' ';
    const newPin = pinArray.join('').trimEnd();
    setPin(newPin);

    // Auto-advance
    if (cleanDigit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-trigger lookup on 4 digits
    if (newPin.replace(/\s/g, '').length === 4) {
      fetchDrop(newPin.replace(/\s/g, ''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter' && pin.trim().length === 4) {
      fetchDrop(pin.trim());
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      setPin(pasted);
      if (pasted.length === 4) {
        fetchDrop(pasted);
      }
    }
  };

  const handleDownload = () => {
    if (!dropData) return;
    setHasDownloaded(true);

    // Trigger direct browser download
    const downloadUrl = `/api/drop/download/${dropData.pin}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = dropData.sanitizedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // If burn after download is active, inform user and clear
    if (dropData.burnAfterDownload) {
      setTimeout(() => {
        setDropData(null);
        setErrorMsg('File burned! In accordance with the self-destruct setting, this file was purged immediately upon download.');
      }, 1500);
    }
  };

  const handleEmergencyWipe = async () => {
    if (!dropData) return;
    if (!confirm('Permanently destroy this drop from campus servers now?')) return;

    try {
      await fetch(`/api/drop/${dropData.pin}`, { method: 'DELETE' });
      setDropData(null);
      setErrorMsg('File drop manually destroyed.');
    } catch (e) {
      console.error('Error deleting drop:', e);
    }
  };

  const clearPin = () => {
    setPin('');
    setDropData(null);
    setErrorMsg(null);
    if (onClearInitialPin) onClearInitialPin();
    inputRefs[0].current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 mb-3 shadow-inner">
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>Campus PC File Pickup</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-mono">No USB Needed</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Retrieve File with <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">4-Digit PIN</span>
        </h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Type the 4-digit code generated on your sender laptop or phone to securely download your files to this workstation.
        </p>
      </div>

      {/* PIN Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-8">
        <label className="block text-xs uppercase font-mono tracking-wider text-slate-400 text-center mb-4">
          Enter 4-Digit PIN Code
        </label>

        {/* Segmented Digit Inputs */}
        <div className="flex justify-center items-center gap-3 sm:gap-4 my-2" onPaste={handlePaste}>
          {[0, 1, 2, 3].map((idx) => {
            const digit = pin[idx] || '';
            return (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit.trim()}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-14 h-18 sm:w-18 sm:h-22 rounded-2xl bg-slate-950 border-2 border-slate-700 text-center text-3xl sm:text-4xl font-mono font-bold text-white focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 shadow-inner transition-all"
              />
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => fetchDrop(pin.trim())}
            disabled={pin.trim().length !== 4 || isLoading}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all shadow-md ${
              pin.trim().length !== 4 || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Locating Drop...</span>
              </>
            ) : (
              <>
                <span>Retrieve File</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {pin.length > 0 && (
            <button
              onClick={clearPin}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ERROR NOTICE */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-white">Transfer Status: </span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* DROP FOUND & READY FOR SECURE DOWNLOAD */}
      {dropData && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top highlight glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-emerald-400" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Drop Verified Active
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Ready for Clean Download
              </h2>
            </div>

            {/* Remaining TTL countdown */}
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Time Until Wipe</div>
                <div className="text-base font-mono font-bold text-amber-300">
                  {formatTimeRemaining(secondsRemaining)}
                </div>
              </div>
            </div>
          </div>

          {/* File Card info */}
          <div className="my-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <FileCheck className="w-8 h-8" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-base sm:text-lg font-bold text-white truncate" title={dropData.originalName}>
                {dropData.sanitizedName}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Size: <strong className="text-slate-200 font-mono">{formatBytes(dropData.size)}</strong></span>
                <span>•</span>
                <span>MIME: <strong className="text-slate-200 font-mono text-[11px]">{dropData.mimeType}</strong></span>
                <span>•</span>
                <span>PIN: <strong className="text-emerald-400 font-mono">{dropData.pin}</strong></span>
              </div>
              {dropData.note && (
                <div className="mt-2 text-xs text-slate-300 italic bg-slate-900/80 p-2 rounded border border-slate-800">
                  Note: "{dropData.note}"
                </div>
              )}
            </div>
          </div>

          {/* Self-Destruct Warning if Enabled */}
          {dropData.burnAfterDownload && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                <strong>Self-Destruct Active:</strong> This file will be wiped immediately from campus memory and unlinked as soon as you finish downloading it.
              </span>
            </div>
          )}

          {/* Security & Antivirus Inspection Badge */}
          <div className="mb-6 p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-mono uppercase font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Antivirus & Sandbox Inspection
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                dropData.securityReport.status === 'clean'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {dropData.securityReport.status === 'clean' ? 'CLEAN & SAFE' : 'QUARANTINED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-400">
              <div>
                <span className="text-[10px] text-slate-500 block">SHA-256 CHECKSUM</span>
                <span className="font-mono text-slate-300 text-[11px] truncate block" title={dropData.securityReport.sha256}>
                  {dropData.securityReport.sha256.slice(0, 18)}...
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">MAGIC HEADER FORMAT</span>
                <span className="font-mono text-slate-300 text-[11px] block">
                  {dropData.securityReport.magicHeader}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">THREATS INTERCEPTED</span>
                <span className="font-mono text-emerald-400 text-[11px] block">
                  {dropData.securityReport.threats.length === 0 ? '0 Threat Signatures' : `${dropData.securityReport.threats.length} Threats`}
                </span>
              </div>
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleDownload}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-xl font-extrabold text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Download File to Lab Workstation</span>
            </button>

            <button
              onClick={handleEmergencyWipe}
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:text-rose-300 text-slate-400 text-sm font-medium border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              title="Manually purge this file right now"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe Now</span>
            </button>
          </div>

          {hasDownloaded && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Download initiated! Check your browser's download directory.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
