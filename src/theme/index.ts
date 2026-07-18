/**
 * FitConnect design system.
 * FitConnect 2.0 design system.
 * Dark-first, with a warm high-energy orange and quieter graphite surfaces.
 */

export const colors = {
  // Surfaces
  bg: '#08090B',
  bgSoft: '#0C0E12',
  surface: '#111318',
  surfaceElevated: '#181B21',
  surfaceHigh: '#23272F',

  // Borders / hairlines
  border: 'rgba(255,255,255,0.075)',
  borderStrong: 'rgba(255,255,255,0.15)',
  borderSubtle: 'rgba(255,255,255,0.045)',

  // Brand
  primary: '#FF5C35',
  primaryLight: '#FF9B73',
  primaryDeep: '#DF3E16',
  primaryTint: 'rgba(255,92,53,0.11)',
  primaryTintStrong: 'rgba(255,92,53,0.20)',
  primaryBorder: 'rgba(255,92,53,0.28)',
  brandGlow: 'rgba(255,92,53,0.34)',
  warm: '#FFB36B',

  // Text
  textPrimary: '#F7F5F2',
  textSecondary: '#C7C8CD',
  textMuted: '#9699A2',
  textDim: '#737780',
  textFaint: '#565A64',

  // Semantic
  success: '#3BD16F',
  successLight: '#7BE0A0',
  successTint: 'rgba(59,209,111,0.12)',
  danger: '#FF6B6B',
  dangerDeep: '#E62828',
  dangerTint: 'rgba(230,40,40,0.12)',
  warning: '#FF9A5F',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(11,11,13,0.94)',
  scrim: 'rgba(11,11,13,0.55)',
} as const;

/**
 * Font family keys map to the exact names loaded by expo-font in the root
 * layout. Archivo = display/UI. Space Mono = numerals, tags, technical labels.
 */
export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  // Archivo Black (900) renders as missing-glyph boxes on some iOS devices via
  // Expo Go, so `black` maps to the 800 weight (heaviest that loads reliably).
  black: 'Archivo_800ExtraBold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
  xxxl: 44,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

/** Common text presets used across screens. */
export const typography = {
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.textPrimary, letterSpacing: -1.1, lineHeight: 34 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.45 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },
  mono: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, letterSpacing: 0.5 },
  monoTag: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.primary },
} as const;

export const shadow = {
  card: {
    boxShadow: '0 16px 44px rgba(0,0,0,0.30)',
  },
  glow: { boxShadow: '0 14px 40px rgba(255,92,53,0.20)' },
} as const;

export const theme = { colors, fonts, spacing, radius, typography, shadow };
export type Theme = typeof theme;
