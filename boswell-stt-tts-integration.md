
## Open‑Source STT + TTS Integration: Quick‑Start Guide

Below is a “starter‑kit” for hooking an open‑source Speech‑to‑Text (STT) engine to a Text‑to‑Speech (TTS) engine, in a single‑process Python pipeline.  
Feel free to swap out any component for a different model – all the code will still work as long as the component exposes a Python API.

---

| **Task** | **Typical Open‑Source Options** | **Python Package** | **Typical License** |
|----------|---------------------------------|---------------------|---------------------|
| **STT** | • **Vosk** (Kaldi‑based, small‑footprint)  <br>• **Coqui‑STT** (TensorFlow‑based, lightweight) <br>• **OpenAI Whisper** (large, accurate) <br>• **Kaldi** (full pipeline) | `vosk`, `coqui-stt`, `whisper`, `kaldi-python` | MIT / Apache‑2.0 |
| **TTS** | • **Coqui‑TTS** (Tacotron‑2 + WaveRNN, multi‑voice) <br>• **Mozilla TTS** (same as Coqui‑TTS) <br>• **ESPnet‑TTS** (end‑to‑end, high‑quality) <br>• **Festival / eSpeak** (older, lightweight) | `tts`, `espnet`, `festival` | Apache‑2.0 / GPL |
| **Audio I/O** | • `sounddevice`, `pyaudio`, `webrtcvad` | `sounddevice` | BSD 3‑Clause |
| **Other** | • `transformers` (for Whisper) | `transformers` | Apache‑2.0 |

---

## 1. Install Everything

```bash
# Create a clean venv
python -m venv stt_tts_env
source stt_tts_env/bin/activate

# Core packages
pip install --upgrade pip
pip install sounddevice numpy
pip install vosk  # or coqui-stt, whisper, etc.
pip install tts  # Coqui‑TTS
```

> **Tip**  
> If you want Whisper, install `openai-whisper` or the HuggingFace `transformers` variant.  
> ```bash
> pip install openai-whisper
> pip install transformers
> ```

---

## 2. A Minimal “Talk‑Back” Pipeline

The following script listens to the default microphone, sends the captured audio to an STT engine, then feeds the resulting text into a TTS engine and plays it back.

```python
import sounddevice as sd
import numpy as np
import queue
import threading
import time

# ------------------------------------------------------------------
# 1. STT – Vosk
# ------------------------------------------------------------------
from vosk import Model, KaldiRecognizer
vosk_model = Model("model")            # download https://alphacephei.com/vosk/models
rec = KaldiRecognizer(vosk_model, 16000)

# ------------------------------------------------------------------
# 2. TTS – Coqui TTS
# ------------------------------------------------------------------
from tts.api import TTS
tts = TTS(tts_name="tts_models/en/ljspeech/tacotron2-DDC", device="cpu")  # pick a pre‑trained model

# ------------------------------------------------------------------
# 3. Audio Buffers
# ------------------------------------------------------------------
q = queue.Queue()
audio_stream = sd.RawInputStream(samplerate=16000,
                                 dtype='int16',
                                 channels=1,
                                 callback=lambda indata, frames, time, status: q.put(bytes(indata)))

# ------------------------------------------------------------------
# 4. Background thread: capture audio and feed to STT
# ------------------------------------------------------------------
def capture():
    with audio_stream:
        while True:
            data = q.get()
            if rec.AcceptWaveform(data):
                # Full utterance finished
                result = rec.Result()
                # JSON: {"text":"..."}
                text = eval(result)['text']
                if text:
                    print("You said:", text)
                    # Feed to TTS
                    wav = tts.tts_to_file(text, file_path="out.wav")
                    # Play back
                    sd.play(wav, 16000)
                    sd.wait()

t = threading.Thread(target=capture, daemon=True)
t.start()

# ------------------------------------------------------------------
# 5. Keep the main thread alive
# ------------------------------------------------------------------
try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\nStopping...")
```

**What it does**

1. **Capture**: Records raw PCM at 16 kHz.  
2. **STT**: Vosk runs on the chunk; when a complete sentence is detected, `rec.Result()` returns a JSON string with the recognized text.  
3. **TTS**: Coqui‑TTS turns the text into speech (`tts_to_file` writes a WAV).  
4. **Playback**: The WAV is immediately played back via `sounddevice`.

> **Why `tts_to_file` instead of `tts.tts(text)`?**  
> `tts_to_file` writes a file on disk and returns the path, making it trivial to play.  
> If you prefer in‑memory bytes, use `tts.tts(text, output_format="audio")` and play with `sd.play`.

---

## 3. Switching Components

**Replace Vosk with Whisper (full‑bandwidth, large‑scale)**
```bash
pip install openai-whisper
```
```python
import whisper
whisper_model = whisper.load_model("small")   # or "large"

def whisper_recognize(audio_bytes):
    # Whisper expects a numpy array of shape (samples,)
    wav = np.frombuffer(audio_bytes, np.int16).astype(np.float32) / 32768.0
    result = whisper_model.transcribe(wav, fp16=False)
    return result["text"]
```

**Replace Coqui‑TTS with ESPnet**
```bash
pip install espnet
```
```python
# Example – call the REST API of ESPnet TTS
# (Or run the python inference code directly – see ESPnet docs)
```

---

## 4. Advanced Tips

| Feature | How to Add |
|---------|------------|
| **Noise‑Reduction/VAD** | `webrtcvad` to cut out silence; feed only voiced segments to STT. |
| **Bidirectional Conversation** | Store conversation history and pass it to TTS as context; for more natural TTS use a *voice‑clone* model. |
| **Multi‑Language** | Load the appropriate STT/TTS model per user locale. |
| **GPU Acceleration** | For Whisper and TTS, specify `device="cuda"` and install `pytorch` with CUDA support. |
| **Microservice Architecture** | Wrap each engine behind a FastAPI endpoint; a “voice‑bot” orchestrator can run them in parallel. |

---

## 5. Licensing & Deployment

- **Vosk** – MIT, so you can bundle it in commercial apps.  
- **Coqui‑TTS** – Apache‑2.0, same friendliness.  
- **Whisper** – MIT.  
- **ESPnet** – Apache‑2.0.  
- **Festival / eSpeak** – GPL (be mindful if you ship a binary).

If you plan to expose your service over the Internet, run the code inside Docker containers for reproducibility:

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg libsndfile1
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

---

## 6. Quick Reference Links

| **Component** | **GitHub / Docs** |
|---------------|-------------------|
| Vosk | https://github.com/alphacep/vosk-api |
| Coqui‑STT | https://github.com/coqui-ai/STT |
| Whisper | https://github.com/openai/whisper |
| Coqui‑TTS | https://github.com/coqui-ai/TTS |
| ESPnet | https://github.com/espnet/espnet |
| Festival | https://github.com/festvox/festival |
| sounddevice | https://python-sounddevice.readthedocs.io |
| webrtcvad | https://github.com/wiseman/py-webrtcvad |

---

### TL;DR

1. Pick an STT (Vosk/Whisper) and a TTS (Coqui‑TTS/ESPnet).  
2. Install both with pip.  
3. Record audio → STT → Text → TTS → Play.  
4. Swap in/out components as needed; all have pure‑Python APIs.  
5. Wrap in a FastAPI or Flask app if you need a service.  

Happy building! If you hit any roadblocks, drop a comment and let me know what you’re trying to achieve.
