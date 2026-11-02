import { NextRequest } from 'next/server';

// Malformed JSON resolves to undefined, which the route validators then reject with a 400
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
