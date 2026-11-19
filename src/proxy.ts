import { NextResponse, type NextRequest } from 'next/server';

// Whole site behind one password (browser login box) while the app is a demo.
// Any username; the password must equal SITE_PASSWORD. If SITE_PASSWORD is not set, nobody gets in.
// The admin PIN login still applies on top of this.
export function proxy(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const password = process.env.SITE_PASSWORD;
  if (password && header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      if (decoded.slice(decoded.indexOf(':') + 1) === password) return NextResponse.next();
    } catch {
      // malformed header: fall through to the login box
    }
  }
  return new NextResponse('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Nexopel", charset="UTF-8"' },
  });
}
