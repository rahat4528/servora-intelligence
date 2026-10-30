import { FeatureFlagsService } from '../src/common/feature-flags/feature-flags.service';
import { FeatureFlagKeys } from '@servora/common';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(() => {
    service = new FeatureFlagsService();
  });

  it('should return safe default flags for any new tenant', () => {
    const flags = service.getFlagsForTenant('tenant-100');

    expect(flags[FeatureFlagKeys.AI_SUMMARIES]).toBe(true);
    expect(flags[FeatureFlagKeys.AI_REPLY_SUGGESTIONS]).toBe(true);
    expect(flags[FeatureFlagKeys.RAG_KNOWLEDGE]).toBe(false);
    expect(flags[FeatureFlagKeys.CALQUICK_INTEGRATION]).toBe(false);
    expect(flags[FeatureFlagKeys.HUMAN_APPROVAL_ACTIONS]).toBe(false);
    expect(flags[FeatureFlagKeys.INTELLIGENT_ROUTING]).toBe(false);
    expect(flags[FeatureFlagKeys.INTELLIGENT_ROUTING_SHADOW]).toBe(true);
  });

  it('should isolate flag overrides between distinct tenants', () => {
    service.setFlagForTenant('tenant-A', FeatureFlagKeys.RAG_KNOWLEDGE, true);

    expect(service.isEnabled('tenant-A', FeatureFlagKeys.RAG_KNOWLEDGE)).toBe(true);
    expect(service.isEnabled('tenant-B', FeatureFlagKeys.RAG_KNOWLEDGE)).toBe(false);
  });

  it('should allow resetting tenant flags to defaults', () => {
    service.setFlagForTenant('tenant-A', FeatureFlagKeys.CALQUICK_INTEGRATION, true);
    expect(service.isEnabled('tenant-A', FeatureFlagKeys.CALQUICK_INTEGRATION)).toBe(true);

    service.resetTenantFlags('tenant-A');
    expect(service.isEnabled('tenant-A', FeatureFlagKeys.CALQUICK_INTEGRATION)).toBe(false);
  });
});

