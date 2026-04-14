# ADR-002: tsup (esbuild) for Builds Instead of tsc

**Status:** Accepted
**Date:** 2026-04-14
**Decision Makers:** Project team

## Context

The project needs a build step to compile TypeScript to JavaScript for distribution. Two options exist:

1. **tsc** — TypeScript's built-in compiler. Performs full type checking during compilation.
2. **tsup** — A bundler powered by esbuild. Transpiles TypeScript without type checking.

Even with the `registerTool` wrapper (ADR-001) resolving the OOM for `tsc --noEmit`, using tsc as the build tool is significantly slower and produces multiple output files requiring correct ESM import resolution.

## Decision

Use **tsup** for building. Use **tsc --noEmit** separately for type checking.

```json
{
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  }
}
```

tsup configuration:

```typescript
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

## Consequences

### Positive

- **Build speed**: ~60ms vs 10+ seconds for tsc
- **Single output file**: 116KB bundled `dist/index.js` — no import resolution issues, simple to distribute
- **Source maps**: Generated for debugging
- **Separation of concerns**: Build (fast, always works) is decoupled from typecheck (thorough, runs separately)

### Negative

- **Build doesn't catch type errors** — Requires running `yarn typecheck` separately. Mitigated by the `yarn check` script that runs lint + format:check + build in sequence, and by CI enforcing typecheck.
- **Additional dev dependency** — tsup adds ~40 transitive dependencies. Acceptable for a build tool.

### Alternatives Considered

- **tsc only** — Slower, produces multiple files, would need additional bundling for single-file distribution.
- **esbuild directly** — tsup provides a cleaner config API and handles TypeScript paths, `clean`, and banner injection.
- **SWC** — Similar performance to esbuild but less ecosystem support for the MCP server use case.
