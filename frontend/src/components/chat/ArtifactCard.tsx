import React, { useState } from 'react';
import { ArtifactItem } from '../../types';
import { downloadArtifactFile } from '../../services/api';
import {
  FileSpreadsheet,
  FileText,
  File,
  Download,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Presentation,
} from 'lucide-react';

interface ArtifactCardProps {
  artifact: ArtifactItem;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact }) => {
  const [downloaded, setDownloaded] = useState(false);

  const format = (artifact.format || 'file').toLowerCase();

  // Color scheme and icon depending on file format
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let IconComponent = FileSpreadsheet;

  if (format === 'pdf') {
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    IconComponent = FileText;
  } else if (format === 'docx' || format === 'doc') {
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    IconComponent = FileText;
  } else if (format === 'pptx' || format === 'ppt') {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    IconComponent = Presentation;
  } else if (format === 'csv') {
    badgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/30';
    IconComponent = FileSpreadsheet;
  } else {
    badgeColor = 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
    IconComponent = File;
  }

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    downloadArtifactFile(artifact.downloadUrl, artifact.name);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3500);
  };

  const handleOpen = () => {
    window.open(artifact.downloadUrl, '_blank');
  };

  return (
    <div className="mt-2.5 bg-dark-900 border border-dark-700/80 rounded-lg p-3.5 shadow-sm transition-all hover:border-dark-600 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className={`p-2 rounded border shrink-0 ${badgeColor}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-semibold text-neutral-100 truncate" title={artifact.name}>
              {artifact.name}
            </div>
            <div className="flex items-center space-x-2 text-2xs font-mono text-neutral-400">
              <span className="uppercase tracking-wider">{format}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-2.5 h-2.5 text-neutral-500" />
                {formatSize(artifact.sizeBytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 flex items-center space-x-2">
          {format === 'pdf' && (
            <button
              onClick={handleOpen}
              className="px-2.5 py-1 text-2xs font-mono rounded bg-dark-800 hover:bg-dark-750 text-neutral-300 hover:text-neutral-100 border border-dark-650 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Open preview in new browser tab"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className={`px-3 py-1 text-2xs font-mono font-medium rounded flex items-center space-x-1.5 transition-colors cursor-pointer ${
              downloaded
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-dark-950 font-semibold'
            }`}
          >
            {downloaded ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SHA-256 Provenance & Verification Tag */}
      {artifact.sha256 && (
        <div className="flex items-center justify-between text-3xs font-mono text-neutral-500 pt-2 border-t border-dark-750/70">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span>SHA-256 Verified Artifact</span>
          </span>
          <span className="truncate max-w-[220px]" title={artifact.sha256}>
            {artifact.sha256.slice(0, 18)}...{artifact.sha256.slice(-8)}
          </span>
        </div>
      )}
    </div>
  );
};
