import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum LlmProviderType {
  Mock = 'mock',
  Gemini = 'gemini',
  OpenAi = 'openai',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  SERVORA_NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1024)
  @IsOptional()
  SERVORA_PORT: number = 4000;

  @IsString()
  @IsOptional()
  SERVORA_FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  SERVORA_BACKEND_URL: string = 'http://localhost:4000';

  @IsString()
  @IsOptional()
  SERVORA_DATABASE_URL: string = 'postgresql://servora_user:servora_password@localhost:5432/servora_dev?schema=public';

  @IsString()
  @IsOptional()
  SERVORA_REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  SERVORA_REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  SERVORA_REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  SERVORA_STORAGE_ENDPOINT: string = 'localhost';

  @IsNumber()
  @IsOptional()
  SERVORA_STORAGE_PORT: number = 9000;

  @IsString()
  @IsOptional()
  SERVORA_JWT_SECRET: string = 'servora-dev-jwt-secret-min-32-chars-replace-in-production';

  @IsEnum(LlmProviderType)
  @IsOptional()
  SERVORA_LLM_PRIMARY_PROVIDER: LlmProviderType = LlmProviderType.Mock;

  @IsEnum(LlmProviderType)
  @IsOptional()
  SERVORA_LLM_FALLBACK_PROVIDER: LlmProviderType = LlmProviderType.Mock;

  @IsString()
  @IsOptional()
  SERVORA_CALQUICK_ADAPTER_MODE: string = 'mock';

  @IsString()
  @IsOptional()
  SERVORA_LOG_LEVEL: string = 'info';
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((err) => `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`)
      .join('\n');
    throw new Error(`[Servora Configuration Error] Invalid environment variables:\n${formattedErrors}`);
  }

  return validatedConfig;
}

