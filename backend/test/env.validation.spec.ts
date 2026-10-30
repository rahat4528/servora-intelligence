import { validateEnvironment } from '../src/common/config/env.validation';

describe('validateEnvironment', () => {
  it('should accept valid configuration with defaults', () => {
    const config = {
      SERVORA_NODE_ENV: 'development',
      SERVORA_PORT: '4000',
    };

    const validated = validateEnvironment(config);
    expect(validated.SERVORA_PORT).toBe(4000);
    expect(validated.SERVORA_NODE_ENV).toBe('development');
  });

  it('should throw an error if an invalid port or enum is supplied', () => {
    const invalidConfig = {
      SERVORA_NODE_ENV: 'invalid_env_mode',
      SERVORA_PORT: '80', // below min port 1024
    };

    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /Servora Configuration Error/,
    );
  });
});

