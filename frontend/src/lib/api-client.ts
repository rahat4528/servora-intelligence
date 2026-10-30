/**
 * Servora Intelligence — Unified Frontend API Client
 * Enterprise typed REST client connecting Next.js to the NestJS backend.
 */

import { ApiResponse, ConversationStatus, MessageSenderType, UserRole } from '@servora/common';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVORA_API_URL || 'http://localhost:4000/api';

class ServoraApiClient {
  private token: string | null = null;
  private tenantId: string = 'tenant-default';

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('servora_token');
      this.tenantId = localStorage.getItem('servora_tenant_id') || 'tenant-default';
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('servora_token', token);
      } else {
        localStorage.removeItem('servora_token');
      }
    }
  }

  public setTenantId(tenantId: string) {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('servora_tenant_id', tenantId);
    }
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.tenantId,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        throw new Error(errorData.message || `API error (${response.status})`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      console.warn(`[ServoraApiClient] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  // ==========================================
  // Health & Diagnostics
  // ==========================================
  public async checkHealth(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/health');
  }

  // ==========================================
  // Authentication
  // ==========================================
  public async login(email: string, password: string): Promise<ApiResponse<any>> {
    const res = await this.request<ApiResponse<any>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.data?.accessToken) {
      this.setToken(res.data.accessToken);
      if (res.data.user?.tenantId) {
        this.setTenantId(res.data.user.tenantId);
      }
    }
    return res;
  }

  public async getProfile(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/auth/me');
  }

  // ==========================================
  // Operational Inbox
  // ==========================================
  public async listConversations(params: {
    status?: ConversationStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    return this.request<ApiResponse<any[]>>(`/inbox/conversations?${query.toString()}`);
  }

  public async getConversation(id: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/inbox/conversations/${id}`);
  }

  public async createConversation(data: {
    customerName: string;
    customerEmail?: string;
    channel?: string;
    initialMessage: string;
  }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/inbox/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async postMessage(
    conversationId: string,
    content: string,
    senderType: MessageSenderType = MessageSenderType.AGENT,
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/inbox/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, senderType }),
    });
  }

  public async postInternalNote(
    conversationId: string,
    content: string,
    tags: string[] = [],
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/inbox/conversations/${conversationId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, tags }),
    });
  }

  public async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/inbox/conversations/${conversationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  public async assignAgent(
    conversationId: string,
    agentId: string,
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/inbox/conversations/${conversationId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ agentId }),
    });
  }

  // ==========================================
  // Knowledge Intelligence & RAG
  // ==========================================
  public async getKnowledgeSources(): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>('/knowledge/sources');
  }

  public async queryKnowledge(query: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/knowledge/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  public async ingestKnowledge(data: {
    title: string;
    content: string;
    sourceType?: string;
  }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/knowledge/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Tool Registry & Safe Execution
  // ==========================================
  public async listTools(): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>('/tools');
  }

  public async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    conversationId?: string,
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ toolName, parameters, conversationId }),
    });
  }

  // ==========================================
  // Human Approvals & Refund Proposals
  // ==========================================
  public async prepareRefund(data: {
    conversationId: string;
    orderId: string;
    customerId: string;
    amount: number;
    currency?: string;
    reason: string;
    evidence: string;
  }): Promise<any> {
    return this.request<any>('/approvals/refunds/prepare', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async listRefundProposals(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/approvals/refunds${query}`);
  }

  public async reviewRefund(
    id: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
    reviewNotes?: string,
  ): Promise<any> {
    return this.request<any>(`/approvals/refunds/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewNotes }),
    });
  }

  public async executeRefund(id: string, idempotencyKey: string): Promise<any> {
    return this.request<any>(`/approvals/refunds/${id}/execute`, {
      method: 'POST',
      headers: { 'x-idempotency-key': idempotencyKey },
    });
  }

  // ==========================================
  // Intelligent Routing & Agents
  // ==========================================
  public async listAgents(): Promise<any[]> {
    return this.request<any[]>('/routing/agents');
  }

  public async evaluateRouting(
    signals: Record<string, any>,
    mode: 'SHADOW' | 'ACTIVE' = 'SHADOW',
  ): Promise<any> {
    return this.request<any>(`/routing/evaluate?mode=${mode}`, {
      method: 'POST',
      body: JSON.stringify(signals),
    });
  }

  // ==========================================
  // Automated QA & Coaching
  // ==========================================
  public async listQaEvaluations(): Promise<any[]> {
    return this.request<any[]>('/qa/evaluations');
  }

  public async evaluateQa(data: {
    conversationId: string;
    agentId: string;
    customerMessage: string;
    agentReply: string;
    intent: string;
  }): Promise<any> {
    return this.request<any>('/qa/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Real-Event Analytics Dashboard
  // ==========================================
  public async getAnalyticsDashboard(days: number = 30): Promise<any> {
    return this.request<any>(`/analytics/dashboard?days=${days}`);
  }

  public async getModelComparison(): Promise<any> {
    return this.request<any>('/analytics/model-comparison');
  }
}

export const api = new ServoraApiClient();
