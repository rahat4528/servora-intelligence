import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '@servora/common';

describe('Servora Intelligence — Live End-to-End API Integration Suite', () => {
  let app: INestApplication;
  let adminToken: string;
  let agentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Authenticate Admin User
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@servora.local',
        password: 'Password123!',
      });

    expect(adminLoginRes.status).toBe(201);
    expect(adminLoginRes.body.data.accessToken).toBeDefined();
    adminToken = adminLoginRes.body.data.accessToken;

    // Authenticate Agent User
    const agentLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'agent@servora.local',
        password: 'Password123!',
      });

    expect(agentLoginRes.status).toBe(201);
    expect(agentLoginRes.body.data.accessToken).toBeDefined();
    agentToken = agentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. System Health & Diagnostics', () => {
    it('GET /api/health — should return 200 OK with operational subsystems', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('Servora Intelligence Backend');
      expect(res.body.data.subsystems.database.status).toBe('healthy');
      expect(res.body.data.subsystems.redis.status).toBe('healthy');
      expect(res.body.data.subsystems.llmProvider.provider).toBeDefined();
    });
  });

  describe('2. Authentication & User Profile', () => {
    it('POST /api/auth/login — should reject invalid credentials with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@servora.local',
          password: 'IncorrectPassword',
        });

      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me — should return authenticated user details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@servora.local');
      expect(res.body.data.role).toBe(UserRole.TENANT_ADMIN);
      expect(res.body.data.tenantId).toBe('tenant-default');
    });

    it('GET /api/auth/me — should reject unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Core Operational Inbox API', () => {
    let createdConvId: string;

    it('POST /api/inbox/conversations — should create a new conversation thread', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inbox/conversations')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          customerName: 'Rahim Chowdhury',
          customerEmail: 'rahim@test.local',
          channel: 'CHAT',
          initialMessage: 'Amar delivery kobe ashbe? Order CQ-9821',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.customerName).toBe('Rahim Chowdhury');
      expect(res.body.data.status).toBe('OPEN');
      createdConvId = res.body.data.id;
    });

    it('GET /api/inbox/conversations — should list conversations with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inbox/conversations?limit=10&page=1')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.pagination.total).toBeGreaterThan(0);
    });

    it('GET /api/inbox/conversations/:id — should fetch conversation by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inbox/conversations/${createdConvId}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdConvId);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
    });

    it('POST /api/inbox/conversations/:id/messages — should append agent reply', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/inbox/conversations/${createdConvId}/messages`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          content: 'Apnar order processing-e ache, dhonnobad!',
          senderType: 'AGENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('Apnar order processing-e ache, dhonnobad!');
    });
  });

  describe('4. Tool Registry & Controlled Execution API', () => {
    it('GET /api/tools — should list registered tools with safety categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tools')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      const names = res.body.data.map((t: any) => t.name);
      expect(names).toContain('lookup_order');
      expect(names).toContain('check_courier_status');
    });

    it('POST /api/tools/execute — should execute read-only lookup_order safely', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tools/execute')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          toolName: 'lookup_order',
          parameters: { orderId: 'CQ-9821' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.data.orderId).toBe('CQ-9821');
      expect(res.body.data.data.orderStatus).toBe('SHIPPED');
    });
  });

  describe('5. Knowledge Intelligence & RAG Retrieval API', () => {
    it('GET /api/knowledge/sources — should list ingested knowledge sources', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/knowledge/sources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/knowledge/query — should retrieve semantic knowledge chunks with citations', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/knowledge/query')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: 'What is the refund and return policy?' });

      expect(res.status).toBe(201);
      expect(res.body.data.chunks.length).toBeGreaterThan(0);
      expect(res.body.data.contextText).toBeDefined();
    });
  });

  describe('6. Intelligent Multi-Signal Routing API', () => {
    it('GET /api/routing/agents — should return available support agents', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/routing/agents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/routing/evaluate — should calculate optimal agent routing with scoring breakdown', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/routing/evaluate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          conversationId: 'conv-e2e-route-1',
          tenantId: 'tenant-default',
          intent: 'returns',
          sentiment: 'negative',
          urgency: 'high',
          language: 'bn',
          customerTier: 'STANDARD',
          slaBufferMinutes: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.conversationId).toBe('conv-e2e-route-1');
      expect(res.body.alternatives.length).toBeGreaterThan(0);
      expect(res.body.slaRisk).toBeDefined();
    });
  });

  describe('7. Automated Quality Assurance API', () => {
    it('GET /api/qa/evaluations — should return QA evaluations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/qa/evaluations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/qa/evaluate — should run 8-dimension QA evaluation on conversation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/qa/evaluate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          conversationId: 'conv-test-qa-1',
          agentId: 'usr-agent-1',
          customerMessage: 'Amar delivery pacchi na, khub baje service!',
          agentReply: 'Assalamu alaikum. Ami khub dukkhito apnar osostir jonno. Ami ekhoni order ti check kore dicchi.',
          intent: 'order_tracking',
        });

      expect(res.status).toBe(201);
      expect(res.body.overallScore).toBeGreaterThanOrEqual(1);
      expect(res.body.overallScore).toBeLessThanOrEqual(5);
      expect(res.body.dimensions.empathyTone).toBeDefined();
      expect(res.body.coachingNotes).toBeDefined();
    });
  });

  describe('8. Analytics & Model Comparison API', () => {
    it('GET /api/analytics/dashboard — should return full metrics with sample sizes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/dashboard?days=30')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.operational).toBeDefined();
      expect(res.body.aiPerformance).toBeDefined();
      expect(res.body.cost).toBeDefined();
      expect(res.body.goldenEval).toBeDefined();
    });

    it('GET /api/analytics/model-comparison — should compare Gemini, OpenAI, and Mock models', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/analytics/model-comparison')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.models).toBeDefined();
      expect(Array.isArray(res.body.models)).toBe(true);
      expect(res.body.models.length).toBe(3);
      const modelNames = res.body.models.map((m: any) => m.modelName);
      expect(modelNames).toContain('gemini-2.5-flash');
      expect(modelNames).toContain('gpt-4o-mini');
      expect(modelNames).toContain('mock-deterministic');
    });
  });

  describe('9. Human-Approved Actions & Financial Safeguards API', () => {
    it('POST /api/approvals/refunds/prepare — should create a refund proposal in PENDING status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/approvals/refunds/prepare')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          conversationId: 'conv-e2e-ref-1',
          orderId: 'CQ-9821',
          customerId: 'cust-9821',
          amount: 50.0,
          currency: 'USD',
          reason: 'Damaged item upon delivery',
          evidence: 'Customer submitted clear photo of ruptured box and shattered contents',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('PENDING');
      expect(res.body.amount).toBe(50.0);
    });

    it('POST /api/approvals/refunds/:id/execute — should block execution if not approved', async () => {
      const prepRes = await request(app.getHttpServer())
        .post('/api/approvals/refunds/prepare')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          conversationId: 'conv-e2e-ref-2',
          orderId: 'CQ-9821',
          customerId: 'cust-9821',
          amount: 30.0,
          currency: 'USD',
          reason: 'Customer requested refund',
          evidence: 'Package delayed over 14 business days',
        });

      const proposalId = prepRes.body.id;

      // Attempting to execute unapproved proposal must fail with 400
      const execRes = await request(app.getHttpServer())
        .post(`/api/approvals/refunds/${proposalId}/execute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-idempotency-key', 'idemp-key-test-123');

      expect(execRes.status).toBe(400);
      expect(execRes.body.message).toContain('PENDING');
    });
  });
});
