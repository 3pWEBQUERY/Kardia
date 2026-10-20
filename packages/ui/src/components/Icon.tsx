import type { LucideIcon, LucideProps } from 'lucide-react';

/** Lucide, 20 px, Strichstärke 1.75 (PRD 8.4). Ohne `label` rein dekorativ. */
export function Icon({
  icon: Glyph,
  label,
  size = 20,
  ...rest
}: { icon: LucideIcon; label?: string; size?: number } & Omit<LucideProps, 'ref'>) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      {...rest}
    />
  );
}
