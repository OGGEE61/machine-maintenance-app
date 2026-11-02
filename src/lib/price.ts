export function formatPrice(unitPrice: number | null, quantity = 1): string {
  return unitPrice === null ? 'On request' : `€${(unitPrice * quantity).toFixed(2)}`;
}

// Parts priced on request aren't counted
export function linesTotal(lines: Array<{ unitPrice: number | null; quantity: number }>): number {
  return lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);
}
