import { createHash } from 'node:crypto';

import Anthropic from '@anthropic-ai/sdk';

import type { AiFunction, AiRunStatus } from '@kardia/db/enums';
import type { z } from 'zod';


/**
 * Gemeinsamer Ablauf aller KI-Funktionen (PRD 9.2):
 *  - Modell `claude-haiku-5-5`, nur im Worker (Ausnahme KI-2 im Such-Request-Pfad)
 *  - strukturierte Ausgabe per Tool Use mit striktem JSON-Schema, zusätzlich Zod
 *  - ungültig → genau 1 Wiederholung mit der Fehlermeldung → danach Fehlerstatus, kein Raten
 *  - Prompt Caching für System-Prompt und Schema (stabiler Präfix)
 *  - Protokoll in `AiRun` (Funktion, Modell, Tokens, Kosten, Dauer, Status, Hash)
 */

export const MODEL = 'claude-haiku-5-5';

/** Listenpreise USD pro Million Tokens (Prompt ≤ 100'000 Tokens / darüber). */
const PRICE = {
  short: { input: 0.1, output: 0.5 },
  long: { input: 0.5, output: 2.5 },
  cacheWriteFactor: 1.25,
  cacheReadFactor: 0.1,
  longThreshold: 100_000,
} as const;

export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costUsd(usage: UsageLike): number {
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const promptTokens = usage.input_tokens + cacheWrite + cacheRead;
  const rate = promptTokens > PRICE.longThreshold ? PRICE.long : PRICE.short;
  const cost =
    usage.input_tokens * rate.input +
    cacheWrite * rate.input * PRICE.cacheWriteFactor +
    cacheRead * rate.input * PRICE.cacheReadFactor +
    usage.output_tokens * rate.output;
  // Spalte AiRun.costUsd ist Decimal(10,6): auf Millionstel-Dollar runden.
  return Math.round(cost) / 1_000_000;
}

export interface AiRunRecord {
  function: AiFunction;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  status: AiRunStatus;
  inputHash: string;
  rawInput: string | null;
  rawOutput: unknown;
  orgId: string | null;
}

/** Schreibt einen Lauf (in Produktion in die Tabelle AiRun, siehe `dbAiLogger`). */
export type AiLogger = (record: AiRunRecord) => Promise<void>;

export class AiError extends Error {
  constructor(
    readonly status: Exclude<AiRunStatus, 'SUCCESS'>,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface StructuredCall<S extends z.ZodType> {
  fn: AiFunction;
  /** Stabiler System-Prompt (gecacht). Nie Zeitstempel o. Ä. einbauen. */
  system: string;
  tool: { name: string; description: string; inputSchema: Record<string, unknown> };
  schema: S;
  /** Inhalt der Nutzernachricht (Text oder Dokument-/Bildblöcke). */
  content: Anthropic.ContentBlockParam[];
  /** Für Hash und Protokoll; bei Dokumenten nur Metadaten, nie die Datei selbst. */
  rawInputForLog: string;
  timeoutMs: number;
  maxTokens: number;
  orgId?: string | null;
  logger: AiLogger;
  client?: Anthropic;
  /** Rohtexte protokollieren (werden nach 30 Tagen gelöscht). */
  storeRaw?: boolean;
}

let sharedClient: Anthropic | undefined;

/** Standard-Client: liest Zugangsdaten aus der Umgebung (ANTHROPIC_API_KEY). */
export function getClient(): Anthropic {
  sharedClient ??= new Anthropic();
  return sharedClient;
}

export function hashInput(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function runStructured<S extends z.ZodType>(call: StructuredCall<S>): Promise<z.infer<S>> {
  const client = call.client ?? getClient();
  const started = Date.now();
  const tools: Anthropic.Tool[] = [
    {
      name: call.tool.name,
      description: call.tool.description,
      strict: true,
      input_schema: call.tool.inputSchema as Anthropic.Tool.InputSchema,
      cache_control: { type: 'ephemeral' },
    },
  ];
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: call.system, cache_control: { type: 'ephemeral' } },
  ];
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: call.content }];
  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let lastRaw: unknown = null;

  const log = async (status: AiRunStatus) => {
    await call.logger({
      function: call.fn,
      model: MODEL,
      inputTokens: usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens,
      outputTokens: usage.output_tokens,
      costUsd: costUsd(usage),
      durationMs: Date.now() - started,
      status,
      inputHash: hashInput(call.rawInputForLog),
      rawInput: call.storeRaw === false ? null : call.rawInputForLog,
      rawOutput: lastRaw,
      orgId: call.orgId ?? null,
    });
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        {
          model: MODEL,
          max_tokens: call.maxTokens,
          system,
          tools,
          // Haiku 5.5 erlaubt erzwungene Tool-Wahl; die Antwort beginnt dann direkt mit dem Tool-Aufruf.
          tool_choice: { type: 'tool', name: call.tool.name },
          output_config: { effort: 'low' },
          messages,
        },
        // Zeitlimit pro Versuch; keine SDK-Wiederholungen, sonst würde das Limit vervielfacht.
        { timeout: call.timeoutMs, maxRetries: call.timeoutMs < 5000 ? 0 : 1 },
      );
    } catch (error) {
      const status: AiRunStatus = error instanceof Anthropic.APIConnectionTimeoutError ? 'TIMEOUT' : 'ERROR';
      await log(status);
      throw new AiError(status, error instanceof Error ? error.message : 'KI-Aufruf fehlgeschlagen', error);
    }

    usage.input_tokens += response.usage.input_tokens;
    usage.output_tokens += response.usage.output_tokens;
    usage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0;
    usage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;

    if (response.stop_reason === 'refusal') {
      lastRaw = { stop_reason: 'refusal', stop_details: response.stop_details ?? null };
      await log('ERROR');
      throw new AiError('ERROR', 'Das Modell hat die Anfrage abgelehnt.');
    }

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === call.tool.name,
    );
    lastRaw = toolUse?.input ?? null;
    if (!toolUse) {
      if (response.stop_reason === 'max_tokens') {
        await log('INVALID_OUTPUT');
        throw new AiError('INVALID_OUTPUT', 'Antwort abgeschnitten (max_tokens).');
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: `Antworte ausschliesslich mit einem Aufruf des Werkzeugs ${call.tool.name}.` });
      continue;
    }

    const parsed = call.schema.safeParse(toolUse.input);
    if (parsed.success) {
      await log('SUCCESS');
      return parsed.data;
    }

    // Eine Wiederholung mit der Zod-Fehlermeldung im Prompt (als Tool-Ergebnis mit is_error).
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: true,
          content: `Die Ausgabe ist ungültig: ${parsed.error.issues
            .slice(0, 10)
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('; ')}. Rufe das Werkzeug erneut mit korrigierten Werten auf. Unbekannte Werte sind null.`,
        },
      ],
    });
  }

  await log('INVALID_OUTPUT');
  throw new AiError('INVALID_OUTPUT', 'Die KI-Ausgabe war auch nach einer Wiederholung ungültig.');
}
