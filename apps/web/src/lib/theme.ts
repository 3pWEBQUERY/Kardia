export const THEME_COOKIE = 'kardia_theme';
export type ThemePref = 'system' | 'light' | 'dark';

export function parseTheme(value: string | undefined): ThemePref {
  return value === 'light' || value === 'dark' ? value : 'system';
}
