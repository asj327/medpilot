from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import json
import os
import sqlite3
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ── database setup ────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect("medpilot.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            patient     TEXT    NOT NULL,
            test_name   TEXT    NOT NULL,
            status      TEXT    DEFAULT 'pending',
            is_critical INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

init_db()


# ── routes will go here ───────────────────────────────────────────
@app.get("/ping")
def ping():
    return {"status": "MedPilot is running"}


# ── POST /transcribe ──────────────────────────────────────────────
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), patient: str = "Unknown"):

    audio_bytes = await audio.read()
    if not audio_bytes:
        return JSONResponse(status_code=400, content={"error": "Empty audio file"})

    async with httpx.AsyncClient() as http:
        dg_response = await http.post(
            "https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&numerals=true&diarize=true",
            headers={
                "Authorization": f"Token {DEEPGRAM_KEY}",
                "Content-Type": audio.content_type,
            },
            content=audio_bytes,
            timeout=30
        )

    if dg_response.status_code != 200:
        return JSONResponse(status_code=502, content={"error": "Deepgram failed", "detail": dg_response.text})

    words = dg_response.json()["results"]["channels"][0]["alternatives"][0]["words"]

    # group words by speaker
    transcript_lines = []
    current_speaker = None
    current_line = []

    for word in words:
        speaker = word.get("speaker", 0)
        if speaker != current_speaker:
            if current_line:
                label = "Doctor" if current_speaker == 0 else "Patient"
                transcript_lines.append(f"{label}: {' '.join(current_line)}")
            current_speaker = speaker
            current_line = [word["punctuated_word"]]
        else:
            current_line.append(word["punctuated_word"])

    # add last line
    if current_line:
        label = "Doctor" if current_speaker == 0 else "Patient"
        transcript_lines.append(f"{label}: {' '.join(current_line)}")

    transcript = "\n".join(transcript_lines)

    if not transcript.strip():
        return JSONResponse(status_code=422, content={"error": "Audio was silent or unclear"})

    return {"transcript": transcript}


# ── POST /analyse ─────────────────────────────────────────────────
# step 2 — transcript to SOAP + conditions
class AnalyseIn(BaseModel):
    transcript: str

@app.post("/analyse")
def analyse(body: AnalyseIn):

    prompt = f"""You are a clinical documentation assistant.

Given this doctor-patient consultation transcript, return a JSON object with exactly these fields:
{{
  "soap": {{
    "subjective": "what the patient reports — symptoms, history, complaints",
    "objective": "measurable findings — vitals, exam results if mentioned",
    "assessment": "likely diagnosis or clinical impression",
    "plan": "treatment plan, medications, follow-up"
  }},
  "conditions": [
    {{
      "name": "condition name",
      "likelihood": "high / medium / low",
      "tests": ["test 1", "test 2"]
    }}
  ]
}}

Return exactly 3 conditions. Return only valid JSON — no explanation, no markdown.

Transcript:
{body.transcript}"""

    llm_response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    try:
        result = json.loads(llm_response.choices[0].message.content)
    except json.JSONDecodeError:
        return JSONResponse(status_code=500, content={"error": "LLM returned invalid JSON"})

    return {
        "soap": result["soap"],
        "conditions": result["conditions"]
    }
    
# ── POST /reports ─────────────────────────────────────────────────
class ReportIn(BaseModel):
    patient: str
    tests: list[str]

@app.post("/reports")
def save_reports(body: ReportIn):
    conn = get_db()
    for test in body.tests:
        conn.execute(
            "INSERT INTO reports (patient, test_name) VALUES (?, ?)",
            (body.patient, test)
        )
    conn.commit()
    conn.close()
    return {"message": f"Saved {len(body.tests)} tests for {body.patient}"}


# ── GET /reports ──────────────────────────────────────────────────
@app.get("/reports")
def get_reports():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM reports ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ── PATCH /reports/{report_id}/critical ───────────────────────────
class CriticalUpdate(BaseModel):
    is_critical: bool

@app.patch("/reports/{report_id}/critical")
def flag_critical(report_id: int, body: CriticalUpdate):
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM reports WHERE id = ?", (report_id,)
    ).fetchone()

    if row is None:
        conn.close()
        return JSONResponse(
            status_code=404,
            content={"error": f"Report {report_id} not found"}
        )

    conn.execute(
        "UPDATE reports SET is_critical = ? WHERE id = ?",
        (1 if body.is_critical else 0, report_id)
    )
    conn.commit()
    conn.close()

    return {
        "id": report_id,
        "is_critical": body.is_critical,
        "message": "Flagged as critical" if body.is_critical else "Flag removed"
    }