export type OrderStatus = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PAID' | 'REFUND_PENDING' | 'REFUNDED' | 'FAILED';
export type CourierDeliveryStatus = 'PICKED_UP' | 'IN_TRANSIT' | 'HUB_DELAY' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CalQuickOrder {
  orderId: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  courierName?: string;
  items: OrderItem[];
  createdAt: string;
  isMock: boolean;
}

export interface CourierCheckpoint {
  timestamp: string;
  location: string;
  status: CourierDeliveryStatus;
  notes?: string;
}

export interface CalQuickCourierStatus {
  trackingNumber: string;
  orderId: string;
  tenantId: string;
  courierName: string;
  status: CourierDeliveryStatus;
  origin: string;
  destination: string;
  currentLocation: string;
  estimatedDelivery: string;
  checkpoints: CourierCheckpoint[];
  lastUpdated: string;
  isMock: boolean;
}

export interface CalQuickHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  mode: 'mock' | 'live';
  latencyMs: number;
  documentationAvailable: boolean;
  blockerNotes?: string;
}

export interface CalQuickAdapter {
  readonly mode: 'mock' | 'live';
  lookupOrder(orderId: string, tenantId: string): Promise<CalQuickOrder>;
  checkCourierStatus(trackingNumber: string, tenantId: string): Promise<CalQuickCourierStatus>;
  getHealth(): Promise<CalQuickHealth>;
}

