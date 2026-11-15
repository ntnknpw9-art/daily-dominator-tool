import { describe, it, expect } from 'vitest';
import { authRequest, isAuthServiceUnavailable } from './auth-errors';

describe('authentication failure classification', () => {
  it('classifies observed key-fetch and 504 failures as service outages', () => {
    expect(isAuthServiceUnavailable({ status: 504, message: 'context deadline exceeded' })).toBe(true);
    expect(isAuthServiceUnavailable({ status: 400, message: 'failed to verify signature: fetching keys context canceled' })).toBe(true);
  });
  it('does not classify invalid credentials or audience as service outages', () => {
    expect(isAuthServiceUnavailable({ status: 400, message: 'Invalid login credentials' })).toBe(false);
    expect(isAuthServiceUnavailable({ status: 400, message: 'Unacceptable audience in id_token' })).toBe(false);
  });
  it('returns thrown failures without retrying authentication', async () => {
    let calls = 0;
    const result = await authRequest(async () => {
      calls++;
      throw new Error('Failed to fetch');
    });
    expect(calls).toBe(1);
    expect(isAuthServiceUnavailable(result.error)).toBe(true);
  });
});