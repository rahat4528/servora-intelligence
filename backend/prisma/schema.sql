-- ============================================================================
-- SERVORA INTELLIGENCE — PRODUCTION POSTGRESQL 16 + PGVECTOR DDL SCHEMA
-- ============================================================================
-- Multi-Tenant Customer Support & AI Operations Schema
-- Requirements: PostgreSQL 16+, pgvector extension (pgvector/pgvector:pg16)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ----------------------------------------------------------------------------
-- 1. TENANTS & CONFIGURATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(32) NOT NULL DEFAULT 'ENTERPRISE',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    daily_ai_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ----------------------------------------------------------------------------
-- 2. USERS & AGENT PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('TENANT_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_AGENT')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

CREATE TABLE IF NOT EXISTS agent_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
    skills TEXT[] NOT NULL DEFAULT '{}',
    languages TEXT[] NOT NULL DEFAULT '{"en"}',
    max_concurrent_conversations INT NOT NULL DEFAULT 5,
    current_workload INT NOT NULL DEFAULT 0,
    historical_csat NUMERIC(3, 2) NOT NULL DEFAULT 4.80,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_tenant_status ON agent_profiles(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 3. INBOX CORE: CONVERSATIONS, MESSAGES & INTERNAL NOTES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id VARCHAR(64),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    channel VARCHAR(32) NOT NULL DEFAULT 'CHAT' CHECK (channel IN ('CHAT', 'EMAIL', 'WHATSAPP', 'SMS')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED')),
    priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    assigned_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    language VARCHAR(32) NOT NULL DEFAULT 'en',
    sentiment VARCHAR(32) NOT NULL DEFAULT 'neutral',
    intent VARCHAR(64),
    tags TEXT[] NOT NULL DEFAULT '{}',
    unread_count INT NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status ON conversations(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(tenant_id, assigned_agent_id);

CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sender_type VARCHAR(32) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AGENT', 'AI_ASSISTANT', 'SYSTEM')),
    sender_id VARCHAR(64),
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    redacted_content TEXT,
    tokens INT DEFAULT 0,
    sentiment VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS internal_notes (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_conv ON internal_notes(conversation_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 4. KNOWLEDGE INTELLIGENCE (RAG & PGVECTOR)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(32) NOT NULL DEFAULT 'DOCUMENT' CHECK (source_type IN ('DOCUMENT', 'FAQ', 'POLICY', 'MANUAL')),
    file_path VARCHAR(512),
    doc_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tenant ON knowledge_sources(tenant_id);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    citation_id VARCHAR(32) NOT NULL,
    section_title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384) NOT NULL, -- Multilingual 384-dimensional dense vector
    lexical_tokens TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant ON knowledge_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_citation ON knowledge_chunks(tenant_id, citation_id);
-- HNSW Vector Index for sub-millisecond approximate nearest neighbor cosine search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hnsw ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
-- Full-text search index for BM25-style lexical matching
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts ON knowledge_chunks USING gin (lexical_tokens);

-- ----------------------------------------------------------------------------
-- 5. HUMAN-APPROVED ACTIONS & IDEMPOTENT REFUNDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refund_proposals (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    reason TEXT NOT NULL,
    evidence TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED', 'EXPIRED')),
    policy_eligibility JSONB NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    external_transaction_id VARCHAR(128),
    CONSTRAINT uq_refund_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_refund_proposals_tenant_status ON refund_proposals(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 6. AUTOMATED QA & COACHING EVALUATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_evaluations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR(255) NOT NULL,
    overall_score NUMERIC(3, 2) NOT NULL,
    dimensions JSONB NOT NULL,
    flags JSONB NOT NULL,
    coaching_notes JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AI_EVALUATED' CHECK (status IN ('AI_EVALUATED', 'MANAGER_VERIFIED', 'DISPUTED', 'OVERTURNED')),
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    manager_adjustments JSONB,
    dispute_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qa_evaluations_agent ON qa_evaluations(tenant_id, agent_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 7. IMMUTABLE AUDIT TRAIL & COMPLIANCE LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_time ON audit_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(tenant_id, resource_type, resource_id);

-- ----------------------------------------------------------------------------
-- 8. TOOL EXECUTION RECORDS & AUDITING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_execution_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    tool_name VARCHAR(64) NOT NULL,
    user_id VARCHAR(64),
    conversation_id VARCHAR(64),
    parameters JSONB NOT NULL,
    result JSONB,
    error TEXT,
    duration_ms INT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'UNAUTHORIZED', 'BLOCKED_BY_BUDGET')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tool_exec_tenant_time ON tool_execution_logs(tenant_id, created_at DESC);
