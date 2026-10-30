# SERVORA INTELLIGENCE — ARCHITECTURE DECISION RECORDS (ADR)

This living document captures significant technical and architectural decisions made throughout the evolution of Servora Intelligence.

---

## ADR-001: Greenfield Architecture & Addition of Phase 2B (Inbox Core)

- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:**
  The original master prompt assumed an existing customer-support codebase (referencing legacy names such as RelayDesk AI) with pre-existing inbox, conversation history, and routing logic. However, the project workspace is empty (greenfield) with no legacy code present.
- **Decision:**
  1. Build Servora Intelligence as a greenfield, production-grade application without waiting for legacy repositories.
  2. Modify the implementation roadmap to introduce **Phase 2B: Inbox Core** immediately following Phase 2 (Tenancy, RBAC, and Audit) and prior to Phase 3 (AI Core).
  3. Phase 2B will implement the complete operational inbox: conversation threads, messages, ticket statuses, agent assignment/reassignment, manual routing, internal notes, tags, search/filtering, unread counters, and real-time event updates.
  4. Ensure the database schema and domain models support future external data import via migration or import adapters.
- **Alternatives Considered:**
  - *Wait for legacy codebase:* Would block development indefinitely.
  - *Combine Inbox into Phase 1 or Phase 3:* Violates single-responsibility phases and risks mixing AI orchestration with foundational inbox mechanics.
- **Consequences:**
  - Every inbox feature is modern, fully typed, clean, and built strictly to the multi-tenant specifications from day one.
  - Phase 0 characterization tests are skipped since there is no legacy system to audit; characterization begins with Phase 2B test suites.

---

## ADR-002: Technology Stack Baseline & Cross-Platform Monorepo Structure

- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:**
  The project requires Next.js (TypeScript, Tailwind CSS) for frontend, NestJS (TypeScript) for backend, PostgreSQL with pgvector, Redis with BullMQ, and S3-compatible storage (MinIO). The development host is Windows with spaces in directory paths (`c:\New folder\Servora Intelligence`).
- **Decision:**
  1. Establish a modular monorepo containing:
     - `backend/` (NestJS application with modular architecture)
     - `frontend/` (Next.js 14+ App Router application with Tailwind CSS)
     - `packages/common/` (Shared DTOs, types, and schema validations)
  2. Implement `docker-compose.yml` to provision:
     - `postgres`: PostgreSQL 16 with pgvector extension (`pgvector/pgvector:pg16`)
     - `redis`: Redis 7 Alpine
     - `minio`: MinIO S3-compatible object storage
  3. Ensure all npm scripts are strictly cross-platform (using `cross-env`, Node CLI tools, and quoted paths). No bash-only syntax or unquoted paths.
- **Alternatives Considered:**
  - *Single combined framework (Next.js API routes only):* Lacks NestJS's enterprise modularity, dependency injection, and clean decoupling required for AI orchestrators, BullMQ workers, and tool registries.
  - *Separate polyrepo repositories:* Adds coordination friction and complicates unified CI/golden eval runs.
- **Consequences:**
  - Clear separation between frontend presentation and backend business logic.
  - One-command local setup for all dependencies.

---

## ADR-003: CalQuick Typed Adapter with Deterministic Mock Engine

- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:**
  CalQuick API documentation, endpoint URLs, and sandbox credentials are not currently available. The master prompt forbids inventing real endpoints or fabricating integration verification.
- **Decision:**
  1. Define a strict, typed client contract (`CalQuickAdapter` interface) covering `lookup_order`, `check_courier_status`, and `submit_refund_draft`.
  2. Implement `CalQuickMockAdapter` that provides deterministic fixtures and error simulations for all supported order statuses and courier states.
  3. Explicitly label the mock implementation across UI badges, log messages, and API responses.
  4. Record the missing upstream documentation and credentials as an active blocker for live API testing, ready to be hot-swapped via configuration once real credentials arrive.
- **Alternatives Considered:**
  - *Inventing hypothetical CalQuick endpoints:* Violates honesty rules and risks breaking when actual endpoints arrive.
  - *Deferring CalQuick integration entirely:* Would leave Phase 5-7 incomplete.
- **Consequences:**
  - The tool execution and human approval workflows can be fully implemented, tested, and evaluated deterministically without external network flakiness.

---

## ADR-004: Configuration-Driven Multi-Provider LLM Abstraction

- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:**
  The platform requires primary LLM (Google Gemini), fallback LLM (OpenAI), multilingual understanding (English, Bangla, Banglish), and pgvector embeddings. External API keys may not be present in all environments (e.g. CI runners or local offline development).
- **Decision:**
  1. Create an abstract `LlmProvider` interface with adapters:
     - `GeminiProvider` (Primary)
     - `OpenAiProvider` (Fallback)
     - `MockLlmProvider` (Deterministic local dev / CI eval runner)
  2. Configure provider selection entirely via environment variables (`SERVORA_LLM_PRIMARY_PROVIDER`, `SERVORA_LLM_FALLBACK_PROVIDER`, `SERVORA_LLM_PRIMARY_MODEL`, etc.). Never hardcode model names in business logic.
  3. Default to `MockLlmProvider` when API keys are absent, ensuring the system boots and passes tests without live credentials.
  4. Embeddings use a configurable model identifier supporting multilingual text, with a local deterministic embedding fallback for offline testing.
- **Alternatives Considered:**
  - *Direct SDK calls scattered across services:* Creates tight coupling and prevents transparent fallback.
- **Consequences:**
  - Enables offline testing, reproducible CI evaluation, and smooth failover between providers with zero business logic changes.

---

## ADR-005: Original Geometric Brand Identity & Logo Mark

- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:**
  Sections 1 and 17 mandate rebranding the application to **Servora Intelligence**, featuring an abstract letter "S" logo mark built from two offset interlocking geometric halves with smooth quarter-circle curves, crisp flat edges, blue gradient upper half (`#4DB8FF` to `#2F8CFF`), and violet gradient lower half (`#5B3CF0` to `#7C5CFF`). Third-party stock vector files must not be copied or traced directly.
- **Decision:**
  1. Author an original vector SVG logo mark conforming to the geometry, curvature, and gradient specifications.
  2. Provide standard SVG variants: full-color (light background), full-color (dark background), monochrome, and horizontal lockup with "Servora Intelligence" typography.
  3. Generate browser favicon assets and application icons.
  4. Maintain brand tokens in a centralized theme configuration (`packages/common` / Tailwind theme).
- **Consequences:**
  - Fully compliant with IP and licensing guidelines.
  - Responsive, crisp rendering across mobile, desktop, and app icons.

