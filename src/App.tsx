/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { UploadView } from './components/UploadView';
import { ReceiveView } from './components/ReceiveView';
import { LabRadarView } from './components/LabRadarView';
import { SecurityGuideView } from './components/SecurityGuideView';
import { GeminiChatView } from './components/GeminiChatView';
import { UserVaultView } from './components/UserVaultView';
import { CampusStats, CleanDrop, ActiveTab } from './types';
import { ShieldCheck, HardDrive, Lock, Terminal, Radio } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [stats, setStats] = useState<CampusStats | null>(null);
  const [targetPin, setTargetPin] = useState<string>('');

  // Check URL query parameters for ?pin=XXXX on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam && pinParam.trim().length === 4) {
      setTargetPin(pinParam.trim());
      setActiveTab('receive');
    }
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleDropCreated = (drop: CleanDrop) => {
    fetchStats();
  };

  const handleSelectPinToReceive = (pin: string) => {
    setTargetPin(pin);
    setActiveTab('receive');
    // Update URL without reloading
    const newUrl = `${window.location.pathname}?pin=${pin}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Campus Subnet Ribbon */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-1.5 text-[11px] font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">CAMPUS SECURE NODE #04</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">10-Min Ephemeral Auto-Wipe Sandbox</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-medium">Zero Disk Execution</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-medium">ClamAV Heuristic Engine</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-amber-300 font-medium hidden md:inline">Gemini Grounded Intelligence</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'receive' && window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        activeDropsCount={stats?.activeDropsCount || 0}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'upload' && (
          <UploadView
            onDropCreated={handleDropCreated}
            onNavigateToReceive={(pin) => handleSelectPinToReceive(pin)}
          />
        )}

        {activeTab === 'receive' && (
          <ReceiveView
            initialPin={targetPin}
            onClearInitialPin={() => {
              setTargetPin('');
              window.history.replaceState({}, '', window.location.pathname);
            }}
          />
        )}

        {activeTab === 'radar' && (
          <LabRadarView
            stats={stats}
            onRefreshStats={fetchStats}
            onSelectPinToReceive={handleSelectPinToReceive}
            onNavigateToSend={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'chat' && <GeminiChatView />}

        {activeTab === 'vault' && (
          <UserVaultView onNavigateToUpload={() => setActiveTab('upload')} />
        )}

        {activeTab === 'guide' && <SecurityGuideView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">Campus CleanDrop Secure File Relay</span>
            <span>—</span>
            <span>Preventing University USB Malware Vectors</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Ephemeral TTL: 10m</span>
            <span>•</span>
            <span>Max Payload: 50MB</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('chat')}
              className="text-cyan-400 hover:underline"
            >
              Ask Sentinel AI
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('guide')}
              className="text-emerald-400 hover:underline"
            >
              Lab Hygiene Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
