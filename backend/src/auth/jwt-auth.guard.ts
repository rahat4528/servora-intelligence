import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TenantContextService } from '../common/tenancy/tenant-context.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = this.configService.get<string>('jwt.secret') || 'servora-dev-jwt-secret-min-32-chars-replace-in-production';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      request.user = {
        id: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };

      // Set tenant context for this request execution
      this.tenantContextService.runWithContext(
        {
          tenantId: payload.tenantId,
          userId: payload.sub,
          userRole: payload.role,
          requestId: request.requestId,
        },
        () => {},
      );

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}

