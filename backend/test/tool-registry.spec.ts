import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ToolRegistryService } from '../src/tools/tool-registry.service';
import { CalQuickService } from '../src/integrations/calquick/calquick.service';
import { CalQuickMockAdapter } from '../src/integrations/calquick/calquick-mock.adapter';
import { CalQuickLiveAdapter } from '../src/integrations/calquick/calquick-live.adapter';
import { RetrievalService } from '../src/rag/retrieval/retrieval.service';
import { EmbeddingService } from '../src/rag/ingestion/embedding.service';
import { KnowledgeIngestionService } from '../src/rag/ingestion/knowledge-ingestion.service';
import { AuditService } from '../src/audit/audit.service';
import { BudgetService } from '../src/ai/governance/budget.service';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('Tool Registry and Controlled Execution Suite (Phase 6 CI Gate)', () => {
  let toolRegistry: ToolRegistryService;
  let budgetService: BudgetService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        ToolRegistryService,
        CalQuickService,
        CalQuickMockAdapter,
        CalQuickLiveAdapter,
        RetrievalService,
        EmbeddingService,
        KnowledgeIngestionService,
        AuditService,
        BudgetService,
        StructuredLoggerService,
      ],
    }).compile();

    toolRegistry = module.get<ToolRegistryService>(ToolRegistryService);
    budgetService = module.get<BudgetService>(BudgetService);
  });

  describe('1. Tool Registry Definition & Metadata', () => {
    it('should register standard tools with valid input schemas and risk categories', () => {
      const tools = toolRegistry.getToolDefinitions();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('lookup_order');
      expect(toolNames).toContain('check_courier_status');
      expect(toolNames).toContain('search_customer_policy');
      expect(toolNames).toContain('get_customer_history');

      const lookupOrder = toolRegistry.getToolByName('lookup_order');
      expect(lookupOrder.riskCategory).toBe('READ_ONLY');
      expect(lookupOrder.approvalRequired).toBe(false);
      expect(lookupOrder.inputSchema.required).toContain('orderId');
    });
  });

  describe('2. Read-Only Tool Execution Workflows', () => {
    it('should successfully execute lookup_order and return verified order items', async () => {
      const res = await toolRegistry.executeTool({
        toolName: 'lookup_order',
        parameters: { orderId: 'CQ-9821' },
        tenantId: 'tenant-default',
        conversationId: 'conv-101',
      });

      expect(res.success).toBe(true);
      expect(res.data.orderId).toBe('CQ-9821');
      expect(res.data.customerName).toBe('Tanvir Hossain');
      expect(res.data.totalAmount).toBe(145.0);
    });

    it('should successfully execute check_courier_status with checkpoints', async () => {
      const res = await toolRegistry.executeTool({
        toolName: 'check_courier_status',
        parameters: { trackingNumber: 'TRK-9821' },
        tenantId: 'tenant-default',
        conversationId: 'conv-101',
      });

      expect(res.success).toBe(true);
      expect(res.data.trackingNumber).toBe('TRK-9821');
      expect(res.data.status).toBe('IN_TRANSIT');
      expect(res.data.currentLocation).toContain('Customs Clearance');
    });

    it('should successfully execute search_customer_policy using tenant RAG', async () => {
      const res = await toolRegistry.executeTool({
        toolName: 'search_customer_policy',
        parameters: { query: 'how many days for refund' },
        tenantId: 'tenant-default',
      });

      expect(res.success).toBe(true);
      expect(res.data.citation).toContain('Refund and Return Policy');
    });

    it('should execute get_customer_history with authorized context', async () => {
      const res = await toolRegistry.executeTool({
        toolName: 'get_customer_history',
        parameters: { customerId: 'cust-1' },
        tenantId: 'tenant-default',
      });

      expect(res.success).toBe(true);
      expect(res.data.totalOrders).toBe(3);
      expect(res.data.recentOrders).toContain('CQ-9821');
    });
  });

  describe('3. Validation, Isolation & Budget Guardrails', () => {
    it('should reject tool execution when required parameters are missing', async () => {
      await expect(
        toolRegistry.executeTool({
          toolName: 'lookup_order',
          parameters: {}, // missing orderId
          tenantId: 'tenant-default',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject tool execution targeting another tenant resources', async () => {
      await expect(
        toolRegistry.executeTool({
          toolName: 'lookup_order',
          parameters: { orderId: 'CQ-ISO-99' },
          tenantId: 'tenant-default', // isolated order queried by default tenant
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce conversation tool-call budget limits', async () => {
      const convId = 'conv-budget-limit-test';

      // Exhaust 5 tool calls for this conversation
      for (let i = 0; i < 5; i++) {
        await toolRegistry.executeTool({
          toolName: 'get_customer_history',
          parameters: { customerId: 'cust-1' },
          tenantId: 'tenant-default',
          conversationId: convId,
        });
      }

      // 6th call must be blocked by budget gate
      await expect(
        toolRegistry.executeTool({
          toolName: 'get_customer_history',
          parameters: { customerId: 'cust-1' },
          tenantId: 'tenant-default',
          conversationId: convId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

