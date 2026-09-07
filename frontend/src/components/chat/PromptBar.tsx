import React, { useState } from 'react';
import { ArrowUp, Bot } from 'lucide-react';
import { ModelOption } from '../../types';

interface PromptBarProps {
  onSendMessage: (text: string) => void;
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  availableModels: ModelOption[];
  isProcessing?: boolean;
  disabled?: boolean;
  disabledPlaceholder?: string;
  activeDocumentName?: string;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSendMessage,
  selectedModel,
  onSelectModel,
  availableModels,
  isProcessing = false,
  disabled = false,
  disabledPlaceholder,
  activeDocumentName,
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'Agent' | 'Direct'>('Agent');
  const [showModelMenu, setShowModelMenu] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-3 bg-dark-900 border-t border-dark-700/80">
      <form
        onSubmit={handleSubmit}
        className={`bg-dark-950 border ${
          disabled
            ? 'border-dark-800 opacity-70 cursor-not-allowed'
            : 'border-dark-650 focus-within:border-amber-500/60'
        } rounded-lg p-2.5 transition-all shadow-lg relative`}
      >
        {/* Text Input area */}
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? disabledPlaceholder || 'No documents uploaded yet. Upload a PDF to start.'
              : 'Ask a technical question about the indexed corpus, formulas, or system architecture...'
          }
          disabled={isProcessing || disabled}
          className={`w-full bg-transparent text-neutral-200 placeholder-neutral-500 text-xs font-mono resize-none focus:outline-none leading-relaxed ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
        />

        {/* Bottom pill row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dark-800/80 mt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode selector */}
            <button
              type="button"
              onClick={() => setMode(mode === 'Agent' ? 'Direct' : 'Agent')}
              className="flex items-center space-x-1.5 bg-dark-850 hover:bg-dark-800 border border-dark-700 px-2 py-0.5 rounded text-2xs text-neutral-300 transition-colors font-mono"
            >
              <Bot className="w-3 h-3 text-amber-400" />
              <span>{mode}</span>
              <span className="text-neutral-500 text-2xs">▾</span>
            </button>

            {/* Strict 3B Model selector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center space-x-1.5 bg-dark-850 hover:bg-dark-800 border border-dark-700 px-2 py-0.5 rounded text-2xs text-neutral-300 transition-colors font-mono"
              >
                <span className="text-amber-400 font-medium">{selectedModel.displayName}</span>
                <span className="text-neutral-500 text-2xs">▾</span>
              </button>

              {showModelMenu && (
                <div className="absolute left-0 bottom-full mb-1 w-44 bg-dark-850 border border-dark-650 rounded-md shadow-xl py-1 z-50">
                  <div className="px-2 py-1 text-2xs text-neutral-500 uppercase font-mono font-semibold border-b border-dark-700/80">
                    Strict 3B Engine
                  </div>
                  {availableModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(m);
                        setShowModelMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1 text-2xs font-mono flex items-center justify-between hover:bg-dark-750 ${
                        selectedModel.id === m.id ? 'text-amber-400 font-semibold' : 'text-neutral-300'
                      }`}
                    >
                      <span>{m.displayName}</span>
                      <span className="text-neutral-500 text-2xs">{m.parameterCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>


            {/* Active Document Indicator */}
            {activeDocumentName && (
              <span className="hidden xl:inline-flex items-center space-x-1 text-2xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded font-mono truncate max-w-[160px]">
                <span className="text-amber-500 font-bold">@</span>
                <span className="truncate">{activeDocumentName}</span>
              </span>
            )}

            {/* Command hints */}
            <span className="hidden md:inline-block text-2xs text-neutral-500 font-mono">
              <span className="text-neutral-400">/</span> for commands
            </span>
            <span className="hidden md:inline-block text-2xs text-neutral-500 font-mono">
              <span className="text-neutral-400">@</span> for files
            </span>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || disabled}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
              input.trim() && !isProcessing && !disabled
                ? 'bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-md shadow-amber-500/20 active:scale-95'
                : 'bg-dark-800 text-neutral-600 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
