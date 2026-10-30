import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../../common/logging/structured-logger.service';
import { AuditService } from '../../audit/audit.service';
import {
  CalQuickAdapter,
  CalQuickOrder,
  CalQuickCourierStatus,
  CalQuickHealth,
} from './calquick.interface';
import { CalQuickMockAdapter } from './calquick-mock.adapter';
import { CalQuickLiveAdapter } from './calquick-live.adapter';

@Injectable()
export class CalQuickService implements CalQuickAdapter {
  private activeAdapter: CalQuickAdapter;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
    private readonly auditService: AuditService,
    private readonly mockAdapter: CalQuickMockAdapter,
    private readonly liveAdapter: CalQuickLiveAdapter,
  ) {
    const mode = this.configService.get<string>('calquick.mode') || 'mock';
    this.activeAdapter = mode === 'live' ? this.liveAdapter : this.mockAdapter;
  }

  get mode(): 'mock' | 'live' {
    return this.activeAdapter.mode;
  }

  async lookupOrder(orderId: string, tenantId: string): Promise<CalQuickOrder> {
    const startTime = Date.now();
    try {
      const order = await this.activeAdapter.lookupOrder(orderId, tenantId);

      this.logger.log(
        `[CalQuick ${this.mode.toUpperCase()}] Looked up order ${orderId} for tenant ${tenantId} in ${Date.now() - startTime}ms`,
        'CalQuickService',
        { tenantId, orderId },
      );

      await this.auditService.recordEvent({
        tenantId,
        userId: 'system',
        eventType: 'CALQUICK_ORDER_LOOKUP',
        resourceType: 'order',
        resourceId: orderId,
        action: 'LOOKUP',
        details: { mode: this.mode, status: order.orderStatus, isMock: order.isMock },
      });

      return order;
    } catch (err: any) {
      this.logger.warn(
        `[CalQuick ${this.mode.toUpperCase()}] Order lookup failed for ${orderId}: ${err.message}`,
        'CalQuickService',
      );
      throw err;
    }
  }

  async checkCourierStatus(trackingNumber: string, tenantId: string): Promise<CalQuickCourierStatus> {
    const startTime = Date.now();
    try {
      const courier = await this.activeAdapter.checkCourierStatus(trackingNumber, tenantId);

      this.logger.log(
        `[CalQuick ${this.mode.toUpperCase()}] Checked courier ${trackingNumber} for tenant ${tenantId} in ${Date.now() - startTime}ms`,
        'CalQuickService',
        { tenantId, trackingNumber },
      );

      await this.auditService.recordEvent({
        tenantId,
        userId: 'system',
        eventType: 'CALQUICK_COURIER_CHECK',
        resourceType: 'courier',
        resourceId: trackingNumber,
        action: 'CHECK_STATUS',
        details: { mode: this.mode, status: courier.status, isMock: courier.isMock },
      });

      return courier;
    } catch (err: any) {
      this.logger.warn(
        `[CalQuick ${this.mode.toUpperCase()}] Courier check failed for ${trackingNumber}: ${err.message}`,
        'CalQuickService',
      );
      throw err;
    }
  }

  async getHealth(): Promise<CalQuickHealth> {
    return this.activeAdapter.getHealth();
  }
}

