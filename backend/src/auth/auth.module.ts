import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CryptoModule } from '../common/crypto/crypto.module';
import { TenancyModule } from '../common/tenancy/tenancy.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [
    CryptoModule,
    TenancyModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') || 'servora-dev-jwt-secret-min-32-chars-replace-in-production',
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}

