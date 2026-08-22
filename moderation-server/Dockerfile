FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/huggingface

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py .

RUN python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; model_id='hongssi/final_abuse_manual_model'; AutoTokenizer.from_pretrained(model_id); AutoModelForSequenceClassification.from_pretrained(model_id)"

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
