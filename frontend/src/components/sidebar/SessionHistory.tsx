import React from 'react';
import { History, Plus, MessageSquare } from 'lucide-react';
import { SessionHistoryItem } from '../../types';

interface SessionHistoryProps {
  sessions: SessionHistoryItem[];
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  sessions,
  onSelectSession,
  onNewSession,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 text-neutral-400">
        <div className="flex items-center space-x-1.5">
          <History className="w-3 h-3 text-neutral-400" />
          <span className="text-2xs font-semibold uppercase tracking-wider font-mono text-neutral-300">
            History ({sessions.length})
          </span>
        </div>

        <button
          onClick={onNewSession}
          title="Start new query session"
          className="w-4 h-4 rounded hover:bg-dark-750 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Session list or clean empty state */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-neutral-500 font-mono text-xs select-none">
            <MessageSquare className="w-6 h-6 mb-2 text-neutral-700 stroke-[1.5]" />
            <span className="font-medium text-neutral-400 text-xs">No recent queries</span>
            <span className="text-2xs text-neutral-600 mt-1 max-w-[170px] leading-relaxed">
              Queries submitted in this session will appear here
            </span>
          </div>
        ) : (
          sessions.map((session) => {
            const isRag = session.tag === 'RAG';
            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-2.5 py-2 rounded transition-all group relative border ${
                  session.active
                    ? 'bg-dark-800 border-amber-500/40 text-neutral-100 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:bg-dark-800/60 hover:text-neutral-200'
                }`}
              >
                {/* Title & Time */}
                <div className="flex items-center justify-between text-xs font-mono mb-0.5">
                  <span className="font-medium truncate mr-2 group-hover:text-neutral-200">
                    {session.title}
                  </span>
                  <span className="text-2xs text-neutral-500 shrink-0">
                    {session.time}
                  </span>
                </div>

                {/* Subtitle tag */}
                <div className="flex items-center space-x-1.5 text-2xs font-mono text-neutral-500 truncate">
                  <span
                    className={`font-semibold ${
                      isRag ? 'text-amber-500' : 'text-neutral-400'
                    }`}
                  >
                    [{session.tag}]
                  </span>
                  <span className="truncate group-hover:text-neutral-400">
                    {session.subtitle}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Embedding Engine Status */}
      <div className="px-3 py-2 border-t border-dark-700/80 bg-dark-900/60 flex items-center justify-between text-2xs font-mono">
        <span className="text-neutral-500 truncate mr-2">
          Nomic-Embed-v1.5 (768d)
        </span>
        <span className="text-emerald-400 font-medium shrink-0 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span>Ready</span>
        </span>
      </div>
    </div>
  );
};
