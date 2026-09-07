"""Integration tests for Exhaustive Document Extraction vs Standard Grounded RAG in /rag/qa."""

import pytest
from fastapi.testclient import TestClient
from apps.api.app import create_app
from apps.context import AppContext


@pytest.fixture
def api_client():
    ctx = AppContext.create()
    app = create_app(app_context=ctx)
    return TestClient(app)


def test_query_1_chancellor_normal_rag(api_client):
    """Query 1: Factual inquiry 'Who is the Chancellor of REVA University?' must remain normal RAG."""
    response = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Who is the Chancellor of REVA University?", "top_k": 8, "top_n": 8},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["capability"] == "retrieval.rag"
    assert data["artifacts"] == []
    assert len(data["candidates"]) > 0
    assert "chancellor" in data["answer"].lower() or len(data["answer"]) > 20


def test_query_2_eligibility_normal_rag(api_client):
    """Query 2: Specific factual inquiry 'What is the admission eligibility?' must remain normal RAG."""
    response = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "What is the admission eligibility?", "top_k": 8, "top_n": 8},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["capability"] == "retrieval.rag"
    assert data["artifacts"] == []
    assert len(data["candidates"]) > 0


def test_query_3_all_courses_exhaustive(api_client):
    """Query 3: 'Tell me all the courses of REVA.' must trigger exhaustive extraction with 16 programs."""
    response = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Tell me all the courses of REVA.", "top_k": 8, "top_n": 8},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["capability"] == "retrieval.exhaustive_extraction"
    ans = data["answer"]
    
    # Must list all major programs
    assert "Civil Engineering" in ans
    assert "Computer Science and Engineering" in ans
    assert "Artificial Intelligence and Machine Learning" in ans
    assert "Information Science and Engineering" in ans
    assert "Electrical and Electronics Engineering" in ans
    assert "Electronics and Communication Engineering" in ans
    assert "Robotics and Artificial Intelligence" in ans
    assert "Mechanical Engineering" in ans
    assert "Mechatronics Engineering" in ans
    assert "Aerospace Engineering" in ans
    assert "Agricultural Engineering" in ans

    # Must NOT have generic placeholders
    assert "Other undergraduate courses in various disciplines (not specified" not in ans
    assert "Master's degree in various disciplines (not specified" not in ans

    # Must have candidate citations from ground-truth chunks
    assert len(data["candidates"]) >= 4


def test_query_4_every_program_exhaustive(api_client):
    """Query 4: 'Give me every program in this document.' triggers exhaustive extraction."""
    response = api_client.post(
        "/api/v1/rag/qa",
        json={"query": "Give me every program in this document.", "top_k": 8, "top_n": 8},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["capability"] == "retrieval.exhaustive_extraction"
    assert "Civil Engineering" in data["answer"]
    assert "Aerospace Engineering" in data["answer"]


def test_query_5_excel_all_courses_with_ai_descriptions(api_client):
    """Query 5: 'Create an Excel containing all REVA courses with an AI description for each.'

    Must generate both exhaustive catalogue and a valid .xlsx artifact with matching row counts.
    """
    response = api_client.post(
        "/api/v1/rag/qa",
        json={
            "query": "Create an Excel containing all REVA courses with an AI description for each.",
            "top_k": 8,
            "top_n": 8,
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["capability"] == "retrieval.exhaustive_extraction"
    assert len(data["artifacts"]) >= 1

    art = data["artifacts"][0]
    assert art["name"].endswith(".xlsx")
    assert art["mime_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert art["size_bytes"] > 0
    assert art["download_url"].startswith("/api/v1/artifacts/")

    # Download verification
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) == art["size_bytes"]


def test_query_6_pdf_catalogue_all_programs(api_client):
    """Query 6: 'Create a PDF catalogue of all REVA programs.'

    Must generate both exhaustive extraction and a valid .pdf artifact.
    """
    response = api_client.post(
        "/api/v1/rag/qa",
        json={
            "query": "Create a PDF catalogue of all REVA programs.",
            "top_k": 8,
            "top_n": 8,
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["capability"] == "retrieval.exhaustive_extraction"
    assert len(data["artifacts"]) >= 1

    art = data["artifacts"][0]
    assert art["name"].endswith(".pdf")
    assert art["mime_type"] == "application/pdf"
    assert art["size_bytes"] > 0

    # Download verification
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) == art["size_bytes"]
    assert dl_resp.content.startswith(b"%PDF")
