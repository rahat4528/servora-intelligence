import { Injectable } from '@nestjs/common';
import {
  DEFAULT_TENANT_FEATURE_FLAGS,
  FeatureFlagKey,
  FeatureFlagKeys,
  TenantFeatureFlags,
} from '@servora/common';

@Injectable()
export class FeatureFlagsService {
  // In-memory tenant flag store for local dev / fast lookup; can be backed by DB in Phase 2
  private readonly tenantOverrides = new Map<string, Partial<TenantFeatureFlags>>();

  /**
   * Get all resolved feature flags for a given tenant.
   * Falls back to DEFAULT_TENANT_FEATURE_FLAGS.
   */
  getFlagsForTenant(tenantId: string): TenantFeatureFlags {
    const overrides = this.tenantOverrides.get(tenantId) || {};
    return {
      ...DEFAULT_TENANT_FEATURE_FLAGS,
      ...overrides,
    };
  }

  /**
   * Check whether a specific feature flag is enabled for a tenant.
   */
  isEnabled(tenantId: string, flag: FeatureFlagKey): boolean {
    const flags = this.getFlagsForTenant(tenantId);
    return Boolean(flags[flag]);
  }

  /**
   * Override a feature flag for a specific tenant.
   */
  setFlagForTenant(
    tenantId: string,
    flag: FeatureFlagKey,
    enabled: boolean,
  ): TenantFeatureFlags {
    const existing = this.tenantOverrides.get(tenantId) || {};
    const updated = { ...existing, [flag]: enabled };
    this.tenantOverrides.set(tenantId, updated);
    return this.getFlagsForTenant(tenantId);
  }

  /**
   * Reset all flag overrides for a tenant.
   */
  resetTenantFlags(tenantId: string): void {
    this.tenantOverrides.delete(tenantId);
  }
}

