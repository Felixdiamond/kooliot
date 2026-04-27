// Hard shadow utility for Tailwind v4
// Since custom shadows can't be used as classes, we use inline styles

export const shadows = {
  'hard-sm': '2px 2px 0px 0px #1E293B',
  'hard-md': '4px 4px 0px 0px #1E293B',
  'hard-lg': '6px 6px 0px 0px #1E293B',
  'hard-xl': '8px 8px 0px 0px #1E293B',
  'soft-hard': '8px 8px 0px 0px #E2E8F0',
  'hard-accent': '4px 4px 0px 0px #8B5CF6',
  'hard-secondary': '4px 4px 0px 0px #F472B6',
  'hard-tertiary': '4px 4px 0px 0px #FBBF24',
  'hard-quaternary': '4px 4px 0px 0px #34D399',
} as const;

export type ShadowKey = keyof typeof shadows;
