import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Text Tools', () => {
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

  // ── text-overlay ────────────────────────────────────────────────────

  describe('text-overlay', () => {
    it('builds correct args with defaults', async () => {
      const result = await client.callTool({
        name: 'text-overlay',
        arguments: { input: '/test/photo.jpg', text: 'Hello World' },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-gravity');
      expect(args).toContain('NorthWest');
      expect(args).toContain('-font');
      expect(args).toContain('Arial');
      expect(args).toContain('-pointsize');
      expect(args).toContain('32');
      expect(args).toContain('-fill');
      expect(args).toContain('white');
      expect(args).toContain('-annotate');
      expect(args).toContain('+0+0');
      expect(args).toContain('Hello World');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('builds rotation annotate format when rotation is non-zero', async () => {
      await client.callTool({
        name: 'text-overlay',
        arguments: {
          input: '/test/photo.jpg',
          text: 'Rotated',
          rotation: 45,
          x: 10,
          y: 20,
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-annotate');
      expect(args).toContain('45x45+10+20');
    });

    it('includes stroke args when stroke_color is provided', async () => {
      await client.callTool({
        name: 'text-overlay',
        arguments: {
          input: '/test/photo.jpg',
          text: 'Stroked',
          stroke_color: '#000000',
          stroke_width: 2,
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-stroke');
      expect(args).toContain('#000000');
      expect(args).toContain('-strokewidth');
      expect(args).toContain('2');
    });
  });

  // ── text-fit ────────────────────────────────────────────────────────

  describe('text-fit', () => {
    it('builds caption-based auto-size args', async () => {
      const result = await client.callTool({
        name: 'text-fit',
        arguments: {
          input: '/test/photo.jpg',
          text: 'Auto sized text',
          box_width: 400,
          box_height: 100,
        },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('(');
      expect(args).toContain('-size');
      expect(args).toContain('400x100');
      expect(args).toContain('-fill');
      expect(args).toContain('-font');
      expect(args.some((a: string) => a.startsWith('caption:'))).toBe(true);
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('includes background when specified', async () => {
      await client.callTool({
        name: 'text-fit',
        arguments: {
          input: '/test/photo.jpg',
          text: 'With bg',
          box_width: 200,
          box_height: 50,
          background: '#ff000080',
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-background');
      expect(args).toContain('#ff000080');
    });
  });

  // ── text-path ───────────────────────────────────────────────────────

  describe('text-path', () => {
    it('builds arc distort args with defaults', async () => {
      const result = await client.callTool({
        name: 'text-path',
        arguments: { input: '/test/photo.jpg', text: 'Curved Text' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('(');
      expect(args).toContain('-font');
      expect(args).toContain('Arial');
      expect(args).toContain('-pointsize');
      expect(args).toContain('32');
      expect(args.some((a: string) => a.startsWith('label:'))).toBe(true);
      expect(args).toContain('-distort');
      expect(args).toContain('Arc');
      expect(args).toContain('180 0');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('uses custom arc degrees and rotation', async () => {
      await client.callTool({
        name: 'text-path',
        arguments: {
          input: '/test/photo.jpg',
          text: 'Circle',
          arc_degrees: 360,
          rotation: 90,
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('360 90');
    });
  });

  // ── annotate ────────────────────────────────────────────────────────

  describe('annotate', () => {
    it('builds draw commands for a circle annotation', async () => {
      const result = await client.callTool({
        name: 'annotate',
        arguments: {
          input: '/test/photo.jpg',
          annotations: [{ type: 'circle', x: 100, y: 100, radius: 30 }],
        },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args.some((a: string) => a.includes('circle'))).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('1 annotation(s)');
    });

    it('builds draw commands for an arrow annotation', async () => {
      await client.callTool({
        name: 'annotate',
        arguments: {
          input: '/test/photo.jpg',
          annotations: [{ type: 'arrow', x: 50, y: 50, x2: 200, y2: 100 }],
        },
      });

      const args = mockState.calls[0].args;
      expect(args.some((a: string) => a.includes('line'))).toBe(true);
      expect(args.some((a: string) => a.includes('polygon'))).toBe(true);
    });

    it('builds draw commands for multiple annotation types', async () => {
      const result = await client.callTool({
        name: 'annotate',
        arguments: {
          input: '/test/photo.jpg',
          annotations: [
            { type: 'circle', x: 50, y: 50 },
            { type: 'number', x: 100, y: 100, label: '1' },
          ],
        },
      });

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('2 annotation(s)');
    });
  });

  // ── caption-bar ─────────────────────────────────────────────────────

  describe('caption-bar', () => {
    it('builds caption bar at bottom (default) with identify call', async () => {
      const result = await client.callTool({
        name: 'caption-bar',
        arguments: { input: '/test/photo.jpg', text: 'My Caption' },
      });

      // First call should be identify to get image width
      expect(mockState.calls.length).toBeGreaterThanOrEqual(2);
      const identifyArgs = mockState.calls[0].args;
      expect(identifyArgs[0]).toBe('identify');
      expect(identifyArgs).toContain('-format');
      expect(identifyArgs).toContain('%w');

      // Second call builds the caption bar composite
      const args = mockState.calls[1].args;
      expect(args).toContain('(');
      expect(args).toContain('-gravity');
      expect(args).toContain('South');
      expect(args).toContain('-annotate');
      expect(args).toContain('My Caption');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('uses North gravity for top position', async () => {
      await client.callTool({
        name: 'caption-bar',
        arguments: { input: '/test/photo.jpg', text: 'Top Caption', position: 'top' },
      });

      const args = mockState.calls[1].args;
      // The outer gravity should be North for top positioning
      const gravityIndices = args.reduce((acc: number[], a: string, i: number) => {
        if (a === '-gravity') acc.push(i);
        return acc;
      }, []);
      // Last gravity is the position gravity
      const lastGravityIdx = gravityIndices[gravityIndices.length - 1];
      expect(args[lastGravityIdx + 1]).toBe('North');
    });
  });
});
