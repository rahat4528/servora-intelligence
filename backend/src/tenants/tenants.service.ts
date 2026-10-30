import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface TenantSettingsRecord {
  tenantId: string;
  primaryLanguage: 'en' | 'bn' | 'bn-Latn' | 'mixed';
  defaultRoutingMode: 'skill_workload' | 'manual';
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  updatedAt: string;
}

@Injectable()
export class TenantsService {
  private tenants: Map<string, TenantRecord> = new Map();
  private settings: Map<string, TenantSettingsRecord> = new Map();

  constructor(private readonly auditService: AuditService) {
    this.seedTenants();
  }

  private seedTenants() {
    const defaultTenant: TenantRecord = {
      id: 'tenant-default',
      name: 'Default Organization',
      slug: 'default',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const isolatedTenant: TenantRecord = {
      id: 'tenant-isolated',
      name: 'Isolated Acme Corp',
      slug: 'isolated',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.tenants.set(defaultTenant.id, defaultTenant);
    this.tenants.set(isolatedTenant.id, isolatedTenant);

    this.settings.set(defaultTenant.id, {
      tenantId: defaultTenant.id,
      primaryLanguage: 'en',
      defaultRoutingMode: 'skill_workload',
      dailyBudgetUsd: 50.0,
      monthlyBudgetUsd: 1000.0,
      updatedAt: new Date().toISOString(),
    });

    this.settings.set(isolatedTenant.id, {
      tenantId: isolatedTenant.id,
      primaryLanguage: 'bn',
      defaultRoutingMode: 'manual',
      dailyBudgetUsd: 25.0,
      monthlyBudgetUsd: 500.0,
      updatedAt: new Date().toISOString(),
    });
  }

  getTenantById(tenantId: string, requesterTenantId: string): TenantRecord {
    if (tenantId !== requesterTenantId) {
      throw new ForbiddenException('Cross-tenant access violation: cannot access other tenant metadata');
    }
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return tenant;
  }

  getSettings(tenantId: string, requesterTenantId: string): TenantSettingsRecord {
    if (tenantId !== requesterTenantId) {
      throw new ForbiddenException('Cross-tenant access violation: cannot access other tenant settings');
    }
    const settings = this.settings.get(tenantId);
    if (!settings) {
      throw new NotFoundException(`Settings for tenant ${tenantId} not found`);
    }
    return settings;
  }

  async updateSettings(
    tenantId: string,
    requesterTenantId: string,
    userId: string,
    updates: Partial<TenantSettingsRecord>,
  ): Promise<TenantSettingsRecord> {
    if (tenantId !== requesterTenantId) {
      throw new ForbiddenException('Cross-tenant access violation: cannot modify other tenant settings');
    }

    const current = this.getSettings(tenantId, requesterTenantId);
    const updated: TenantSettingsRecord = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.settings.set(tenantId, updated);

    await this.auditService.recordEvent({
      tenantId,
      userId,
      eventType: 'TENANT_SETTINGS_UPDATED',
      resourceType: 'tenant_settings',
      resourceId: tenantId,
      action: 'UPDATE',
      details: updates,
    });

    return updated;
  }
}

