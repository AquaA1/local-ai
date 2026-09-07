import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../../types';
import { ThoughtBox } from './ThoughtBox';
import { FormulaCard } from './FormulaCard';
import { CitationBadges } from './CitationBadges';
import { ArtifactCard } from './ArtifactCard';

interface ChatAreaProps {
  messages: ChatMessage[];
  activeSessionTitle: string;
  contextTokensUsed: number;
  contextTokensMax: number;
  isProcessing?: boolean;
  activeDocumentName?: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  activeSessionTitle,
  contextTokensUsed,
  contextTokensMax,
  isProcessing = false,
  activeDocumentName,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-dark-950">
      {/* Active Session Sub-Header */}
      <div className="h-8 bg-dark-900/90 border-b border-dark-700/80 px-4 flex items-center justify-between text-2xs font-mono select-none">
        <div className="flex items-center space-x-2 truncate mr-4">
          <span className="text-neutral-500">Active Session:</span>
          <span className="text-neutral-200 font-semibold truncate">
            {activeSessionTitle}
          </span>
          {activeDocumentName && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-2xs font-mono font-medium truncate max-w-[200px]" title={`Active Document: ${activeDocumentName}`}>
              Scope: @{activeDocumentName}
            </span>
          )}
        </div>

        <div className="shrink-0 flex items-center space-x-1.5 text-neutral-400">
          <span>Context window:</span>
          <span className="text-amber-400 font-semibold">
            {contextTokensUsed.toLocaleString()}
          </span>
          <span className="text-neutral-600">/</span>
          <span>{contextTokensMax.toLocaleString()} tok</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          if (isUser) {
            return (
              <div
                key={msg.id}
                className="bg-dark-900 border border-dark-700/80 rounded-lg p-3.5 shadow-sm"
              >
                <div className="flex items-center justify-between text-2xs font-mono text-neutral-400 mb-1.5 border-b border-dark-750/60 pb-1">
                  <span className="font-semibold text-neutral-300">You</span>
                  <span className="text-neutral-500">{msg.timestamp}</span>
                </div>
                <div className="text-xs text-neutral-200 font-mono leading-relaxed select-text">
                  {msg.text}
                </div>
              </div>
            );
          }

          // Assistant message
          return (
            <div key={msg.id} className="space-y-2 select-text">
              {/* Expandable Reasoning Thought Box */}
              {msg.thought && <ThoughtBox thought={msg.thought} />}

              {/* Main response card */}
              <div className="bg-dark-900/60 border border-dark-750 rounded-lg p-4 font-sans text-xs text-neutral-300 leading-relaxed space-y-3">
                {/* Formatted prose lines */}
                <div className="whitespace-pre-line text-neutral-200 space-y-2">
                  {msg.text.split('\n\n').map((para, idx) => {
                    // Check if it's bullet list
                    if (para.startsWith('•')) {
                      return (
                        <ul key={idx} className="space-y-1 pl-1">
                          {para.split('\n').map((bullet, bIdx) => {
                            const parts = bullet.split(': ');
                            const title = parts[0]?.replace('• ', '');
                            const desc = parts.slice(1).join(': ');
                            return (
                              <li key={bIdx} className="flex items-start space-x-2">
                                <span className="text-amber-500 text-sm leading-none">•</span>
                                <div>
                                  <strong className="text-neutral-200 font-medium font-mono">{title}:</strong>{' '}
                                  <span className="text-neutral-300">{desc}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    }
                    return <p key={idx}>{para}</p>;
                  })}
                </div>

                {/* Mathematical Formula Card */}
                {msg.formula && <FormulaCard formula={msg.formula} />}

                {/* Generated Artifacts (Downloadable XLSX / PDF / DOCX) */}
                {msg.artifacts && msg.artifacts.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.artifacts.map((art) => (
                      <ArtifactCard key={art.artifactId} artifact={art} />
                    ))}
                  </div>
                )}

                {/* Citation grounding chunk accordion */}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <CitationBadges chunks={msg.groundingChunks} />
                )}
              </div>
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-2xs font-mono text-amber-400 bg-dark-900 border border-amber-500/30 p-2.5 rounded-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Agent synthesizing response and grounding equation tokens...</span>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
