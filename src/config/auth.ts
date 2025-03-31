export const AUTH_CONFIG = {
  pin: {
    length: 4,
    minLength: 4,
    maxLength: 6,
  },
} as const;

export type AuthConfig = typeof AUTH_CONFIG; 