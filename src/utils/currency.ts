export function formatBRLFromCents(cents: number): string {
  if (isNaN(cents)) cents = 0;
  
  const value = cents / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

  // Normalize non-breaking spaces to regular spaces for consistency
  return formatted.replace(/\u00A0/g, ' ');
}

export function parseBRLToCents(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value); // If it's already a number, assume it's cents and round it safely
  }
  
  if (!value) return 0;

  const isNegative = value.includes('-');
  const numericString = value.replace(/[^\d]/g, '');
  
  if (!numericString) return 0;
  
  const parsed = parseInt(numericString, 10);
  return isNegative ? -parsed : parsed;
}
