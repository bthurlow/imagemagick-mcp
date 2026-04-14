# ADR-001: Type-Erased registerTool Wrapper

**Status:** Accepted
**Date:** 2026-04-14
**Decision Makers:** Project team

## Context

The MCP SDK's `server.tool()` method has heavily overloaded generic signatures that force TypeScript to resolve Zod's deeply nested recursive conditional types (`z.infer<z.ZodObject<T>>`) for every tool registration call. With 57 tools, this causes `tsc --noEmit` to exhaust available memory (4GB+ heap) and crash with OOM.

This is a known issue in the TypeScript ecosystem with Zod + generics at scale. The same problem occurs in large tRPC routers with inline Zod schemas.

### Approaches Tried (Failed)

1. **Explicit handler types** (`async (params: ResizeParams) => {...}`) — Reduced inference on the output side, but tsc still resolves the schema generic on the input side to validate the overload match.

2. **Extracted typed schemas** (`const resizeSchema: z.ZodType<ResizeParams> = z.object({...})`) — Pre-types the schema, but `z.ZodType<T>` erases the `ZodObject` shape, and `server.tool()` still resolves the generic when validating the shape.

3. **`.shape` property** — Passes the raw Zod shape object instead of the full `ZodObject`, but tsc still resolves the `ZodRawShape` generic constraint.

4. **Increased heap** (`--max-old-space-size=16384`) — Delays the OOM but doesn't prevent it. Memory usage scales with the number of tool registrations.

## Decision

Introduce a `registerTool<TParams>()` wrapper in `src/utils/register.ts` that type-erases the schema parameter:

```typescript
export function registerTool<TParams>(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, unknown>,
  handler: (params: TParams) => Promise<ToolResult>,
): void {
  (server as any).tool(name, description, schema, handler);
}
```

This contains a single `any` cast that prevents tsc from resolving Zod's recursive generics through the SDK's overloaded signatures.

## Consequences

### Positive

- **tsc --noEmit completes in seconds** with zero errors and normal memory usage
- **Full typecheck on all handler code** — param destructuring, business logic, return types are all checked via the explicit `TParams` generic
- **Full typecheck on all schemas** — Zod schemas in types.ts are typechecked in isolation
- **Full runtime validation** — Zod schemas still validate all incoming MCP tool parameters at runtime
- **Single point of containment** — one `any` cast in one 5-line function, clearly documented

### Negative

- **No compile-time check that a Zod schema matches its paired interface.** If `ResizeParams` gains a field but `resizeSchema` doesn't, tsc won't catch it. Zod will still validate at runtime (the field won't be parsed). Mitigation: schemas and interfaces are colocated in the same `types.ts` file, making drift unlikely.
- **One `any` cast exists.** It requires an `eslint-disable` comment. Mitigation: isolated, documented, and the only one in the codebase.

### Alternatives Considered But Not Chosen

- **TypeScript project references** — Would split compilation into 7 independent units (~8 tools each). More complex build setup, slower incremental builds, and may still OOM within a single category if the SDK types are heavy enough.
- **Drop Zod entirely** — Pass plain JSON Schema objects to `server.tool()`. Loses runtime validation and Zod's ergonomic schema definition.
- **Use a different MCP SDK** — No viable alternative exists.

## Notes

This is a TypeScript tooling limitation, not a code quality issue. The MCP SDK + Zod combination creates O(n) recursive generic instantiations where n = number of tools. The wrapper reduces this to O(1) by resolving the generic once in the wrapper signature rather than per-call.
