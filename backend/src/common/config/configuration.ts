export default () => ({
  env: process.env.SERVORA_NODE_ENV || 'development',
  port: parseInt(process.env.SERVORA_PORT || '4000', 10),
  frontendUrl: process.env.SERVORA_FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.SERVORA_BACKEND_URL || 'http://localhost:4000',
  database: {
    url: process.env.SERVORA_DATABASE_URL,
  },
  redis: {
    host: process.env.SERVORA_REDIS_HOST || 'localhost',
    port: parseInt(process.env.SERVORA_REDIS_PORT || '6379', 10),
    password: process.env.SERVORA_REDIS_PASSWORD || undefined,
  },
  storage: {
    endpoint: process.env.SERVORA_STORAGE_ENDPOINT || 'localhost',
    port: parseInt(process.env.SERVORA_STORAGE_PORT || '9000', 10),
    useSsl: process.env.SERVORA_STORAGE_USE_SSL === 'true',
    accessKey: process.env.SERVORA_STORAGE_ACCESS_KEY,
    secretKey: process.env.SERVORA_STORAGE_SECRET_KEY,
    bucket: process.env.SERVORA_STORAGE_BUCKET || 'servora-documents',
  },
  jwt: {
    secret: process.env.SERVORA_JWT_SECRET || 'servora-dev-jwt-secret-min-32-chars-replace-in-production',
    expiresIn: process.env.SERVORA_JWT_EXPIRES_IN || '7d',
  },
  llm: {
    primaryProvider: process.env.SERVORA_LLM_PRIMARY_PROVIDER || 'mock',
    fallbackProvider: process.env.SERVORA_LLM_FALLBACK_PROVIDER || 'mock',
    geminiApiKey: process.env.SERVORA_GEMINI_API_KEY,
    geminiModel: process.env.SERVORA_GEMINI_MODEL || 'gemini-2.5-flash',
    openaiApiKey: process.env.SERVORA_OPENAI_API_KEY,
    openaiModel: process.env.SERVORA_OPENAI_MODEL || 'gpt-4o-mini',
    embeddingProvider: process.env.SERVORA_EMBEDDING_PROVIDER || 'mock',
    embeddingModel: process.env.SERVORA_EMBEDDING_MODEL || 'text-embedding-004',
  },
  calquick: {
    mode: process.env.SERVORA_CALQUICK_ADAPTER_MODE || 'mock',
    baseUrl: process.env.SERVORA_CALQUICK_BASE_URL,
    apiKey: process.env.SERVORA_CALQUICK_API_KEY,
  },
  governance: {
    maxDailyBudgetUsd: parseFloat(process.env.SERVORA_MAX_DAILY_BUDGET_USD || '50.00'),
    maxMonthlyBudgetUsd: parseFloat(process.env.SERVORA_MAX_MONTHLY_BUDGET_USD || '1000.00'),
    maxTokensPerConversation: parseInt(process.env.SERVORA_MAX_TOKENS_PER_CONVERSATION || '8000', 10),
    maxToolCallsPerConversation: parseInt(process.env.SERVORA_MAX_TOOL_CALLS_PER_CONVERSATION || '5', 10),
  },
  logging: {
    level: process.env.SERVORA_LOG_LEVEL || 'info',
  },
});

