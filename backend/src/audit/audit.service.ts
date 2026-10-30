import { Injectable, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

export interface AuditEventRecord {
  id: string;
  tenantId: string;
  userId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface CreateAuditEventDto {
  tenantId: string;
  userId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface QueryAuditEventsFilter {
  eventType?: string;
  userId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private events: AuditEventRecord[] = [];

  constructor(private readonly logger: StructuredLoggerService) {}

  async recordEvent(dto: CreateAuditEventDto): Promise<AuditEventRecord> {
    const record: AuditEventRecord = {
      id: `aud-${uuidv4()}`,
      tenantId: dto.tenantId,
      userId: dto.userId,
      eventType: dto.eventType,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      action: dto.action,
      details: dto.details,
      ipAddress: dto.ipAddress || '127.0.0.1',
      userAgent: dto.userAgent || 'internal/system',
      createdAt: new Date().toISOString(),
    };

    this.events.unshift(record);

    this.logger.log(
      `[Audit Event] ${record.eventType} on ${record.resourceType}:${record.resourceId} by ${record.userId}`,
      'AuditService',
      {
        tenantId: record.tenantId,
        userId: record.userId,
      },
    );

    return record;
  }

  async getEventsForTenant(
    requesterTenantId: string,
    filter: QueryAuditEventsFilter = {},
  ): Promise<{ items: AuditEventRecord[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    // Strict tenant isolation: requester can ONLY see events from their own tenantId
    let tenantEvents = this.events.filter((e) => e.tenantId === requesterTenantId);

    if (filter.eventType) {
      tenantEvents = tenantEvents.filter((e) => e.eventType === filter.eventType);
    }
    if (filter.userId) {
      tenantEvents = tenantEvents.filter((e) => e.userId === filter.userId);
    }
    if (filter.resourceType) {
      tenantEvents = tenantEvents.filter((e) => e.resourceType === filter.resourceType);
    }

    const total = tenantEvents.length;
    const startIndex = (page - 1) * limit;
    const items = tenantEvents.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}

