import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card, CardBody, CardHeader, Stat } from '../src/components/Card.tsx';
import { ConditionChip, ConditionLine, StatusChip } from '../src/components/Chip.tsx';
import { CompareTable } from '../src/components/CompareTable.tsx';
import { DataTable } from '../src/components/DataTable.tsx';
import { Callout, EmptyState, SkeletonText } from '../src/components/Feedback.tsx';
import { Button } from '../src/components/Button.tsx';
import { PipelineCard, PipelineColumn } from '../src/components/Pipeline.tsx';
import { ProfileFieldList, ProfileFieldRow } from '../src/components/ProfileFieldRow.tsx';
import { RosterStrip, type RosterCode } from '../src/components/RosterStrip.tsx';

const meta: Meta = { title: 'Komponenten/Domäne' };
export default meta;

const pattern = 'FFSSXXXNNNXXFFSSFXXXXFFFSSXX'.split('') as RosterCode[];

export const Bedingungszeile: StoryObj = {
  render: () => (
    <ConditionLine label="Bedingungen">
      <li><ConditionChip state="met" stateLabel="erfüllt" mode="must" modeLabel="Muss">Keine Nächte</ConditionChip></li>
      <li><ConditionChip state="met" stateLabel="erfüllt">Dienstplan 6 Wo</ConditionChip></li>
      <li><ConditionChip state="met" stateLabel="erfüllt">Lohn ≥ 95k</ConditionChip></li>
      <li><ConditionChip state="unmet" stateLabel="nicht erfüllt" mode="wish" modeLabel="Wunsch">Pendelzeit 34 min (Wunsch 30)</ConditionChip></li>
      <li><ConditionChip state="unknown" stateLabel="unbekannt" onRemove={() => undefined}>Kita intern</ConditionChip></li>
    </ConditionLine>
  ),
};

export const Dienstrhythmus: StoryObj = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <RosterStrip pattern={pattern} caption="Muster-Dienstplan 4 Wochen, 100 %" />
      <RosterStrip pattern={pattern.map((c, i) => (i % 3 === 0 && c !== 'X' ? 'X' : c))} caption="Skaliert auf 60 %" compact />
    </div>
  ),
};

export const Profilfelder: StoryObj = {
  render: () => (
    <Card className="max-w-3xl">
      <CardHeader title="Intensivstation 1" meta="Spital Seefeld-Ost (Demo) · Zürich" actions={<StatusChip tone="ok">verifiziert</StatusChip>} />
      <CardBody>
        <ProfileFieldList>
          <ProfileFieldRow label="Lohnband" value="CHF 90'000–118'800 · 13 Monatslöhne" source="bestätigt von Arbeitgeber am 02.10.2026" />
          <ProfileFieldRow label="Dienstplan-Vorlauf" value="6 Wochen" team="Team 4 Wo · 7 Antworten" deviates source="bestätigt von Arbeitgeber am 02.10.2026" employerComment="Arbeitgeber: Ab Januar planen wir verbindlich 6 Wochen voraus." />
          <ProfileFieldRow label="Wochenenden pro Monat" value="2" team="Team bestätigt · 7 Antworten" />
        </ProfileFieldList>
      </CardBody>
    </Card>
  ),
};

export const Vergleich: StoryObj = {
  render: () => (
    <CompareTable
      caption="Stellen-Vergleich"
      columns={['IPS 1 · Seefeld-Ost', 'IPS 2 · Glattal', 'IPS 3 · Uster']}
      rows={[
        { key: 'lead', label: 'Dienstplan-Vorlauf', cells: ['6 Wo', '3 Wo', '5 Wo'], raw: [6, 3, 5], better: 'higher' },
        { key: 'we', label: 'Wochenenden/Monat', cells: ['2', '2', '2'], raw: [2, 2, 2], better: 'lower' },
        { key: 'sal', label: 'Lohn ab', cells: ["CHF 90'000", "CHF 86'000", "CHF 88'000"], raw: [90000, 86000, 88000], better: 'higher' },
      ]}
    />
  ),
};

export const PipelineUndTabelle: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3 overflow-x-auto">
        <PipelineColumn id="new" title="Neu" count={2}>
          <PipelineCard dataId="a" href="#a" title="Lea M." meta="Pass-Match 85 %" status={<StatusChip tone="ok">Pass verifiziert</StatusChip>} selected />
          <PipelineCard dataId="b" href="#b" title="Jonas S." meta="Pass-Match 70 %" status={<StatusChip tone="warn">Anerkennung läuft</StatusChip>} />
        </PipelineColumn>
        <PipelineColumn id="screened" title="Gesichtet" count={0}>
          <li><EmptyState>Noch keine Bewerbungen in dieser Spalte.</EmptyState></li>
        </PipelineColumn>
      </div>
      <DataTable
        caption="Schichten"
        rowKey={(r) => r.id}
        rows={[{ id: '1', date: '22.10.2026', code: 'F', rate: 55 }, { id: '2', date: '24.10.2026', code: 'N', rate: 62 }]}
        columns={[
          { key: 'date', header: 'Datum', cell: (r) => r.date, sortValue: (r) => r.date },
          { key: 'code', header: 'Dienst', cell: (r) => r.code },
          { key: 'rate', header: 'CHF/h', cell: (r) => r.rate, sortValue: (r) => r.rate, align: 'right' },
        ]}
      />
    </div>
  ),
};

export const Rueckmeldungen: StoryObj = {
  render: () => (
    <div className="grid max-w-xl gap-4">
      <EmptyState action={<Button variant="primary">Pendelzeit auf 45 min erhöhen</Button>}>
        Keine Treffer. Pendelzeit auf 45 min erhöhen ergäbe 12 Treffer.
      </EmptyState>
      <Callout tone="critical" title="Upload abgelehnt">
        Die Datei ist grösser als 15 MB. Bitte als PDF mit geringerer Auflösung exportieren.
      </Callout>
      <Callout tone="warn">Dieses Stationsprofil wurde seit 200 Tagen nicht bestätigt.</Callout>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Time-to-Hire" value="24 Tage" hint="Ziel ≤ 30" />
        <Stat label="Antwortquote" value="91 %" />
        <Stat label="Flex besetzt" value="74 %" />
      </div>
      <SkeletonText lines={3} />
    </div>
  ),
};
