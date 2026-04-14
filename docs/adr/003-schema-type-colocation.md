# ADR-003: Colocated Interfaces and Zod Schemas

**Status:** Accepted
**Date:** 2026-04-14
**Decision Makers:** Project team

## Context

Each of the 57 MCP tools requires two things:

1. A **Zod schema** — defines the JSON Schema exposed to MCP clients and validates incoming parameters at runtime.
2. A **TypeScript interface** — provides compile-time type safety for the tool handler code.

These must stay in sync. If a field is added to one but not the other, the tool will either fail validation or have an untyped parameter.

## Decision

Colocate each interface and its Zod schema in the same `types.ts` file, directly adjacent:

```typescript
// types.ts
export interface ResizeParams {
  input: string;
  width: number;
  height: number;
  mode: 'fit' | 'fill' | 'stretch';
}

export const resizeSchema = z.object({
  input: z.string().describe('Path to the input image'),
  width: z.number().int().positive().describe('Target width in pixels'),
  height: z.number().int().positive().describe('Target height in pixels'),
  mode: z.enum(['fit', 'fill', 'stretch']).default('fit').describe('Resize mode'),
});
```

Tool handlers in `index.ts` import both:

```typescript
import { type ResizeParams, resizeSchema } from './types.js';

registerTool<ResizeParams>(server, 'resize', 'desc', resizeSchema.shape,
  async (params: ResizeParams) => { ... });
```

## Consequences

### Positive

- **Drift prevention** — Interface and schema are 5 lines apart. Adding a field to one without the other is immediately visible.
- **Single source of truth per category** — All type definitions for a tool category live in one file.
- **Clean handler files** — `index.ts` files contain only business logic, no schema definitions.
- **IDE navigation** — Jump-to-definition on a param type lands directly next to the schema.

### Negative

- **No compile-time enforcement** — Due to the `registerTool` wrapper (ADR-001), tsc does not verify that a schema matches its interface. This is an accepted trade-off for build performance. Zod catches mismatches at runtime.
- **types.ts files are larger** — Each contains both interfaces and schemas. Acceptable since they're organized by category (8-10 tools per file).

### Alternatives Considered

- **Derive types from schemas** (`type ResizeParams = z.infer<typeof resizeSchema>`) — This is the standard Zod pattern but causes the OOM described in ADR-001 when used with `server.tool()`.
- **Separate files** (`types.ts` + `schemas.ts`) — Increases drift risk and navigation overhead with no benefit.
- **Single global types file** — Loses the category-based organization that makes 57 tools manageable.

## File Structure

```
src/core/
├── types.ts    # ResizeParams interface + resizeSchema, CropParams + cropSchema, ...
└── index.ts    # registerTool<ResizeParams>(server, 'resize', ..., resizeSchema.shape, handler)

src/text/
├── types.ts    # TextOverlayParams + textOverlaySchema, ...
└── index.ts    # registerTool<TextOverlayParams>(server, 'text-overlay', ..., handler)

# Same pattern for compositing/, color/, content/, ads/, assets/
```
