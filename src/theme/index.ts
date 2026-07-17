/**
 * FitConnect design system.
 * Tokens extracted directly from the approved design (FitConnect.html).
 * Dark-first. Primary accent is the orange #FF5A1F.
 */

export const colors = {
  // Surfaces
  bg: '#0B0B0D',
  surface: '#141417',
  surfaceElevated: '#1B1B1F',
  surfaceHigh: '#26262B',

  // Borders / hairlines
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderSubtle: 'rgba(255,255,255,0.06)',

  // Brand
  primary: '#FF5A1F',
  primaryLight: '#FF9A5F',
  primaryDeep: '#FF7A3F',
  primaryTint: 'rgba(255,90,31,0.10)',
  primaryTintStrong: 'rgba(255,90,31,0.18)',
  primaryBorder: 'rgba(255,90,31,0.22)',

  // Text
  textPrimary: '#F5F5F4',
  textSecondary: '#C9C9CE',
  textMuted: '#9A9AA0',
  textDim: '#7A7A80',
  textFaint: '#5A5A60',

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
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  pill: 999,
} as const;

/** Common text presets used across screens. */
export const typography = {
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.textPrimary, letterSpacing: -0.3 },
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
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const theme = { colors, fonts, spacing, radius, typography, shadow };
export type Theme = typeof theme;
