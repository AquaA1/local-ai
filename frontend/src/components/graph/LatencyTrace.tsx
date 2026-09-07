import React from 'react';
import { LatencyTraceData } from '../../types';

interface LatencyTraceProps {
  trace: LatencyTraceData;
  vectorEngineName?: string;
}

export const LatencyTrace: React.FC<LatencyTraceProps> = ({
  trace,
  vectorEngineName = 'Qdrant',
}) => {
  return (
    <div className="mt-4 pt-3 border-t border-dark-750/80 font-mono text-2xs space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between text-neutral-400">
        <span className="uppercase tracking-wider font-semibold">Latency Trace</span>
        <span className="text-amber-400 font-bold">{trace.totalFormatted}</span>
      </div>

      {/* Latency items list */}
      <div className="space-y-1.5 bg-dark-900/80 border border-dark-750/60 rounded p-2.5">
        {/* Retrieval */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="truncate">Retrieval ({vectorEngineName})</span>
            <span className="text-neutral-400 font-medium">
              {trace.retrievalMs} ms <span className="text-neutral-500">({trace.retrievalPct}%)</span>
            </span>
          </div>
          <div className="w-full bg-dark-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${trace.retrievalPct}%` }}
            />
          </div>
        </div>

        {/* Reasoning & Synthesis */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="truncate">Reasoning & Synthesis</span>
            <span className="text-neutral-400 font-medium">
              {trace.reasoningMs.toLocaleString()} ms <span className="text-neutral-500">({trace.reasoningPct}%)</span>
            </span>
          </div>
          <div className="w-full bg-dark-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${trace.reasoningPct}%` }}
            />
          </div>
        </div>

        {/* Router & Pack */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="truncate">Router & Pack</span>
            <span className="text-neutral-400 font-medium">
              {trace.routerMs} ms <span className="text-neutral-500">({trace.routerPct}%)</span>
            </span>
          </div>
          <div className="w-full bg-dark-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${trace.routerPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
