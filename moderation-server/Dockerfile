FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/huggingface \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    MODEL_PATH=/opt/model

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py .

RUN HF_HUB_OFFLINE=0 TRANSFORMERS_OFFLINE=0 python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; model_id='hongssi/final_abuse_manual_model'; tokenizer=AutoTokenizer.from_pretrained(model_id); model=AutoModelForSequenceClassification.from_pretrained(model_id); tokenizer.save_pretrained('/opt/model'); model.save_pretrained('/opt/model')"

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
