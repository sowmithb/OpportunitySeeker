export const THEMES = [
  {
    id: 'fieldnotes',
    label: 'Fieldnotes',
    description: 'Warm paper, ink, and a terracotta compass.',
  },
] as const
export type ThemeId = (typeof THEMES)[number]['id']
export function getActiveTheme(): ThemeId {
  return 'fieldnotes'
}
export function getTheme(_id: string) {
  return THEMES[0]
}
