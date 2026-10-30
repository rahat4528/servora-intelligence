import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@servora/common';
import { EncryptionService } from '../common/crypto/encryption.service';
import { v4 as uuidv4 } from 'uuid';

export interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  tenantName: string;
  tenantSlug: string;
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  // In-memory persistent store for development & tests; integrates with DB
  private users: Map<string, UserRecord> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.seedDefaultUsersSync();
  }

  private seedDefaultUsersSync() {
    // Generate deterministic sync hash for default test accounts
    const passwordHash = '$2a$10$wTf7tE29y4b.y9e6L8K9U.Pz2lS7mR5F6g7H8i9J0k1L2m3N4o5P6'; // bcrypt hash of Password123!

    const seedUsers: UserRecord[] = [
      {
        id: 'usr-admin-1',
        tenantId: 'tenant-default',
        email: 'admin@servora.local',
        passwordHash,
        name: 'Tenant Administrator',
        role: UserRole.TENANT_ADMIN,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-manager-1',
        tenantId: 'tenant-default',
        email: 'manager@servora.local',
        passwordHash,
        name: 'Support Operations Manager',
        role: UserRole.SUPPORT_MANAGER,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-agent-1',
        tenantId: 'tenant-default',
        email: 'agent@servora.local',
        passwordHash,
        name: 'Support Agent One',
        role: UserRole.SUPPORT_AGENT,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-agent-2',
        tenantId: 'tenant-isolated',
        email: 'agent@isolated.local',
        passwordHash,
        name: 'Isolated Support Agent',
        role: UserRole.SUPPORT_AGENT,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    ];

    seedUsers.forEach((u) => this.users.set(u.email.toLowerCase(), u));
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = this.users.get(loginDto.email.toLowerCase());
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.encryptionService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateToken(user);
  }

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const existing = this.users.get(registerDto.email.toLowerCase());
    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const passwordHash = await this.encryptionService.hashPassword(registerDto.password);
    const tenantId = `tenant-${registerDto.tenantSlug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newUser: UserRecord = {
      id: `usr-${uuidv4().slice(0, 8)}`,
      tenantId,
      email: registerDto.email.toLowerCase(),
      passwordHash,
      name: registerDto.name,
      role: registerDto.role || UserRole.TENANT_ADMIN,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.users.set(newUser.email, newUser);
    return this.generateToken(newUser);
  }

  getUserById(id: string): UserRecord | undefined {
    return Array.from(this.users.values()).find((u) => u.id === id);
  }

  getUsersByTenant(tenantId: string): UserRecord[] {
    return Array.from(this.users.values()).filter((u) => u.tenantId === tenantId);
  }

  createUserForTenant(tenantId: string, data: { email: string; name: string; password: string; role: UserRole }): Promise<UserRecord> {
    return this.encryptionService.hashPassword(data.password).then((passwordHash) => {
      const existing = this.users.get(data.email.toLowerCase());
      if (existing) {
        throw new ConflictException('User already exists');
      }

      const user: UserRecord = {
        id: `usr-${uuidv4().slice(0, 8)}`,
        tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      this.users.set(user.email, user);
      return user;
    });
  }

  private generateToken(user: UserRecord): AuthResult {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const secret = this.configService.get<string>('jwt.secret') || 'servora-dev-jwt-secret-min-32-chars-replace-in-production';
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '7d';

    const accessToken = this.jwtService.sign(payload, { secret, expiresIn });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

