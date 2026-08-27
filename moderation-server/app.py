import hmac
import os
import re
import unicodedata
from typing import Literal

import torch
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_ID = os.getenv("MODEL_ID", "hongssi/final_abuse_manual_model")
MODEL_PATH = os.getenv("MODEL_PATH", "/opt/model")
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "128"))
BLOCK_THRESHOLD = float(os.getenv("BLOCK_THRESHOLD", "0.85"))
REVIEW_THRESHOLD = float(os.getenv("REVIEW_THRESHOLD", "0.55"))
MODERATION_SECRET = os.environ["MODERATION_SECRET"]

if not 0 <= REVIEW_THRESHOLD <= BLOCK_THRESHOLD <= 1:
    raise RuntimeError("임계값은 0 <= REVIEW_THRESHOLD <= BLOCK_THRESHOLD <= 1이어야 합니다.")

FALLBACK_LABELS = [
    "여성/가족",
    "남성",
    "성소수자",
    "인종/국적",
    "연령",
    "지역",
    "종교",
    "기타 혐오",
    "악플/욕설",
    "clean",
    "개인지칭",
]
IGNORED_LABELS = {"clean", "개인지칭"}

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH, local_files_only=True)
model.eval()


def get_labels() -> list[str]:
    configured = [str(model.config.id2label[index]) for index in range(model.config.num_labels)]
    if len(configured) == len(FALLBACK_LABELS) and all(label.startswith("LABEL_") for label in configured):
        return FALLBACK_LABELS
    return configured


LABELS = get_labels()
if len(LABELS) != model.config.num_labels:
    raise RuntimeError("모델 레이블 수가 출력 크기와 일치하지 않습니다.")

app = FastAPI(title="SASA FOOD Moderation API", version="1.0.0")


class ModerationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=300)


class ModerationResponse(BaseModel):
    decision: Literal["allow", "review", "block"]
    label: str
    score: float
    model: str


def authorize(authorization: str) -> None:
    expected = f"Bearer {MODERATION_SECRET}"
    if not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text).strip().lower()
    normalized = re.sub(r"\s+", " ", normalized)
    return re.sub(r"(.)\1{3,}", r"\1\1", normalized)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ready", "model": MODEL_ID}


@app.post("/moderate", response_model=ModerationResponse)
def moderate(
    request: ModerationRequest,
    authorization: str = Header(default=""),
) -> ModerationResponse:
    authorize(authorization)
    inputs = tokenizer(
        normalize_text(request.text),
        return_tensors="pt",
        truncation=True,
        max_length=MAX_LENGTH,
    )

    with torch.inference_mode():
        probabilities = torch.sigmoid(model(**inputs).logits[0]).tolist()

    scores = dict(zip(LABELS, probabilities, strict=True))
    harmful_scores = {label: score for label, score in scores.items() if label not in IGNORED_LABELS}
    label, score = max(harmful_scores.items(), key=lambda item: item[1])

    decision: Literal["allow", "review", "block"]
    if score >= BLOCK_THRESHOLD:
        decision = "block"
    elif score >= REVIEW_THRESHOLD:
        decision = "review"
    else:
        decision = "allow"

    return ModerationResponse(decision=decision, label=label, score=score, model=MODEL_ID)
