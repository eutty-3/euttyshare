import React from 'react';
import { ShieldCheck, Upload, Download, Radio, ShieldAlert, Sparkles, Terminal } from 'lucide-react';

interface NavbarProps {
  activeTab: 'upload' | 'receive' | 'radar' | 'guide';
  setActiveTab: (tab: 'upload' | 'receive' | 'radar' | 'guide') => void;
  activeDropsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, activeDropsCount }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Campus Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('upload')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/20 text-white">
              <ShieldCheck className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                  CleanDrop
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  Campus Safe
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Zero-USB Ephemeral File Relay</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Send File</span>
              <span className="md:hidden">Send</span>
            </button>

            <button
              onClick={() => setActiveTab('receive')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'receive'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">Receive (Enter PIN)</span>
              <span className="md:hidden">Receive</span>
            </button>

            <button
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'radar'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden lg:inline">Lab Radar</span>
              {activeDropsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono rounded-full font-bold">
                  {activeDropsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Why flash drives are dangerous in campus computer labs"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="hidden xl:inline">USB Hygiene Guide</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
