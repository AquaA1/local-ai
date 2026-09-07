import React, { useState } from 'react';
import { ExecutionPhase, PipelineState } from '../../types';
import { AlertCircle } from 'lucide-react';

interface ExecutionGraphProps {
  phases: ExecutionPhase[];
  pipelineState?: PipelineState;
  onPhaseClick?: (phase: ExecutionPhase) => void;
}

export const ExecutionGraph: React.FC<ExecutionGraphProps> = ({
  phases,
  pipelineState = 'idle',
  onPhaseClick,
}) => {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  const handleSelect = (phase: ExecutionPhase) => {
    setSelectedPhaseId((prev) => (prev === phase.id ? null : phase.id));
    onPhaseClick?.(phase);
  };

  const isProcessing = pipelineState === 'processing';
  const isSettled = pipelineState === 'idle' || pipelineState === 'completed';

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {/* Header with Title and Pipeline State Pill */}
      <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-neutral-400">
        <span>Live Execution Graph</span>
        <span
          className={`px-1.5 py-0.5 rounded text-2xs font-mono font-medium tracking-wide transition-all duration-300 ${
            isProcessing
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
              : pipelineState === 'completed'
              ? 'bg-dark-800/80 text-neutral-400 border border-[#333333]'
              : pipelineState === 'error'
              ? 'bg-rose-950/30 text-rose-400 border border-rose-500/40'
              : 'bg-dark-850/60 text-neutral-500 border border-[#262626]'
          }`}
        >
          {pipelineState}
        </span>
      </div>

      {/* Pipeline Tree with Connector Line */}
      <div
        className={`relative pl-3 space-y-3.5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:transition-all before:duration-700 before:ease-in-out ${
          isProcessing
            ? 'before:bg-gradient-to-b before:from-amber-500/70 before:via-amber-500/40 before:to-[#262626] before:shadow-[0_0_6px_rgba(245,158,11,0.4)]'
            : 'before:bg-[#262626]'
        }`}
      >
        {phases.map((phase) => {
          const isSelected = selectedPhaseId === phase.id;
          const isRunning = phase.status === 'running';
          const isCompleted = phase.status === 'completed';
          const isError = phase.status === 'error';

          // Status icon / indicator dot
          let statusIndicator: React.ReactNode;

          if (isRunning) {
            statusIndicator = (
              <div className="relative flex items-center justify-center transition-all duration-300">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400/40 animate-ping absolute" />
                <div
                  className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300 relative z-10"
                  style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.9)' }}
                />
              </div>
            );
          } else if (isCompleted) {
            if (isSettled) {
              // Settled muted low-contrast state: dim amber/gray indicator dot, no glow
              statusIndicator = (
                <div className="w-2 h-2 rounded-full bg-neutral-600/70 border border-[#333333] transition-all duration-700 ease-in-out" />
              );
            } else {
              // Processing an ongoing pipeline, step already passed
              statusIndicator = (
                <div className="w-2 h-2 rounded-full bg-amber-500/80 border border-amber-400/60 transition-all duration-300" />
              );
            }
          } else if (isError) {
            statusIndicator = <AlertCircle className="w-3 h-3 text-rose-500" />;
          } else {
            // Pending: muted low-contrast gray ring
            statusIndicator = (
              <div className="w-2 h-2 rounded-full border border-[#262626] bg-dark-950 transition-all duration-300" />
            );
          }

          // Card styles based on status & pipeline lifecycle
          let cardStyle = 'border-[#222222] bg-dark-950/40 text-neutral-600';
          let titleColor = 'text-neutral-600';
          let latencyColor = 'text-neutral-600';
          let subtitleColor = 'text-neutral-600';
          let customShadow = 'none';

          if (isRunning) {
            cardStyle = 'glow-amber-pipeline bg-dark-850/95 border-amber-500 text-neutral-100';
            titleColor = 'text-amber-300 font-semibold';
            latencyColor = 'text-amber-400 font-mono font-medium animate-pulse';
            subtitleColor = 'text-neutral-300';
            customShadow = '0 0 12px rgba(245, 158, 11, 0.6)';
          } else if (isCompleted) {
            if (isSettled) {
              // Settled state: muted desaturated low-contrast (#262626 or #333333 border/text)
              cardStyle = isSelected
                ? 'border-amber-500/40 bg-dark-850/80 text-neutral-300'
                : 'border-[#262626] bg-dark-900/40 hover:bg-dark-850/40 hover:border-[#333333] text-neutral-400';
              titleColor = 'text-neutral-300';
              latencyColor = 'text-neutral-500 font-mono';
              subtitleColor = 'text-neutral-500';
              customShadow = 'none';
            } else {
              cardStyle = isSelected
                ? 'border-amber-500/50 bg-dark-800'
                : 'border-amber-500/25 bg-dark-850/60 text-neutral-200';
              titleColor = 'text-neutral-200';
              latencyColor = 'text-neutral-400 font-mono';
              subtitleColor = 'text-neutral-400';
              customShadow = 'none';
            }
          } else if (isError) {
            cardStyle = 'border-rose-500/50 bg-rose-950/20 text-rose-300';
            titleColor = 'text-rose-300 font-semibold';
            latencyColor = 'text-rose-400 font-mono';
            subtitleColor = 'text-rose-400/80';
            customShadow = '0 0 8px rgba(244, 63, 94, 0.3)';
          }

          return (
            <div key={phase.id} className="relative group">
              {/* Connector node circle */}
              <div className="absolute -left-[16px] top-2 z-10 flex items-center justify-center">
                {statusIndicator}
              </div>

              {/* Phase Card */}
              <button
                onClick={() => handleSelect(phase)}
                style={{
                  boxShadow: customShadow,
                  transition: isRunning ? 'all 0.3s ease-in-out' : 'all 0.8s ease-in-out',
                }}
                className={`w-full text-left p-2 rounded border ${cardStyle}`}
              >
                {/* Title & Latency */}
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-medium ${titleColor}`}>
                    {phase.name}
                  </span>
                  <span className={`text-2xs ${latencyColor}`}>
                    {phase.latencyOrMetric}
                  </span>
                </div>

                {/* Optional Pill Badge */}
                {phase.pillBadge && (
                  <div className="mb-1">
                    <span
                      className={`inline-block text-2xs px-1.5 py-0.2 rounded font-medium ${
                        isRunning
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                          : isSettled
                          ? 'bg-dark-800/80 border border-[#333333] text-neutral-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}
                      style={{ transition: 'all 0.8s ease-in-out' }}
                    >
                      [{phase.pillBadge}]
                    </span>
                  </div>
                )}

                {/* Subtitle / Status details */}
                <div className={`text-2xs leading-snug ${subtitleColor}`}>
                  {phase.subtitle}
                </div>

                {/* Expanded inspect JSON */}
                {isSelected && phase.details && (
                  <div className="mt-2 pt-2 border-t border-dark-700/80 text-2xs text-neutral-400 bg-dark-950/80 p-2 rounded">
                    <pre className="overflow-x-auto text-amber-400/90 font-mono">
                      {JSON.stringify(phase.details, null, 2)}
                    </pre>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
