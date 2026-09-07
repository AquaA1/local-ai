import React, { useMemo } from 'react';
import katex from 'katex';
import { FormulaBlock } from '../../types';

interface FormulaCardProps {
  formula: FormulaBlock;
}

export const FormulaCard: React.FC<FormulaCardProps> = ({ formula }) => {
  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(formula.latex, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [formula.latex]);

  return (
    <div className="my-3.5 bg-dark-900 border border-dark-700/90 rounded-md p-3 font-mono flex items-center justify-between text-xs shadow-inner">
      <div className="flex-1 overflow-x-auto py-0.5">
        {renderedHtml ? (
          <span
            className="text-amber-400 font-medium"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <span className="text-amber-400 font-semibold tracking-wide">
            {formula.rawText}
          </span>
        )}
      </div>

      <div className="shrink-0 ml-4 text-2xs text-neutral-500 font-mono select-none border-l border-dark-700 pl-3">
        {formula.equationLabel}
      </div>
    </div>
  );
};
