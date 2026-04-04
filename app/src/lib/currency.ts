/** Cambio fisso richiesto: 1 EUR = 183 JPY */
export const JPY_PER_EUR = 183;

export function jpyToEur(jpy: number): number {
  return jpy / JPY_PER_EUR;
}

export function eurToJpy(eur: number): number {
  return Math.round(eur * JPY_PER_EUR);
}

/** Mostra euro come valuta principale (da importi interni in JPY). */
export function formatEurFromJpy(jpy: number, fractionDigits = 0): string {
  const n = jpyToEur(jpy);
  return `€${n.toLocaleString('it-IT', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatJpy(jpy: number): string {
  return `¥${jpy.toLocaleString('it-IT')}`;
}

/** Prezzo attrazione: euro in evidenza, yen tra parentesi se > 0 */
export function formatPriceEurPrimary(jpy: number): string {
  if (!jpy || jpy <= 0) return 'Gratis';
  return `${formatEurFromJpy(jpy, 0)} (${formatJpy(jpy)})`;
}
