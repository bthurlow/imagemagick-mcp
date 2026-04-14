# ADR-004: ImageMagick CLI via execFile, Not Bindings

**Status:** Accepted
**Date:** 2026-04-14
**Decision Makers:** Project team

## Context

ImageMagick can be consumed in Node.js in two ways:

1. **Native bindings** — npm packages like `magickwand.js` or `wasm-imagemagick` that embed ImageMagick as a library.
2. **CLI wrapper** — Shell out to the `magick` command-line tool via `child_process.execFile`.

## Decision

Use `child_process.execFile('magick', args)` wrapped in a typed async helper (`src/utils/exec.ts`).

```typescript
export async function magick(args: string[], options?: { timeout?: number }): Promise<string> {
  const { stdout } = await execFileAsync('magick', args, {
    timeout: options?.timeout ?? 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}
```

## Consequences

### Positive

- **Zero native dependencies** — No node-gyp, no platform-specific binaries, no WASM. Works on any OS with ImageMagick installed.
- **Full ImageMagick feature set** — Every CLI flag and filter is available. No subset limitations of binding wrappers.
- **Simple debugging** — Every operation is a `magick` command that can be copied and run manually.
- **Version agnostic** — Works with any ImageMagick 7.x installation.
- **execFile, not exec** — Uses `execFile` (not `exec`) to avoid shell injection. Arguments are passed as an array, never interpolated into a shell string.

### Negative

- **Process overhead** — Each operation spawns a child process (~5-15ms overhead). Acceptable for image processing where the actual work takes 50-500ms.
- **System dependency** — Requires ImageMagick 7+ installed. The README documents installation for all major platforms.
- **Stdout parsing** — Some tools (info, color-extract) parse stdout text. Brittle if ImageMagick changes output format across versions. Mitigated by using explicit `-format` flags.

### Security

- `execFile` does not invoke a shell, preventing command injection via file paths or parameter values.
- File paths are validated before use (`validateInputFile`).
- Timeouts prevent runaway processes (30s default, 120s for batch operations).
- Max buffer (10MB) prevents memory exhaustion from unexpected output.

### Alternatives Considered

- **magickwand.js** — Native bindings. Adds platform-specific build complexity, limited API surface, lagging feature support.
- **wasm-imagemagick** — WASM port. Limited to a subset of ImageMagick, larger bundle, slower for complex operations.
- **Sharp** — Excellent for basic operations but lacks ImageMagick's full filter/compositing/text capabilities needed for content and ad creative tools.
