import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Flame,
  Copy,
  Check,
  QrCode,
  FileText,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Lock,
  ExternalLink,
  ChevronRight,
  Info,
  Bug
} from 'lucide-react';
import { CleanDrop } from '../types';
import { formatBytes, formatTimeRemaining } from '../utils';

interface UploadViewProps {
  onDropCreated: (drop: CleanDrop) => void;
  onNavigateToReceive: (pin: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onDropCreated, onNavigateToReceive }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [burnAfterDownload, setBurnAfterDownload] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdDrop, setCreatedDrop] = useState<CleanDrop | null>(null);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live countdown for created drop
  useEffect(() => {
    if (!createdDrop) return;
    const updateCountdown = () => {
      const left = Math.max(0, Math.floor((createdDrop.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        setCreatedDrop(null);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [createdDrop]);

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File exceeds maximum allowed campus limit (50MB). Please choose a smaller file.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmitUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMsg(null);

    // Multi-stage visual feedback for security analysis
    setUploadStep('Sanitizing file path and stripping directory traversal...');
    await new Promise((r) => setTimeout(r, 250));

    setUploadStep('Inspecting magic bytes, entropy, and double extensions...');
    await new Promise((r) => setTimeout(r, 250));

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('durationMinutes', durationMinutes.toString());
      formData.append('burnAfterDownload', burnAfterDownload ? 'true' : 'false');
      formData.append('note', note);

      const response = await fetch('/api/drop/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload and secure file.');
      }

      setCreatedDrop(data.drop);
      onDropCreated(data.drop);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      setUploadStep('');
    }
  };

  const copyPinToClipboard = () => {
    if (!createdDrop) return;
    navigator.clipboard.writeText(createdDrop.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyDirectLink = () => {
    if (!createdDrop) return;
    const url = `${window.location.origin}/?pin=${createdDrop.pin}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleManualPurge = async () => {
    if (!createdDrop) return;
    if (!confirm('Permanently destroy this drop immediately from the campus server?')) return;

    try {
      await fetch(`/api/drop/${createdDrop.pin}`, { method: 'DELETE' });
      setCreatedDrop(null);
    } catch (e) {
      console.error('Error deleting drop:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Announcement */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 mb-3 shadow-inner">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero-USB Campus Safe Protocol</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-mono">10m Auto-Wipe Sandbox</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Drop Files Securely, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">No USBs Required</span>
        </h1>
        <p className="mt-2 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          Send documents between your laptop and campus PCs without risking library malware or infected flash drives. Get a quick 4-digit PIN for immediate retrieval.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Security Alert: </span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* SUCCESS SCREEN: PIN DISPLAY & QR CODE */}
      {createdDrop ? (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top highlight glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> File Safely Staged & Inspected
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">Transfer PIN Ready</h2>
              <p className="text-slate-400 text-sm mt-1">
                Enter this 4-digit PIN on any library or lab PC to download instantly.
              </p>
            </div>

            {/* Live Expiration Countdown Pill */}
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <div className="text-[11px] font-mono uppercase text-slate-400">Auto-Wipe Timer</div>
                <div className="text-lg font-mono font-bold text-amber-300">
                  {formatTimeRemaining(secondsLeft)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center">
            {/* BIG PIN CARD */}
            <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 text-center shadow-inner">
              <div className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-2">
                Campus Retrieval PIN
              </div>
              <div className="flex items-center justify-center gap-3 my-4">
                {createdDrop.pin.split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-emerald-500/40 flex items-center justify-center text-4xl sm:text-5xl font-mono font-extrabold text-emerald-300 shadow-lg shadow-emerald-950/50"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={copyPinToClipboard}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-600 transition-all shadow-sm active:scale-95"
                >
                  {copiedPin ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>PIN Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      <span>Copy 4-Digit PIN</span>
                    </>
                  )}
                </button>

                <button
                  onClick={copyDirectLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-medium text-sm border border-emerald-500/30 transition-all shadow-sm active:scale-95"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span>Copy Direct URL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
                <button
                  onClick={() => onNavigateToReceive(createdDrop.pin)}
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Simulate Lab PC Download <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* QR CODE & FILE CARD */}
            <div className="lg:col-span-5 flex flex-col items-center sm:items-start bg-slate-800/40 border border-slate-800 rounded-2xl p-5">
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-cyan-400" /> Scan with Phone or Lab PC
                </span>
                {createdDrop.burnAfterDownload && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Flame className="w-3 h-3" /> Burn on 1st DL
                  </span>
                )}
              </div>

              <div className="w-full flex flex-col sm:flex-row items-center gap-4">
                {createdDrop.qrCodeDataUrl ? (
                  <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                    <img
                      src={createdDrop.qrCodeDataUrl}
                      alt="CleanDrop PIN QR Code"
                      className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <div className="text-sm font-semibold text-white truncate max-w-[200px]" title={createdDrop.originalName}>
                    {createdDrop.sanitizedName}
                  </div>
                  <div className="text-xs text-slate-400">
                    Size: <span className="text-slate-200 font-mono">{formatBytes(createdDrop.size)}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    MIME: <span className="text-slate-200 font-mono text-[11px]">{createdDrop.mimeType}</span>
                  </div>
                  {createdDrop.note && (
                    <div className="text-xs text-slate-300 italic bg-slate-900/60 p-1.5 rounded border border-slate-700/60 mt-1">
                      "{createdDrop.note}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Deep Security Inspection Certificate */}
          <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${createdDrop.securityReport.status === 'clean' ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Multi-Layer Campus Security Audit
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                createdDrop.securityReport.status === 'clean'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                ClamAV & Sandbox: {createdDrop.securityReport.clamAvStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-400">
              <div>
                <div className="text-slate-500 text-[10px]">FILE HASH (SHA-256)</div>
                <div className="font-mono text-slate-300 truncate" title={createdDrop.securityReport.sha256}>
                  {createdDrop.securityReport.sha256.slice(0, 16)}...
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">MAGIC HEADER</div>
                <div className="font-mono text-slate-300">
                  {createdDrop.securityReport.magicHeader || 'Verified Format'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">SHANNON ENTROPY</div>
                <div className="font-mono text-slate-300">
                  {createdDrop.securityReport.entropy} / 8.0
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">STORAGE PERMISSION</div>
                <div className="font-mono text-emerald-400">
                  0600 (Non-Executable)
                </div>
              </div>
            </div>

            {createdDrop.securityReport.warnings.length > 0 && (
              <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300 space-y-1">
                {createdDrop.securityReport.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setCreatedDrop(null);
                setSelectedFile(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Send Another File
            </button>

            <button
              onClick={handleManualPurge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-medium border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Wipe Drop Now (Emergency Burn)
            </button>
          </div>
        </div>
      ) : (
        /* UPLOAD FORM */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmitUpload} className="space-y-6">
            {/* Drag & Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-slate-950/60'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <div className="font-semibold text-white text-lg max-w-md truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    {formatBytes(selectedFile.size)} • Click to choose a different file
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 mb-3 group-hover:text-emerald-400 transition-colors">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="font-semibold text-white text-base sm:text-lg">
                    Drag and drop file here, or <span className="text-emerald-400 underline underline-offset-4">browse</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm">
                    PDFs, documents, lab datasets, code, images, lecture notes up to 50MB. All files undergo automatic antivirus and sandbox scanning.
                  </p>
                </div>
              )}
            </div>

            {/* Transfer Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Expiration selection */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Auto-Wipe TTL
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value={5}>5 Minutes (Quick Sprint)</option>
                  <option value={10}>10 Minutes (Standard Campus MVP)</option>
                  <option value={30}>30 Minutes (Lecture Duration)</option>
                  <option value={60}>60 Minutes (Lab Exam)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  File is permanently unlinked and erased from the server immediately after time expires.
                </p>
              </div>

              {/* Burn After Download Toggle */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" /> Burn After Download
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Self-destruct the file the second it is retrieved on the destination PC.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={burnAfterDownload}
                    onChange={(e) => setBurnAfterDownload(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {burnAfterDownload ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* Note / Lab PC Destination Tag */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Station Tag / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Library Desk #14"
                  maxLength={60}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown on the destination screen to identify the transfer.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                  !selectedFile || isUploading
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold shadow-emerald-500/20 active:scale-[0.99]'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{uploadStep || 'Securing & Scanning File...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Upload & Generate 4-Digit PIN</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Guarantee Banner */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white">Zero Disk Execution</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Files are stored with chmod 0600 in an isolated directory without execution rights.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white">Aggressive Auto-Purge</div>
            <p className="text-xs text-slate-400 mt-0.5">
              The internal daemon unlinks and cleans drops immediately at the 10-minute mark.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white">Heuristic Threat Sniffing</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Double extensions, dangerous executables (.exe, .scr, .vbs), and bad magic headers are intercepted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
