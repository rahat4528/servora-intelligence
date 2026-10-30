# SERVORA INTELLIGENCE — COMPLETE PRODUCT DEVELOPMENT MASTER PROMPT

## ROLE

Act as a senior software architect, full-stack developer, AI engineer, machine learning engineer, database architect, cybersecurity engineer, UI/UX designer, and QA engineer.

Your task is to transform the existing customer-support platform into a complete, intelligent, AI-powered customer support and operations platform called **Servora Intelligence**.

Build a real, functional product with a working frontend, backend, database, AI integrations, external API connections, background processing, security controls, and an evaluation system. Do not create only a chatbot, a static dashboard, a UI prototype, or an architectural demonstration.

**Inspect the existing project first, preserve its working functionality, and implement the new capabilities as an extension of the existing system.**

---

# 0. HOW TO EXECUTE THIS PROMPT

This is a large program of work. It is delivered as a series of small, verified phases, never as one giant change.

### Working protocol

1. Work on **one phase at a time** (see Section 21). Each phase has a goal, scope, and an **exit gate**.
2. Do not start phase N+1 until the exit gate of phase N has passed, or the failure is explicitly documented and accepted.
3. At the end of every phase, write a **Phase Report** (template in Section 21) and update the two living documents below.
4. Keep two living documents in the repository:
   - `docs/servora/PROGRESS.md` — checklist of phases and features with true status (`not started`, `in progress`, `done and verified`, `blocked`).
   - `docs/servora/DECISIONS.md` — short architecture decision records (what, why, alternatives, consequences).
5. Every phase ends in a state that **builds, boots, and passes its tests**. Never leave the main branch broken between phases.
6. Ship new AI capabilities behind **per-tenant feature flags** so the human-support inbox is never put at risk.

### Priority order when requirements conflict

1. Do not break the existing inbox, its data, or its history.
2. Tenant isolation, security, and human approval of sensitive actions.
3. Verified correctness.
4. Feature completeness.
5. Polish.

### Honesty rules (apply everywhere)

- Never claim a feature works because a UI component exists. A feature is done only when the backend logic exists, is connected to the frontend, persists data, and has been tested end to end.
- Never claim an external integration, financial operation, security feature, or AI metric works without actual verification.
- Never fabricate AI evaluations, dashboard metrics, model accuracy, citations, or completed financial actions.
- Never invent CalQuick endpoints, credentials, or response structures.
- Where something is blocked (missing documentation, credentials, service), continue with independent work and document the exact blocker.

---

# 1. PRODUCT IDENTITY AND VISION

**Product name:** Servora Intelligence
**Category:** AI-Powered Customer Support & Operations Platform

**Core concept:**
Keep the existing customer-support inbox and routing experience, and transform it into an intelligent support platform where AI can understand conversations, retrieve knowledge, recommend responses, perform authorized actions, assist human agents, and continuously improve support operations.

Servora Intelligence must answer three questions:

1. What does the customer need?
2. What is the best way to resolve the issue?
3. What actions can the system safely take to resolve it?

### Naming and rebranding rules

- Rename the product's main branding (whatever the repository currently calls it) to **Servora Intelligence**: application title, navigation, login and onboarding screens, dashboard, emails and notification templates, documentation, metadata, and relevant configuration.
- The full product name, **Servora Intelligence**, is used for all user-visible branding. Where the full name does not fit (collapsed sidebar, favicon, app icon), use the logo mark alone rather than a shortened text name.
- Use `servora` as the technical slug, `SERVORA_` as the environment-variable prefix, and `@servora/*` as the package scope where packages are introduced.
- Add the Servora Intelligence **logo mark and hero branding** described in Section 17 ("Brand identity and hero logo").
- Rename user-facing text first. Rename internal identifiers (database objects, existing env vars, folders, queue names, stored keys) only when it is safe. Where a rename could break data, deployments, or integrations, keep the old identifier, add a documented alias or deprecation path, and record the decision in `DECISIONS.md`.
- Finish the rebrand with a repository-wide search for every old product name (including "RelayDesk AI" and the bare name "Servora" used on its own as a product name) and confirm that no user-visible occurrence remains.
- **CalQuick is not the main product.** CalQuick is an external order-management and courier integration. Keep the architecture extensible so additional commerce platforms can be integrated later.
- Preserve the existing inbox, conversation history, routing, and every useful working feature. Do not rebuild the platform unnecessarily; extend it wherever practical.

---

# 2. TECHNOLOGY STACK

Use the following stack unless the existing repository has a compelling technical constraint.

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend | NestJS |
| Database | PostgreSQL |
| Vector search | pgvector |
| Background processing | BullMQ |
| Queue and cache | Redis |
| AI integration | LLM API with fallback models |
| Styling | Tailwind CSS |
| File storage | S3-compatible storage |
| Validation | Shared schema validation, enforced server-side |
| Testing | Unit, integration, security, and end-to-end tests |

### Stack-gap rule

If the existing repository does not already use this stack (different framework, language, or database), do not rewrite everything at once. In Phase 0, write a decision record that states:

- what exists today and what the target stack requires,
- the smallest migration path (for example: add the new services alongside the old ones, migrate module by module, keep the existing data accessible),
- the risk to existing inbox behaviour and historical data,
- what is reused as is (existing queues, Redis, auth, real-time layer, and so on).

Then proceed with that plan. Reuse working infrastructure instead of duplicating it.

### Engineering rules

- Use modular architecture, maintainable code, clear interfaces, and reliable API contracts.
- Keep external API credentials and AI provider keys on the backend. Never expose secrets to frontend code.
- Use compatible, maintained package versions. Check current official documentation before implementing any version-sensitive integration.
- Use the simplest reliable architecture that supports the requirements. Avoid unnecessary microservices and excessive abstraction.
- Do not hard-code model names, provider names, or prompts in business logic. They must be configuration and versioned data.

---

# 3. EXISTING SUPPORT INBOX — PRESERVE AND IMPROVE

The existing inbox remains the central operational workspace. Do not replace it with an isolated AI chat page.

Implement or preserve:

- Customer conversation lists and full conversation history.
- Incoming and outgoing messages.
- Ticket status management.
- Agent assignment, reassignment, and manual routing.
- Customer information panel.
- Search and filtering.
- Tags and categories where supported.
- Internal notes and conversation ownership.
- Notifications and unread status.
- Conversation summaries.
- Customer order context.
- AI-generated response suggestions.
- AI action proposals.
- Human approval controls.

All existing inbox functionality must keep working after each phase.

**The human-support inbox must remain fully functional when the AI provider, the RAG service, Redis-backed AI jobs, or the CalQuick integration is unavailable.**

---

# 4. USER ROLES AND MULTI-TENANCY

Build a proper multi-tenant SaaS architecture.

### Roles

**Support Agent**
- Manage assigned conversations and respond to customers.
- View AI suggestions and review citations.
- Use authorized tools.
- Submit approval requests.
- View personal performance and coaching feedback.

**Support Manager**
- Monitor team performance and review conversation quality.
- Override routing decisions and manage agent workloads.
- Approve sensitive actions.
- View operational analytics.

**Tenant Administrator**
- Manage organization settings, users, and permissions.
- Configure integrations.
- Upload and manage knowledge documents.
- Configure AI models, policies, and tenant AI budgets.
- View audit records and analytics.

### Tenant isolation

Every tenant must have securely isolated: users and agents, conversations and messages, customer information, knowledge documents and embeddings, tool permissions, integrations and credentials, AI usage and budgets, QA results, and reports and evaluation data.

Enforce tenant-aware authorization in the frontend, backend, database, vector retrieval, file storage, caches, and background workers. Use PostgreSQL row-level security or an equivalent strict tenant-scoped access control. Never depend on frontend filtering for isolation.

---

# 5. AI SUPPORT AGENT WITH TOOL-CALLING

This is one of the most important features. The AI agent must understand customer conversations, retrieve information, call authorized tools, prepare actions, and generate appropriate responses. Use structured tool definitions and validate every tool request on the backend.

### Initial tool registry

| Tool | Purpose and rules |
|---|---|
| `lookup_order` | Search for a customer's order. Return order ID, status, amount, payment status, and relevant details. Validate customer and tenant ownership. |
| `check_courier_status` | Return courier and delivery information with the latest confirmed delivery status, timestamps, and source where available. |
| `search_customer_policy` | Search the current tenant's policies. Return relevant content with source references. |
| `prepare_refund_proposal` | Prepare refund details: order ID, amount, reason, supporting evidence. Validate refund policy and eligibility. **Never executes the refund.** |
| `submit_refund_draft` | Submit an approved refund draft through the CalQuick integration. Requires human approval. Re-validate the approved action before execution. |
| `get_customer_history` | Return authorized customer history, limited to what the current support task requires. |

Organize the registry so new tools can be added without changing the orchestration system.

### AI agent workflow

1. Receive the customer message.
2. Identify tenant and conversation context.
3. Detect language.
4. Understand intent and urgency.
5. Retrieve relevant knowledge.
6. Decide whether external information is required.
7. Select an authorized tool when necessary.
8. Validate the tool call.
9. Execute permitted read-only operations.
10. Prepare sensitive operations for human review.
11. Generate an answer using verified information.
12. Save the interaction and relevant audit events.

The AI must never claim that an order was changed, a refund was approved, or a financial transaction was completed unless the external system has confirmed the result.

### Human-in-the-loop action policy

| Category | Examples | Policy |
|---|---|---|
| Read-only | Order lookup, courier status, knowledge search, authorized customer history | May execute automatically when permitted. |
| Low-risk preparation | Conversation summaries, response drafts, refund proposals, internal notes | May be prepared automatically. Must never impersonate a completed action. |
| Sensitive | Refund submission, account changes, other consequential external operations | Require explicit approval from an authorized human. |

Approval states: `pending`, `approved`, `rejected`, `expired`, `executed`, `failed`.

Store for each approval: requester, approver, timestamps, reason, action parameters, execution result, and external reference ID. Prevent repeated execution with idempotency keys and server-side state validation. Re-validate the approved action at execution time.

---

# 6. CALQUICK EXTERNAL API INTEGRATION

Connect Servora Intelligence to the CalQuick order API. CalQuick stays a dedicated integration adapter, independent of the AI business logic.

Implement:

- Authentication using the documented API method.
- Order lookup, order status, and courier status retrieval.
- Refund proposal preparation and authorized refund draft submission.
- Request and response validation.
- Timeout handling, safe retries, and rate-limit handling.
- External API error mapping.
- Idempotency for supported write operations.
- Integration health monitoring.
- Structured audit records.

**Before implementing, inspect the actual CalQuick API documentation, endpoints, authentication requirements, and request and response schemas.** Do not invent endpoints, methods, credentials, or response structures.

If documentation or credentials are unavailable, build a typed adapter with a mock implementation for development and CI, and document the blocker clearly. Never use mock responses to claim the real integration works.

---

# 7. TENANT-SPECIFIC RAG KNOWLEDGE SYSTEM

Implement retrieval-augmented generation on PostgreSQL and pgvector. Each tenant has its own independently managed knowledge base.

### Knowledge sources

FAQs, refund and return policies, delivery policies, product documentation, pricing information, internal support instructions, PDF, DOCX, and TXT files, and approved website content.

### Document management

Authorized tenant administrators can upload, view, update, delete, and reprocess documents, view ingestion status and document versions, and manage document access.

### Ingestion pipeline

```text
Document Upload
      |
File Validation
      |
Text Extraction
      |
Cleaning and Normalization
      |
Document Chunking
      |
Embedding Generation
      |
Tenant-Scoped pgvector Storage
      |
Semantic and Keyword Search
      |
Relevance Filtering
      |
AI Context Construction
      |
Answer with Source Citations
```

### Chunk metadata

Every indexed chunk retains: tenant ID, source document ID, document version, page or section reference, chunk text, embedding, access permissions, and created and updated timestamps.

### Citations

AI knowledge answers must cite real retrieved sources, for example:

> According to the refund policy, eligible requests can be submitted for review within the specified return period.
> Sources: Refund Policy — Section 3; Return Instructions — Page 4.

Do not fabricate source names, page numbers, citations, or supporting evidence. Add a **citation validator** that checks every citation in a generated answer against the chunks that were actually retrieved for that answer.

### Retrieval design

- Use tenant-aware retrieval filters on every query.
- Combine semantic and keyword (full-text) search, with relevance filtering.
- Evaluate vector-index filtering behaviour under multi-tenant workloads (filtered ANN behaviour, partial indexes, partitioning) using current pgvector documentation, and record the chosen strategy and benchmark results in `DECISIONS.md`.
- Test retrieval with English, Bangla, and Banglish queries. Verify that the embedding model handles Bangla adequately and record its measured retrieval quality.

---

# 8. BANGLA, BANGLISH, AND MULTILINGUAL SUPPORT

Support English, Bangla, Banglish (romanized Bangla), and mixed Bangla-English conversations.

| Input | Expected behaviour |
|---|---|
| English | Respond naturally in English. |
| Bangla | Respond in natural Bangla. |
| Banglish | Understand romanized Bangla and respond in the language most appropriate to the customer's preference. |
| Mixed | Preserve natural language context and important terminology. |
| Uncertain | Use a safe fallback or ask for clarification. |

### Processing pipeline

1. Detect the language and calculate confidence.
2. Classify the content as Bangla, English, Banglish, or mixed.
3. Classify intent.
4. Retrieve tenant knowledge.
5. Preserve names, order IDs, and technical terms.
6. Generate the response in the customer's preferred language.
7. Allow manual language override by an agent.

Build an explicit **Banglish evaluation dataset**. Do not assume that good standard-Bangla performance proves reliable Banglish understanding.

---

# 9. AI-ASSISTED INTELLIGENT ROUTING

Upgrade the existing routing engine without removing manual assignment or existing routing features. Replace basic round-robin as the primary approach with configurable, intelligent agent matching.

### Signals

Customer intent, sentiment, urgency, conversation complexity, customer language, required skills, agent availability, agent workload, remaining SLA time, predicted resolution time, and relevant historical performance.

### Workflow

```text
New Conversation
       |
Intent Detection
       |
Sentiment and Urgency Analysis
       |
Language Detection
       |
Identify Required Skills
       |
Find Eligible Agents
       |
Calculate Candidate Scores
       |
Estimate Resolution Time
       |
Select Suitable Agent
       |
Assign Conversation
       |
Record Actual Outcome
```

### Features

Skill-based, language-based, workload-aware, priority-based, and SLA-aware assignment; estimated resolution time; assignment explanation; manager override; manual reassignment; and **fallback to the existing routing rules when AI classification fails**.

Scoring logic must be transparent and configurable. Sentiment is an assistive signal only and must never unfairly disadvantage customers or agents. Track predicted versus actual resolution time to evaluate the routing model.

---

# 10. AUTOMATED QUALITY ASSURANCE

Evaluate both AI-generated responses and human agent conversations.

| Dimension | Question |
|---|---|
| Accuracy | Is the answer supported by evidence? |
| Policy compliance | Does it follow tenant policies? |
| Resolution quality | Was the customer's issue addressed? |
| Empathy | Is the tone appropriate? |
| Clarity | Is the response understandable? |
| Citation quality | Are sources relevant and valid? |
| Tool correctness | Were tools called appropriately? |
| Safety | Was sensitive information protected? |

For each eligible conversation, generate: a summary, the customer's main issue, resolution status, QA scores with supporting evidence, strengths, areas for improvement, recommended response improvements, coaching notes, and suggested training topics.

Managers can review AI evaluations, correct scores, add comments, dispute results, trigger re-evaluation, and calibrate rubrics. **Never penalize employees automatically on the basis of unverified AI evaluations.**

---

# 11. AI SAFETY AND GOVERNANCE

Safety is an enforceable backend system, not a system-prompt instruction.

### Prompt-injection defense

- Treat customer messages and retrieved documents as untrusted input.
- Keep system policies separate from retrieved content.
- Prevent documents from issuing unauthorized tool commands.
- Use explicit tool allowlists, independent argument validation, and server-side permission checks.
- Validate generated responses before any external action.

### PII protection

- Detect sensitive information; redact unnecessary personal data from logs.
- Avoid sending unnecessary PII to external LLM providers.
- Control how customer documents and conversation data are stored; apply retention rules.
- Keep sensitive information out of analytics and debug logs.

### Tool permissions

Per-tenant and per-role. Every tool declares: name, description, input schema, required permissions, risk category, approval requirements, tenant restrictions, execution timeout, idempotency behaviour, and audit requirements.

### Cost budgets

Configurable limits for: daily and monthly AI spend per tenant, maximum cost per conversation, maximum tokens per request, maximum tool calls per conversation, maximum retrieval operations, and provider-specific spend. When a tenant reaches a budget, gracefully disable or degrade AI features while preserving normal human support.

### Fallback models

Provider abstraction with a primary model and compatible fallbacks. Handle timeouts, rate limits, and outages; track model versions, cost, and latency; preserve safety and permissions during fallback. **Fallback models can never bypass human approvals.**

---

# 12. AI EVALUATION DASHBOARD

Every KPI must have a defined numerator, denominator, reporting window, sample count, and calculation method, shown in the UI. Do not display fabricated or hardcoded statistics.

| KPI | Definition |
|---|---|
| Resolution Rate | Eligible conversations resolved within a documented window without reopening, divided by eligible conversations. |
| Escalation Rate | Conversations escalated to higher support levels, divided by eligible conversations. |
| Hallucination Rate | Audited AI responses containing unsupported material claims, divided by audited AI responses. |
| Cost Per Ticket | Total AI cost divided by the defined number of eligible conversations. |
| Tool Success Rate | Successfully completed eligible tool executions divided by attempted executions. |
| Citation Accuracy | Evaluated citations that actually support their claims, divided by evaluated citations. |
| Resolution Prediction Error | Difference between predicted and actual resolution time. |

**Filters:** tenant, team, agent, date range, language, intent, LLM provider, model version, prompt version.

**Visualizations:** resolution, escalation, and hallucination trends; cost per ticket; AI-assisted versus non-AI-assisted resolution; model cost comparison; tool success and failure; citation quality; agent coaching trends; language and intent distribution.

---

# 13. GOLDEN EVALUATION SYSTEM AND CI

Build a reproducible evaluation system that runs in CI to detect accuracy and safety regressions after prompt, model, retrieval, or routing changes.

### Golden test categories

1. Correct order lookup.
2. Correct courier status interpretation.
3. Refund policy compliance.
4. Accurate RAG responses.
5. Citation validity.
6. Bangla understanding.
7. Banglish understanding.
8. Intent detection.
9. Sentiment analysis.
10. Urgency prediction.
11. Skill-based routing.
12. Tool permission enforcement.
13. Refund approval enforcement.
14. Prompt-injection resistance.
15. PII redaction.
16. Tenant isolation.
17. Provider fallback behaviour.
18. Cost budget enforcement.
19. Tool idempotency.
20. Failure and recovery handling.

### Case fields

Test ID, input conversation, tenant configuration, expected intent, expected language, expected routing criteria, expected response characteristics, expected citations, allowed tools, forbidden tools, expected approval requirements, expected result, test category.

### Workflow

```text
Code / Prompt / Model Change
             |
       Run Golden Set
             |
       Mock External APIs
             |
      Execute Test Cases
             |
      Validate Tool Calls
             |
      Evaluate Responses
             |
      Validate Citations
             |
      Measure Cost and Latency
             |
      Compare Against Baseline
             |
       Pass / Fail Gate
             |
       Merge Decision
```

Store per run: results, prompt version, model version, retrieval configuration, actual tool calls, expected and actual outputs, cost, latency, safety violations, and evaluation score.

- Use deterministic mocked external APIs in CI. Use a separate controlled CalQuick sandbox suite when available.
- **Golden tests must never execute real financial operations.**
- Show accuracy changes across prompt and model versions.
- A model or prompt update must not silently reduce safety or retrieval quality: a drop beyond the configured threshold fails the gate.
- **The harness is built early (Phase 3) and grows with every phase.** Each new AI feature ships with its golden cases.

---

# 14. BACKGROUND JOB PROCESSING

Use Redis and BullMQ for long-running or asynchronous work. Reuse existing queues and Redis infrastructure where they already exist.

| Queue | Responsibility |
|---|---|
| `ai-conversation` | AI orchestration and response processing |
| `knowledge-ingestion` | Document extraction, chunking, embeddings |
| `routing-analysis` | Intent and assignment analysis |
| `qa-processing` | Conversation evaluation |
| `analytics-processing` | KPI calculation and aggregation |
| `evaluation` | Golden test runs |
| `integration-events` | External API synchronization |

Every queue implements: job validation, tenant context propagation, retry rules, exponential backoff where appropriate, idempotency, timeout handling, concurrency controls, failure monitoring, dead-letter handling, and job result tracking.

Enforce tenant budgets in the application-level budget service, not only through queue rate limiting. **A background job must never lose its tenant authorization context.**

---

# 15. DATABASE ARCHITECTURE

PostgreSQL is the main database, with pgvector for semantic search. Use a normalized schema with migrations. Do not create structures manually.

| Area | Tables |
|---|---|
| Identity and tenancy | `tenants`, `tenant_settings`, `users`, `roles`, `permissions`, `agents`, `agent_skills` |
| Support operations | `conversations`, `messages`, `conversation_tags`, `assignments`, `routing_decisions` |
| AI intelligence | `ai_sessions`, `ai_responses`, `ai_provider_configs`, `model_versions`, `prompt_versions` |
| Knowledge | `knowledge_sources`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_ingestion_jobs` |
| Integrations and tools | `integrations`, `tool_definitions`, `tool_executions`, `external_api_events` |
| Human approval | `approval_requests`, `approval_events` |
| Quality assurance | `qa_reviews`, `qa_scores`, `coaching_notes` |
| Analytics and governance | `ai_usage`, `tenant_budgets`, `audit_events` |
| Evaluation | `eval_cases`, `eval_runs`, `eval_results` |

All tenant-owned records are tenant-scoped. Include primary keys, foreign keys, unique constraints, indexes, timestamps, referential integrity, migration and seed scripts, and retention policies. Do not store raw credentials without suitable encryption and access controls.

When the existing database differs from this schema, introduce the new tables through migrations alongside the existing ones and map old data forward. Never delete historical conversation data.

---

# 16. NESTJS BACKEND MODULE STRUCTURE

```text
backend/
|-- auth/
|-- tenants/
|-- users/
|-- agents/
|-- inbox/
|-- conversations/
|-- routing/
|
|-- ai-orchestrator/
|-- language-detection/
|-- rag/
|-- knowledge-base/
|
|-- tool-registry/
|-- tool-execution/
|
|-- integrations/
|   |-- calquick/
|   |-- order/
|   |-- courier/
|
|-- approvals/
|-- quality-assurance/
|-- analytics/
|-- evaluation/
|-- usage-billing/
|-- audit/
|-- queues/
|-- common/
```

Each module has clear responsibilities. Use dependency injection, DTOs, validation, guards, interceptors, and exception handling. The AI orchestrator coordinates services and must not become a monolith containing all business logic. The CalQuick adapter stays separate from business rules.

---

# 17. NEXT.JS FRONTEND ARCHITECTURE

Build a polished, responsive dashboard with clear workflows for agents, managers, and administrators.

**Navigation:** Dashboard, Inbox, AI Assistant, Knowledge Base, Routing, Quality Assurance, Approvals, AI Analytics, Integrations, Agent Management, Settings, Audit Logs.

**Inbox, per conversation:** customer details, full history, assigned agent, intent and sentiment indicators, language indicator, AI summary, suggested response, knowledge citations, authorized order and courier information, proposed AI actions, approval status, and tool execution history.

**AI assistant panel:** generate suggested replies, summarize conversations, search policies, view citations, retrieve order and courier information, prepare refund proposals, request approval for sensitive operations.

**Manager dashboard:** team workload, agent availability, routing performance, pending approvals, conversation quality, coaching reports, SLA performance.

**Administrator dashboard:** tenant settings, integration configuration, knowledge sources, tool permissions, AI model settings, cost budgets, usage statistics, audit logs, evaluation results.

**UI requirements:** consistent typography and spacing, a professional color system, clear navigation, responsive layout, accessible controls, useful loading and error states, toast notifications, empty-state guidance, confirmation for destructive actions, and real-time or appropriately refreshed inbox status.

Every visible action must have working behaviour. No static cards with fabricated data.

### Brand identity and hero logo

The **hero section** of the public landing page must display the **Servora Intelligence logo mark** prominently, above or beside the product name and tagline. Use the same mark in the sign-in and onboarding hero panel, the navigation header, the browser favicon, and the app icon.

If the repository has no public landing page or sign-in hero, create a minimal one (logo mark, product name, one-line description, sign-in button) instead of skipping this requirement.

**Logo style to follow:**

- A modern, abstract **letter "S"** built from two offset geometric halves that interlock, separated by thin gaps.
- The shapes are made of thick, flat-ended horizontal bars joined by smooth quarter-circle curves. Edges are crisp and flat. There are no outlines, no drop shadows, and no 3D effects.
- The upper half uses a **blue gradient** (light sky blue to azure). The lower half uses a **violet/purple gradient** (indigo to soft purple). Start from roughly `#4DB8FF → #2F8CFF` for blue and `#5B3CF0 → #7C5CFF` for violet, then tune them to fit the final theme.
- Clean, minimal, professional, and instantly readable at small sizes.

**Technical requirements:**

- Build the logo as an **inline or file-based SVG** (vector, not a raster image), with a `viewBox`, so it stays sharp at every size.
- Provide variants: full-colour for light backgrounds, full-colour for dark backgrounds, single-colour (monochrome), and a horizontal lockup of the mark plus the text "Servora Intelligence".
- Export the favicon set and app icons from the same SVG.
- Provide meaningful `alt` text or an accessible label, for example "Servora Intelligence logo".
- Size the hero logo responsively. Keep it legible and uncropped on mobile, tablet, and desktop.
- If an entrance animation is added, keep it subtle and respect `prefers-reduced-motion`.
- Store brand tokens (logo colours, gradient stops) in one shared theme file so the colour system and the logo stay consistent.

**Asset and licensing rule:** The reference image for this style is a third-party logo design offered for sale (a stock logo listing). Use it **as a style reference only**. Do not trace, copy, or embed that exact artwork. Create an original mark in this style, or, if the exact logo has been legally purchased or licensed, place the licensed files provided by the owner. Record the choice in `DECISIONS.md`. If a reference image is attached to this prompt, treat it as a style reference only.

---

# 18. API DESIGN AND BUSINESS LOGIC

Provide secure, documented endpoints (or equivalent backend operations) for: authentication and user management, tenant and role management, conversations and messages, agent assignment, routing decisions, AI orchestration, language detection, knowledge ingestion and retrieval, tool execution, CalQuick integration, approval workflows, QA processing, analytics, evaluation runs, AI budget monitoring, and audit log retrieval.

Use consistent response schemas and correct HTTP status codes. Validate every request on the backend. Enforce authentication, tenant isolation, ownership, permissions, and tool restrictions on every relevant operation. Use request IDs and structured logs to trace complete workflows. Publish an OpenAPI specification.

---

# 19. OBSERVABILITY AND RELIABILITY

Track: API errors, background job failures, LLM provider errors, model latency, token usage, tool execution status, CalQuick failures, approval delays, retrieval failures, database performance, queue backlog, and tenant budget consumption.

Use structured logs and correlation IDs. Avoid logging raw sensitive conversations or unnecessary PII. Provide health checks for the backend, database, Redis, and external integrations.

---

# 20. CROSS-CUTTING DEFINITION OF DONE

A feature counts as done only when all of the following are true:

- Backend logic, persistence, and migrations exist.
- It is connected to the frontend where applicable, and its actions really work.
- Tenant isolation and permission checks are enforced server-side.
- Audit events are written for sensitive operations.
- Unit and integration tests pass, and golden evaluation cases exist for any AI behaviour.
- Failure modes are handled (provider down, integration down, budget reached), and the inbox still works.
- It is behind a feature flag where it touches AI behaviour.
- Documentation and `PROGRESS.md` are updated.

---

# 21. IMPLEMENTATION ROADMAP

The roadmap is organized as **vertical slices with safety and evaluation built in from the start**, grouped into four releases. Governance (PII, budgets, permissions, injection defense, audit) and the golden-evaluation harness are not late phases: they are established early and extended in every later phase.

### Milestones

| Release | Phases | What exists at the end |
|---|---|---|
| **A — Safe AI-assisted inbox** | 0–4 | Rebranded Servora Intelligence, tenant-safe platform, AI summaries and reply suggestions with real citations from a tenant knowledge base, golden evals running in CI. |
| **B — Tool-using agent with approvals** | 5–7 | CalQuick order and courier lookups, tool registry, refund proposals, human-approved actions with idempotency. |
| **C — Intelligence and operations** | 8–10 | Intelligent routing, automated QA and coaching, analytics and model/prompt comparison. |
| **D — Production hardening** | 11 | Security review, performance and failure-injection testing, deployment, final regression. |

Release A and Release B together form the minimum valuable product. Do not start a later release until the earlier release is stable.

### Phase Report template (required at the end of every phase)

- Goal and what was actually implemented.
- Files and modules created or modified.
- Database migrations.
- Tests added and executed, with real results.
- Exit gate checklist with pass or fail.
- Blockers, deviations, and known issues.
- Feature flags introduced.
- Setup or run commands that changed.

---

### Phase 0 — Discovery and Baseline (no feature code)

**Goal:** Understand exactly what exists and protect it.

- Inspect the complete repository: architecture, stack, modules, data model, auth, real-time layer, queues, deployment.
- Inventory existing inbox and routing features and existing data.
- Write characterization tests (or documented manual test scripts if automation is impractical) covering the inbox golden paths: load conversations, send and receive messages, assign and reassign, change status, search and filter.
- Write the stack-gap decision record (Section 2) and a risk register.
- Check whether CalQuick API documentation, a sandbox, and credentials are available. Record the result.
- Create `PROGRESS.md`, `DECISIONS.md`, and the implementation checklist, including the list of components that must be preserved.

**Exit gate:** audit report written, baseline inbox tests recorded and passing, stack decision documented, no application behaviour changed.

### Phase 1 — Foundation and Rebrand

**Goal:** A clean, reproducible development base under the Servora Intelligence name.

- Apply the rebranding rules from Section 1.
- Create the logo mark, its variants, and the branded hero (Section 17, "Brand identity and hero logo"), and add the brand tokens to the shared theme.
- Establish lint, type-check, test runners, formatting, and a CI pipeline that runs them.
- Provide one-command local setup: PostgreSQL with pgvector, Redis, and S3-compatible storage (for example via Docker Compose), plus `.env.example` with placeholders only.
- Environment-variable validation at boot, a migrations framework, seed scripts.
- Structured logging with request IDs, and basic health checks.
- Per-tenant feature-flag mechanism.

**Exit gate:** a fresh checkout boots with documented commands; CI is green; baseline inbox tests still pass; no user-visible old product name remains; the landing/sign-in hero shows the Servora Intelligence logo and it renders correctly on mobile and desktop, in light and dark mode.

### Phase 2 — Multi-Tenancy, RBAC, and Audit

**Goal:** A security base that every later feature depends on.

- Tenants, tenant settings, roles, permissions, agent skills.
- Secure authentication and server-side authorization guards.
- Row-level security or equivalent tenant scoping in the database.
- Tenant context propagation through HTTP requests, caches, file storage keys, and background jobs.
- Encrypted storage for integration credentials.
- Audit-event infrastructure with an audit log view.
- **Tenant-isolation test suite**, which becomes a permanent CI gate.

**Exit gate:** cross-tenant read and write attempts fail in tests at the API, database, cache, and job layers; role restrictions are verified; audit events are recorded for sensitive operations; existing inbox still works for existing data.

### Phase 3 — AI Core, Governance Baseline, and Evaluation Harness

**Goal:** Safe AI plumbing, with the first useful feature behind a flag.

- LLM provider abstraction with primary and fallback models, timeouts, retries, and rate-limit handling.
- Versioned prompts and model records; usage and cost tracking.
- **Budget service** with enforced daily, monthly, per-conversation, token, and tool-call limits and graceful degradation.
- **PII detection and redaction layer** for logs and provider requests.
- **Untrusted-content handling baseline** (separation of system policy from customer and document content).
- Language detection for English, Bangla, Banglish, and mixed input, with confidence and manual override.
- Intent, sentiment, and urgency classification.
- AI orchestrator skeleton producing **conversation summaries and draft replies only** (no tools yet), shown in the inbox.
- `ai-conversation` queue with the Section 14 job requirements.
- **Golden evaluation harness skeleton** with first cases: language, intent, PII redaction, budget enforcement, provider fallback, prompt-injection basics. Mocked providers in CI.

**Exit gate:** AI summaries and suggestions work in the inbox for a flagged tenant; a simulated provider outage and a simulated budget exhaustion both leave the inbox fully working; fallback does not weaken safety checks; the golden suite runs in CI and its baseline is stored.

### Phase 4 — Knowledge Intelligence (RAG)

**Goal:** Cited, tenant-specific answers.

- Knowledge-base management UI and API: upload, update, delete, reprocess, versions, ingestion status, access control.
- `knowledge-ingestion` pipeline: validation, extraction (PDF, DOCX, TXT), cleaning, chunking, embeddings, tenant-scoped pgvector storage.
- Hybrid semantic and keyword retrieval with relevance filtering and tenant filters.
- pgvector indexing and filtering strategy chosen from a measured benchmark and recorded in `DECISIONS.md`.
- Context construction, answer generation with citations, and the **citation validator**.
- Bangla and Banglish retrieval and response tests; the Banglish evaluation dataset begins here.
- Golden cases for RAG accuracy, citation validity, and tenant isolation of knowledge.

**Exit gate:** a document uploaded by one tenant is retrievable and cited for that tenant and invisible to every other tenant; fabricated citations are rejected by the validator in tests; Bangla and Banglish retrieval results are measured and recorded; **Release A is complete.**

### Phase 5 — CalQuick Integration (read-only first)

**Goal:** A reliable, isolated adapter for order and courier data.

- Read the real CalQuick documentation first; list the exact endpoints, authentication method, and schemas used.
- Typed adapter with request and response validation, timeouts, safe retries, rate-limit handling, and error mapping.
- Order lookup, order status, and courier status.
- Integration health monitoring and `external_api_events` records.
- `integration-events` queue.
- Deterministic mock implementation for development and CI, clearly labelled as a mock.
- If documentation or credentials are missing: document the exact blocker and continue with the mock-based work, without claiming real integration works.

**Exit gate:** adapter contract tests pass against the mock; real-API verification either passes against a sandbox or is recorded as blocked with the reason; an integration outage leaves the inbox working.

### Phase 6 — Tool Registry and Read-Only Tool Calling

**Goal:** The AI can safely fetch verified information.

- Tool registry with the full metadata from Section 11.
- Backend argument validation, per-tenant and per-role permission checks, timeouts, and `tool_executions` logging.
- Tools: `lookup_order`, `check_courier_status`, `search_customer_policy`, `get_customer_history`.
- Agent loop with tool selection, validation, execution, and grounded answer generation, with the maximum-tool-call budget enforced.
- Tool results displayed in the inbox (order and courier panel, tool execution history).
- Golden cases: correct order lookup, courier interpretation, tool permission enforcement, forbidden tools, tool-call injection attempts, failed external calls.

**Exit gate:** the agent answers order and courier questions from verified tool data; unauthorized and malformed tool calls are rejected server-side in tests; the AI never states unverified order facts.

### Phase 7 — Human-Approved Actions

**Goal:** Sensitive operations only ever happen with explicit human approval.

- `prepare_refund_proposal` with policy and eligibility validation (no execution).
- Approval workflow: states `pending`, `approved`, `rejected`, `expired`, `executed`, `failed`; `approval_requests` and `approval_events`; approver permission checks; expiry.
- `submit_refund_draft` through CalQuick, with server-side re-validation at execution time and idempotency keys.
- Approvals UI for agents and managers, with the full evidence trail.
- Golden cases: refund policy compliance, refund approval enforcement, idempotency, duplicate execution prevention.
- Real financial operations are never executed by tests; use mocks or a verified sandbox only.

**Exit gate:** no code path executes a sensitive action without a valid approval (proved by tests, including attempts via fallback models, background jobs, and replayed requests); duplicate execution is prevented; every step is audited; **Release B is complete.**

### Phase 8 — Intelligent Routing

**Goal:** Better assignment, introduced without risk.

- Scoring engine using the Section 9 signals, with configurable weights and assignment explanations.
- Skill, language, workload, priority, and SLA matching; resolution-time estimation.
- **Shadow mode first:** compute AI routing decisions alongside the existing routing and compare, without acting. Enable active routing per tenant only after the comparison is reviewed.
- Manager override and manual reassignment preserved; fallback to existing rules on any failure.
- Recording of predicted versus actual resolution time.
- `routing-analysis` queue.
- Golden cases for skill-based routing and fallback behaviour.

**Exit gate:** shadow-mode comparison available; active routing selectable per tenant; overrides and fallback verified; sentiment never acts as a sole routing factor.

### Phase 9 — Automated QA and Coaching

**Goal:** Reviewable, fair quality evaluation.

- `qa-processing` queue producing summaries, scores across the eight dimensions with evidence, strengths, improvements, and coaching notes.
- Manager review workflow: correct, comment, dispute, re-evaluate, calibrate rubrics.
- Agent-facing coaching view.
- Safeguard: no automated penalties from unverified AI evaluations.
- Tests for score generation, review, and re-evaluation.

**Exit gate:** QA reports are generated from real conversations, can be reviewed and corrected by managers, and are clearly labelled as AI-generated until reviewed.

### Phase 10 — Analytics and Evaluation Dashboard

**Goal:** Measurable, explainable AI performance.

- KPI calculations exactly as defined in Section 12, with visible definitions, denominators, windows, and sample counts.
- `analytics-processing` queue and stored aggregates.
- All required filters and visualizations, computed from stored measurements only.
- Prompt and model version comparison views.
- Complete the golden dataset across all 20 categories; baseline comparison and pass/fail gate in CI; evaluation results visible in the admin dashboard.

**Exit gate:** every dashboard figure traces back to stored data; KPI calculation tests pass; a deliberately degraded prompt or model fails the CI gate in a demonstration run.

### Phase 11 — Release Hardening

**Goal:** Production readiness. **Release D.**

- Security review: authentication, authorization, secrets, file uploads, injection (prompt and SQL), rate limits, dependency audit.
- Full tenant-isolation re-test at every layer.
- Performance work: query plans, pgvector behaviour at realistic scale, queue throughput, inbox latency.
- Failure-injection tests: Redis outage, database failure, LLM provider outage, CalQuick timeout, job retries, duplicate jobs, budget exhaustion.
- Deployment configuration and instructions, backup and retention settings, runbooks.
- Final documentation: README, architecture, API, deployment.
- Final regression of the entire inbox baseline from Phase 0.

**Exit gate:** the Section 24 acceptance checklist passes, or each unmet item is explicitly documented as incomplete.

---

# 22. TESTING REQUIREMENTS

Testing is mandatory and continuous, not saved for the end. Fix actionable failures and rerun affected tests.

- **Authentication and tenancy:** authentication, role restrictions, cross-tenant access prevention, unauthorized API requests, permission changes.
- **Inbox:** conversation loading, sending and receiving messages, assignment, manual reassignment, status updates, history persistence.
- **AI:** intent detection, language detection, Bangla and Banglish understanding, response generation, fallback provider, prompt-injection attempts.
- **RAG:** upload, extraction, chunking, embedding, retrieval, citation, document updates, tenant isolation.
- **Tools:** order lookup, courier status, refund proposal, invalid arguments, unauthorized tools, failed external calls, duplicate execution prevention, human approval enforcement.
- **Routing:** skill, language, workload, priority, and SLA matching; manual override; fallback behaviour.
- **Quality assurance:** scores, summary accuracy, coaching note quality, manager review, re-evaluation.
- **Analytics:** resolution, escalation, hallucination, cost, tool success, citation accuracy, and model-comparison calculations.
- **Reliability:** Redis outage, database failure, LLM provider outage, CalQuick timeout, background job retry, duplicate jobs, tenant budget exhaustion.

---

# 23. FINAL DELIVERABLES

1. Complete Servora Intelligence frontend, including the branded hero and logo assets.
2. Complete NestJS backend.
3. PostgreSQL schema and migrations.
4. pgvector knowledge retrieval system.
5. Redis and BullMQ background processing.
6. Secure authentication and multi-tenancy.
7. Working support inbox.
8. AI agent with controlled tool-calling.
9. CalQuick integration, or a clearly documented adapter blocker.
10. Tenant-specific knowledge management.
11. Bangla and Banglish language handling.
12. Intelligent routing engine.
13. Automated quality assurance.
14. Approval workflows.
15. AI safety and governance layer.
16. Evaluation dashboard.
17. Golden evaluation dataset and CI integration.
18. API and environment configuration.
19. `.env.example` with placeholders only.
20. Database migration and seed scripts.
21. Unit, integration, and end-to-end tests.
22. README and setup documentation.
23. Architecture and API documentation, including `PROGRESS.md` and `DECISIONS.md`.
24. Deployment instructions.
25. Actual build and test report.

---

# 24. FINAL ACCEPTANCE CHECKLIST

The project is complete only when each item below is verified:

- [ ] Main product branding is Servora Intelligence, with no user-visible old name remaining.
- [ ] The hero shows the Servora Intelligence logo (SVG, light/dark/monochrome variants, favicon and app icons), and the logo is an original or properly licensed asset.
- [ ] Existing support inbox and conversation history still work.
- [ ] Existing manual routing and assignment are preserved.
- [ ] Multi-tenant architecture works and tenant data is isolated.
- [ ] Role-based permissions work.
- [ ] AI identifies intent and urgency.
- [ ] English, Bangla, and Banglish handling is tested.
- [ ] Each tenant has an independent knowledge base.
- [ ] RAG provides real, validated source citations.
- [ ] Order lookup works with CalQuick or a verified configured integration.
- [ ] Courier status retrieval works.
- [ ] Refund proposals are generated correctly.
- [ ] Refund submission requires appropriate human approval.
- [ ] AI routing considers agent skills and workload.
- [ ] Managers can override assignment.
- [ ] Automated QA produces meaningful, reviewable reports.
- [ ] Prompt-injection defenses are tested.
- [ ] PII protection is implemented.
- [ ] Per-tool permissions are enforced.
- [ ] Tenant-level AI cost budgets work.
- [ ] Fallback models preserve safety policies.
- [ ] Analytics use actual stored measurements.
- [ ] Golden evaluation tests run in CI with a pass/fail gate.
- [ ] Prompt and model changes can be compared.
- [ ] AI outages do not disable the normal support inbox.
- [ ] Required tests pass, or unresolved failures are explicitly documented.

---

# 25. FINAL EXECUTION RULES AND REPORT

- Before coding, inspect the complete existing repository and create the implementation checklist (Phase 0).
- Do not delete functioning inbox features or historical conversation data.
- Do not mark a feature complete just because a UI component exists.
- When an external API, credential, asset, or service is unavailable, continue implementing independent functionality and document the exact blocker.

At the end of the program, report:

- Features actually implemented.
- Files and modules created or modified.
- Database changes.
- API integrations completed.
- Tests executed and results.
- Security and tenant-isolation results.
- AI evaluation results.
- Performance and cost findings where measured.
- Incomplete or blocked features.
- Exact setup and execution commands.

**FINAL PRODUCT OBJECTIVE:**
Build Servora Intelligence as a real AI-powered customer support and operations platform that preserves the existing inbox, understands customers, retrieves trusted knowledge, intelligently routes conversations, takes permission-controlled actions, keeps humans in control of sensitive operations, evaluates support quality, and continuously measures AI performance.

**Do not deliver only a blueprint, mockup, demo, or disconnected AI chatbot. Deliver the actual integrated product with verified functionality.**
