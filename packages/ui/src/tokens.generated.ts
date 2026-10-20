// Generiert aus tokens.json – nicht von Hand bearbeiten.
export const colors = {
  "surface-0": {
    "light": "#FFFFFF",
    "dark": "#0F1215"
  },
  "surface-50": {
    "light": "#F7F8FA",
    "dark": "#15191D"
  },
  "surface-100": {
    "light": "#EEF0F3",
    "dark": "#1C2126"
  },
  "line-200": {
    "light": "#E3E6EB",
    "dark": "#262C33"
  },
  "line-300": {
    "light": "#CDD2DA",
    "dark": "#353C45"
  },
  "ink-900": {
    "light": "#0E1116",
    "dark": "#F2F4F7"
  },
  "ink-700": {
    "light": "#3A4250",
    "dark": "#C3C9D2"
  },
  "ink-500": {
    "light": "#646C7C",
    "dark": "#8E96A3"
  },
  "accent-600": {
    "light": "#0F6B5E",
    "dark": "#4FB3A3"
  },
  "accent-700": {
    "light": "#0A5249",
    "dark": "#7CCABD"
  },
  "accent-50": {
    "light": "#E8F3F1",
    "dark": "#12302C"
  },
  "on-accent": {
    "light": "#FFFFFF",
    "dark": "#0F1215"
  },
  "ok-600": {
    "light": "#1F7A3D",
    "dark": "#5CC07E"
  },
  "warn-600": {
    "light": "#A15C00",
    "dark": "#E3A13B"
  },
  "critical-600": {
    "light": "#B42318",
    "dark": "#F07A70"
  },
  "overlay": {
    "light": "#0E111666",
    "dark": "#00000099"
  }
} as const;

export type ColorToken = keyof typeof colors;
