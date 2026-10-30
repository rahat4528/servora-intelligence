import { Injectable, LoggerService, Scope } from '@nestjs/common';

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  conversationId?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.DEFAULT })
export class StructuredLoggerService implements LoggerService {
  private formatMessage(
    level: string,
    message: any,
    context?: string,
    meta?: LogContext,
  ): string {
    const logPayload = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      product: 'Servora Intelligence',
      context: context || 'Application',
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      requestId: meta?.requestId,
      tenantId: meta?.tenantId,
      userId: meta?.userId,
      conversationId: meta?.conversationId,
      metadata: meta ? { ...meta } : undefined,
    };

    // Clean undefined fields
    Object.keys(logPayload).forEach((key) => {
      if ((logPayload as any)[key] === undefined) {
        delete (logPayload as any)[key];
      }
    });

    return JSON.stringify(logPayload);
  }

  log(message: any, context?: string, meta?: LogContext) {
    console.log(this.formatMessage('info', message, context, meta));
  }

  error(message: any, trace?: string, context?: string, meta?: LogContext) {
    const errorMeta = { ...meta, trace };
    console.error(this.formatMessage('error', message, context, errorMeta));
  }

  warn(message: any, context?: string, meta?: LogContext) {
    console.warn(this.formatMessage('warn', message, context, meta));
  }

  debug(message: any, context?: string, meta?: LogContext) {
    if (process.env.SERVORA_LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('debug', message, context, meta));
    }
  }

  verbose(message: any, context?: string, meta?: LogContext) {
    if (process.env.SERVORA_LOG_LEVEL === 'verbose') {
      console.log(this.formatMessage('verbose', message, context, meta));
    }
  }
}

