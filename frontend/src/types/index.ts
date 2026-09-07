export interface KnowledgeDocument {
  id: string;
  name: string;
  size: string;
  chunks: number;
  active?: boolean;
  format: 'pdf' | 'md' | 'docx' | 'txt';
  pageCount?: number;
  status?: 'ready' | 'processing' | 'indexing' | 'error';
  stage?: string;
}

export interface SessionHistoryItem {
  id: string;
  title: string;
  subtitle: string;
  tag: 'RAG' | 'Direct' | 'Exhaustive' | 'Context Export';
  time: string;
  active?: boolean;
}

export type PipelineState = 'idle' | 'processing' | 'completed' | 'error';

export interface ExecutionPhase {
  id: string;
  phaseNumber: number;
  name: string;
  latencyOrMetric: string;
  status: 'completed' | 'running' | 'pending' | 'error';
  subtitle: string;
  pillBadge?: string;
  details?: Record<string, unknown>;
}

export interface GroundingChunk {
  id: string;
  fileName: string;
  chunkIndex: number;
  cosineScore: number;
  tokenCount: number;
  content: string;
  pageNumber?: number;
  section?: string;
}

export interface ThoughtStep {
  durationSeconds: number;
  confidencePercent: number;
  tag: string;
  filesRead: {
    fileName: string;
    section: string;
  }[];
}

export interface FormulaBlock {
  latex: string;
  rawText: string;
  equationLabel: string;
}

export interface ArtifactItem {
  artifactId: string;
  name: string;
  uri?: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  format?: 'xlsx' | 'pdf' | 'docx' | 'csv' | 'pptx' | string;
  sha256?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  thought?: ThoughtStep;
  formula?: FormulaBlock;
  groundingChunks?: GroundingChunk[];
  artifacts?: ArtifactItem[];
  capability?: string;
}

export interface LatencyTraceData {
  totalFormatted: string;
  retrievalMs: number;
  retrievalPct: number;
  reasoningMs: number;
  reasoningPct: number;
  routerMs: number;
  routerPct: number;
  traceId: string;
  httpStatus: string;
  querySnippet: string;
}

export interface ModelOption {
  id: string;
  displayName: string;
  parameterCount: string;
  tier: 'lightweight' | 'reasoning';
}
