import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  CalQuickAdapter,
  CalQuickOrder,
  CalQuickCourierStatus,
  CalQuickHealth,
} from './calquick.interface';

@Injectable()
export class CalQuickMockAdapter implements CalQuickAdapter {
  readonly mode = 'mock';

  private orders: Map<string, CalQuickOrder> = new Map([
    [
      'CQ-9821',
      {
        orderId: 'CQ-9821',
        tenantId: 'tenant-default',
        customerId: 'cust-1',
        customerName: 'Tanvir Hossain',
        customerEmail: 'tanvir@example.com',
        totalAmount: 145.0,
        currency: 'USD',
        orderStatus: 'SHIPPED',
        paymentStatus: 'PAID',
        trackingNumber: 'TRK-9821',
        courierName: 'CalQuick Express Logistics',
        items: [
          { sku: 'KB-RGB-01', name: 'Mechanical Gaming Keyboard (RGB)', quantity: 1, unitPrice: 120.0 },
          { sku: 'PAD-XL-02', name: 'Extended Desk Mat', quantity: 1, unitPrice: 25.0 },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        isMock: true,
      },
    ],
    [
      'CQ-102',
      {
        orderId: 'CQ-102',
        tenantId: 'tenant-default',
        customerId: 'cust-2',
        customerName: 'Nusrat Jahan',
        customerEmail: 'nusrat@example.com',
        totalAmount: 85.0,
        currency: 'USD',
        orderStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        trackingNumber: 'TRK-1020',
        courierName: 'CalQuick Express Logistics',
        items: [
          { sku: 'KB-SL-03', name: 'Slim Wireless Keyboard', quantity: 1, unitPrice: 85.0 },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        isMock: true,
      },
    ],
    [
      'CQ-4412',
      {
        orderId: 'CQ-4412',
        tenantId: 'tenant-default',
        customerId: 'cust-3',
        customerName: 'Farhan Ahmed',
        customerEmail: 'farhan@example.com',
        totalAmount: 210.0,
        currency: 'USD',
        orderStatus: 'SHIPPED',
        paymentStatus: 'PAID',
        trackingNumber: 'TRK-4412',
        courierName: 'CalQuick Courier BD',
        items: [
          { sku: 'MON-ARM-01', name: 'Heavy Duty Dual Monitor Arm', quantity: 1, unitPrice: 210.0 },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        isMock: true,
      },
    ],
    [
      'CQ-ISO-99',
      {
        orderId: 'CQ-ISO-99',
        tenantId: 'tenant-isolated',
        customerId: 'cust-iso-1',
        customerName: 'Acme Buyer',
        customerEmail: 'buyer@acme-client.com',
        totalAmount: 500.0,
        currency: 'USD',
        orderStatus: 'PROCESSING',
        paymentStatus: 'PAID',
        trackingNumber: 'TRK-ISO-99',
        courierName: 'Acme Courier',
        items: [{ sku: 'VIP-PACK', name: 'Enterprise Bundle', quantity: 1, unitPrice: 500.0 }],
        createdAt: new Date().toISOString(),
        isMock: true,
      },
    ],
  ]);

  private couriers: Map<string, CalQuickCourierStatus> = new Map([
    [
      'TRK-9821',
      {
        trackingNumber: 'TRK-9821',
        orderId: 'CQ-9821',
        tenantId: 'tenant-default',
        courierName: 'CalQuick Express Logistics',
        status: 'IN_TRANSIT',
        origin: 'Shenzhen Global Sorting Facility',
        destination: 'Dhaka, Bangladesh',
        currentLocation: 'Dhaka International Airport Cargo Hub (Customs Clearance)',
        estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        checkpoints: [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            location: 'Shenzhen Hub',
            status: 'PICKED_UP',
            notes: 'Package picked up from merchant warehouse.',
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            location: 'Bangkok Air Transit',
            status: 'IN_TRANSIT',
            notes: 'Flight departed to Dhaka.',
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            location: 'Dhaka Cargo Terminal',
            status: 'IN_TRANSIT',
            notes: 'Customs documents submitted for verification.',
          },
        ],
        lastUpdated: new Date().toISOString(),
        isMock: true,
      },
    ],
    [
      'TRK-4412',
      {
        trackingNumber: 'TRK-4412',
        orderId: 'CQ-4412',
        tenantId: 'tenant-default',
        courierName: 'CalQuick Courier BD',
        status: 'IN_TRANSIT',
        origin: 'Tejgaon Central Hub',
        destination: 'Uttara Sector 7, Dhaka',
        currentLocation: 'Mohakhali Sorting Facility',
        estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
        checkpoints: [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            location: 'Tejgaon Central Hub',
            status: 'PICKED_UP',
            notes: 'Dispatched to delivery van.',
          },
        ],
        lastUpdated: new Date().toISOString(),
        isMock: true,
      },
    ],
  ]);

  async lookupOrder(orderId: string, tenantId: string): Promise<CalQuickOrder> {
    const order = this.orders.get(orderId.trim().toUpperCase());
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found in CalQuick order database.`);
    }

    if (order.tenantId !== tenantId) {
      throw new ForbiddenException(`Cross-tenant violation: order '${orderId}' does not belong to tenant '${tenantId}'.`);
    }

    return { ...order };
  }

  async checkCourierStatus(trackingNumber: string, tenantId: string): Promise<CalQuickCourierStatus> {
    const courier = this.couriers.get(trackingNumber.trim().toUpperCase());
    if (!courier) {
      throw new NotFoundException(`Tracking number '${trackingNumber}' was not found in CalQuick courier registry.`);
    }

    if (courier.tenantId !== tenantId) {
      throw new ForbiddenException(`Cross-tenant violation: courier record does not belong to tenant '${tenantId}'.`);
    }

    return { ...courier };
  }

  async getHealth(): Promise<CalQuickHealth> {
    return {
      status: 'healthy',
      mode: 'mock',
      latencyMs: 12,
      documentationAvailable: false,
      blockerNotes: 'Upstream CalQuick live API documentation and sandbox credentials are not yet available. Deterministic mock engine is fully operational.',
    };
  }
}

