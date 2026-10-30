import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawSecret = this.configService.get<string>('jwt.secret') || 'servora-dev-default-secret-min-32-chars';
    // Derive a fixed 32-byte key from the secret using SHA-256
    this.key = crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Encrypt sensitive text (such as API keys, tokens, credentials) using AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedPayload {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      authTag,
      ciphertext,
    };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM with authentication tag validation
   */
  decrypt(payload: EncryptedPayload): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(payload.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password against bcrypt hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

