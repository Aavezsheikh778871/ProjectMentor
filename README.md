# ProjectMentor AI

An AI-powered platform that helps final-year students **generate project ideas** from their skills and interests, then **mentors them** into a practical project: features, tech stack, a week-by-week roadmap, architecture, an academic abstract, and a follow-up AI mentor chat.

Built for the PromptWars hackathon (Parul University).

---

## Why this demo can't break

The single most important design decision: **the app runs fully with zero configuration.**

- **No MongoDB?** The server detects it and runs on an in-memory store. Auth, saved projects and conversations all still work.
- **No AI API key?** A deterministic **offline reasoning engine** produces the same idea/plan/mentor output shapes an LLM would. It's seeded, so the same profile always yields the same ideas.
- **Have a key?** Set one and the app upgrades to live LLM output automatically. If the LLM returns malformed or partial JSON, the response is **repaired** by merging in the offline engine's result rather than erroring.
- **LLM times out or rate-limits mid-demo?** It silently falls back to the engine.

Dead venue wifi, an expired free tier, or a rate limit cannot take down the presentation.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Framer Motion, react-hot-toast, react-markdown |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose) — optional, falls back to in-memory |
| AI | Gemini **or** any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter, Ollama) — optional, falls back to the offline engine |
| Auth | JWT (bcrypt-hashed passwords) |

---

## Project structure

```
/client                 React + Vite frontend
  src/pages             Landing, Login, Register, Dashboard, Generate, Mentor
  src/components        Shared UI primitives + IdeaDetailModal
  src/context           AuthContext
  src/lib               api client, constants
/server                 Express backend
  src/models            Mongoose schemas (User, ProjectIdea, Conversation, Feedback)
  src/routes            API endpoint definitions
  src/controllers       Request handlers
  src/services          AI service layer (aiService, providers, prompts, fallbackEngine, knowledge)
  src/repositories      Mongo-or-memory data access
  src/middleware        auth, validate, rateLimit, errorHandler
  src/utils             cache, token, logger, ApiError/ApiResponse, sanitize
docker-compose.yml      Full stack in one command
```

---

## Quick start

Requires Node 20+.

```bash
# 1. install both apps
npm run install:all

# 2. (optional) configure the server — it works without this
cp server/.env.example server/.env
#   leave everything blank to run zero-config, or add a GEMINI_API_KEY / OPENAI_API_KEY

# 3. run the backend (terminal 1)
npm run dev:server        # http://localhost:5000

# 4. run the frontend (terminal 2)
npm run dev:client        # http://localhost:5173
```

Open http://localhost:5173, register a student account, and generate ideas.

### Or with Docker

```bash
docker compose up --build      # client on :5173, API on :5000, Mongo included
```

---

## Configuring AI (optional)

Edit `server/.env`. Pick **one** provider; leave `AI_PROVIDER` blank to auto-detect.

```bash
# Google Gemini (generous free tier)
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.6-flash

# — or any OpenAI-compatible endpoint —
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1     # Groq/OpenRouter/Ollama also work
OPENAI_MODEL=gpt-4o-mini
```

The active engine is reported by `GET /api/health` and shown on generated results ("AI-generated" vs "Offline engine").

---

## API overview

Base URL `/api`. All responses use `{ success, data }` or `{ success, error }`.

**Auth** — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**Projects** — `POST /projects/generate` (5 scored ideas), `GET /projects/saved`, `POST /projects/save/:id`, `DELETE /projects/saved/:id`, `GET /projects/details/:id` (full plan), `POST /projects/improve/:id`, `PUT /projects/status/:id`

**Mentor** — `POST /mentor/chat`, `GET /mentor/conversations`, `GET /mentor/conversation/:id`, `DELETE /mentor/conversation/:id`

**Generate** — `POST /generate/{techstack,timeline,abstract,features,architecture}`

**Explore** (public) — `GET /explore/trending`, `GET /explore/ideas?domain=&difficulty=`, `POST /explore/rate/:id`

Protected routes require `Authorization: Bearer <token>`. AI endpoints are rate-limited to 10 requests/day per user (disable with `DISABLE_RATE_LIMIT=true` for demos).

---

## Security & production notes

- Passwords hashed with bcrypt; JWTs signed server-side; secret required in production.
- helmet, CORS, gzip compression, request sanitisation (XSS + Mongo-operator injection), and per-user rate limiting are all in place.
- AI responses are cached (24h TTL) so repeated identical queries are instant and cheap. The cache is an in-memory module with a Redis-compatible surface — swapping to Redis means rewriting one file.

## Built vs. deferred

Given the hackathon time box, the core loop (idea generation → scored comparison → full mentor blueprint → follow-up chat → save/persist) is complete and verified end-to-end. Deferred for later: Swagger UI docs, PWA service worker, a guided onboarding tour, and a Kanban progress board. The Redis cache and PDF export are implemented as an in-memory cache and Markdown/print output respectively.
