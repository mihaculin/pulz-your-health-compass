export interface ThemeDef {
  id: string;
  name: string;
  sub: string;
  aqua: string;
  lavender: string;
}

export const THEMES: ThemeDef[] = [
  { id: "aqua-bloom",  name: "Aqua Bloom",  sub: "Calm waters",  aqua: "#b3ecec", lavender: "#D7C9DB" },
  { id: "rose-mist",   name: "Rose Mist",   sub: "Soft warmth",  aqua: "#F4D4E4", lavender: "#D7C9DB" },
  { id: "sky-pearl",   name: "Sky Pearl",   sub: "Clear sky",    aqua: "#C8E8F4", lavender: "#b3ecec" },
  { id: "forest-dew",  name: "Forest Dew",  sub: "In the woods", aqua: "#D4ECCC", lavender: "#b3ecec" },
];

export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyThemeCss(aqua: string, lavender: string): void {
  document.documentElement.style.setProperty("--color-aqua", hexToHsl(aqua));
  document.documentElement.style.setProperty("--color-lavender", hexToHsl(lavender));
}

export function applyThemeById(themeId: string, customAqua = "#b3ecec"): void {
  const theme = THEMES.find((t) => t.id === themeId);
  if (theme) {
    applyThemeCss(theme.aqua, theme.lavender);
  } else {
    applyThemeCss(customAqua, "#D7C9DB");
  }
}
