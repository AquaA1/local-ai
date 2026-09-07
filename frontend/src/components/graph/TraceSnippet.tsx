import React from 'react';
import { LatencyTraceData } from '../../types';

interface TraceSnippetProps {
  trace: LatencyTraceData;
}

export const TraceSnippet: React.FC<TraceSnippetProps> = ({ trace }) => {
  return (
    <div className="mt-3 pt-2 border-t border-dark-750/70 font-mono text-2xs space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-neutral-500">Trace ID:</span>
          <span className="text-amber-400 font-medium">{trace.traceId}</span>
        </div>
        <span className="text-emerald-400 font-semibold">{trace.httpStatus}</span>
      </div>

      <div className="bg-dark-950/90 border border-dark-800 p-2 rounded text-neutral-500 font-mono overflow-x-auto truncate">
        <code>{trace.querySnippet}</code>
      </div>
    </div>
  );
};
