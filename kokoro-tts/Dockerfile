# Kokoro-82M TTS: CPU inference, espeak-ng for phonemizer fallback.
# https://github.com/hexgrad/kokoro

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng \
    libsndfile1 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch first (kokoro depends on torch).
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY kokoro-tts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY kokoro-tts/app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
