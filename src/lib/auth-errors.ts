type AuthFailure = { message?: string; status?: number; code?: string };

export function isAuthServiceUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const failure = error as AuthFailure;
  return (failure.status !== undefined && failure.status >= 500) ||
    /context deadline exceeded|request_timeout|fetching keys|context canceled|timeout|failed to fetch|network/i.test(`${failure.code ?? ''} ${failure.message ?? ''}`);
}

export function authErrorMessage(error: unknown): string {
  if (isAuthServiceUnavailable(error)) {
    return 'שירות ההתחברות אינו זמין כרגע. נסה שוב בעוד כמה דקות; אין צורך לשנות את הסיסמה.';
  }
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/invalid.*credentials/i.test(message)) return 'האימייל או הסיסמה שגויים.';
  return message || 'לא ניתן להשלים את הבקשה כרגע. נסה שוב.';
}

// Normalize thrown transport errors to the same result shape as Auth API errors.
// Never retry mutations or bypass identity verification.
export async function authRequest<T extends { error?: unknown }>(request: () => Promise<T>): Promise<T | { error: Error }> {
  try {
    return await request();
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}