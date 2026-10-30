import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  ConversationStatus,
  ConversationPriority,
  MessageSenderType,
} from '@servora/common';
import { AuditService } from '../audit/audit.service';

export interface InboxStreamEvent {
  type: 'CONVERSATION_CREATED' | 'MESSAGE_SENT' | 'NOTE_ADDED' | 'STATUS_CHANGED' | 'ASSIGNED';
  tenantId: string;
  conversationId: string;
  data: any;
  timestamp: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  tenantId: string;
  senderType: MessageSenderType;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: any[];
  createdAt: string;
}

export interface InternalNoteRecord {
  id: string;
  conversationId: string;
  tenantId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedAgentId?: string;
  tags: string[];
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages?: MessageRecord[];
  notes?: InternalNoteRecord[];
}

export interface ListConversationsFilter {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assignedAgentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateConversationDto {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  initialMessage: string;
  priority?: ConversationPriority;
  tags?: string[];
}

@Injectable()
export class InboxService {
  private conversations: Map<string, ConversationRecord> = new Map();
  private messages: Map<string, MessageRecord[]> = new Map();
  private internalNotes: Map<string, InternalNoteRecord[]> = new Map();
  private eventSubject = new Subject<InboxStreamEvent>();

  public getEventStream(tenantId: string): Observable<InboxStreamEvent> {
    return this.eventSubject.asObservable().pipe(filter((e) => e.tenantId === tenantId));
  }

  private emitEvent(event: InboxStreamEvent) {
    this.eventSubject.next(event);
  }

  constructor(private readonly auditService: AuditService) {
    this.seedConversations();
  }

  private seedConversations() {
    const tenantDefault = 'tenant-default';
    const initialConversations: ConversationRecord[] = [
      {
        id: 'conv-101',
        tenantId: tenantDefault,
        customerId: 'cust-1',
        customerName: 'Tanvir Hossain',
        customerEmail: 'tanvir@example.com',
        customerPhone: '+8801711223344',
        title: 'Where is my courier delivery? (Order #CQ-9821)',
        status: ConversationStatus.OPEN,
        priority: ConversationPriority.HIGH,
        assignedAgentId: 'usr-agent-1',
        tags: ['courier', 'delivery-delay', 'calquick'],
        unreadCount: 1,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conv-102',
        tenantId: tenantDefault,
        customerId: 'cust-2',
        customerName: 'Nusrat Jahan',
        customerEmail: 'nusrat@example.com',
        customerPhone: '+8801812345678',
        title: 'Requesting refund for defective keyboard',
        status: ConversationStatus.PENDING,
        priority: ConversationPriority.MEDIUM,
        assignedAgentId: 'usr-agent-1',
        tags: ['refund', 'hardware'],
        unreadCount: 0,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conv-103',
        tenantId: tenantDefault,
        customerId: 'cust-3',
        customerName: 'Farhan Ahmed',
        customerEmail: 'farhan@example.com',
        customerPhone: '+8801912987654',
        title: 'Banglish inquiry: Amar order ta kobe pabo?',
        status: ConversationStatus.OPEN,
        priority: ConversationPriority.MEDIUM,
        assignedAgentId: undefined, // Unassigned for routing tests
        tags: ['banglish', 'order-status'],
        unreadCount: 1,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conv-201',
        tenantId: 'tenant-isolated',
        customerId: 'cust-iso-1',
        customerName: 'Acme VIP Buyer',
        customerEmail: 'buyer@acme-client.com',
        title: 'Acme Isolated Thread #1',
        status: ConversationStatus.OPEN,
        priority: ConversationPriority.URGENT,
        assignedAgentId: 'usr-agent-2',
        tags: ['vip'],
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    initialConversations.forEach((conv) => {
      this.conversations.set(conv.id, conv);
      this.messages.set(conv.id, [
        {
          id: `msg-${uuidv4().slice(0, 8)}`,
          conversationId: conv.id,
          tenantId: conv.tenantId,
          senderType: MessageSenderType.CUSTOMER,
          senderId: conv.customerId,
          senderName: conv.customerName,
          content: `Initial inquiry regarding ${conv.title}`,
          createdAt: conv.createdAt,
        },
      ]);
      this.internalNotes.set(conv.id, []);
    });
  }

  listConversations(
    tenantId: string,
    filter: ListConversationsFilter = {},
  ): { items: ConversationRecord[]; total: number; page: number; limit: number } {
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    let tenantList = Array.from(this.conversations.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filter.status) {
      tenantList = tenantList.filter((c) => c.status === filter.status);
    }
    if (filter.priority) {
      tenantList = tenantList.filter((c) => c.priority === filter.priority);
    }
    if (filter.assignedAgentId) {
      tenantList = tenantList.filter((c) => c.assignedAgentId === filter.assignedAgentId);
    }
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.toLowerCase();
      tenantList = tenantList.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.customerEmail.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sort by lastMessageAt descending
    tenantList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const total = tenantList.length;
    const startIndex = (page - 1) * limit;
    const items = tenantList.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  getConversationById(conversationId: string, tenantId: string): ConversationRecord {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.tenantId !== tenantId) {
      throw new NotFoundException(`Conversation ${conversationId} not found in this tenant`);
    }

    // Reset unread count on view
    conv.unreadCount = 0;
    this.conversations.set(conversationId, conv);

    const msgs = this.messages.get(conversationId) || [];
    const notes = this.internalNotes.get(conversationId) || [];

    return {
      ...conv,
      messages: msgs,
      notes,
    };
  }

  async createConversation(tenantId: string, dto: CreateConversationDto): Promise<ConversationRecord> {
    const id = `conv-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const conversation: ConversationRecord = {
      id,
      tenantId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      title: dto.title,
      status: ConversationStatus.OPEN,
      priority: dto.priority || ConversationPriority.MEDIUM,
      tags: dto.tags || [],
      unreadCount: 1,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const firstMessage: MessageRecord = {
      id: `msg-${uuidv4().slice(0, 8)}`,
      conversationId: id,
      tenantId,
      senderType: MessageSenderType.CUSTOMER,
      senderId: dto.customerId,
      senderName: dto.customerName,
      content: dto.initialMessage,
      createdAt: now,
    };

    this.conversations.set(id, conversation);
    this.messages.set(id, [firstMessage]);
    this.internalNotes.set(id, []);

    await this.auditService.recordEvent({
      tenantId,
      userId: dto.customerId,
      eventType: 'CONVERSATION_CREATED',
      resourceType: 'conversation',
      resourceId: id,
      action: 'CREATE',
      details: { title: dto.title, customerEmail: dto.customerEmail },
    });

    this.emitEvent({
      type: 'CONVERSATION_CREATED',
      tenantId,
      conversationId: id,
      data: conversation,
      timestamp: now,
    });

    return {
      ...conversation,
      messages: [firstMessage],
      notes: [],
    };
  }

  async addMessage(
    conversationId: string,
    tenantId: string,
    data: {
      senderType: MessageSenderType;
      senderId: string;
      senderName: string;
      content: string;
    },
  ): Promise<MessageRecord> {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.tenantId !== tenantId) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const now = new Date().toISOString();
    const msg: MessageRecord = {
      id: `msg-${uuidv4().slice(0, 8)}`,
      conversationId,
      tenantId,
      senderType: data.senderType,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      createdAt: now,
    };

    const currentMsgs = this.messages.get(conversationId) || [];
    currentMsgs.push(msg);
    this.messages.set(conversationId, currentMsgs);

    conv.lastMessageAt = now;
    conv.updatedAt = now;

    // If customer replies, reopen closed ticket and bump unread
    if (data.senderType === MessageSenderType.CUSTOMER) {
      if (conv.status === ConversationStatus.RESOLVED || conv.status === ConversationStatus.CLOSED) {
        conv.status = ConversationStatus.OPEN;
      }
      conv.unreadCount += 1;
    }

    this.conversations.set(conversationId, conv);

    this.emitEvent({
      type: 'MESSAGE_SENT',
      tenantId,
      conversationId,
      data: msg,
      timestamp: now,
    });

    return msg;
  }

  async addInternalNote(
    conversationId: string,
    tenantId: string,
    authorId: string,
    authorName: string,
    content: string,
  ): Promise<InternalNoteRecord> {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.tenantId !== tenantId) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const note: InternalNoteRecord = {
      id: `note-${uuidv4().slice(0, 8)}`,
      conversationId,
      tenantId,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
    };

    const currentNotes = this.internalNotes.get(conversationId) || [];
    currentNotes.push(note);
    this.internalNotes.set(conversationId, currentNotes);

    this.emitEvent({
      type: 'NOTE_ADDED',
      tenantId,
      conversationId,
      data: note,
      timestamp: note.createdAt,
    });

    return note;
  }

  async updateStatus(
    conversationId: string,
    tenantId: string,
    status: ConversationStatus,
    actorId: string,
  ): Promise<ConversationRecord> {
    const conv = this.getConversationById(conversationId, tenantId);
    const oldStatus = conv.status;
    conv.status = status;
    conv.updatedAt = new Date().toISOString();

    this.conversations.set(conversationId, conv);

    await this.auditService.recordEvent({
      tenantId,
      userId: actorId,
      eventType: 'CONVERSATION_STATUS_CHANGED',
      resourceType: 'conversation',
      resourceId: conversationId,
      action: 'UPDATE_STATUS',
      details: { oldStatus, newStatus: status },
    });

    this.emitEvent({
      type: 'STATUS_CHANGED',
      tenantId,
      conversationId,
      data: { oldStatus, newStatus: status },
      timestamp: conv.updatedAt,
    });

    return conv;
  }

  async assignAgent(
    conversationId: string,
    tenantId: string,
    agentId: string,
    actorId: string,
  ): Promise<ConversationRecord> {
    const conv = this.getConversationById(conversationId, tenantId);
    const oldAgentId = conv.assignedAgentId;
    conv.assignedAgentId = agentId;
    conv.updatedAt = new Date().toISOString();

    this.conversations.set(conversationId, conv);

    await this.auditService.recordEvent({
      tenantId,
      userId: actorId,
      eventType: 'CONVERSATION_ASSIGNED',
      resourceType: 'conversation',
      resourceId: conversationId,
      action: 'ASSIGN',
      details: { oldAgentId, newAgentId: agentId },
    });

    this.emitEvent({
      type: 'ASSIGNED',
      tenantId,
      conversationId,
      data: { oldAgentId, newAgentId: agentId },
      timestamp: conv.updatedAt,
    });

    return conv;
  }
}

