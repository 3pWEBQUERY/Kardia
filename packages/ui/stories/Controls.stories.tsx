import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../src/components/Button.tsx';
import { Combobox } from '../src/components/Combobox.tsx';
import { Checkbox, Input, RadioGroup, Select, Switch, Textarea } from '../src/components/Field.tsx';

const meta: Meta = { title: 'Komponenten/Steuerelemente' };
export default meta;

export const Buttons: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((v) => (
        <div key={v} className="flex items-center gap-3">
          {(['s', 'm', 'l'] as const).map((s) => (
            <Button key={s} variant={v} size={s}>
              {v} {s}
            </Button>
          ))}
          <Button variant={v} disabled>
            deaktiviert
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Formular: StoryObj = {
  render: function Render() {
    const [title, setTitle] = useState<string | null>(null);
    return (
      <div className="grid max-w-xl gap-4">
        <Input label="Lohn ab" prefix="CHF" type="number" defaultValue={88000} required />
        <Input label="Dienstplan-Vorlauf" unit="Wo" type="number" defaultValue={6} hint="Ganze Wochen" />
        <Input label="Pensum min." unit="%" type="number" step={10} defaultValue={65} error="Pensum bitte in 10er-Schritten angeben, z. B. 60 oder 70." />
        <Select label="Fachbereich" options={[{ value: 'ICU', label: 'Intensivstation' }, { value: 'GERIATRICS', label: 'Geriatrie' }]} placeholder="Bitte wählen" />
        <Combobox
          label="Facharzttitel"
          value={title}
          onChange={setTitle}
          options={[{ value: 'aim', label: 'Allgemeine Innere Medizin' }, { value: 'chir', label: 'Chirurgie' }, { value: 'anae', label: 'Anästhesiologie' }]}
        />
        <Textarea label="Persönliche Nachricht" hint="Optional, höchstens 500 Zeichen" maxLength={500} />
        <Checkbox label="13. Monatslohn" description="Wird im Profil als ja/nein angezeigt" checked />
        <Switch label="Nur Unterschiede" />
        <RadioGroup label="Buchungsregel" options={[{ value: 'FIRST_CONFIRMS', label: 'Wer zuerst bestätigt' }, { value: 'EMPLOYER_SELECTS', label: 'Arbeitgeber wählt aus' }]} />
      </div>
    );
  },
};
