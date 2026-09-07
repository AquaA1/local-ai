"""Router for persistent RAG knowledge base operations (ingest, search, qa, document management)."""

from __future__ import annotations

import asyncio
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from apps.api.dependencies import get_app_context, get_staging_dir
from apps.api.schemas.rag import (
    RagCandidateSchema,
    RagDocumentListResponse,
    RagDocumentSummarySchema,
    RagIngestRequest,
    RagIngestResponse,
    RagQARequest,
    RagQAResponse,
    RagSearchRequest,
    RagSearchResponse,
)
from apps.context import AppContext
from orchestration.capabilities.base import CapabilityContext
from orchestration.domain.results import TaskResult

router = APIRouter(prefix="/rag", tags=["RAG Knowledge Base"])


def _clean_file_name(name: str) -> str:
    """Strip leading UUID or file-* prefix to render human-readable file names."""
    if not name:
        return ""
    clean = re.sub(r"^(?:file-)?[0-9a-fA-F]{8,}(?:-[0-9a-fA-F]{4,})*[-_]", "", name)
    return clean or name


def _resolve_file(file_id: Optional[str], file_path: Optional[str], staging_dir: Path, repo_root: Path) -> Path:
    """Safely resolve an uploaded file ID or relative path within authorized roots."""
    if file_id:
        matches = list(staging_dir.glob(f"{file_id}_*"))
        if not matches or not matches[0].is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Uploaded file '{file_id}' not found in staging.",
            )
        return matches[0].resolve()

    if file_path:
        p = Path(file_path).resolve()
        allowed_roots = [staging_dir.resolve(), repo_root.resolve()]
        is_safe = any(p.is_relative_to(root) for root in allowed_roots)
        if not is_safe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Access denied: path '{file_path}' is outside authorized directory roots.",
            )
        if not p.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{file_path}' not found.",
            )
        return p

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Either 'file_id' or 'file_path' must be provided.",
    )


@router.post("/ingest", response_model=RagIngestResponse)
async def ingest_document(
    req: RagIngestRequest,
    background_tasks: BackgroundTasks,
    context: AppContext = Depends(get_app_context),
    staging_dir: Path = Depends(get_staging_dir),
) -> RagIngestResponse:
    """Ingest, normalize, chunk, embed, and index a document into the persistent RAG store."""
    repo_root = getattr(context.core, "repo_root", Path.cwd())
    resolved_path = _resolve_file(req.file_id, req.file_path, staging_dir, repo_root)

    clean_name = _clean_file_name(resolved_path.name)
    initial_doc_id = f"doc_{resolved_path.stem}"
    harness = context.create_rag_harness()

    if req.async_mode:
        def _pre_register() -> None:
            from rag.storage.models import DocumentModel
            from sqlalchemy import select
            try:
                with harness.db.session() as session:
                    rec = session.scalar(select(DocumentModel).where(DocumentModel.id == initial_doc_id))
                    if not rec:
                        session.add(
                            DocumentModel(
                                id=initial_doc_id,
                                content="",
                                metadata_={
                                    "file_name": resolved_path.name,
                                    "format": resolved_path.suffix.lstrip(".").lower(),
                                    "status": "processing",
                                    "stage": "Ingesting via Docling...",
                                    "page_count": 0,
                                },
                            )
                        )
                        session.commit()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Failed to pre-register document: %s", e)

        await asyncio.to_thread(_pre_register)

        def _run_ingestion() -> None:
            try:
                harness.ingest_document(resolved_path)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error("Background ingestion failed for %s: %s", resolved_path, e)

        background_tasks.add_task(_run_ingestion)

        return RagIngestResponse(
            document_id=initial_doc_id,
            file_name=clean_name or resolved_path.name,
            format=resolved_path.suffix.lstrip(".").lower(),
            page_count=0,
            chunk_count=0,
            status="processing",
            stage="Ingesting via Docling...",
            action="created",
            timings={},
        )

    try:
        stats = await asyncio.to_thread(harness.ingest_document, resolved_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document '{resolved_path.name}': {str(exc)}",
        ) from exc

    return RagIngestResponse(
        document_id=stats.document_id,
        file_name=clean_name or stats.file_name,
        format=stats.format,
        page_count=stats.page_count,
        chunk_count=stats.chunk_count,
        status="ready",
        stage="Ready",
        action=stats.action,
        timings={
            "ingestion_sec": stats.timings.ingestion_sec,
            "normalization_sec": stats.timings.normalization_sec,
            "chunking_sec": stats.timings.chunking_sec,
            "metadata_sec": stats.timings.metadata_sec,
            "embedding_sec": stats.timings.embedding_sec,
            "indexing_sec": stats.timings.indexing_sec,
            "total_sec": stats.timings.total_sec,
        },
    )


@router.post("/search", response_model=RagSearchResponse)
async def search_rag(
    req: RagSearchRequest,
    context: AppContext = Depends(get_app_context),
) -> RagSearchResponse:
    """Explicit search operation: vector retrieval and cross-encoder reranking without LLM calls."""
    cap = context.create_rag_capability()
    cap_ctx = CapabilityContext(execution_id=f"rag-search-{uuid.uuid4().hex[:8]}")

    initial_k = max(req.top_k, 20) if req.top_k else 20
    post_rerank_n = req.top_n if req.top_n and req.top_n >= 6 else 8

    parameters: Dict[str, Any] = {
        "operation": "search",
        "top_k": initial_k,
        "top_n": post_rerank_n,
    }
    if req.document_id:
        parameters["document_id"] = req.document_id
    if req.min_score is not None:
        parameters["min_score"] = req.min_score

    inputs = {"query": req.query}

    result: TaskResult = await asyncio.to_thread(
        cap.execute,
        parameters=parameters,
        inputs=inputs,
        context=cap_ctx,
    )

    out = result.output or {}
    candidates = [
        RagCandidateSchema(**c) for c in out.get("candidates", [])
    ]
    return RagSearchResponse(
        query=req.query,
        count=out.get("count", len(candidates)),
        candidates=candidates,
        timings=out.get("timings", {}),
    )


@router.post("/qa", response_model=RagQAResponse)
async def qa_rag(
    req: RagQARequest,
    context: AppContext = Depends(get_app_context),
) -> RagQAResponse:
    """Explicit grounded QA operation: vector retrieval, reranking, and local LLM answer synthesis."""
    cap = context.create_rag_capability()
    cap_ctx = CapabilityContext(execution_id=f"rag-qa-{uuid.uuid4().hex[:8]}")

    initial_k = max(req.top_k, 20) if req.top_k else 20
    post_rerank_n = req.top_n if req.top_n and req.top_n >= 6 else 8

    parameters: Dict[str, Any] = {
        "operation": "qa",
        "top_k": initial_k,
        "top_n": post_rerank_n,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
    }
    if req.document_id:
        parameters["document_id"] = req.document_id
    if req.min_score is not None:
        parameters["min_score"] = req.min_score
    if req.system_prompt:
        parameters["system_prompt"] = req.system_prompt

    inputs = {"query": req.query}

    result: TaskResult = await asyncio.to_thread(
        cap.execute,
        parameters=parameters,
        inputs=inputs,
        context=cap_ctx,
    )

    out = result.output or {}
    candidates = [
        RagCandidateSchema(**c) for c in out.get("candidates", [])
    ]
    return RagQAResponse(
        query=req.query,
        answer=out.get("answer", ""),
        count=out.get("count", len(candidates)),
        candidates=candidates,
        timings=out.get("timings", {}),
    )


@router.get("/documents", response_model=List[RagDocumentSummarySchema])
async def list_documents(
    context: AppContext = Depends(get_app_context),
) -> List[RagDocumentSummarySchema]:
    """List all indexed documents and their chunk counts directly from PostgreSQL, deduplicated by clean name."""
    harness = context.create_rag_harness()
    summaries = await asyncio.to_thread(harness.list_documents)

    seen_names: set[str] = set()
    result: List[RagDocumentSummarySchema] = []

    # Sort so that documents with chunks > 0 or status == 'ready' come first
    sorted_summaries = sorted(
        summaries,
        key=lambda s: (getattr(s, "chunk_count", 0) > 0, getattr(s, "status", "") == "ready"),
        reverse=True,
    )

    for s in sorted_summaries:
        clean_name = _clean_file_name(s.file_name)
        if clean_name in seen_names:
            continue
        seen_names.add(clean_name)
        status_val = getattr(s, "status", "ready")
        stage_val = getattr(s, "stage", None)
        result.append(
            RagDocumentSummarySchema(
                id=s.document_id,
                document_id=s.document_id,
                file_name=clean_name or s.file_name,
                total_chunks=s.chunk_count,
                chunk_count=s.chunk_count,
                created_at=s.created_at,
                status=status_val,
                stage=stage_val,
                format=s.format,
                page_count=s.page_count,
            )
        )
    return result


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    context: AppContext = Depends(get_app_context),
) -> Dict[str, Any]:
    """Delete a document and all its chunks from the persistent RAG store."""
    harness = context.create_rag_harness()

    def _delete() -> bool:
        return harness.indexer.delete_document(document_id)

    deleted = await asyncio.to_thread(_delete)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found in RAG store.",
        )
    return {"status": "deleted", "document_id": document_id}
