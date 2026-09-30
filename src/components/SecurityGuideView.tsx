import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HardDrive,
  Bug,
  Lock,
  Flame,
  AlertTriangle,
  FileCode,
  Radio,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export const SecurityGuideView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 mb-3 font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>University Lab Threat Advisory</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Why USB Drives Spread Malware Across Campus
        </h1>
        <p className="mt-2 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          Understanding the hidden risks of physical thumb drives in computer labs and how CleanDrop provides an air-gap alternative.
        </p>
      </div>

      {/* Comparison: Physical USB vs CleanDrop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Physical USB Column */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Physical USB Flash Drives</h3>
              <p className="text-xs text-rose-400 font-mono">High Risk Vector in Public Labs</p>
            </div>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>LNK Shortcut Trojans:</strong> Automatically hides genuine student folders and replaces them with malicious shortcut scripts.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Cross-Workstation Infection:</strong> One infected laptop infects the USB drive, which subsequently infects 20+ library terminals.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Hardware Micro-controller Exploits (BadUSB):</strong> Reprogrammed USB controller chips can emulate keyboards to type terminal commands.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Permanent Residue:</strong> Files left on forgotten USB drives can be inspected or altered by the next student using the machine.
              </span>
            </li>
          </ul>
        </div>

        {/* CleanDrop Column */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">CleanDrop Web Relay</h3>
              <p className="text-xs text-emerald-400 font-mono">Zero-Contact Ephemeral Air-Gap</p>
            </div>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero Physical Contact:</strong> Transfer files through high-speed local HTTP requests without plugging anything into USB ports.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Multi-Layer Antivirus Scanning:</strong> Pre-execution analysis checks magic headers, byte entropy, and double extensions (.pdf.exe).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>10-Minute Auto-Purge:</strong> Expired payloads are automatically unlinked and scrubbed by the background server daemon.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Non-Executable Storage (0600):</strong> Uploaded payloads are saved with zero execution privileges to prevent server-side exploitation.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Anatomy of USB Attacks Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Bug className="w-5 h-5 text-amber-400" /> Common Campus USB Attack Vectors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-rose-400 font-bold text-sm mb-1">1. The Shortcut Worm</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Worms like VBS/Dorkbot alter folder attributes to hidden/system and create matching .lnk shortcuts that execute malicious scripts when double-clicked.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-rose-400 font-bold text-sm mb-1">2. Double-Extension Trick</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Files titled <code>Assignment_Draft.pdf.exe</code> rely on Windows default setting to hide known file extensions, duping students into launching an executable.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-rose-400 font-bold text-sm mb-1">3. Lab Terminal Keyloggers</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unattended flash drives often spread credential grabbers that log university portal passwords and institutional email accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Student Best Practices */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Best Practices for Computer Labs
        </h2>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              1
            </span>
            <div>
              <span className="font-semibold text-white">Always use CleanDrop for lab prints & submission transfers</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Drop your PDF or document on your personal laptop, note the 4-digit PIN, and type it into the library printer PC.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              2
            </span>
            <div>
              <span className="font-semibold text-white">Enable "Burn After Download" for confidential exams or grades</span>
              <p className="text-xs text-slate-400 mt-0.5">
                If transferring sensitive research datasets or grade sheets, toggle self-destruct so the drop leaves no traces once downloaded.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              3
            </span>
            <div>
              <span className="font-semibold text-white">Never plug in "lost" flash drives found in lecture halls</span>
              <p className="text-xs text-slate-400 mt-0.5">
                USB baiting is a classic social engineering attack. Turn found thumb drives over to campus IT or lost & found without plugging them in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
