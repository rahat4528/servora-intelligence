import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { InboxService } from '../src/inbox/inbox.service';
import { AuditService } from '../src/audit/audit.service';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';
import { ConversationStatus, ConversationPriority, MessageSenderType } from '@servora/common';
import { NotFoundException } from '@nestjs/common';

describe('Inbox Core Test Suite (Phase 2B)', () => {
  let inboxService: InboxService;
  let auditService: AuditService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [InboxService, AuditService, StructuredLoggerService],
    }).compile();

    inboxService = module.get<InboxService>(InboxService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('1. Conversation Loading, Searching, and Filtering', () => {
    it('should list conversations for a tenant with pagination', () => {
      const result = inboxService.listConversations('tenant-default', { page: 1, limit: 10 });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.items.every((c) => c.tenantId === 'tenant-default')).toBe(true);
    });

    it('should filter conversations by status', () => {
      const openResult = inboxService.listConversations('tenant-default', {
        status: ConversationStatus.OPEN,
      });
      expect(openResult.items.every((c) => c.status === ConversationStatus.OPEN)).toBe(true);

      const pendingResult = inboxService.listConversations('tenant-default', {
        status: ConversationStatus.PENDING,
      });
      expect(pendingResult.items.every((c) => c.status === ConversationStatus.PENDING)).toBe(true);
    });

    it('should search conversations by customer name, title, or tag', () => {
      const searchResult = inboxService.listConversations('tenant-default', {
        search: 'Tanvir',
      });
      expect(searchResult.items.length).toBeGreaterThan(0);
      expect(searchResult.items[0].customerName).toBe('Tanvir Hossain');
    });

    it('should fetch a single conversation with messages and reset unread count', () => {
      const conv = inboxService.getConversationById('conv-101', 'tenant-default');
      expect(conv.id).toBe('conv-101');
      expect(conv.messages).toBeDefined();
      expect(conv.messages!.length).toBeGreaterThan(0);
      expect(conv.unreadCount).toBe(0);
    });
  });

  describe('2. Message and Internal Note Operations', () => {
    it('should allow support agent to post a reply', async () => {
      const message = await inboxService.addMessage('conv-101', 'tenant-default', {
        senderType: MessageSenderType.AGENT,
        senderId: 'usr-agent-1',
        senderName: 'Agent Sarah',
        content: 'Your package is on its way.',
      });

      expect(message.id).toBeDefined();
      expect(message.senderType).toBe(MessageSenderType.AGENT);
      expect(message.content).toBe('Your package is on its way.');

      const updatedConv = inboxService.getConversationById('conv-101', 'tenant-default');
      expect(updatedConv.messages!.some((m) => m.id === message.id)).toBe(true);
    });

    it('should allow support agent to add an internal private note', async () => {
      const note = await inboxService.addInternalNote(
        'conv-101',
        'tenant-default',
        'usr-agent-1',
        'Agent Sarah',
        'Supervisor review required for customs delay.',
      );

      expect(note.id).toBeDefined();
      expect(note.authorName).toBe('Agent Sarah');
      expect(note.content).toContain('Supervisor review');

      const updatedConv = inboxService.getConversationById('conv-101', 'tenant-default');
      expect(updatedConv.notes!.some((n) => n.id === note.id)).toBe(true);
    });

    it('should automatically reopen a resolved ticket when a customer sends a new message', async () => {
      // First resolve ticket
      await inboxService.updateStatus('conv-102', 'tenant-default', ConversationStatus.RESOLVED, 'usr-agent-1');
      let conv = inboxService.getConversationById('conv-102', 'tenant-default');
      expect(conv.status).toBe(ConversationStatus.RESOLVED);

      // Customer sends a follow-up message
      await inboxService.addMessage('conv-102', 'tenant-default', {
        senderType: MessageSenderType.CUSTOMER,
        senderId: 'cust-2',
        senderName: 'Nusrat Jahan',
        content: 'Wait, the replacement was also the wrong model!',
      });

      conv = inboxService.getConversationById('conv-102', 'tenant-default');
      expect(conv.status).toBe(ConversationStatus.OPEN);
      expect(conv.unreadCount).toBe(0); // getConversationById resets unread count
    });
  });

  describe('3. Status Management & Manual Assignment', () => {
    it('should update ticket status and record audit event', async () => {
      const updated = await inboxService.updateStatus(
        'conv-101',
        'tenant-default',
        ConversationStatus.CLOSED,
        'usr-manager-1',
      );

      expect(updated.status).toBe(ConversationStatus.CLOSED);

      const auditLogs = await auditService.getEventsForTenant('tenant-default', {
        eventType: 'CONVERSATION_STATUS_CHANGED',
      });
      expect(auditLogs.items.length).toBeGreaterThan(0);
      expect(auditLogs.items[0].resourceId).toBe('conv-101');
    });

    it('should assign and reassign agent manually and record audit event', async () => {
      const updated = await inboxService.assignAgent(
        'conv-103',
        'tenant-default',
        'usr-agent-1',
        'usr-manager-1',
      );

      expect(updated.assignedAgentId).toBe('usr-agent-1');

      const auditLogs = await auditService.getEventsForTenant('tenant-default', {
        eventType: 'CONVERSATION_ASSIGNED',
      });
      expect(auditLogs.items.length).toBeGreaterThan(0);
      expect(auditLogs.items[0].resourceId).toBe('conv-103');
    });
  });

  describe('4. Tenant Isolation of Inbox Data', () => {
    it('should prevent Tenant A from accessing Tenant B conversations', () => {
      expect(() => {
        inboxService.getConversationById('conv-201', 'tenant-default');
      }).toThrow(NotFoundException);
    });

    it('should strictly isolate conversation listings between tenants', () => {
      const listA = inboxService.listConversations('tenant-default');
      const listB = inboxService.listConversations('tenant-isolated');

      expect(listA.items.some((c) => c.id === 'conv-201')).toBe(false);
      expect(listB.items.every((c) => c.tenantId === 'tenant-isolated')).toBe(true);
    });
  });
});

