import React, { useState } from 'react';
import { Sparkles, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { ThoughtStep } from '../../types';

interface ThoughtBoxProps {
  thought: ThoughtStep;
}

export const ThoughtBox: React.FC<ThoughtBoxProps> = ({ thought }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="my-2 border border-dark-700/80 bg-dark-900/60 rounded-md overflow-hidden text-xs font-mono">
      {/* Header bar with summary & badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-dark-850/70 hover:bg-dark-800 transition-colors text-left"
      >
        <div className="flex items-center space-x-2 text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="text-neutral-300 font-medium">
            Thought for {thought.durationSeconds}s
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-amber-400 font-medium">
            {thought.confidencePercent}% confidence
          </span>
          <span className="ml-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-2xs px-1.5 py-0.5 rounded font-semibold">
            {thought.tag}
          </span>
        </div>

        <div className="text-neutral-500">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expandable detailed reasoning steps */}
      {isExpanded && (
        <div className="px-4 py-2.5 border-t border-dark-750/70 space-y-1.5 bg-dark-950/40">
          {thought.filesRead.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-neutral-400 text-xs">
              <span className="text-neutral-500 text-2xs font-sans">Read</span>
              <div className="inline-flex items-center space-x-1.5 bg-dark-800/90 border border-dark-650 hover:border-amber-500/40 px-2 py-0.5 rounded text-2xs font-mono cursor-pointer transition-colors group">
                <FileText className="w-3 h-3 text-amber-500/80 group-hover:text-amber-400" />
                <span className="text-neutral-300 group-hover:text-amber-400 font-medium">
                  {item.fileName}
                </span>
                <span className="text-neutral-500 font-mono">
                  {item.section}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
