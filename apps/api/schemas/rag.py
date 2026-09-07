"""Pydantic schemas for the RAG knowledge base endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RagIngestRequest(BaseModel):
    """Request payload to ingest a document into the persistent RAG store."""

    file_id: Optional[str] = Field(None, description="Staged file ID from /api/v1/files/upload")
    file_path: Optional[str] = Field(None, description="Relative path within allowed workspace or staging roots")
    async_mode: bool = Field(True, description="Whether to run ingestion asynchronously in background")


class RagIngestResponse(BaseModel):
    """Response returned upon document ingestion dispatch or completion."""

    document_id: str = Field(..., description="Unique document ID in RAG store")
    file_name: str = Field(..., description="Base filename of ingested document")
    format: str = Field(..., description="Document format (pdf, docx, md, txt)")
    page_count: int = Field(0, description="Total pages in document")
    chunk_count: int = Field(0, description="Total chunks extracted and embedded")
    status: str = Field("ready", description="Ingestion lifecycle status: processing, indexing, ready, error")
    stage: Optional[str] = Field(None, description="Detailed stage description")
    action: str = Field(..., description="'created' or 'updated'")
    timings: Dict[str, float] = Field(default_factory=dict, description="Per-stage latency breakdown in seconds")


class RagCandidateSchema(BaseModel):
    """Schema for an individual retrieved and reranked passage."""

    chunk_id: str
    document_id: str
    content: str
    similarity_score: float = Field(0.0, description="Vector cosine similarity score [-1.0, 1.0]")
    vector_rank: int = Field(1, description="Rank from initial pgvector retrieval")
    rerank_score: float = Field(0.0, description="Cross-encoder logit relevance score")
    rerank_rank: int = Field(1, description="Rank after cross-encoder scoring")
    chunk_index: int = 0
    heading_path: List[str] = Field(default_factory=list, description="Breadcrumb section trail")
    page_numbers: List[int] = Field(default_factory=list, description="1-indexed source pages spanned")
    file_name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RagSearchRequest(BaseModel):
    """Request payload for explicit search operation (no LLM call)."""

    query: str = Field(..., min_length=1, description="Technical search query")
    top_k: int = Field(20, ge=1, le=50, description="Vector candidate pool size (initial retrieval window)")
    top_n: int = Field(8, ge=1, le=20, description="Reranked candidate pool size")
    document_id: Optional[str] = Field(None, description="Optional document ID to constrain search scope")
    min_score: Optional[float] = Field(None, description="Optional minimum reranker logit threshold")


class RagSearchResponse(BaseModel):
    """Response schema for explicit search operation."""

    query: str
    count: int
    candidates: List[RagCandidateSchema]
    timings: Dict[str, float] = Field(default_factory=dict)


class RagQARequest(BaseModel):
    """Request payload for grounded QA operation (retrieval + rerank + LLM answer)."""

    query: str = Field(..., min_length=1, description="Technical question to answer")
    top_k: int = Field(20, ge=1, le=50, description="Vector candidate pool size (initial retrieval window)")
    top_n: int = Field(8, ge=1, le=20, description="Reranked candidate pool size (packed into prompt context)")
    document_id: Optional[str] = Field(None, description="Optional document ID to constrain search scope")
    min_score: Optional[float] = Field(None, description="Optional minimum reranker logit threshold")
    temperature: float = Field(0.1, ge=0.0, le=1.0, description="LLM sampling temperature")
    max_tokens: int = Field(512, ge=1, le=4096, description="Maximum tokens generated in answer")
    system_prompt: Optional[str] = Field(None, description="Optional custom system grounding prompt")


from apps.api.schemas.common import ArtifactReferenceSchema


class RagQAResponse(BaseModel):
    """Response schema for grounded QA operation with capability artifact support."""

    query: str
    answer: str
    count: int = 0
    candidates: List[RagCandidateSchema] = Field(default_factory=list)
    timings: Dict[str, float] = Field(default_factory=dict)
    artifacts: List[ArtifactReferenceSchema] = Field(default_factory=list, description="Generated file artifacts (XLSX, PDF, etc.)")
    capability: Optional[str] = Field("retrieval.rag", description="Underlying capability executed")
    execution_id: Optional[str] = Field(None, description="Execution ID for capability provenance")
    status: str = Field("completed", description="Execution status")


class RagDocumentSummarySchema(BaseModel):
    """Catalog summary for an indexed document in the RAG store."""

    id: str = Field(..., description="Unique document ID in RAG store")
    file_name: str = Field(..., description="Base filename of indexed document")
    total_chunks: int = Field(0, description="Total chunks extracted and stored in rag_chunks")
    created_at: str = Field(..., description="Timestamp when document was indexed")
    status: str = Field("ready", description="Document status: processing, indexing, ready, error")
    stage: Optional[str] = Field(None, description="Detailed stage description")
    format: Optional[str] = "pdf"
    page_count: Optional[int] = 1
    document_id: Optional[str] = None
    chunk_count: Optional[int] = None


class RagDocumentListResponse(BaseModel):
    """List response of all indexed documents in the RAG store."""

    count: int
    documents: List[RagDocumentSummarySchema]
