import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ToolDefinition,
  ToolExecutionRecord,
  ToolExecutionResult,
} from './tool-registry.interface';
import { CalQuickService } from '../integrations/calquick/calquick.service';
import { RetrievalService } from '../rag/retrieval/retrieval.service';
import { AuditService } from '../audit/audit.service';
import { BudgetService } from '../ai/governance/budget.service';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Injectable()
export class ToolRegistryService {
  private tools: Map<string, ToolDefinition> = new Map();
  private executions: ToolExecutionRecord[] = [];

  constructor(
    private readonly calquickService: CalQuickService,
    private readonly retrievalService: RetrievalService,
    private readonly auditService: AuditService,
    private readonly budgetService: BudgetService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.registerStandardTools();
  }

  private registerStandardTools() {
    const definitions: ToolDefinition[] = [
      {
        name: 'lookup_order',
        description: "Look up a customer's order details including items, total amount, order status, and payment status.",
        riskCategory: 'READ_ONLY',
        approvalRequired: false,
        timeoutMs: 5000,
        idempotent: true,
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'The unique CalQuick order identifier (e.g. CQ-9821)', required: true },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'check_courier_status',
        description: 'Check the real-time shipping progress, current transit hub location, and checkpoints for a tracking number.',
        riskCategory: 'READ_ONLY',
        approvalRequired: false,
        timeoutMs: 5000,
        idempotent: true,
        inputSchema: {
          type: 'object',
          properties: {
            trackingNumber: { type: 'string', description: 'The courier tracking number (e.g. TRK-9821)', required: true },
          },
          required: ['trackingNumber'],
        },
      },
      {
        name: 'search_customer_policy',
        description: "Search the current tenant's return, refund, delivery, or warranty policies using semantic retrieval.",
        riskCategory: 'READ_ONLY',
        approvalRequired: false,
        timeoutMs: 5000,
        idempotent: true,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The customer query or policy topic to retrieve', required: true },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_customer_history',
        description: 'Retrieve authorized past conversation titles and orders for a verified customer in the current tenant.',
        riskCategory: 'READ_ONLY',
        approvalRequired: false,
        timeoutMs: 5000,
        idempotent: true,
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'The unique customer identifier', required: true },
          },
          required: ['customerId'],
        },
      },
    ];

    definitions.forEach((d) => this.tools.set(d.name, d));
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolByName(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new NotFoundException(`Tool '${name}' is not registered in the tool registry.`);
    }
    return tool;
  }

  async executeTool(params: {
    toolName: string;
    parameters: Record<string, any>;
    tenantId: string;
    conversationId?: string;
    userId?: string;
  }): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.getToolByName(params.toolName);

    // 1. Check Tool Call Budget Limit
    if (params.conversationId) {
      const budget = this.budgetService.checkBudget(params.tenantId, params.conversationId);
      if (!budget.allowed) {
        throw new ForbiddenException(`Tool execution blocked: ${budget.reason}`);
      }
    }

    // 2. Validate Input Parameters against Schema
    for (const requiredField of tool.inputSchema.required) {
      if (!params.parameters || params.parameters[requiredField] === undefined || String(params.parameters[requiredField]).trim().length === 0) {
        throw new BadRequestException(`Missing required parameter '${requiredField}' for tool '${params.toolName}'`);
      }
    }

    // 3. Prohibit direct execution of sensitive tools requiring approval
    if (tool.approvalRequired) {
      throw new ForbiddenException(
        `Tool '${params.toolName}' is classified as ${tool.riskCategory} and cannot be executed directly. It requires a formal human manager approval proposal.`,
      );
    }

    let resultData: any;
    let isMock = false;

    try {
      switch (params.toolName) {
        case 'lookup_order': {
          const order = await this.calquickService.lookupOrder(params.parameters.orderId, params.tenantId);
          resultData = order;
          isMock = order.isMock;
          break;
        }
        case 'check_courier_status': {
          const courier = await this.calquickService.checkCourierStatus(params.parameters.trackingNumber, params.tenantId);
          resultData = courier;
          isMock = courier.isMock;
          break;
        }
        case 'search_customer_policy': {
          const retrieval = await this.retrievalService.retrieveRelevantKnowledge(
            params.tenantId,
            params.parameters.query,
          );
          resultData = {
            matchesCount: retrieval.chunks.length,
            topResult: retrieval.chunks[0]?.chunk?.content,
            citation: retrieval.chunks[0]?.citationString,
          };
          isMock = true;
          break;
        }
        case 'get_customer_history': {
          resultData = {
            customerId: params.parameters.customerId,
            totalOrders: 3,
            lifetimeSpendUsd: 440.0,
            accountStatus: 'VERIFIED',
            recentOrders: ['CQ-9821', 'CQ-102'],
          };
          isMock = true;
          break;
        }
        default:
          throw new BadRequestException(`Handler for tool '${params.toolName}' is not implemented.`);
      }

      const durationMs = Date.now() - startTime;

      // Record Execution
      const record: ToolExecutionRecord = {
        id: `tex-${uuidv4().slice(0, 8)}`,
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        userId: params.userId,
        toolName: params.toolName,
        inputParameters: params.parameters,
        result: resultData,
        durationMs,
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      };
      this.executions.unshift(record);

      // Record Tool Usage in Budget Service
      this.budgetService.recordUsage(params.tenantId, params.conversationId, 50, 0.0001, 1);

      await this.auditService.recordEvent({
        tenantId: params.tenantId,
        userId: params.userId || 'system',
        eventType: 'TOOL_EXECUTED',
        resourceType: 'tool',
        resourceId: params.toolName,
        action: 'EXECUTE',
        details: { parameters: params.parameters, durationMs, status: 'SUCCESS' },
      });

      return {
        success: true,
        toolName: params.toolName,
        data: resultData,
        isMock,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const record: ToolExecutionRecord = {
        id: `tex-${uuidv4().slice(0, 8)}`,
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        userId: params.userId,
        toolName: params.toolName,
        inputParameters: params.parameters,
        error: err.message,
        durationMs,
        status: 'FAILED',
        createdAt: new Date().toISOString(),
      };
      this.executions.unshift(record);

      throw err;
    }
  }

  getExecutionsForTenant(tenantId: string, conversationId?: string): ToolExecutionRecord[] {
    let list = this.executions.filter((e) => e.tenantId === tenantId);
    if (conversationId) {
      list = list.filter((e) => e.conversationId === conversationId);
    }
    return list;
  }
}

