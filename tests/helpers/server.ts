import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { registerCoreTools } from '../../src/core/index.js';
import { registerTextTools } from '../../src/text/index.js';
import { registerCompositingTools } from '../../src/compositing/index.js';
import { registerColorTools } from '../../src/color/index.js';
import { registerContentTools } from '../../src/content/index.js';
import { registerAdTools } from '../../src/ads/index.js';
import { registerAssetTools } from '../../src/assets/index.js';

/**
 * Create a test MCP server + client pair connected via in-memory transport.
 */
export async function createTestServerClient(): Promise<{
  server: McpServer;
  client: Client;
  cleanup: () => Promise<void>;
}> {
  const server = new McpServer({
    name: 'imagemagick-mcp-test',
    version: '0.1.0',
  });

  // Register all tools
  registerCoreTools(server);
  registerTextTools(server);
  registerCompositingTools(server);
  registerColorTools(server);
  registerContentTools(server);
  registerAdTools(server);
  registerAssetTools(server);

  const client = new Client({ name: 'test-client', version: '1.0.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const cleanup = async (): Promise<void> => {
    await client.close();
    await server.close();
  };

  return { server, client, cleanup };
}
