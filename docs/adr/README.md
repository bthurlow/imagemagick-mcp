# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the imagemagick-mcp project.

ADRs document significant technical decisions, their context, and consequences. They serve as a historical record of why the codebase is structured the way it is.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-register-tool-wrapper.md) | Type-Erased registerTool Wrapper | Accepted |
| [002](002-tsup-over-tsc-build.md) | tsup (esbuild) for Builds Instead of tsc | Accepted |
| [003](003-schema-type-colocation.md) | Colocated Interfaces and Zod Schemas | Accepted |
| [004](004-imagemagick-cli-wrapper.md) | ImageMagick CLI via execFile, Not Bindings | Accepted |

## Format

Each ADR follows the structure:
- **Status** — Proposed, Accepted, Deprecated, Superseded
- **Context** — What problem prompted this decision
- **Decision** — What we decided and why
- **Consequences** — Trade-offs, positives, negatives, alternatives considered
