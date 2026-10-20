/**
 * Minimaler JSON-Schema-Baukasten für strikte Tools: nur Typen, Enums, `required`
 * und `additionalProperties: false`. Wertebereiche prüft Zod danach.
 */
export type JsonSchema = Record<string, unknown>;

export const str = (description?: string): JsonSchema => ({ type: 'string', ...(description ? { description } : {}) });
export const num = (description?: string): JsonSchema => ({ type: 'number', ...(description ? { description } : {}) });
export const int = (description?: string): JsonSchema => ({ type: 'integer', ...(description ? { description } : {}) });
export const bool = (description?: string): JsonSchema => ({ type: 'boolean', ...(description ? { description } : {}) });
export const enumOf = (values: readonly string[], description?: string): JsonSchema => ({
  type: 'string',
  enum: [...values],
  ...(description ? { description } : {}),
});
export const arr = (items: JsonSchema, description?: string): JsonSchema => ({
  type: 'array',
  items,
  ...(description ? { description } : {}),
});

/** Erlaubt zusätzlich null (fehlender Wert). */
export function nullable(schema: JsonSchema): JsonSchema {
  return { anyOf: [schema, { type: 'null' }] };
}

export function obj(properties: Record<string, JsonSchema>, description?: string): JsonSchema {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
    ...(description ? { description } : {}),
  };
}
