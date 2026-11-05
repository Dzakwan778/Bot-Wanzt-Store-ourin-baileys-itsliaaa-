import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { LogEntry } from '../../types/dashboard.types';

interface LiveTerminalProps {
  logs: LogEntry[];
  status?: string;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs, status = 'idle' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs
      .map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return { label: 'Connected', dotClass: 'bg-emerald-400' };
      case 'waiting_code':
      case 'code_ready':
        return { label: 'Pairing Ready', dotClass: 'bg-sky-400' };
      case 'connecting':
        return { label: 'Connecting...', dotClass: 'bg-amber-400' };
      case 'error':
        return { label: 'Error', dotClass: 'bg-rose-400' };
      default:
        return { label: 'Ready to link', dotClass: 'bg-sky-400' };
    }
  };

  const currentStatus = getStatusText();

  return (
    <div className="space-y-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[340px] sm:h-[400px] md:h-[480px]">
        {/* Terminal Header */}
        <div className="bg-slate-900/95 text-slate-200 px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-800 shrink-0 gap-2">
          {/* Left: Window Controls + Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block"></span>
            </div>
            <div className="h-3.5 w-px bg-slate-800 shrink-0"></div>
            <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5 truncate">
              <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-semibold tracking-tight">Live Socket Stream</span>
            </span>
          </div>

          {/* Right: Adaptive Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] sm:text-[11px] font-mono text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline text-slate-400">Port: 3000 •</span>
              <span>WS Active</span>
            </div>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 bg-slate-950 p-3.5 sm:p-4 font-mono text-xs overflow-y-auto space-y-2 selection:bg-slate-800 scrollbar-none">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-16 sm:py-20 text-center space-y-2.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center mx-auto text-slate-600">
                <Terminal className="w-5 h-5 text-slate-500" />
              </div>
              <div className="font-medium text-slate-400 text-xs sm:text-sm">Belum ada log soket aktif.</div>
              <div className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed not-italic">
                Masukkan nomor target pada form pairing lalu klik &quot;Minta Kode Pairing&quot;.
              </div>
            </div>
          ) : (
            logs.map((log) => {
              let colorClass = 'text-slate-300';
              let badgeBg = '';
              if (log.type === 'success') colorClass = 'text-emerald-400 font-semibold';
              if (log.type === 'code') {
                colorClass = 'text-sky-300 font-bold';
                badgeBg = 'bg-sky-950/60 p-1.5 rounded-lg border border-sky-800/60';
              }
              if (log.type === 'warning') colorClass = 'text-amber-400';
              if (log.type === 'error') colorClass = 'text-rose-400 font-semibold';

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 leading-relaxed text-[11px] sm:text-xs ${badgeBg}`}
                >
                  <span className="text-slate-500 text-[10px] sm:text-[11px] shrink-0 select-none pt-0.5">
                    [{log.time}]
                  </span>
                  <span className={`${colorClass} break-words flex-1 min-w-0`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-slate-900/90 px-3.5 sm:px-4 py-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-500">
              {logs.length} event{logs.length !== 1 ? 's' : ''}
            </span>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleCopyLogs}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin Log</span>
                  </>
                )}
              </button>
            )}
          </div>

          <span className="flex items-center gap-1.5 text-slate-300 font-mono text-[10px] sm:text-xs">
            <span className={`w-2 h-2 rounded-full ${currentStatus.dotClass} animate-pulse`}></span>
            <span>{currentStatus.label}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
