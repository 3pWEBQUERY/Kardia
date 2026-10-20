import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { IMPORT_FIELD_KEYS, structureJobAd, verifyImport } from '../src/functions/jobStructuring.ts';
import { toSearchFilter } from '../src/functions/searchParsing.ts';
import { NotEnoughTextsError, summarizeTeamComments } from '../src/functions/teamSummary.ts';
import { AiError, costUsd, type AiRunRecord } from '../src/runner.ts';

type Reply = { input?: unknown; stop?: Anthropic.StopReason; throws?: unknown };

function fakeClient(replies: Reply[]) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const client = {
    messages: {
      create: (params: Anthropic.MessageCreateParamsNonStreaming) => {
        calls.push(structuredClone(params));
        const r = replies.shift();
        if (!r) throw new Error('keine Antwort mehr');
        if (r.throws) return Promise.reject(r.throws);
        const toolName = params.tool_choice && 'name' in params.tool_choice ? params.tool_choice.name : 'x';
        return Promise.resolve({
          id: 'msg',
          type: 'message',
          role: 'assistant',
          model: 'claude-haiku-5-5',
          stop_reason: r.stop ?? 'tool_use',
          stop_sequence: null,
          stop_details: null,
          content: r.input === undefined ? [] : [{ type: 'tool_use', id: `tu_${calls.length}`, name: toolName, input: r.input }],
          usage: { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        });
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

function logger() {
  const runs: AiRunRecord[] = [];
  return { runs, log: (r: AiRunRecord) => Promise.resolve(void runs.push(r)) };
}

const emptyImport = () =>
  Object.fromEntries(IMPORT_FIELD_KEYS.map((k) => [k, { value: null, evidence: null, confidence: 0 }])) as Record<
    string,
    { value: unknown; evidence: string | null; confidence: number }
  >;

const AD = `Für unsere Intensivstation (IPS) suchen wir eine dipl. Pflegefachperson HF/FH 80–100 %.
Jahreslohn ab CHF 88'000. Früh-, Spät- und Nachtdienst. Dienstplan 6 Wochen im Voraus.`;

describe('KI-1 Inserat-Strukturierung', () => {
  it('übernimmt nur Werte mit Beleg im Text', () => {
    const raw = emptyImport();
    raw.department = { value: 'ICU', evidence: 'Intensivstation (IPS)', confidence: 0.97 };
    raw.salaryMinChf = { value: 88000, evidence: "Jahreslohn ab CHF 88’000", confidence: 0.92 };
    raw.rosterLeadWeeks = { value: 6, evidence: 'Dienstplan 6 Wochen im Voraus', confidence: 0.9 };
    raw.vacationWeeks = { value: 6, evidence: '6 Wochen Ferien', confidence: 0.6 }; // nicht im Text → erfunden
    raw.weekendsPerMonth = { value: 2, evidence: null, confidence: 0.4 }; // ohne Beleg
    raw.salaryMaxChf = { value: 5, evidence: 'ab CHF', confidence: 0.2 }; // ungültiger Wert
    const result = verifyImport(AD, raw as never);
    expect(Object.keys(result.fields).sort()).toEqual(['department', 'rosterLeadWeeks', 'salaryMinChf']);
    expect(result.dropped).toEqual(
      expect.arrayContaining([
        { field: 'vacationWeeks', reason: 'evidenceNotInText' },
        { field: 'weekendsPerMonth', reason: 'noEvidence' },
        { field: 'salaryMaxChf', reason: 'invalidValue' },
      ]),
    );
  });

  it('nutzt Haiku 5.5, striktes Tool, Prompt Caching und protokolliert den Lauf', async () => {
    const raw = emptyImport();
    raw.department = { value: 'ICU', evidence: 'Intensivstation (IPS)', confidence: 0.97 };
    const { client, calls } = fakeClient([{ input: raw }]);
    const { runs, log } = logger();
    const result = await structureJobAd({ text: AD, orgId: 'org1', logger: log, client });
    expect(result.fields.department?.value).toBe('ICU');
    const req = calls[0];
    expect(req?.model).toBe('claude-haiku-5-5');
    expect(req?.tools?.[0]).toMatchObject({ strict: true, cache_control: { type: 'ephemeral' } });
    expect(req && 'temperature' in req).toBe(false);
    expect(Array.isArray(req?.system) && req.system[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(runs[0]).toMatchObject({ function: 'JOB_STRUCTURING', status: 'SUCCESS', orgId: 'org1', inputTokens: 1000 });
  });

  it('wiederholt einmal mit Fehlermeldung, danach Fehlerstatus statt Raten', async () => {
    const { client, calls } = fakeClient([{ input: { foo: 1 } }, { input: { foo: 2 } }]);
    const { runs, log } = logger();
    await expect(structureJobAd({ text: AD, orgId: 'o', logger: log, client })).rejects.toBeInstanceOf(AiError);
    expect(calls).toHaveLength(2);
    const retry = calls[1]?.messages.at(-1);
    expect(JSON.stringify(retry)).toContain('is_error');
    expect(runs.at(-1)?.status).toBe('INVALID_OUTPUT');
  });

  it('meldet Zeitüberschreitung als TIMEOUT', async () => {
    const { client } = fakeClient([{ throws: new Anthropic.APIConnectionTimeoutError() }]);
    const { runs, log } = logger();
    await expect(structureJobAd({ text: AD, orgId: 'o', logger: log, client })).rejects.toMatchObject({ status: 'TIMEOUT' });
    expect(runs[0]?.status).toBe('TIMEOUT');
  });
});

describe('KI-2 Suchsatz', () => {
  it('übernimmt gültige Bedingungen und verwirft ungültige einzeln', () => {
    const filter = toSearchFilter({
      profession: 'NURSE_HF_FH',
      departments: ['ICU'],
      cantons: ['ZH', 'XX'],
      workloadPct: 80,
      availableFrom: '2027-03-01',
      conditions: [
        { key: 'noNights', mode: 'must', value: null, transport: null },
        { key: 'minSalary', mode: 'wish', value: 12, transport: null },
        { key: 'maxCommute', mode: 'wish', value: 30, transport: 'PT' },
        { key: 'erfunden', mode: 'must', value: null, transport: null },
      ],
      keywords: null,
    });
    expect(filter.cantons).toEqual(['ZH']);
    expect(filter.conditions.map((c) => c.key)).toEqual(['noNights', 'maxCommute']);
  });
});

describe('KI-5 Team-Zusammenfassung', () => {
  it('erzeugt unter 5 Texten nichts', async () => {
    const { log } = logger();
    await expect(summarizeTeamComments({ field: 'rosterLeadWeeks', comments: ['a', 'b', 'c', 'd'], logger: log })).rejects.toBeInstanceOf(
      NotEnoughTextsError,
    );
  });
});

describe('Kosten', () => {
  it('rechnet mit den Listenpreisen von Haiku 5.5', () => {
    // 6'000 In / 1'500 Out → 0.0006 + 0.00075 = 0.00135 USD (PRD 9.3: 10'000 Aufrufe ≈ 14 USD)
    expect(costUsd({ input_tokens: 6000, output_tokens: 1500 })).toBeCloseTo(0.00135, 6);
    expect(costUsd({ input_tokens: 150_000, output_tokens: 0 })).toBeCloseTo(0.075, 6);
  });
});
