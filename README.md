# 🦥 LazyDesk AI — Open-Source AI Document Organizer

> **Built for Hacktoberfest 2026 Week 3: "Slow and Steady"**  
> *Channel your inner sloth. Let local open-weight AI do the heavy lifting of reading, categorizing, summarizing, and renaming your messy files.*

[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-Week%203%3A%20Slow%20%26%20Steady-orange?style=flat-square)](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Local AI: Ollama](https://img.shields.io/badge/Local%20AI-Gemma%203%20%2F%20Ollama-emerald?style=flat-square)](https://ollama.com)
[![Stack: MERN](https://img.shields.io/badge/Stack-MERN-indigo?style=flat-square)](https://react.dev)

---

## 🌟 The Problem & The "Lazy" Payoff

Nobody enjoys spending their evenings or workdays sifting through downloaded files with cryptic names like `Scan_20261019_001.pdf`, `Invoice_FINAL_v2(3).pdf`, or `notes_temp.txt`. You have to:
1. Open each file.
2. Skim through pages to figure out what it actually is.
3. Guess a good category and tag.
4. Rename it to a standardized format like `2026-10-acme-cloud-invoice.pdf`.
5. Move it to the right folder.

**A sloth wouldn't do that, and neither should you.**

**LazyDesk AI** automates this entire chore on your local desktop. Drop your PDFs and TXT files into the dashboard, and a locally running, open-weight model (**Google Gemma via Ollama**) parses the contents, extracts key details, generates a concise summary, tags the document, and suggests a clean, standardized filename. You review and approve the suggestion with a single click.

---

## 🔒 Why Open Innovation & Local AI Matter

LazyDesk AI was intentionally built with **100% on-device, open-source AI** rather than proprietary cloud APIs (like OpenAI or Claude Cloud). Here is why:

1. **Uncompromised Privacy**: Documents often contain sensitive data — financial invoices, tax records, medical statements, NDAs, and source code specs. Sending these files to third-party cloud LLMs creates compliance liabilities and privacy risks. With LazyDesk AI, **zero bytes leave your local computer**.
2. **Zero Recurring Inference Cost**: Cloud APIs charge per thousand tokens for every document parsed. Running open-weight Gemma on Ollama costs **$0.00**, whether you process 10 files or 10,000 files.
3. **Offline Resilience**: LazyDesk AI runs completely offline on an airplane, train, or remote retreat. No internet connection is required.
4. **Model Freedom & Portability**: You are not locked into any proprietary vendor. You can switch from `gemma3:1b` to `gemma3:4b`, `gemma:2b`, `llama3.2`, or any specialized open-weight model with a single environment variable change (`OLLAMA_MODEL`).

---

## 🏗 Architecture & Data Flow

```
                      +-----------------------------+
                      |      React + Vite Client    |
                      |   (Modern Glassmorphism UI) |
                      +--------------+--------------+
                                     |
                          REST API   |  CORS / Proxy
                                     v
                      +-----------------------------+
                      |     Express.js Backend      |
                      |   (Node.js ES Modules)      |
                      +-------+--------------+------+
                              |              |
           Extract & Validate |              | Store Metadata
                              v              v
        +-------------------------+    +-----------------------+
        | Safe Storage & Parser   |    | MongoDB (Mongoose)    |
        | - Isolated uploads/ dir |    | - Documents collection|
        | - Magic bytes check     |    | - Text & category idx |
        | - pdf-parse & utf-8     |    +-----------------------+
        +------------+------------+
                     |
                     | Untrusted Text + Guardrail Prompt
                     v
        +-----------------------------------------------+
        | Local Ollama HTTP API (localhost:11434)       |
        | - Open-weight Gemma 3 model                   |
        | - JSON Format Enforcement                     |
        | - Prompt Injection Defense                    |
        +-----------------------------------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ or v22+
- **MongoDB**: Running locally on `mongodb://127.0.0.1:27017`
- **Ollama**: Installed from [ollama.com](https://ollama.com) (optional for base upload/search, required for local AI analysis)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/LazyDesk-AI.git
cd LazyDesk-AI

# Install all root, server, and client dependencies
npm run install:all
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/lazydesk-ai
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:1b
OLLAMA_TIMEOUT_MS=60000
MAX_FILE_SIZE_BYTES=10485760
MAX_TEXT_EXTRACT_CHARS=8000
```

### 3. Start Local AI Model (Ollama)

In a separate terminal, pull and start Gemma:

```bash
ollama run gemma3:1b
```

*(You can also use `gemma:2b` or any model of your choice by changing `OLLAMA_MODEL` in `.env`)*

### 4. Run the Application

Start both the backend server and Vite frontend concurrently:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Health Probe**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

*(Or run a unified production build via `npm run build && npm start` to access the full app on `http://localhost:5000`)*

---

## 🧪 Testing

LazyDesk AI includes an automated unit and integration test suite using Node.js's native test runner (`node:test`).

Run all tests:

```bash
npm test
```

Test coverage includes:
- **`extractor.test.js`**: Magic byte signature verification, PDF and TXT extraction, length truncation guardrails.
- **`ollama.test.js`**: Structured JSON output validation, category allowlist enforcement, malicious filename sanitization, offline status reporting.
- **`storage.test.js`**: Path traversal prevention, safe filename generation, directory isolation.
- **`api.test.js`**: Health check status, upload validation, error handling.

---

## 📁 Sample Test Documents

Non-sensitive test documents are pre-generated in the `samples/` directory for instant testing:
- `samples/quarterly-financial-invoice.txt`: Sample hosting bill.
- `samples/software-consulting-agreement.pdf`: Real multi-clause legal consulting agreement.
- `samples/quantum-sensor-hardware-spec.pdf`: Technical hardware specification sheet.
- `samples/open-weight-ai-research-notes.txt`: Markdown research notes.

You can drag and drop any of these directly into the dashboard upload zone!

---

## 🛡️ Security Guardrails

- **Strict Path Traversal Protection**: Uploaded files are stored with random UUID filenames inside an isolated directory. User-suggested or model-suggested names are never directly used as filesystem paths.
- **Prompt Injection Defense**: Document content is encapsulated as untrusted user data with strict delimiter tags. The system prompt instructs Gemma never to follow or execute commands found within documents.
- **Magic Bytes Validation**: File contents are inspected to ensure uploaded files are genuine PDFs or valid plain text, preventing disguised binary files.
- **Human-in-the-Loop Review**: No file is overwritten or permanently renamed without explicit user review and confirmation.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
