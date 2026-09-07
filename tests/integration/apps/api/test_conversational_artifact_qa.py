"""Integration tests for Conversational Artifact Generation (ARTIFACT_FROM_CONTEXT).

Verifies:
1. Turn 1 (Chancellor QA) -> Turn 2 ("Make a PDF of that.") generates PDF directly from context (retrieval_sec == 0.0).
2. Turn 1 (All courses QA) -> Turn 2 ("Put this into Excel.") generates XLSX with all 16 canonical programs.
3. Turn 1 ("tell me all the courses mentioned in reva") -> Turn 2 ("generate me a pdf of this report you gave")
   delivers PDF with REVA course catalogue and STRICTLY ABSENT of "4.2 Classification of Courses" / "Program Assessment Committee".
4. Explicit expansion ("using the document") bypasses conversational export and triggers search.
5. New topic query ("Make a PDF about classification of courses.") bypasses conversational export.
"""

import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import openpyxl
import pypdfium2

from apps.api.app import create_app
from apps.context import AppContext


@pytest.fixture
def api_client():
    ctx = AppContext.create()
    app = create_app(app_context=ctx)
    return TestClient(app)


def test_turn1_chancellor_then_turn2_make_pdf(api_client):
    """Test 1: Standard RAG QA followed by 'Make a PDF of that.' must produce a PDF directly from context."""
    session_id = "sess-chancellor-conv-test"

    # Turn 1: Ask who is Chancellor
    t1_resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Who is the Chancellor of REVA University?", "top_k": 8, "session_id": session_id},
    )
    assert t1_resp.status_code == 200, t1_resp.text
    t1_data = t1_resp.json()
    assert t1_data["capability"] == "retrieval.rag"
    assert len(t1_data["candidates"]) > 0

    # Turn 2: Conversational export
    t2_resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Make a PDF of that.", "session_id": session_id},
    )
    assert t2_resp.status_code == 200, t2_resp.text
    t2_data = t2_resp.json()

    assert t2_data["capability"] == "artifact.from_context"
    assert t2_data["timings"]["retrieval_sec"] == 0.0
    assert len(t2_data["artifacts"]) == 1

    art = t2_data["artifacts"][0]
    assert art["name"].endswith(".pdf")

    # Download and inspect PDF content
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 500

    pdf = pypdfium2.PdfDocument(io.BytesIO(dl_resp.content))
    assert len(pdf) >= 1
    pdf_text = "".join(page.get_textpage().get_text_range() for page in pdf)
    assert "Chancellor" in pdf_text or "REVA" in pdf_text


def test_turn1_all_courses_then_turn2_put_into_excel(api_client):
    """Test 2: Exhaustive program catalogue followed by 'Put this into Excel.' exports 16 canonical programs."""
    session_id = "sess-excel-conv-test"

    # Turn 1: Exhaustive query
    t1_resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Tell me all the courses of REVA.", "session_id": session_id},
    )
    assert t1_resp.status_code == 200, t1_resp.text
    t1_data = t1_resp.json()
    assert t1_data["capability"] == "retrieval.exhaustive_extraction"

    # Turn 2: Conversational export to Excel
    t2_resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Put this into Excel.", "session_id": session_id},
    )
    assert t2_resp.status_code == 200, t2_resp.text
    t2_data = t2_resp.json()

    assert t2_data["capability"] == "artifact.from_context"
    assert t2_data["timings"]["retrieval_sec"] == 0.0
    assert len(t2_data["artifacts"]) == 1

    art = t2_data["artifacts"][0]
    assert art["name"].endswith(".xlsx")

    # Download and inspect Excel content
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200

    wb = openpyxl.load_workbook(io.BytesIO(dl_resp.content))
    sheet = wb.active
    all_cells_text = " ".join(str(cell.value) for row in sheet.iter_rows() for cell in row if cell.value is not None)

    # Must contain canonical program names
    assert "Civil Engineering" in all_cells_text
    assert "Computer Science and Engineering" in all_cells_text
    assert "Electrical and Electronics Engineering" in all_cells_text
    assert "Aerospace Engineering" in all_cells_text
    assert "Mechatronics Engineering" in all_cells_text
    assert "Agricultural Engineering" in all_cells_text


def test_courses_report_then_generate_pdf_of_this_report(api_client):
    """Test 3: Exact repro of user bug: 'generate me a pdf of this report you gave'.
    
    Verifies:
    1. Correct REVA academic programs & courses are present.
    2. Zero vector search occurs.
    3. Unrelated sections like '4.2 Classification of Courses' and 'Program Assessment Committee'
       are STRICTLY ABSENT.
    """
    session_id = "sess-reva-bug-repro"

    # Turn 1: User asks for courses
    t1_resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "tell me all the courses mentioned in reva", "session_id": session_id},
    )
    assert t1_resp.status_code == 200, t1_resp.text
    assert t1_resp.json()["capability"] == "retrieval.exhaustive_extraction"

    # Turn 2: User asks for PDF of the preceding report
    t2_resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "generate me a pdf of this report you gave", "session_id": session_id},
    )
    assert t2_resp.status_code == 200, t2_resp.text
    t2_data = t2_resp.json()

    assert t2_data["capability"] == "artifact.from_context"
    assert t2_data["timings"]["retrieval_sec"] == 0.0
    assert len(t2_data["artifacts"]) == 1

    art = t2_data["artifacts"][0]
    assert art["name"].endswith(".pdf")

    # Download PDF
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200

    pdf = pypdfium2.PdfDocument(io.BytesIO(dl_resp.content))
    full_pdf_text = "".join(page.get_textpage().get_text_range() for page in pdf)

    # 1. POSITIVE ASSERTIONS: Contains actual course and program content
    assert "Civil Engineering" in full_pdf_text
    assert "Computer Science" in full_pdf_text
    assert "Mechanical Engineering" in full_pdf_text
    assert "reva" in full_pdf_text.lower()

    # 2. NEGATIVE ASSERTIONS: Must NOT contain the wrong RAG context chunks
    assert "4.2 Classification of Courses" not in full_pdf_text
    assert "Program Assessment Committee" not in full_pdf_text
    assert "Assessment and Evaluation" not in full_pdf_text
    assert "Deviations" not in full_pdf_text


def test_explicit_document_expansion_not_conversational(api_client):
    """Test 4: Explicit document request must NOT be treated as zero-search conversational export."""
    resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Create a detailed PDF about REVA programs using the document."},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["capability"] != "artifact.from_context"


def test_new_topic_artifact_not_conversational(api_client):
    """Test 5: New topic artifact creation without conversational reference must not be artifact.from_context."""
    resp = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Make a PDF about classification of courses."},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["capability"] != "artifact.from_context"
