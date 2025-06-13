# AGENTS.md – Chatterbox TTS API (Project Root)

> **Purpose**   This file gives OpenAI Codex (and any human newcomer) the *exact* steps, rules, and guard‑rails for working in this repository. It is **not** a general README—focus on build/run/test, style, and safety. Down‑stream `AGENTS.md` files (if any) override these rules.

---

## 🚦 Agent Guard-Rails & Local-First Policy

### 🛑 Protected subtree
* **Do not** create, modify, delete, or re-format any file inside  
  `chatterbox/**`.  
  These sources are a *vendored snapshot* of Chatterbox-TTS and are kept in sync
  upstream; changes here would be overwritten and may break binary reproducibility.
* If you need to read code from that subtree to answer a question or implement
  a feature elsewhere, that is allowed, but keep it strictly *read-only*.

### 📦 Local Chatterbox build
* Treat `chatterbox/` as the **authoritative package**.  
  When you need Chatterbox-TTS in your Python env:
  
  ```bash
  # One-liner used by tests and scripts
  uv pip install ./chatterbox
  ```
* Never run `uv pip install chatterbox-tts` or `pip install chatterbox-tts` (remote package).

### 🛠️ Environment bootstrap (uv-only)
``` bash 
# Create / sync the env
uv sync               # respects pyproject + uv.lock
uv pip install ./chatterbox   # local package, see above

# Run the API for dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 4123
```
> All CI, tests, and helper scripts assume uv – do not fall back to pip.

### ✅ Sanity checks before PRs

1. `uv run pytest -q` must pass.
2. `uv run python -m app.selftest` (quick speech-generation smoke test) must
produce audio without downloading remote Chatterbox wheels.
3. Verify that `import chatterbox, inspect, os; print(inspect.getfile(chatterbox));` prints a path under `chatterbox/`.

## 1  Project snapshot

- **What**   REST API (FastAPI + Pydantic) exposing Chatterbox‑TTS voice cloning as OpenAI‑compatible endpoints.
- **Why**    Drop‑in replacement for OpenAI TTS with local or Docker deploy, plus optional React UI.
- **Where**  Backend in `app/`, CLI helpers in root, optional web UI in `frontend/`.

---

## 2  Environment – *always use **`uv`*

1. **Install**       `curl -LsSf https://astral.sh/uv/install.sh | sh`
2. **Sync deps**     `uv sync`   # creates/updates `.venv` automatically
3. **Run dev api**   `uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-4123}`
4. **Run helper**    `uv run python start.py dev` (hot‑reload)

> **Never** invoke `pip`, `python -m venv`, or raw `python`/`uvicorn`—wrap them with `uv run` so the agent stays in the managed env.

### 2.1 Docker shortcuts (optional)

- API‑only           `docker compose -f docker/docker-compose.uv.yml up -d`
- API + Frontend     `docker compose -f docker/docker-compose.uv.yml --profile frontend up -d`

---

## 3  Build / Test / Lint

| Action                       | Command                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Unit & integration tests** | `uv run pytest -q`                                                                                                              |
| **Memory regression**        | `uv run python tests/test_memory.py`                                                                                            |
| **API smoke test**           | `curl -X POST http://localhost:4123/v1/audio/speech -H"Content-Type: application/json" -d '{"input":"ping"}' --output ping.wav` |
| **Static type check**        | `uv run mypy app`                                                                                                               |
| **Formatting**               | `uv run ruff format . && uv run ruff check .`                                                                                   |

Codex must ensure **all tests & linters pass** before creating a PR.

---

## 4  Coding conventions

- **Python ≥ 3.11**
- **Formatter** `ruff format` (black‑like) followed by `ruff check --fix`.
- **Import order** `ruff` default.
- **Max line len** 100.
- **Docstrings**   Google style.

> **Rule**: never commit files that fail `ruff check` or `pytest`.

---

## 5  Config & secrets

- Runtime configuration lives in `.env`. Never hard‑code secrets—use env vars or read via `app.config.get_env()`.
- Default voice sample path: `${VOICE_SAMPLE_PATH}` (`./voice-sample.mp3` in dev). Do not change the default unless the .env entry is updated.

---

## 6  Danger zones (do NOT edit without a ticket)

- `app/core/tts_model.py` – heavy model‑loading logic
- `docker/*.Dockerfile*`  – production images
- `frontend/` build config

Changes here **must** reference a GitHub Issue or JIRA ticket in the PR body.

---

## 7  Pull‑request template

```
### Why
<issue‑link or context>
### What
- [ ] Feature / Fix summary
### Tests
- [ ] pytest passes
- [ ] ruff clean
### Risk
<perf, ABI, memory>
```

Codex should populate the checklist automatically.

---

## 8  Automated CI expectations

The CI pipeline executes:

```bash
uv run ruff format --check .
uv run ruff check .
uv run pytest -q
uv run python tests/test_memory.py
```

Merge will be blocked if any step fails.

---

## 9  Troubleshooting quick ref

| Symptom               | Fast fix                                                                            |
| --------------------- | ----------------------------------------------------------------------------------- |
| **CUDA not detected** | `echo DEVICE=cpu >> .env && uv run uvicorn app.main:app --host 0.0.0.0 --port 4123` |
| **Port conflict**     | Change `PORT` in `.env` and restart                                                 |
| **Out‑of‑memory**     | `echo MAX_CHUNK_LENGTH=200 >> .env`                                                 |
| **Dependency hell**   | `uv sync --extra dev` re‑solves the lock                                            |

---

## 10  Checklist before pushing

-

Happy coding!

