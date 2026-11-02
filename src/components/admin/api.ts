// Calls an admin API route. Failures throw with a message that can be shown to staff,
// and an expired session sends them back to the login page.
export async function adminRequest<T = unknown>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    // Runs outside React, and a full page load also clears the signed-out dashboard's state
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/admin/login');
    throw new Error('Your session has expired.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? 'Something went wrong. Please try again.');
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
