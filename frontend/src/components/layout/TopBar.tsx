import React from 'react';
import { ModelOption } from '../../types';

interface TopBarProps {
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  availableModels: ModelOption[];
}

export const TopBar: React.FC<TopBarProps> = ({
  selectedModel,
  onSelectModel,
  availableModels,
}) => {
  return (
    <header className="h-10 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-3 text-xs select-none">
      {/* Left: Mac window dots + breadcrumb */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 mr-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors cursor-pointer" />
        </div>
        
        <div className="flex items-center space-x-1.5 text-neutral-400 font-mono text-2xs md:text-xs">
          <span className="text-amber-500 font-semibold tracking-wide">Adaptive RAG</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-400">workspace.agent</span>
        </div>
      </div>

      {/* Center: Window title */}
      <div className="hidden md:flex items-center text-neutral-400 font-medium font-sans text-xs">
        <span className="text-neutral-200">Cursor Desktop</span>
        <span className="mx-2 text-neutral-600">—</span>
        <span className="text-neutral-400">RAG Agent Control</span>
      </div>

      {/* Right: Strict 3B Model Selector Pill */}
      <div className="flex items-center space-x-2">
        <div className="relative group">
          <button className="flex items-center space-x-1.5 bg-dark-800 hover:bg-dark-750 border border-dark-650 hover:border-amber-500/40 px-2.5 py-1 rounded text-2xs text-neutral-200 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono font-medium">{selectedModel.displayName}</span>
            <span className="text-2xs text-neutral-500">▾</span>
          </button>
          
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-44 bg-dark-850 border border-dark-650 rounded shadow-xl py-1">
            <div className="px-2.5 py-1 text-2xs text-neutral-500 uppercase tracking-wider border-b border-dark-700/60 font-semibold">
              3B Parameter Models
            </div>
            {availableModels.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectModel(m)}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-dark-750 transition-colors ${
                  selectedModel.id === m.id ? 'text-amber-400 font-semibold' : 'text-neutral-300'
                }`}
              >
                <span>{m.displayName}</span>
                <span className="text-2xs bg-dark-700 px-1.5 py-0.5 rounded text-neutral-400">
                  {m.parameterCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
