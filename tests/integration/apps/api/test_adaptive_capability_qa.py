"""Integration tests verifying end-to-end adaptive capability routing and artifact delivery via /rag/qa."""

import pytest
from fastapi.testclient import TestClient
from apps.api.app import create_app
from apps.context import AppContext


@pytest.fixture
def api_client():
    ctx = AppContext.create()
    app = create_app(app_context=ctx)
    return TestClient(app)


def test_adaptive_qa_excel_generation(api_client):
    """Verify that asking to create an Excel sheet via /rag/qa generates .xlsx and serves download."""
    payload = {
        "query": "Create an Excel sheet of safety equipment inspection logs: Tank T-101 pressure 4.5 bar, Pump P-201 flow 120 m3/h, Valve V-301 status Open",
        "top_k": 8,
        "top_n": 8,
    }
    response = api_client.post("/api/v1/rag/qa", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["capability"] == "artifact.generate"
    assert len(data["artifacts"]) >= 1

    art = data["artifacts"][0]
    assert art["name"].endswith(".xlsx")
    assert art["mime_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert art["size_bytes"] > 0
    assert art["download_url"].startswith("/api/v1/artifacts/")

    # Test downloading the artifact
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) == art["size_bytes"]
    assert "attachment" in dl_resp.headers.get("content-disposition", "")


def test_adaptive_qa_pdf_generation(api_client):
    """Verify that asking to create a PDF report via /rag/qa generates .pdf and serves download."""
    payload = {
        "query": "Generate a PDF report summarizing equipment inspection procedures",
        "top_k": 8,
        "top_n": 8,
    }
    response = api_client.post("/api/v1/rag/qa", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["capability"] == "artifact.generate"
    assert len(data["artifacts"]) >= 1

    art = data["artifacts"][0]
    assert art["name"].endswith(".pdf")
    assert art["mime_type"] == "application/pdf"
    assert art["size_bytes"] > 0

    # Test downloading the PDF
    dl_resp = api_client.get(art["download_url"])
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) == art["size_bytes"]
    assert dl_resp.content.startswith(b"%PDF")


def test_adaptive_qa_rag_preservation(api_client):
    """Verify that regular queries are strictly routed to retrieval.rag with zero regression."""
    payload = {
        "query": "What is the design pressure of FV-201A?",
        "top_k": 8,
        "top_n": 8,
    }
    response = api_client.post("/api/v1/rag/qa", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["capability"] == "retrieval.rag"
    assert data["artifacts"] == []
    assert len(data["candidates"]) > 0
    assert len(data["answer"]) > 0
