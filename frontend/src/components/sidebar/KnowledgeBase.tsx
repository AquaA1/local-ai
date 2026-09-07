import React, { useRef, useState } from 'react';
import { FileText, Upload, Database, Trash2 } from 'lucide-react';
import { KnowledgeDocument } from '../../types';
import { cleanFileName } from '../../services/api';

interface KnowledgeBaseProps {
  documents: KnowledgeDocument[];
  onUploadFile: (file: File) => void;
  isUploading?: boolean;
  onSelectDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  vectorEngineName?: string;
  onToggleVectorEngine?: () => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  documents,
  onUploadFile,
  isUploading = false,
  onSelectDocument,
  onDeleteDocument,
  vectorEngineName = 'Qdrant',
  onToggleVectorEngine,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalChunks = documents.reduce((acc, d) => acc + d.chunks, 0);
  const pdfCount = documents.filter((d) => d.format === 'pdf').length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col border-b border-dark-700/80 pb-3">
      {/* Header with Title and Upload Button */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center space-x-2 text-neutral-300">
          <Database className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-2xs font-semibold uppercase tracking-wider font-mono text-neutral-200">
            Knowledge Base
          </span>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center space-x-1 bg-dark-800 hover:bg-dark-700 border border-amber-500/40 hover:border-amber-500 text-amber-400 hover:text-amber-300 text-2xs px-2 py-0.5 rounded font-mono font-medium transition-all shadow-sm active:scale-95"
        >
          <Upload className="w-2.5 h-2.5" />
          <span>{isUploading ? 'Ingesting...' : 'Upload'}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.md,.txt"
          onChange={handleFileChange}
        />
      </div>

      {/* Subtitle Counts and Vector DB Indicator */}
      <div className="flex items-center justify-between px-3 pb-2 text-2xs font-mono text-neutral-400 border-b border-dark-750/50">
        <span>
          <strong className="text-neutral-200">{pdfCount > 0 ? `${pdfCount} PDFs` : `${documents.length} Docs`}</strong> · <span className="text-amber-500 font-medium">{totalChunks.toLocaleString()}</span> chunks
        </span>
        <button
          onClick={onToggleVectorEngine}
          title="Click to toggle vector store engine view (Qdrant / pgvector)"
          className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-neutral-300 font-medium">{vectorEngineName}</span>
        </button>
      </div>

      {/* Document Items List */}
      <div className="flex flex-col space-y-1 px-2 pt-2 max-h-48 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="px-3 py-6 text-center text-neutral-500 font-mono text-2xs leading-relaxed">
            No documents uploaded yet. Upload a PDF to start.
          </div>
        ) : (
          documents.map((doc) => {
            const isPdf = doc.format === 'pdf' || doc.name.endsWith('.pdf');
            const isConfirming = confirmDeleteId === doc.id;
            const isProcessing = doc.status === 'processing' || doc.status === 'indexing';
            const isError = doc.status === 'error';

            return (
              <div
                key={doc.id}
                onClick={() => !isConfirming && !isProcessing && onSelectDocument(doc.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-all text-xs font-mono group border ${
                  doc.active
                    ? 'bg-dark-800/90 text-neutral-100 border-amber-500/30 cursor-pointer'
                    : isProcessing
                    ? 'border-amber-500/20 bg-dark-800/30 text-neutral-300 cursor-wait'
                    : 'border-transparent text-neutral-400 hover:bg-dark-800/50 hover:text-neutral-200 cursor-pointer'
                }`}
              >
                <div className="flex items-center space-x-2 truncate mr-2">
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isProcessing ? 'text-amber-400 animate-pulse' : isPdf ? 'text-rose-400' : 'text-cyan-400'
                    }`}
                  />
                  <span className="truncate">{cleanFileName(doc.name)}</span>
                </div>

                {isConfirming ? (
                  <div
                    className="shrink-0 flex items-center space-x-1 text-2xs z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-rose-400 font-semibold text-2xs">Delete?</span>
                    <button
                      onClick={() => {
                        onDeleteDocument(doc.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-1.5 py-0.5 bg-rose-600/30 hover:bg-rose-600/60 border border-rose-500/50 rounded text-rose-300 font-bold text-2xs transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-1.5 py-0.5 bg-dark-700 hover:bg-dark-600 rounded text-neutral-300 text-2xs transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="shrink-0 flex items-center space-x-1.5">
                    {isProcessing ? (
                      <span className="text-2xs text-amber-400 font-mono font-medium animate-pulse" title={doc.stage}>
                        {doc.stage || 'Processing...'}
                      </span>
                    ) : isError ? (
                      <span className="text-2xs text-rose-400 font-mono font-medium" title={doc.stage}>
                        Failed
                      </span>
                    ) : doc.active ? (
                      <span className="text-2xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-2xs text-neutral-500 group-hover:text-neutral-400 font-mono">
                        {doc.chunks > 0 ? `${doc.chunks} chk` : doc.size}
                      </span>
                    )}

                    {/* Subtle Trash Icon on Hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(doc.id);
                      }}
                      title={`Delete ${cleanFileName(doc.name)}`}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-neutral-500 transition-all p-0.5 rounded hover:bg-dark-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
