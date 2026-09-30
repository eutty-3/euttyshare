import React, { useState, useEffect } from 'react';
import {
  Radio,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Clock,
  HardDrive,
  Trash2,
  RefreshCw,
  Sparkles,
  Download,
  AlertCircle,
  Cpu,
  Layers,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { ActiveDropSummary, CampusStats } from '../types';
import { formatBytes, formatTimeRemaining } from '../utils';

interface LabRadarViewProps {
  stats: CampusStats | null;
  onRefreshStats: () => void;
  onSelectPinToReceive: (pin: string) => void;
}

export const LabRadarView: React.FC<LabRadarViewProps> = ({
  stats,
  onRefreshStats,
  onSelectPinToReceive,
}) => {
  const [activeDrops, setActiveDrops] = useState<ActiveDropSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchActiveDrops = async () => {
    try {
      const res = await fetch('/api/drops/active');
      const data = await res.json();
      setActiveDrops(data.drops || []);
    } catch (e) {
      console.error('Failed to fetch active drops', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveDrops();
    const interval = setInterval(() => {
      fetchActiveDrops();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedDemos = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification('Sample campus documents staged for quick testing!');
        fetchActiveDrops();
        onRefreshStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handlePurgeExpired = async () => {
    try {
      await fetch('/api/drops/purge-expired', { method: 'POST' });
      fetchActiveDrops();
      onRefreshStats();
      setNotification('Purge sweep executed. Expired files scrubbed.');
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWipeDrop = async (pin: string) => {
    try {
      await fetch(`/api/drop/${pin}`, { method: 'DELETE' });
      fetchActiveDrops();
      onRefreshStats();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 mb-2 font-mono">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Campus Network Subnet Monitor</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">Air-Gap Protection Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lab Radar & Active File Drops
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry of files currently buffered in campus RAM/isolated disk waiting for pickup.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedDemos}
            disabled={isSeeding}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all inline-flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSeeding ? 'Seeding...' : 'Load Sample Drops'}</span>
          </button>

          <button
            onClick={handlePurgeExpired}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all inline-flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Force Purge Sweep</span>
          </button>

          <button
            onClick={() => {
              fetchActiveDrops();
              onRefreshStats();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notification && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>USBs AVOIDED</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats ? stats.usbsAvoided.toLocaleString() : '142'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium">
            Zero physical flash drives infected
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>DATA SANITIZED</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats ? formatBytes(stats.totalBytesCleaned) : '1.8 GB'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Over {stats ? stats.totalTransfers : 142} safe drops
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>THREATS BLOCKED</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
            {stats ? stats.threatsIntercepted : '19'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Worms & disguised .exe blocked
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>EXPIRATIONS PURGED</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">
            {stats ? stats.autoPurgedCount : '138'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Strict 10-minute wipe cycle
          </div>
        </div>
      </div>

      {/* Active Drops Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">In-Flight Drops</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {activeDrops.length} active
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Refreshes automatically every 4s
          </span>
        </div>

        {activeDrops.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-white font-semibold text-base">No active drops in campus transit</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1 mb-4">
              All previous drops have been automatically purged or downloaded. Upload a file or seed sample drops.
            </p>
            <button
              onClick={handleSeedDemos}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Load Sample Lab Documents
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-slate-400 text-xs font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">PIN Code</th>
                  <th className="px-6 py-3.5">File Name & Info</th>
                  <th className="px-6 py-3.5">Security Status</th>
                  <th className="px-6 py-3.5">Time Remaining</th>
                  <th className="px-6 py-3.5 text-right">Lab Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {activeDrops.map((drop) => {
                  const percentLeft = Math.min(100, Math.max(0, (drop.secondsRemaining / 600) * 100));

                  return (
                    <tr key={drop.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* PIN with quick-receive button */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => onSelectPinToReceive(drop.pin)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-base border border-emerald-500/30 transition-colors inline-flex items-center gap-1.5"
                          title="Click to load in Receive view"
                        >
                          <span>{drop.pin}</span>
                        </button>
                      </td>

                      {/* File Details */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white max-w-xs truncate" title={drop.sanitizedName}>
                          {drop.sanitizedName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{formatBytes(drop.size)}</span>
                          <span>•</span>
                          <span>{drop.uploaderIpMasked}</span>
                          {drop.burnAfterDownload && (
                            <span className="inline-flex items-center gap-0.5 text-rose-400 text-[10px]">
                              <Flame className="w-3 h-3" /> Burn on DL
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Security Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono ${
                            drop.securityStatus === 'clean'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {drop.securityStatus === 'clean' ? 'Passed (0 Threats)' : 'Quarantined'}
                        </span>
                      </td>

                      {/* Remaining Timer & Progress Bar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-mono font-bold text-amber-300 text-xs">
                            {formatTimeRemaining(drop.secondsRemaining)}
                          </span>
                        </div>
                        <div className="w-28 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${percentLeft}%` }}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => onSelectPinToReceive(drop.pin)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Receive
                        </button>

                        <button
                          onClick={() => handleWipeDrop(drop.pin)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Manually purge file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campus Lab Security Architecture Note */}
      <div className="mt-8 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-emerald-400" /> Campus CleanDrop Sandbox Specifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-300 font-semibold block mb-0.5">Directory Traversal Defense:</span>
            File names stripped of control characters, `../`, and Windows drive letters. Stored on disk under random UUIDs with no original extensions.
          </div>
          <div>
            <span className="text-slate-300 font-semibold block mb-0.5">No Disk Execution (0600):</span>
            Upload directory is isolated from the web server document root with strict read/write owner-only permissions.
          </div>
          <div>
            <span className="text-slate-300 font-semibold block mb-0.5">Aggressive Ephemerality:</span>
            Background daemon scans the queue every 5 seconds to permanently delete expired payload bytes without residual cache.
          </div>
        </div>
      </div>
    </div>
  );
};
