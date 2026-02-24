// Centralized urgency styling system
// Single source of truth for all priority colors in AtriumHub

export const URGENCY_STYLES = {
  LOW: {
    bar: 'border-l-gray-400',
    pill: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
  },
  MEDIUM: {
    bar: 'border-l-blue-400',
    pill: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  HIGH: {
    bar: 'border-l-purple-500',
    pill: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-500',
  },
  CRITICAL: {
    bar: 'border-l-red-500',
    pill: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
} as const;

export type UrgencyLevel = keyof typeof URGENCY_STYLES;