import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** MCP tool handler return type */
export interface ToolResult {
  content: { type: 'text'; text: string }[];
}

/**
 * Type-erased wrapper around server.tool() to prevent tsc from resolving
 * Zod's deeply nested generics across 57 tool registrations, which causes OOM.
 *
 * Type safety is preserved via explicit param interfaces on each handler.
 * Runtime validation is preserved via Zod schemas passed as the shape argument.
 * The only thing skipped is tsc validating the Zod schema against the SDK's generic constraint.
 */
export function registerTool<TParams>(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, unknown>,
  handler: (params: TParams) => Promise<ToolResult>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).tool(name, description, schema, handler);
}
