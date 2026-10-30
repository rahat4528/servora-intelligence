import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService, LoginDto, RegisterDto, AuthResult } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser, AuthenticatedUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResponse } from '@servora/common';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<ApiResponse<AuthResult>> {
    const result = await this.authService.login(loginDto);
    return {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request): Promise<ApiResponse<AuthResult>> {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('me')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<AuthenticatedUser>> {
    return {
      success: true,
      data: user,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

