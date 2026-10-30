import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../src/auth/auth.service';
import { TenantsService } from '../src/tenants/tenants.service';
import { UsersService } from '../src/users/users.service';
import { AuditService } from '../src/audit/audit.service';
import { EncryptionService } from '../src/common/crypto/encryption.service';
import { TenantContextService } from '../src/common/tenancy/tenant-context.service';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';
import { RolesGuard } from '../src/auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@servora/common';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('Tenant Isolation & RBAC Test Suite (Phase 2 CI Gate)', () => {
  let authService: AuthService;
  let tenantsService: TenantsService;
  let usersService: UsersService;
  let auditService: AuditService;
  let encryptionService: EncryptionService;
  let tenantContextService: TenantContextService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'servora-test-jwt-secret-min-32-chars-long!',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        TenantsService,
        UsersService,
        AuditService,
        EncryptionService,
        TenantContextService,
        StructuredLoggerService,
        RolesGuard,
        Reflector,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    tenantsService = module.get<TenantsService>(TenantsService);
    usersService = module.get<UsersService>(UsersService);
    auditService = module.get<AuditService>(AuditService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    tenantContextService = module.get<TenantContextService>(TenantContextService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('1. Cross-Tenant Read & Write Isolation', () => {
    it('should strictly forbid Tenant A from accessing Tenant B settings', () => {
      const tenantA = 'tenant-default';
      const tenantB = 'tenant-isolated';

      // Tenant A accessing Tenant A succeeds
      const settingsA = tenantsService.getSettings(tenantA, tenantA);
      expect(settingsA).toBeDefined();
      expect(settingsA.tenantId).toBe(tenantA);

      // Tenant A attempting to access Tenant B throws ForbiddenException
      expect(() => tenantsService.getSettings(tenantB, tenantA)).toThrow(
        ForbiddenException,
      );
    });

    it('should strictly forbid Tenant A from modifying Tenant B settings', async () => {
      const tenantA = 'tenant-default';
      const tenantB = 'tenant-isolated';

      await expect(
        tenantsService.updateSettings(tenantB, tenantA, 'usr-admin-1', {
          primaryLanguage: 'bn',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should isolate users between tenants', () => {
      const usersA = usersService.getUsersForTenant('tenant-default');
      const usersB = usersService.getUsersForTenant('tenant-isolated');

      expect(usersA.length).toBeGreaterThan(0);
      expect(usersB.length).toBeGreaterThan(0);

      // None of Tenant A users should appear in Tenant B list
      const userAIds = usersA.map((u) => u.id);
      usersB.forEach((u) => {
        expect(userAIds).not.toContain(u.id);
      });
    });

    it('should isolate audit trail logs between tenants', async () => {
      // Record event for Tenant A
      await auditService.recordEvent({
        tenantId: 'tenant-default',
        userId: 'usr-agent-1',
        eventType: 'TEST_EVENT_A',
        resourceType: 'test',
        resourceId: 'res-1',
        action: 'TEST',
      });

      // Record event for Tenant B
      await auditService.recordEvent({
        tenantId: 'tenant-isolated',
        userId: 'usr-agent-2',
        eventType: 'TEST_EVENT_B',
        resourceType: 'test',
        resourceId: 'res-2',
        action: 'TEST',
      });

      // Tenant A querying audit logs should ONLY see Tenant A events
      const logsA = await auditService.getEventsForTenant('tenant-default');
      expect(logsA.items.every((item) => item.tenantId === 'tenant-default')).toBe(true);

      // Tenant B querying audit logs should ONLY see Tenant B events
      const logsB = await auditService.getEventsForTenant('tenant-isolated');
      expect(logsB.items.every((item) => item.tenantId === 'tenant-isolated')).toBe(true);
    });
  });

  describe('2. Role-Based Access Control (RBAC)', () => {
    function mockExecutionContext(userRole: UserRole, requiredRoles: UserRole[]): ExecutionContext {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: userRole },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
    }

    it('should grant access when user has the required role', () => {
      const context = mockExecutionContext(UserRole.TENANT_ADMIN, [UserRole.TENANT_ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny access when user role is insufficient', () => {
      const context = mockExecutionContext(UserRole.SUPPORT_AGENT, [
        UserRole.TENANT_ADMIN,
        UserRole.SUPPORT_MANAGER,
      ]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow manager role access when allowed alongside admin', () => {
      const context = mockExecutionContext(UserRole.SUPPORT_MANAGER, [
        UserRole.TENANT_ADMIN,
        UserRole.SUPPORT_MANAGER,
      ]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });

  describe('3. Sensitive Credential Encryption (AES-256-GCM)', () => {
    it('should successfully encrypt and decrypt sensitive API keys and tokens', () => {
      const apiKey = 'sk-live-calquick-secret-token-abcdef123456';
      const encrypted = encryptionService.encrypt(apiKey);

      expect(encrypted.ciphertext).not.toBe(apiKey);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it('should fail decryption if authentication tag or ciphertext is tampered with', () => {
      const secret = 'super-confidential-webhook-secret';
      const encrypted = encryptionService.encrypt(secret);

      const tampered = {
        ...encrypted,
        ciphertext: '00' + encrypted.ciphertext.slice(2),
      };

      expect(() => encryptionService.decrypt(tampered)).toThrow();
    });
  });

  describe('4. Tenant Context Propagation', () => {
    it('should strictly isolate asynchronous tenant execution context', async () => {
      let capturedTenant1 = '';
      let capturedTenant2 = '';

      await Promise.all([
        tenantContextService.runWithContext({ tenantId: 'tenant-1' }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          capturedTenant1 = tenantContextService.requireTenantId();
        }),
        tenantContextService.runWithContext({ tenantId: 'tenant-2' }, async () => {
          await new Promise((r) => setTimeout(r, 5));
          capturedTenant2 = tenantContextService.requireTenantId();
        }),
      ]);

      expect(capturedTenant1).toBe('tenant-1');
      expect(capturedTenant2).toBe('tenant-2');
    });

    it('should throw security exception when required tenant context is absent', () => {
      expect(() => tenantContextService.requireTenantId()).toThrow(
        /Missing mandatory tenant context/,
      );
    });
  });
});

