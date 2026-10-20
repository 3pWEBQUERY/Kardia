import { colors } from '../src/tokens.generated.ts';

import type { Meta, StoryObj } from '@storybook/react-vite';


const meta: Meta = { title: 'Grundlagen/Tokens' };
export default meta;

export const Farben: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Object.keys(colors).map((name) => (
        <div key={name} className="flex flex-col gap-1">
          <div className="h-12 rounded-control border border-line-300" style={{ background: `var(--k-color-${name})` }} />
          <span className="font-mono text-micro text-ink-700">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Typografie: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <p className="text-display">Display 40/48</p>
      <h1 className="text-h1">H1 32/40 Seitentitel</h1>
      <h2 className="text-h2">H2 24/32 Abschnitte</h2>
      <h3 className="text-h3">H3 20/28 Kartentitel</h3>
      <p className="text-body">Body 16/24 – Fliesstext mit höchstens 68 Zeichen pro Zeile.</p>
      <p className="text-body-s">Body-S 14/20 – Tabellen und Formulare</p>
      <p className="text-caption">Caption 13/18 – Labels, Chips</p>
      <p className="text-micro text-ink-500">Micro 12/16 – Metadaten, Zeitstempel</p>
      <p className="font-mono tabular">CHF 95&apos;000 · 06:45 · CHE-116.281.710</p>
    </div>
  ),
};
