# Local AI Orchestrator, Provider Profiles & Smart Dictation Architecture

This document specifies the in-app local AI model runner, Ollama integration, VoiceStudio STT, multi-provider profiles, task-specific routing, and clinical dictation pipelines.

---

## 1. Local AI Engine: Ollama & Dynamic VRAM Lifecycle
- **Zero-Terminal Process & REST API**: Standardized on Ollama (`http://127.0.0.1:11434`) running locally on Windows. Replaces fragile subprocess spawners with standard REST endpoints (`/api/tags`, `/api/ps`, `/api/generate`, `/v1/chat/completions`).
- **Storage & Model Directory**: Ollama model weights are centralized in `E:\AI\ollama` via the `OLLAMA_MODELS` environment variable. Loose source GGUFs reside in `E:\AI\gguf`.
- **Primary Clinical Model**: `medgemma:4b` (imported from `medgemma-1.5-4b-it-Q6_K.gguf`), providing fine-tuned cross-sectional radiology reporting within ~3.45 GB VRAM.
- **Port Invariant (Port 11434)**: Ollama strictly uses port `11434`, preserving port `8080` for Punjab HMIS and port `3780` for the Next.js workstation.
- **Dynamic VRAM Inspection & Instant Release**:
  - `GET /api/ps` inspects real-time GPU VRAM usage and reports the active model directly to the workstation UI.
  - **Instant Unload**: Sending `POST /api/generate` with `{ "model": "<name>", "keep_alive": 0 }` immediately flushes weights from GPU VRAM back to 0 MB without restarting any daemon processes.
  - **1-Click Warmup**: Sending `POST /api/generate` with `{ "model": "<name>", "keep_alive": "60m" }` loads weights into CUDA memory for zero-latency consecutive reports.

---

## 2. VoiceStudio Local Speech-to-Text (STT) Engine
- **Local CUDA Acceleration**: Powered by VoiceStudio (`http://127.0.0.1:3900`), running `faster-whisper-large-v3-turbo` on the dedicated NVIDIA GeForce RTX 4050 Laptop GPU.
- **OpenAI-Compatible Audio API**: Exposes `POST /v1/audio/transcriptions` accepting `multipart/form-data` with standard prompt biasing and audio buffers.
- **Radiology Lexicon Conditioning**: `buildRadiologyAcousticPrompt()` injects modality-specific anatomical vocabulary (MRI, CT, X-Ray, US) into Whisper's initial acoustic prompt, eliminating phonetic slips like "call ladder" -> "gallbladder" and "thecal sack" -> "thecal sac".
- **Zero-PHI Air-Gap**: 100% of audio processing and transcription runs on `127.0.0.1:3900` without dispatching audio packets over the internet.

---

## 3. AI Provider Profiles & Task Routing Architecture
- **Unified Profiles Registry**: Supported providers:
  1. `ollama`: Local MedGemma 4B, Qwen 3.5 4B, or Nemotron 3 Nano.
  2. `gemini`: Google Gemini 3.8 Flash for multimodal vision and rapid cloud analysis.
  3. `anthropic`: Anthropic Claude 3.7 Sonnet for complex discrepancy reviews.
  4. `openrouter`: Multi-LLM gateway with verified free models:
     - `nvidia/nemotron-3.5-super-vl:free`: 1M-context multimodal vision for handwritten requisition OCR & form intake.
     - `dots-studio/dots-3-note-preview:free`: 512k-context specialized clinical note model with internal reasoning.
     - `nvidia/nemotron-3-ultra-550b-a55b:free`: 550B MoE flagship for complex diagnostic reasoning and differentials.
     - `google/gemma-4-31b-it:free`: Google Gemma 4 instruction model for report generation.
     - `meta-llama/llama-3.3-70b-instruct:free`: High-availability fallback workhorse.
  5. `openai`: OpenAI GPT-4o-mini and Whisper-1.
  6. `groq`: Groq Cloud ultra-fast LPUs.
  7. `openai-compatible`: Any LAN endpoint, remote Ollama node, or custom vLLM server.
  8. `offline-rules`: Deterministic rule-based heuristic engine with zero LLM dependence.
- **Specialized Task-Specific Routing (`AITaskRouting`)**:
  - **Report Structuring Profile**: Configurable separately (e.g. `openrouter-notes` / `ollama-medgemma`).
  - **Copilot & QA Review Profile**: Configurable separately (e.g. `openrouter-reasoning` / `ollama-medgemma`).
  - **Multimodal Vision Profile**: Multimodal OpenRouter support (`callOpenAIVision`) enables `openrouter-vision` (`nvidia/nemotron-3.5-super-vl:free`) alongside `gemini-cloud`.
  - **Speech-to-Text Engine**: Configurable across `voicestudio-local`, `openai-whisper`, `groq-whisper`, and `web-speech`.

---

## 4. Workstation Presentation Components
- `<ZenLocalAiPill />`: Header status indicator displaying live VRAM state, model name, and 1-click load/unload controls.
- `<AiCockpitLocalTab />`: Model manager under `/settings` displaying installed Ollama models, live VRAM usage, VoiceStudio CUDA status, and ping diagnostics.
- `<AiCockpitCloudTab />`: Cloud API keys manager, custom LAN endpoint configuration, and task-specific routing dropdowns.
- `<TranscribeDrawer />`: Floating voice dictation drawer with real-time waveform visualizer, quick normal phrases, and 1-click structured slotting into Findings and Impression.
