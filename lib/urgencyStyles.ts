// lib/urgencyStyles.ts

export type UrgencyKey = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function normalizeUrgency(value: unknown): UrgencyKey {
  const v = String(value || '').toUpperCase();
  return v === 'LOW' || v === 'MEDIUM' || v === 'HIGH' || v === 'CRITICAL' ? v : 'LOW';
}

/* ---------------------------------- */
/* CHIP / BADGE                       */
/* ---------------------------------- */

export const urgencyChipClasses: Record<UrgencyKey, string> = {
  LOW: 'bg-gray-200 text-gray-700',
  MEDIUM: 'bg-blue-200 text-blue-800',
  HIGH: 'bg-purple-200 text-purple-900',
  CRITICAL: 'bg-red-200 text-red-900',
};

/* ---------------------------------- */
/* SOLID BAR / DOT                    */
/* ---------------------------------- */

export const urgencyBarClasses: Record<UrgencyKey, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-purple-600',
  CRITICAL: 'bg-red-600',
};

/* ---------------------------------- */
/* LEFT BORDER ACCENT (lists)         */
/* ---------------------------------- */

export const urgencyBorderLeftClasses: Record<UrgencyKey, string> = {
  LOW: 'border-l-gray-400',
  MEDIUM: 'border-l-blue-500',
  HIGH: 'border-l-purple-600',
  CRITICAL: 'border-l-red-600',
};

/* ---------------------------------- */
/* FULL CARD BORDER                   */
/* ---------------------------------- */

export const urgencyCardBorderClasses: Record<UrgencyKey, string> = {
  LOW: 'border-gray-400',
  MEDIUM: 'border-blue-500',
  HIGH: 'border-purple-600',
  CRITICAL: 'border-red-600',
};

/* ---------------------------------- */
/* Back-compat helpers                */
/* ---------------------------------- */

export function getUrgencyChipClass(value: unknown): string {
  return urgencyChipClasses[normalizeUrgency(value)];
}

export function getUrgencyBarClass(value: unknown): string {
  return urgencyBarClasses[normalizeUrgency(value)];
}

export function getUrgencyBorderLeftClass(value: unknown): string {
  return urgencyBorderLeftClasses[normalizeUrgency(value)];
}

export function getUrgencyCardBorderClass(value: unknown): string {
  return urgencyCardBorderClasses[normalizeUrgency(value)];
}

/* ---------------------------------- */
/* Unified style object API           */
/* ---------------------------------- */

export const URGENCY_STYLES: Record<
  UrgencyKey,
  { pill: string; dot: string; bar: string; borderLeft: string; cardBorder: string }
> = {
  LOW: {
    pill: urgencyChipClasses.LOW,
    dot: urgencyBarClasses.LOW,
    bar: urgencyBarClasses.LOW,
    borderLeft: urgencyBorderLeftClasses.LOW,
    cardBorder: urgencyCardBorderClasses.LOW,
  },
  MEDIUM: {
    pill: urgencyChipClasses.MEDIUM,
    dot: urgencyBarClasses.MEDIUM,
    bar: urgencyBarClasses.MEDIUM,
    borderLeft: urgencyBorderLeftClasses.MEDIUM,
    cardBorder: urgencyCardBorderClasses.MEDIUM,
  },
  HIGH: {
    pill: urgencyChipClasses.HIGH,
    dot: urgencyBarClasses.HIGH,
    bar: urgencyBarClasses.HIGH,
    borderLeft: urgencyBorderLeftClasses.HIGH,
    cardBorder: urgencyCardBorderClasses.HIGH,
  },
  CRITICAL: {
    pill: urgencyChipClasses.CRITICAL,
    dot: urgencyBarClasses.CRITICAL,
    bar: urgencyBarClasses.CRITICAL,
    borderLeft: urgencyBorderLeftClasses.CRITICAL,
    cardBorder: urgencyCardBorderClasses.CRITICAL,
  },
} as const;