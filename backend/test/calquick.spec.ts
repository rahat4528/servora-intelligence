import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CalQuickService } from '../src/integrations/calquick/calquick.service';
import { CalQuickMockAdapter } from '../src/integrations/calquick/calquick-mock.adapter';
import { CalQuickLiveAdapter } from '../src/integrations/calquick/calquick-live.adapter';
import { AuditService } from '../src/audit/audit.service';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CalQuick Integration Contract & Sandbox Suite (Phase 5 CI Gate)', () => {
  let calquickService: CalQuickService;
  let auditService: AuditService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        CalQuickService,
        CalQuickMockAdapter,
        CalQuickLiveAdapter,
        AuditService,
        StructuredLoggerService,
      ],
    }).compile();

    calquickService = module.get<CalQuickService>(CalQuickService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('1. Order Lookup Operations', () => {
    it('should successfully retrieve order details for an existing order with verified items', async () => {
      const order = await calquickService.lookupOrder('CQ-9821', 'tenant-default');

      expect(order).toBeDefined();
      expect(order.orderId).toBe('CQ-9821');
      expect(order.customerName).toBe('Tanvir Hossain');
      expect(order.orderStatus).toBe('SHIPPED');
      expect(order.paymentStatus).toBe('PAID');
      expect(order.totalAmount).toBe(145.0);
      expect(order.items.length).toBe(2);
      expect(order.isMock).toBe(true);
    });

    it('should throw NotFoundException for unknown order ID', async () => {
      await expect(
        calquickService.lookupOrder('CQ-NONEXISTENT', 'tenant-default'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should strictly forbid cross-tenant order access', async () => {
      // CQ-ISO-99 belongs to tenant-isolated. Tenant-default querying it must fail!
      await expect(
        calquickService.lookupOrder('CQ-ISO-99', 'tenant-default'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Courier Status Retrieval', () => {
    it('should retrieve live-simulated courier checkpoints and current location', async () => {
      const courier = await calquickService.checkCourierStatus('TRK-9821', 'tenant-default');

      expect(courier).toBeDefined();
      expect(courier.trackingNumber).toBe('TRK-9821');
      expect(courier.orderId).toBe('CQ-9821');
      expect(courier.status).toBe('IN_TRANSIT');
      expect(courier.currentLocation).toContain('Customs Clearance');
      expect(courier.checkpoints.length).toBeGreaterThanOrEqual(2);
      expect(courier.isMock).toBe(true);
    });

    it('should throw NotFoundException for invalid tracking numbers', async () => {
      await expect(
        calquickService.checkCourierStatus('TRK-INVALID', 'tenant-default'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Integration Health & Blocker Documentation', () => {
    it('should return operational health status and document the live API documentation blocker', async () => {
      const health = await calquickService.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.mode).toBe('mock');
      expect(health.documentationAvailable).toBe(false);
      expect(health.blockerNotes).toContain('live API documentation');
    });

    it('should record structured audit events for every order and courier lookup', async () => {
      await calquickService.lookupOrder('CQ-4412', 'tenant-default');

      const auditLogs = await auditService.getEventsForTenant('tenant-default', {
        eventType: 'CALQUICK_ORDER_LOOKUP',
      });

      expect(auditLogs.items.length).toBeGreaterThan(0);
      expect(auditLogs.items[0].resourceId).toBe('CQ-4412');
    });
  });
});

