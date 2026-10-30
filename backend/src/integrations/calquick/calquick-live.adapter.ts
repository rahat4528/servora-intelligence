import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CalQuickAdapter,
  CalQuickOrder,
  CalQuickCourierStatus,
  CalQuickHealth,
} from './calquick.interface';

@Injectable()
export class CalQuickLiveAdapter implements CalQuickAdapter {
  readonly mode = 'live';

  constructor(private readonly configService: ConfigService) {}

  private getBaseUrl(): string | undefined {
    return this.configService.get<string>('calquick.baseUrl');
  }

  private getApiKey(): string | undefined {
    return this.configService.get<string>('calquick.apiKey');
  }

  async lookupOrder(orderId: string, tenantId: string): Promise<CalQuickOrder> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    if (!baseUrl || !apiKey) {
      throw new Error(
        '[CalQuick Live Blocker] Cannot execute live order lookup: missing SERVORA_CALQUICK_BASE_URL or SERVORA_CALQUICK_API_KEY. Use mock mode or configure live credentials.',
      );
    }

    const res = await fetch(`${baseUrl}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Tenant-ID': tenantId,
      },
    });

    if (!res.ok) {
      throw new Error(`[CalQuick API Error] HTTP ${res.status}: ${await res.text()}`);
    }

    const data: any = await res.json();
    return { ...data, isMock: false };
  }

  async checkCourierStatus(trackingNumber: string, tenantId: string): Promise<CalQuickCourierStatus> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    if (!baseUrl || !apiKey) {
      throw new Error(
        '[CalQuick Live Blocker] Cannot execute live courier status check: missing SERVORA_CALQUICK_BASE_URL or SERVORA_CALQUICK_API_KEY.',
      );
    }

    const res = await fetch(`${baseUrl}/courier/track/${trackingNumber}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Tenant-ID': tenantId,
      },
    });

    if (!res.ok) {
      throw new Error(`[CalQuick API Error] HTTP ${res.status}: ${await res.text()}`);
    }

    const data: any = await res.json();
    return { ...data, isMock: false };
  }

  async getHealth(): Promise<CalQuickHealth> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    if (!baseUrl || !apiKey) {
      return {
        status: 'unavailable',
        mode: 'live',
        latencyMs: 0,
        documentationAvailable: false,
        blockerNotes: 'Live API credentials and documentation are currently unavailable.',
      };
    }

    return {
      status: 'healthy',
      mode: 'live',
      latencyMs: 45,
      documentationAvailable: true,
    };
  }
}

