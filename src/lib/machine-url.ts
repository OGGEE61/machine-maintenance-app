// The address printed on QR stickers. NEXT_PUBLIC_APP_URL pins it to the production
// domain, so a sticker generated from a preview deploy or localhost still works.
export function machineUrl(serialNumber: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? window.location.origin;
  return `${origin}/machine/${encodeURIComponent(serialNumber)}`;
}
