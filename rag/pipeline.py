"""RAG Pipeline utilities for query pre-processing, fault-tolerant semantic routing, and HyDE templates."""

from __future__ import annotations

import re
from typing import Optional

# System prompt with forgiving semantic matching for typos, conversational phrasing, and named entities
DEFAULT_RAG_SYSTEM_PROMPT = (
    "You are an industrial refinery engineering assistant for Mangalore Refinery and Petrochemicals Limited (MRPL). "
    "Answer the user's question strictly grounded in the provided document context below.\n"
    "Rules:\n"
    "1. Only state facts, numbers, equipment tags, limits, and procedures explicitly present in the context.\n"
    "2. If the answer cannot be determined from the provided context, state clearly: "
    "'The provided context does not contain sufficient information to answer this question.' Do not guess or hallucinate. "
    "If the user asks a question about a completely different entity, company, institution, or topic than the active document, clarify which document is currently selected and explain that the topic is not covered in this document.\n"
    "3. When asserting facts, cite the source section or document.\n"
    "4. Be forgiving of user typos, minor misspellings, colloquial phrasing, and conversational preambles (such as 'can you tell me', 'what is', 'please find'). "
    "Match semantic intent forgivingly across the retrieved document context, preserving critical named entities like leadership, Chancellors, equipment codes, and operational rules."
)

# Hypothetical Document Embeddings (HyDE) prompt template
HYDE_PROMPT_TEMPLATE = (
    "You are a technical document assistant. Write a short, hypothetical passage or direct factual excerpt "
    "that would directly answer the following technical question from an engineering, academic, or policy document. "
    "Ignore conversational fluff, correct any apparent typos in the user's query mentally, and focus purely "
    "on technical facts, equipment names, leadership roles, and procedures.\n\n"
    "Question: {question}\n\n"
    "Hypothetical Document Excerpt:"
)

# Regex pattern to strip common conversational preambles
CONVERSATIONAL_PREAMBLES = re.compile(
    r"^(?:could\s+you\s+(?:please\s+)?tell\s+me|can\s+you\s+(?:please\s+)?tell\s+me|"
    r"please\s+tell\s+me|tell\s+me\s+about|i\s+(?:would\s+like|want)\s+to\s+know\s+about|"
    r"what\s+can\s+you\s+tell\s+me\s+about|do\s+you\s+know|can\s+you\s+find(?:\s+out)?|"
    r"please\s+explain|explain\s+to\s+me|what\s+is|who\s+is)\s*[:,\-]?\s*",
    re.IGNORECASE,
)


def preprocess_query(query: str) -> str:
    """Clean conversational query filler and normalize whitespace while preserving semantic terms.

    Args:
        query: Raw query from user.

    Returns:
        Cleaned query suitable for semantic vector retrieval.
    """
    if not query or not query.strip():
        return ""

    cleaned = query.strip()
    # Normalize excessive whitespace
    cleaned = re.sub(r"\s+", " ", cleaned)

    # If conversational preamble is present and leaves substantial content, strip it
    sub_query = CONVERSATIONAL_PREAMBLES.sub("", cleaned).strip()
    if len(sub_query) >= 3:
        return sub_query

    return cleaned
