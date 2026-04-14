#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCoreTools } from './core/index.js';
import { registerTextTools } from './text/index.js';
import { registerCompositingTools } from './compositing/index.js';
import { registerColorTools } from './color/index.js';
import { registerContentTools } from './content/index.js';
import { registerAdTools } from './ads/index.js';
import { registerAssetTools } from './assets/index.js';

/**
 * ImageMagick MCP Server
 *
 * A comprehensive MCP server for image processing, content creation,
 * ad creative generation, and web/mobile asset management.
 *
 * Requires ImageMagick 7+ installed and available as `magick` in PATH.
 *
 * Categories:
 * - Core: resize, crop, smart-crop, rotate, flip, format-convert, compress, info, strip-metadata, batch
 * - Text: text-overlay, text-fit, text-path, annotate, caption-bar
 * - Compositing: composite, watermark, gradient-overlay, background-remove, drop-shadow, border, rounded-corners, mask-apply
 * - Color: adjust, tint, blur, sharpen, pixelate-region, color-extract, normalize, vignette
 * - Content: social-card, thumbnail, collage, carousel-set, before-after, gif-from-frames, sticker-cutout, quote-card
 * - Ads: banner-set, cta-button, price-badge, a-b-variants, template-fill, qr-code-overlay, product-mockup, email-header
 * - Assets: responsive-set, favicon-set, app-icon-set, splash-screen, sprite-sheet, nine-patch, aspect-crop-set, pdf-to-image, image-diff, optimize-batch
 */
async function main(): Promise<void> {
  const server = new McpServer({
    name: 'imagemagick-mcp',
    version: '0.1.0',
  });

  // Register all tool categories
  registerCoreTools(server);
  registerTextTools(server);
  registerCompositingTools(server);
  registerColorTools(server);
  registerContentTools(server);
  registerAdTools(server);
  registerAssetTools(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
