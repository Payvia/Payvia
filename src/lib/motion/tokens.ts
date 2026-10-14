export const duration = {
  fast: 0.15,
  base: 0.3,
  slow: 0.6,
  hero: 1.2,
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.76, 0, 0.24, 1],
} as const;

/** The same curves as GSAP ease strings. */
export const gsapEase = {
  out: "expo.out",
  inOut: "quart.inOut",
} as const;

export const spring = {
  ui: { type: "spring", stiffness: 400, damping: 32 },
  soft: { type: "spring", stiffness: 120, damping: 20 },
} as const;

export const stagger = {
  tight: 0.04,
  base: 0.07,
} as const;
