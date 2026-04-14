import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Core Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = await createTestServerClient();
    client = setup.client;
    cleanup = setup.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(() => {
    resetMock();
  });

  // ── resize ──────────────────────────────────────────────────────────

  describe('resize', () => {
    it('builds correct args for fit mode (default)', async () => {
      const result = await client.callTool({
        name: 'resize',
        arguments: { input: '/test/photo.jpg', width: 800, height: 600 },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-resize');
      expect(args).toContain('800x600');
      expect(args[0]).toBe('/test/photo.jpg');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('Resized');
    });

    it('builds correct args for fill mode', async () => {
      await client.callTool({
        name: 'resize',
        arguments: { input: '/test/photo.jpg', width: 800, height: 600, mode: 'fill' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-resize');
      expect(args.some((a: string) => a.includes('^'))).toBe(true);
      expect(args).toContain('-gravity');
      expect(args).toContain('center');
      expect(args).toContain('-extent');
      expect(args).toContain('800x600');
    });

    it('builds correct args for stretch mode', async () => {
      await client.callTool({
        name: 'resize',
        arguments: { input: '/test/photo.jpg', width: 1024, height: 768, mode: 'stretch' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-resize');
      expect(args.some((a: string) => a.includes('!'))).toBe(true);
    });
  });

  // ── crop ────────────────────────────────────────────────────────────

  describe('crop', () => {
    it('builds correct crop geometry', async () => {
      const result = await client.callTool({
        name: 'crop',
        arguments: { input: '/test/photo.jpg', width: 300, height: 200, x: 10, y: 20 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-crop');
      expect(args).toContain('300x200+10+20');
      expect(args).toContain('+repage');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('defaults x and y to 0', async () => {
      await client.callTool({
        name: 'crop',
        arguments: { input: '/test/photo.jpg', width: 300, height: 200 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('300x200+0+0');
    });
  });

  // ── smart-crop ──────────────────────────────────────────────────────

  describe('smart-crop', () => {
    it('builds resize + extent for content-aware crop', async () => {
      const result = await client.callTool({
        name: 'smart-crop',
        arguments: { input: '/test/photo.jpg', width: 400, height: 300 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-resize');
      expect(args.some((a: string) => a.includes('^'))).toBe(true);
      expect(args).toContain('-gravity');
      expect(args).toContain('center');
      expect(args).toContain('-extent');
      expect(args).toContain('400x300');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('Smart-cropped');
    });
  });

  // ── rotate ──────────────────────────────────────────────────────────

  describe('rotate', () => {
    it('builds correct rotation args with default background', async () => {
      const result = await client.callTool({
        name: 'rotate',
        arguments: { input: '/test/photo.jpg', degrees: 45 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-rotate');
      expect(args).toContain('45');
      expect(args).toContain('-background');
      expect(args).toContain('transparent');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('uses custom background color', async () => {
      await client.callTool({
        name: 'rotate',
        arguments: { input: '/test/photo.jpg', degrees: 90, background: '#ff0000' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('#ff0000');
    });
  });

  // ── flip ────────────────────────────────────────────────────────────

  describe('flip', () => {
    it('uses -flop for horizontal flip', async () => {
      const result = await client.callTool({
        name: 'flip',
        arguments: { input: '/test/photo.jpg', direction: 'horizontal' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-flop');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('uses -flip for vertical flip', async () => {
      await client.callTool({
        name: 'flip',
        arguments: { input: '/test/photo.jpg', direction: 'vertical' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-flip');
    });
  });

  // ── format-convert ──────────────────────────────────────────────────

  describe('format-convert', () => {
    it('converts without quality param', async () => {
      const result = await client.callTool({
        name: 'format-convert',
        arguments: { input: '/test/photo.jpg', format: 'webp' },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).not.toContain('-quality');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('webp');
    });

    it('includes quality when specified', async () => {
      await client.callTool({
        name: 'format-convert',
        arguments: { input: '/test/photo.jpg', format: 'webp', quality: 90 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-quality');
      expect(args).toContain('90');
    });
  });

  // ── compress ────────────────────────────────────────────────────────

  describe('compress', () => {
    it('builds default compress args with strip', async () => {
      const result = await client.callTool({
        name: 'compress',
        arguments: { input: '/test/photo.png' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-quality');
      expect(args).toContain('85');
      expect(args).toContain('-strip');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('omits -strip when strip is false', async () => {
      await client.callTool({
        name: 'compress',
        arguments: { input: '/test/photo.png', strip: false },
      });

      const args = mockState.calls[0].args;
      expect(args).not.toContain('-strip');
    });
  });

  // ── info ────────────────────────────────────────────────────────────

  describe('info', () => {
    it('calls identify with format string', async () => {
      const result = await client.callTool({
        name: 'info',
        arguments: { input: '/test/photo.jpg' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('identify');
      expect(args).toContain('-format');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });
  });

  // ── strip-metadata ──────────────────────────────────────────────────

  describe('strip-metadata', () => {
    it('builds -strip arg', async () => {
      const result = await client.callTool({
        name: 'strip-metadata',
        arguments: { input: '/test/photo.jpg' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-strip');
      expect(args[0]).toBe('/test/photo.jpg');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('stripped');
    });

    it('respects custom output path', async () => {
      await client.callTool({
        name: 'strip-metadata',
        arguments: { input: '/test/photo.jpg', output: '/out/clean.jpg' },
      });

      const args = mockState.calls[0].args;
      expect(args[args.length - 1]).toBe('/out/clean.jpg');
    });
  });

  // ── batch ───────────────────────────────────────────────────────────

  describe('batch', () => {
    it('chains multiple operations into a single command', async () => {
      const result = await client.callTool({
        name: 'batch',
        arguments: {
          input: '/test/photo.jpg',
          output: '/out/result.jpg',
          operations: ['-resize 800x600', '-quality 85'],
        },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-resize');
      expect(args).toContain('800x600');
      expect(args).toContain('-quality');
      expect(args).toContain('85');
      expect(args[args.length - 1]).toBe('/out/result.jpg');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('Batch');
    });

    it('handles single operation', async () => {
      await client.callTool({
        name: 'batch',
        arguments: {
          input: '/test/photo.jpg',
          output: '/out/result.jpg',
          operations: ['-flip'],
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-flip');
    });
  });
});
