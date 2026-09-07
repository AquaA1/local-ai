import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Bookmark } from 'lucide-react';
import { GroundingChunk } from '../../types';

interface CitationBadgesProps {
  chunks: GroundingChunk[];
}

export const CitationBadges: React.FC<CitationBadgesProps> = ({ chunks }) => {
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);

  if (!chunks || chunks.length === 0) return null;

  const toggleChunk = (id: string) => {
    setExpandedChunkId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mt-4 pt-3 border-t border-dark-750/70">
      <div className="text-2xs font-semibold uppercase tracking-wider font-mono text-neutral-400 mb-2">
        Grounding Source Chunks
      </div>

      <div className="space-y-1.5">
        {chunks.map((chunk) => {
          const isExpanded = expandedChunkId === chunk.id;
          return (
            <div
              key={chunk.id}
              className="border border-dark-700/80 bg-dark-900/80 rounded transition-colors overflow-hidden font-mono text-xs"
            >
              <button
                onClick={() => toggleChunk(chunk.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-dark-850/60 transition-colors"
              >
                <div className="flex items-center space-x-2 truncate mr-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-neutral-200 font-semibold hover:underline truncate">
                    {chunk.fileName}
                  </span>
                  <span className="text-neutral-500 text-2xs truncate">
                    (Chunk {chunk.chunkIndex} · Cosine: {chunk.cosineScore.toFixed(3)})
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-2xs text-amber-500/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    +{chunk.tokenCount} tokens
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-neutral-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-neutral-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 bg-dark-950/60 border-t border-dark-750 text-neutral-300 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center justify-between text-2xs text-neutral-400 border-b border-dark-800 pb-1.5">
                    <span className="flex items-center space-x-1">
                      <Bookmark className="w-3 h-3 text-amber-500" />
                      <span>{chunk.section || 'General Section'}</span>
                    </span>
                    {chunk.pageNumber && (
                      <span className="text-neutral-500 font-mono">
                        Page {chunk.pageNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-300 font-sans text-xs select-text">
                    {chunk.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
