import { afterEach, describe, expect, it, vi } from 'vitest';
import { machineUrl } from './machine-url';

afterEach(() => vi.unstubAllEnvs());

describe('machineUrl', () => {
  it('uses the configured production address', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://parts.example/');
    expect(machineUrl('GP80-1')).toBe('https://parts.example/machine/GP80-1');
  });

  it('encodes serial numbers', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://parts.example');
    expect(machineUrl('a b/c')).toBe('https://parts.example/machine/a%20b%2Fc');
  });
});
