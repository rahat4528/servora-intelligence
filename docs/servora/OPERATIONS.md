# Servora Intelligence — Operations & Deployment Runbook

## 1. System Architecture

```mermaid
graph TD
    Client[Web Browser / Agent Desktop] -->|HTTPS / Next.js 14| Frontend[Frontend Next.js App :3000]
    Frontend -->|REST API / JWT| Backend[NestJS Backend API :4000]
    
    subgraph Data Layer
        Backend -->|pgvector / RLS| Postgres[(PostgreSQL 16 pgvector)]
        Backend -->|Cache / Queues| Redis[(Redis 7)]
        Backend -->|Documents / Evidence| MinIO[(MinIO S3 Compatible)]
    end

    subgraph Intelligence Core
        Backend -->|Language / Intent| Classifier[Multilingual Classifier EN/BN/Banglish]
        Backend -->|Retrieval / Embeddings| VectorStore[Hybrid Lexical + Vector Engine]
        Backend -->|Spend Limits| BudgetGuard[Budget & Guardrails Engine]
        Backend -->|Provider Failover| LLM[Google Gemini / OpenAI / Mock Provider]
    end

    subgraph Operations & Integration
        Backend -->|Human Approval / Idempotency| Approvals[Approvals State Machine]
        Backend -->|Typed Client / Sandbox| CalQuick[CalQuick E-Commerce Integration]
        Backend -->|Audit Events| AuditLog[Tamper-Evident Audit Trail]
    end
```

---

## 2. Environment Configuration Reference

All application secrets and environment variables follow the `SERVORA_` naming convention with deterministic offline defaults for zero-setup local development:

| Variable Name | Description | Default / Example | Required in Prod |
|---|---|---|---|
| `PORT` | NestJS HTTP server port | `4000` | No |
| `SERVORA_JWT_SECRET` | Cryptographic secret for auth tokens & AES encryption key derivation | `servora-dev-jwt-secret-min-32-chars-replace-in-production` | **Yes** |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://servora:servora_secure_password_2026@localhost:5432/servora_db?schema=public` | **Yes** |
| `REDIS_URL` | Redis cache and queue connection string | `redis://localhost:6379` | **Yes** |
| `S3_ENDPOINT` | MinIO / S3 document store endpoint | `http://localhost:9000` | **Yes** |
| `S3_BUCKET` | Knowledge base document bucket | `servora-knowledge` | **Yes** |
| `SERVORA_LLM_PROVIDER` | Active LLM provider (`gemini`, `openai`, `mock`) | `mock` (local), `gemini` (prod) | **Yes** |
| `SERVORA_GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` | If provider=gemini |
| `SERVORA_OPENAI_API_KEY` | OpenAI API key for fallback | `sk-proj-...` | If provider=openai |
| `SERVORA_CALQUICK_BASE_URL` | CalQuick API base URL | `https://api.calquick.example.com/v1` | When upstream available |
| `SERVORA_CALQUICK_API_KEY` | CalQuick API key | `cq_live_...` | When upstream available |

---

## 3. One-Command Boot Instructions

### Prerequisites
- Node.js 18+ and npm 9+
- Docker & Docker Compose

### Boot Infrastructure
```bash
docker compose up -d
```
Starts:
- PostgreSQL 16 pgvector on port `5432`
- Redis 7 on port `6379`
- MinIO S3 on port `9000` (Console on port `9001`)

### Monorepo Dependency Installation & Verification
```bash
npm install
npm run typecheck
npm run test:backend
npm run build:frontend
```

### Start Local Development Servers
```bash
npm run dev
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Health probe: `http://localhost:4000/api/health`

---

## 4. Operator Manual

### Tenant Administration
1. Create new tenant: `POST /api/tenants` (requires `TENANT_ADMIN`)
2. Configure feature flags: Toggle `INTELLIGENT_ROUTING`, `AI_SUMMARIES`, `AI_DRAFTS`
3. Configure daily and monthly AI budgets: `governance.maxDailyBudgetUsd: 50.0`

### Audit Log Inspection
Every sensitive action produces an immutable audit record:
- Query audit logs: `GET /api/audit`
- Filter by `tenantId`, `eventType`, `userId`, `from`, `to`
- Verify cryptographic event signatures

### CalQuick Upstream Credentials Swap
When CalQuick production credentials and API endpoints are delivered:
1. Update `.env`:
   ```bash
   SERVORA_CALQUICK_BASE_URL=https://api.calquick.com/v1
   SERVORA_CALQUICK_API_KEY=cq_live_your_actual_key
   ```
2. The `CalQuickService` automatically detects the live API key and seamlessly activates `CalQuickLiveAdapter` behind the typed `CalQuickAdapter` contract without application restart or code changes.

---

## 5. Security & Failure Recovery Runbook

### Primary LLM Outage
- The config-driven `ProviderRouterService` automatically catches upstream network/quota errors from Google Gemini and falls back to OpenAI within 500ms.
- If both providers fail, the router activates `MockLlmProvider` and emits an operator alert while keeping human inbox operations 100% operational.

### Database Connection Failure
- Database retry logic executes 3 reconnection attempts with exponential backoff.
- In-flight HTTP requests receive standardized 503 Service Unavailable responses with correlation IDs; stack traces are never exposed to clients.

### Redis Cache Failure
- Cache operations automatically fallback to in-memory TTL maps (`TenantContextService` and `FeatureFlagsService` have zero-dependency fallbacks).
