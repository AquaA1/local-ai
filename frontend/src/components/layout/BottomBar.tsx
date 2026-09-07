import React from 'react';
import { ModelOption } from '../../types';

interface BottomBarProps {
  selectedModel: ModelOption;
  errorCount?: number;
  branchName?: string;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  selectedModel,
  errorCount = 0,
  branchName = 'main',
}) => {
  return (
    <footer className="h-6 bg-dark-950 border-t border-dark-700/80 flex items-center justify-between px-3 text-2xs font-mono select-none text-neutral-400">
      {/* Left items */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="font-semibold text-neutral-200">adaptive-rag-agent</span>
        </div>

        <div className="flex items-center space-x-1 text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors">
          <span>Branch:</span>
          <span className="text-neutral-200 font-medium">{branchName}</span>
        </div>

        <div className="flex items-center space-x-1 text-emerald-400">
          <span>✓</span>
          <span>{errorCount} errors</span>
        </div>
      </div>

      {/* Right items */}
      <div className="flex items-center space-x-4 text-neutral-400">
        <span>UTF-8</span>
        <span className="text-amber-500 font-medium">{selectedModel.displayName}</span>
        <span className="text-neutral-500 hidden sm:inline">Cursor Desktop</span>
      </div>
    </footer>
  );
};
