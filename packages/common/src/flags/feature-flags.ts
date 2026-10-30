/**
 * Servora Intelligence Per-Tenant Feature Flags
 * Governs progressive rollout of AI and operational capabilities.
 */

export const FeatureFlagKeys = {
  AI_SUMMARIES: 'ai_summaries',
  AI_REPLY_SUGGESTIONS: 'ai_reply_suggestions',
  RAG_KNOWLEDGE: 'rag_knowledge',
  CALQUICK_INTEGRATION: 'calquick_integration',
  HUMAN_APPROVAL_ACTIONS: 'human_approval_actions',
  INTELLIGENT_ROUTING: 'intelligent_routing',
  INTELLIGENT_ROUTING_SHADOW: 'intelligent_routing_shadow',
  AUTOMATED_QA: 'automated_qa',
  AI_BUDGET_ENFORCEMENT: 'ai_budget_enforcement',
} as const;

export type FeatureFlagKey = (typeof FeatureFlagKeys)[keyof typeof FeatureFlagKeys];

export interface TenantFeatureFlags {
  [FeatureFlagKeys.AI_SUMMARIES]: boolean;
  [FeatureFlagKeys.AI_REPLY_SUGGESTIONS]: boolean;
  [FeatureFlagKeys.RAG_KNOWLEDGE]: boolean;
  [FeatureFlagKeys.CALQUICK_INTEGRATION]: boolean;
  [FeatureFlagKeys.HUMAN_APPROVAL_ACTIONS]: boolean;
  [FeatureFlagKeys.INTELLIGENT_ROUTING]: boolean;
  [FeatureFlagKeys.INTELLIGENT_ROUTING_SHADOW]: boolean;
  [FeatureFlagKeys.AUTOMATED_QA]: boolean;
  [FeatureFlagKeys.AI_BUDGET_ENFORCEMENT]: boolean;
}

/**
 * Default safe feature flag state.
 * By default, human-only inbox functions are enabled, and new AI capabilities
 * are progressively enabled per-tenant.
 */
export const DEFAULT_TENANT_FEATURE_FLAGS: TenantFeatureFlags = {
  [FeatureFlagKeys.AI_SUMMARIES]: true,
  [FeatureFlagKeys.AI_REPLY_SUGGESTIONS]: true,
  [FeatureFlagKeys.RAG_KNOWLEDGE]: false,
  [FeatureFlagKeys.CALQUICK_INTEGRATION]: false,
  [FeatureFlagKeys.HUMAN_APPROVAL_ACTIONS]: false,
  [FeatureFlagKeys.INTELLIGENT_ROUTING]: false,
  [FeatureFlagKeys.INTELLIGENT_ROUTING_SHADOW]: true,
  [FeatureFlagKeys.AUTOMATED_QA]: false,
  [FeatureFlagKeys.AI_BUDGET_ENFORCEMENT]: true,
};

