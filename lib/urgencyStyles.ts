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
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-purple-100 text-purple-800',
  CRITICAL: 'bg-red-100 text-red-700',
};

/* ---------------------------------- */
/* SOLID BAR / DOT                    */
/* ---------------------------------- */

export const urgencyBarClasses: Record<UrgencyKey, string> = {
  LOW: 'bg-gray-300',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-purple-500',
  CRITICAL: 'bg-red-500',
};

/* ---------------------------------- */
/* LEFT BORDER ACCENT (lists)         */
/* ---------------------------------- */

export const urgencyBorderLeftClasses: Record<UrgencyKey, string> = {
  LOW: 'border-l-gray-400',
  MEDIUM: 'border-l-blue-400',
  HIGH: 'border-l-purple-500',
  CRITICAL: 'border-l-red-400',
};

/* ---------------------------------- */
/* FULL CARD BORDER (NEW)             */
/* ---------------------------------- */

export const urgencyCardBorderClasses: Record<UrgencyKey, string> = {
  LOW: 'border-gray-200',
  MEDIUM: 'border-blue-300',
  HIGH: 'border-purple-400',
  CRITICAL: 'border-red-300',
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

/* NEW helper */
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