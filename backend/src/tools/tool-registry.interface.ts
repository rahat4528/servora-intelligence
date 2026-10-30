import { UserRole } from '@servora/common';

export type ToolRiskCategory = 'READ_ONLY' | 'PREPARATION' | 'SENSITIVE';

export interface ToolDefinition {
  name: string;
  description: string;
  riskCategory: ToolRiskCategory;
  approvalRequired: boolean;
  requiredRole?: UserRole;
  timeoutMs: number;
  idempotent: boolean;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; required?: boolean }>;
    required: string[];
  };
}

export interface ToolExecutionRecord {
  id: string;
  tenantId: string;
  conversationId?: string;
  userId?: string;
  toolName: string;
  inputParameters: Record<string, any>;
  result?: any;
  error?: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED' | 'BLOCKED_BY_BUDGET';
  createdAt: string;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  toolName: string;
  data?: T;
  error?: string;
  isMock: boolean;
  durationMs: number;
}

