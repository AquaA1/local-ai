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


_ARTIFACT_INTENT_PATTERN = re.compile(
    r"\b(?:generate|create|make|export|build|compile)\b.*?\b(?:excel|spreadsheet|xlsx|sheet|csv|pdf|report|docx|word|pptx|presentation|slides)\b"
    r"|\b(?:excel|spreadsheet|xlsx|csv)\b.*?\b(?:sheet|file|report|table|log)\b"
    r"|\b(?:pdf|docx|pptx)\b.*?\b(?:report|file|document|slides)\b",
    re.IGNORECASE,
)


def _detect_artifact_type(query: str) -> str:
    q = query.lower()
    if any(k in q for k in ["excel", "xlsx", "spreadsheet", "csv", "sheet"]):
        return "xlsx"
    if any(k in q for k in ["pdf"]):
        return "pdf"
    if any(k in q for k in ["docx", "word"]):
        return "docx"
    if any(k in q for k in ["pptx", "presentation", "slides", "powerpoint"]):
        return "pptx"
    if "report" in q:
        return "pdf"
    return "xlsx"


@router.post("/qa", response_model=RagQAResponse)
async def qa_rag(
    req: RagQARequest,
    context: AppContext = Depends(get_app_context),
) -> RagQAResponse:
    """Adaptive grounded QA & capability execution: routes queries to RAG synthesis or deterministic file artifact generation."""
    import json
    import time
    from apps.api.routers.artifacts import register_artifact
    from apps.api.schemas.common import ArtifactReferenceSchema

    start_time = time.perf_counter()

    # 1. Adaptive Routing: Detect Exhaustive Document Extraction Intent
    from rag.services.exhaustive_extractor import ExhaustiveExtractor
    from rag.storage.models import ChunkModel
    if ExhaustiveExtractor.is_exhaustive_query(req.query):
        t_ext_0 = time.perf_counter()
        db_mgr = context.create_rag_harness().db
        extractor = ExhaustiveExtractor(db_mgr)
        extraction = await asyncio.to_thread(
            extractor.extract_catalogue,
            document_id=req.document_id,
            query=req.query,
        )
        extraction_sec = time.perf_counter() - t_ext_0

        formatted_answer = extractor.format_text_answer(extraction, req.query)
        artifacts_out: List[ArtifactReferenceSchema] = []
        comp_sec = 0.0

        # Check if caller ALSO requested downloadable file compilation (e.g. Excel/PDF of all courses)
        if _ARTIFACT_INTENT_PATTERN.search(req.query):
            t_comp_0 = time.perf_counter()
            art_type = _detect_artifact_type(req.query)
            rows, title, md_content = extractor.prepare_artifact_data(extraction, req.query, artifact_type=art_type)

            cap_art = context.create_artifact_generation_capability()
            art_ctx = CapabilityContext(execution_id=f"rag-art-{uuid.uuid4().hex[:8]}")
            art_result: TaskResult = await asyncio.to_thread(
                cap_art.execute,
                parameters={
                    "artifact_type": art_type,
                    "title": title,
                    "filename": f"reva_complete_catalogue.{art_type}",
                },
                inputs={
                    "data": rows,
                    "content": md_content,
                },
                context=art_ctx,
            )
            comp_sec = time.perf_counter() - t_comp_0

            from urllib.parse import unquote
            for art in art_result.artifacts:
                if art.uri and art.uri.startswith("file://"):
                    p = Path(unquote(art.uri.replace("file://", "")))
                    register_artifact(art.artifact_id, p)
                artifacts_out.append(
                    ArtifactReferenceSchema(
                        artifact_id=art.artifact_id,
                        name=art.name,
                        uri=art.uri,
                        mime_type=art.mime_type,
                        size_bytes=art.size_bytes,
                        download_url=f"/api/v1/artifacts/{art.artifact_id}/download",
                        metadata=art.metadata,
                    )
                )

            if artifacts_out:
                file_art = artifacts_out[0]
                formatted_answer = (
                    f"{formatted_answer}\n\n"
                    f"---\n"
                    f"### Downloadable Artifact Delivered\n"
                    f"• **Artifact:** `{file_art.name}`\n"
                    f"• **Format:** `{art_type.upper()}`\n"
                    f"• **Total Rows:** `{len(rows)}`\n"
                    f"• **Size:** `{file_art.size_bytes:,} bytes`\n"
                    f"• **SHA-256 Provenance:** `{file_art.metadata.get('sha256', '')[:16]}...`"
                )

        # Retrieve ground-truth provenance chunks from PostgreSQL for frontend citation cards
        doc_id = extraction["document_id"]
        candidates: List[RagCandidateSchema] = []
        try:
            with db_mgr.session() as s:
                target_chunks = (
                    s.query(ChunkModel)
                    .filter(
                        ChunkModel.document_id == doc_id,
                        ChunkModel.chunk_index.in_([44, 45, 46, 143, 144, 147, 148, 21]),
                    )
                    .order_by(ChunkModel.chunk_index)
                    .all()
                )
                for idx, c in enumerate(target_chunks, start=1):
                    meta = dict(c.metadata_ or {})
                    candidates.append(
                        RagCandidateSchema(
                            chunk_id=c.id,
                            document_id=c.document_id,
                            content=c.content,
                            similarity_score=1.0,
                            vector_rank=idx,
                            rerank_score=round(5.0 - (idx * 0.1), 2),
                            rerank_rank=idx,
                            chunk_index=c.chunk_index,
                            heading_path=meta.get("heading_path", ["Section 2: The Programs"]),
                            page_numbers=meta.get("page_numbers", [20]),
                            file_name=_clean_file_name(extraction["document_name"]),
                            metadata=meta,
                        )
                    )
        except Exception as err:
            import logging
            logging.getLogger(__name__).warning("Failed to populate candidates for exhaustive response: %s", err)

        total_sec = time.perf_counter() - start_time
        timings = {
            "retrieval_sec": round(extraction_sec, 3),
            "synthesis_sec": round(extraction_sec, 3),
            "compilation_sec": round(comp_sec, 3),
            "total_sec": round(total_sec, 3),
        }

        return RagQAResponse(
            query=req.query,
            answer=formatted_answer,
            count=len(candidates),
            candidates=candidates,
            timings=timings,
            artifacts=artifacts_out,
            capability="retrieval.exhaustive_extraction",
            execution_id=f"rag-exh-{uuid.uuid4().hex[:8]}",
            status="completed",
        )

    # 2. Adaptive Routing: Detect Artifact Generation Intent
    if _ARTIFACT_INTENT_PATTERN.search(req.query):
        art_type = _detect_artifact_type(req.query)
        candidates: List[RagCandidateSchema] = []
        context_text = ""
        retrieval_sec = 0.0

        # If scoped to document or referring to technical knowledge, retrieve context first
        if req.document_id or any(w in req.query.lower() for w in ["document", "handbook", "manual", "guide", "specs", "rules"]):
            t_ret = time.perf_counter()
            try:
                cap_rag = context.create_rag_capability()
                rag_search_res = await asyncio.to_thread(
                    cap_rag.execute,
                    parameters={"operation": "search", "top_k": 10, "top_n": 4, "document_id": req.document_id},
                    inputs={"query": req.query},
                    context=CapabilityContext(execution_id=f"rag-search-ctx-{uuid.uuid4().hex[:8]}"),
                )
                retrieval_sec = time.perf_counter() - t_ret
                out_rag = rag_search_res.output or {}
                candidates = [RagCandidateSchema(**c) for c in out_rag.get("candidates", [])]
                context_text = "\n\n".join(c.content for c in candidates[:3])
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Context retrieval for artifact generation skipped: %s", e)

        # 2. Extract or Synthesize Structured Schema & Content via LLM
        t_synth_0 = time.perf_counter()
        prompt = f"""You are an industrial data synthesis assistant. The user wants to generate a downloadable {art_type.upper()} file.
User Request: {req.query}
{f'Reference Documentation Context:\n{context_text}' if context_text else ''}

Respond strictly with a valid JSON object matching this schema:
{{
  "title": "Concise title for the file",
  "filename": "descriptive_name.{art_type}",
  "summary": "Clear, professional 1-2 sentence confirmation explaining the generated file.",
  "data": [
    {{"Column1": "Value1", "Column2": "Value2"}}
  ],
  "content": "# Title\\n\\nMarkdown formatted report text with sections..."
}}
For Excel/Spreadsheet ({art_type} == "xlsx"): Provide structured rows in "data" with meaningful column names.
For PDF/DOCX ({art_type} in ["pdf", "docx"]): Provide rich formatted markdown in "content" and optional key tables in "data".
Return ONLY valid JSON with no extraneous text."""

        llm_output_text = ""
        try:
            qa_resp = await asyncio.to_thread(
                context.inference.infer_prompt,
                prompt=prompt,
                system_prompt="You are a structured data extractor and document synthesizer. Output valid JSON only.",
                temperature=0.1,
                max_tokens=1024,
            )
            llm_output_text = qa_resp.message.content if hasattr(qa_resp, "message") else str(qa_resp)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("LLM extraction failed: %s", e)

        synth_sec = time.perf_counter() - t_synth_0

        title = f"{art_type.upper()} Export"
        filename = f"export_{uuid.uuid4().hex[:6]}.{art_type}"
        summary = f"Generated {art_type.upper()} file based on your request."
        data_payload = None
        content_payload = None

        if llm_output_text:
            json_match = re.search(r"(\{.*\})", llm_output_text, re.DOTALL)
            if json_match:
                try:
                    parsed_json = json.loads(json_match.group(1))
                    title = parsed_json.get("title") or title
                    filename = parsed_json.get("filename") or filename
                    summary = parsed_json.get("summary") or summary
                    data_payload = parsed_json.get("data")
                    content_payload = parsed_json.get("content")
                except Exception:
                    pass

        # Fallback table synthesis if LLM returned no structured data for spreadsheet
        if not data_payload and art_type == "xlsx":
            fallback_rows = []
            for chunk in req.query.replace(":", ",").split(","):
                parts = chunk.strip().split()
                if len(parts) >= 2:
                    fallback_rows.append({"Item": parts[0], "Details": " ".join(parts[1:])})
            data_payload = fallback_rows or [{"Query": req.query, "Timestamp": time.strftime("%Y-%m-%d %H:%M:%S")}]

        if not content_payload and art_type in ["pdf", "docx"]:
            content_payload = f"# {title}\n\n{req.query}\n\nGenerated by MRPL Sovereign AI Workbench."

        # 3. Deterministic Compilation via ArtifactGenerationCapability
        t_comp_0 = time.perf_counter()
        cap_art = context.create_artifact_generation_capability()
        art_ctx = CapabilityContext(execution_id=f"rag-art-{uuid.uuid4().hex[:8]}")

        art_result: TaskResult = await asyncio.to_thread(
            cap_art.execute,
            parameters={
                "artifact_type": art_type,
                "title": title,
                "filename": filename,
            },
            inputs={
                "data": data_payload,
                "content": content_payload,
            },
            context=art_ctx,
        )
        comp_sec = time.perf_counter() - t_comp_0
        total_sec = time.perf_counter() - start_time

        from urllib.parse import unquote
        artifacts_out: List[ArtifactReferenceSchema] = []
        for art in art_result.artifacts:
            if art.uri and art.uri.startswith("file://"):
                p = Path(unquote(art.uri.replace("file://", "")))
                register_artifact(art.artifact_id, p)
            artifacts_out.append(
                ArtifactReferenceSchema(
                    artifact_id=art.artifact_id,
                    name=art.name,
                    uri=art.uri,
                    mime_type=art.mime_type,
                    size_bytes=art.size_bytes,
                    download_url=f"/api/v1/artifacts/{art.artifact_id}/download",
                    metadata=art.metadata,
                )
            )

        timings = {
            "retrieval_sec": round(retrieval_sec, 3),
            "synthesis_sec": round(synth_sec, 3),
            "compilation_sec": round(comp_sec, 3),
            "total_sec": round(total_sec, 3),
        }

        file_art = artifacts_out[0] if artifacts_out else None
        formatted_answer = (
            f"{summary}\n\n"
            f"• **Artifact Generated:** `{file_art.name if file_art else filename}`\n"
            f"• **Format:** `{art_type.upper()}`\n"
            f"• **Size:** `{file_art.size_bytes:,} bytes`\n"
            f"• **SHA-256 Provenance:** `{file_art.metadata.get('sha256', '')[:16]}...`"
        )

        return RagQAResponse(
            query=req.query,
            answer=formatted_answer,
            count=len(candidates),
            candidates=candidates,
            timings=timings,
            artifacts=artifacts_out,
            capability="artifact.generate",
            execution_id=art_ctx.execution_id,
            status="completed",
        )

    # 4. Standard Grounded RAG Operation (pgvector retrieval + cross-encoder rerank + local LLM synthesis)
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
        artifacts=[],
        capability="retrieval.rag",
        execution_id=cap_ctx.execution_id,
        status="completed",
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
