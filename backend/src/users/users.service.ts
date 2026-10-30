import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService, UserRecord } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@servora/common';

export interface AgentProfile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  skills: string[];
  languages: string[];
  maxConcurrentConversations: number;
  currentActiveConversations: number;
}

@Injectable()
export class UsersService {
  private agentProfiles: Map<string, AgentProfile> = new Map();

  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {
    this.seedAgentProfiles();
  }

  private seedAgentProfiles() {
    this.agentProfiles.set('usr-agent-1', {
      id: 'agt-1',
      userId: 'usr-agent-1',
      tenantId: 'tenant-default',
      displayName: 'Agent Sarah',
      status: 'AVAILABLE',
      skills: ['returns', 'shipping', 'technical_support'],
      languages: ['en', 'bn'],
      maxConcurrentConversations: 4,
      currentActiveConversations: 1,
    });

    this.agentProfiles.set('usr-agent-2', {
      id: 'agt-2',
      userId: 'usr-agent-2',
      tenantId: 'tenant-isolated',
      displayName: 'Agent Rahim (Acme)',
      status: 'AVAILABLE',
      skills: ['billing', 'vip_support'],
      languages: ['bn', 'en'],
      maxConcurrentConversations: 3,
      currentActiveConversations: 0,
    });
  }

  getUsersForTenant(tenantId: string): UserRecord[] {
    return this.authService.getUsersByTenant(tenantId);
  }

  getAgentsForTenant(tenantId: string): AgentProfile[] {
    return Array.from(this.agentProfiles.values()).filter((a) => a.tenantId === tenantId);
  }

  getAgentByUserId(userId: string, requesterTenantId: string): AgentProfile {
    const agent = this.agentProfiles.get(userId);
    if (!agent || agent.tenantId !== requesterTenantId) {
      throw new NotFoundException(`Agent profile for user ${userId} not found in this tenant`);
    }
    return agent;
  }

  async updateAgentStatus(
    userId: string,
    requesterTenantId: string,
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
  ): Promise<AgentProfile> {
    const agent = this.getAgentByUserId(userId, requesterTenantId);
    agent.status = status;
    this.agentProfiles.set(userId, agent);

    await this.auditService.recordEvent({
      tenantId: requesterTenantId,
      userId,
      eventType: 'AGENT_STATUS_CHANGED',
      resourceType: 'agent',
      resourceId: agent.id,
      action: 'UPDATE_STATUS',
      details: { status },
    });

    return agent;
  }

  async createUser(
    requesterTenantId: string,
    requesterUserId: string,
    data: { email: string; name: string; password: string; role: UserRole },
  ): Promise<UserRecord> {
    const user = await this.authService.createUserForTenant(requesterTenantId, data);

    await this.auditService.recordEvent({
      tenantId: requesterTenantId,
      userId: requesterUserId,
      eventType: 'USER_CREATED',
      resourceType: 'user',
      resourceId: user.id,
      action: 'CREATE',
      details: { email: user.email, role: user.role },
    });

    return user;
  }
}

