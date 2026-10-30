import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { UserRole } from '@servora/common';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  userRole?: UserRole;
  requestId?: string;
}

@Injectable({ scope: Scope.DEFAULT })
export class TenantContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

  /**
   * Run a callback within an isolated tenant context (AsyncLocalStorage)
   */
  runWithContext<T>(context: TenantContext, callback: () => Promise<T> | T): Promise<T> | T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Get the current tenant context if present
   */
  getContext(): TenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get the current active tenantId
   */
  getTenantId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.tenantId;
  }

  /**
   * Require tenantId or throw a strict security exception
   */
  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('[Security Exception] Missing mandatory tenant context for tenant-isolated operation.');
    }
    return tenantId;
  }

  /**
   * Get current authenticated userId
   */
  getUserId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.userId;
  }

  /**
   * Get current user role
   */
  getUserRole(): UserRole | undefined {
    return this.asyncLocalStorage.getStore()?.userRole;
  }
}

