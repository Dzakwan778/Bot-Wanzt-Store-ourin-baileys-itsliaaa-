import React from 'react';
import { Terminal } from 'lucide-react';
import { LogEntry } from '../../types/dashboard.types';

interface LiveTerminalProps {
  logs: LogEntry[];
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Header */}
        <div className="bg-slate-900 text-slate-200 px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            </div>
            <span className="text-xs font-mono text-slate-300 ml-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" /> Live Socket Stream
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Port: 3000 • WebSocket Active
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-2 selection:bg-slate-800">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-20 text-center space-y-2">
              <Terminal className="w-8 h-8 mx-auto text-slate-700" />
              <div>Belum ada log soket aktif.</div>
              <div className="text-[11px] text-slate-600">
                Masukkan nomor target di sebelah kiri lalu klik &quot;Minta Kode Pairing&quot;.
              </div>
            </div>
          ) : (
            logs.map((log) => {
              let colorClass = 'text-slate-300';
              if (log.type === 'success') colorClass = 'text-emerald-400 font-semibold';
              if (log.type === 'code') colorClass = 'text-sky-300 font-bold bg-sky-950/60 p-1 rounded border border-sky-800/50';
              if (log.type === 'warning') colorClass = 'text-amber-400';
              if (log.type === 'error') colorClass = 'text-rose-400 font-semibold';

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                  <span className={`${colorClass} break-all`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-end shrink-0">
          <span className="flex items-center gap-1.5 text-sky-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            Ready to link
          </span>
        </div>
      </div>
    </div>
  );
};
