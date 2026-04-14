import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Compositing Tools', () => {
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

  // ── composite ───────────────────────────────────────────────────────

  describe('composite', () => {
    it('builds correct args with defaults (Over, 100% opacity)', async () => {
      const result = await client.callTool({
        name: 'composite',
        arguments: { base: '/test/bg.jpg', overlay: '/test/fg.png' },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/bg.jpg');
      expect(args).toContain('/test/fg.png');
      expect(args).toContain('-gravity');
      expect(args).toContain('Center');
      expect(args).toContain('-geometry');
      expect(args).toContain('+0+0');
      expect(args).toContain('-compose');
      expect(args).toContain('Over');
      expect(args).toContain('-composite');
      // At 100% opacity, no alpha manipulation subcommand
      expect(args).not.toContain('-evaluate');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('adds alpha manipulation for opacity < 100', async () => {
      await client.callTool({
        name: 'composite',
        arguments: { base: '/test/bg.jpg', overlay: '/test/fg.png', opacity: 50 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-alpha');
      expect(args).toContain('set');
      expect(args).toContain('-channel');
      expect(args).toContain('A');
      expect(args).toContain('-evaluate');
      expect(args).toContain('multiply');
      expect(args).toContain('0.5');
    });

    it('uses specified blend mode', async () => {
      await client.callTool({
        name: 'composite',
        arguments: { base: '/test/bg.jpg', overlay: '/test/fg.png', blend: 'Multiply' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('Multiply');
    });
  });

  // ── watermark ───────────────────────────────────────────────────────

  describe('watermark', () => {
    it('builds positioned watermark with defaults', async () => {
      const result = await client.callTool({
        name: 'watermark',
        arguments: { input: '/test/photo.jpg', watermark: '/test/wm.png' },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-gravity');
      expect(args).toContain('SouthEast');
      expect(args).toContain('-evaluate');
      expect(args).toContain('multiply');
      expect(args).toContain('0.3');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('builds tiled watermark with -write mpr:wm', async () => {
      await client.callTool({
        name: 'watermark',
        arguments: { input: '/test/photo.jpg', watermark: '/test/wm.png', mode: 'tile' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-write');
      expect(args).toContain('mpr:wm');
      expect(args).toContain('-fill');
      expect(args).toContain('mpr:wm');
    });
  });

  // ── gradient-overlay ────────────────────────────────────────────────

  describe('gradient-overlay', () => {
    it('builds linear gradient with identify call', async () => {
      const result = await client.callTool({
        name: 'gradient-overlay',
        arguments: { input: '/test/photo.jpg' },
      });

      // First call is identify to get dimensions
      expect(mockState.calls.length).toBeGreaterThanOrEqual(2);
      const identifyArgs = mockState.calls[0].args;
      expect(identifyArgs[0]).toBe('identify');

      // Second call builds the gradient composite
      const args = mockState.calls[1].args;
      expect(args).toContain('(');
      expect(args).toContain('-size');
      expect(args.some((a: string) => a.startsWith('gradient:'))).toBe(true);
      expect(args).toContain('-compose');
      expect(args).toContain('Over');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('builds radial gradient spec', async () => {
      await client.callTool({
        name: 'gradient-overlay',
        arguments: {
          input: '/test/photo.jpg',
          type: 'radial',
          color_start: '#ffffff00',
          color_end: '#00000080',
        },
      });

      const args = mockState.calls[1].args;
      expect(args.some((a: string) => a.startsWith('radial-gradient:'))).toBe(true);
    });

    it('adds rotation for left-right direction', async () => {
      await client.callTool({
        name: 'gradient-overlay',
        arguments: { input: '/test/photo.jpg', direction: 'left-right' },
      });

      const args = mockState.calls[1].args;
      expect(args).toContain('-rotate');
      expect(args).toContain('90');
    });
  });

  // ── background-remove ───────────────────────────────────────────────

  describe('background-remove', () => {
    it('builds transparent background removal with defaults', async () => {
      const result = await client.callTool({
        name: 'background-remove',
        arguments: { input: '/test/photo.jpg' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-fuzz');
      expect(args).toContain('20%');
      expect(args).toContain('-transparent');
      expect(args).toContain('white');
      // Default replace_color is 'none', so no -background/-flatten
      expect(args).not.toContain('-flatten');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('includes -background and -flatten for non-transparent replacement', async () => {
      await client.callTool({
        name: 'background-remove',
        arguments: { input: '/test/photo.jpg', replace_color: '#0000ff' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-background');
      expect(args).toContain('#0000ff');
      expect(args).toContain('-flatten');
    });
  });

  // ── drop-shadow ─────────────────────────────────────────────────────

  describe('drop-shadow', () => {
    it('builds shadow args with defaults', async () => {
      const result = await client.callTool({
        name: 'drop-shadow',
        arguments: { input: '/test/photo.png' },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.png');
      expect(args).toContain('(');
      expect(args).toContain('+clone');
      expect(args).toContain('-shadow');
      expect(args).toContain('100x10+5+5');
      expect(args).toContain('+swap');
      expect(args).toContain('-layers');
      expect(args).toContain('merge');
      expect(args).toContain('+repage');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('uses custom shadow parameters', async () => {
      await client.callTool({
        name: 'drop-shadow',
        arguments: {
          input: '/test/photo.png',
          color: '#ff000080',
          offset_x: 10,
          offset_y: 15,
          blur: 20,
          background: 'transparent',
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('#ff000080');
      expect(args).toContain('100x20+10+15');
      expect(args).toContain('transparent');
    });
  });

  // ── border ──────────────────────────────────────────────────────────

  describe('border', () => {
    it('builds solid border with defaults', async () => {
      const result = await client.callTool({
        name: 'border',
        arguments: { input: '/test/photo.jpg' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-bordercolor');
      expect(args).toContain('white');
      expect(args).toContain('-border');
      expect(args).toContain('10');
      // No -raise/+raise for solid
      expect(args).not.toContain('-raise');
      expect(args).not.toContain('+raise');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('builds raised border style', async () => {
      await client.callTool({
        name: 'border',
        arguments: { input: '/test/photo.jpg', style: 'raised', width: 5 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-raise');
      expect(args).toContain('5x5');
    });

    it('builds sunken border style', async () => {
      await client.callTool({
        name: 'border',
        arguments: { input: '/test/photo.jpg', style: 'sunken', width: 8 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('+raise');
      expect(args).toContain('8x8');
    });
  });

  // ── rounded-corners ─────────────────────────────────────────────────

  describe('rounded-corners', () => {
    it('builds rounded corners with identify + mask composite', async () => {
      const result = await client.callTool({
        name: 'rounded-corners',
        arguments: { input: '/test/photo.jpg' },
      });

      // First call: identify for dimensions
      expect(mockState.calls.length).toBeGreaterThanOrEqual(2);
      const identifyArgs = mockState.calls[0].args;
      expect(identifyArgs[0]).toBe('identify');

      // Second call: the mask composite
      const args = mockState.calls[1].args;
      expect(args).toContain('-alpha');
      expect(args).toContain('set');
      expect(args).toContain('xc:none');
      expect(args.some((a: string) => a.includes('roundrectangle'))).toBe(true);
      expect(args).toContain('-compose');
      expect(args).toContain('DstIn');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
    });

    it('uses custom radius', async () => {
      await client.callTool({
        name: 'rounded-corners',
        arguments: { input: '/test/photo.jpg', radius: 50 },
      });

      const args = mockState.calls[1].args;
      expect(args.some((a: string) => a.includes('50,50'))).toBe(true);
    });
  });

  // ── mask-apply ──────────────────────────────────────────────────────

  describe('mask-apply', () => {
    it('builds circle mask with identify call', async () => {
      const result = await client.callTool({
        name: 'mask-apply',
        arguments: { input: '/test/photo.jpg', shape: 'circle' },
      });

      // First call: identify for dimensions
      expect(mockState.calls.length).toBeGreaterThanOrEqual(2);
      const identifyArgs = mockState.calls[0].args;
      expect(identifyArgs[0]).toBe('identify');

      // Second call: circle mask
      const args = mockState.calls[1].args;
      expect(args).toContain('-alpha');
      expect(args.some((a: string) => a.includes('circle'))).toBe(true);
      expect(args).toContain('-compose');
      expect(args).toContain('DstIn');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('circle');
    });

    it('builds rounded-rect mask with default radius', async () => {
      await client.callTool({
        name: 'mask-apply',
        arguments: { input: '/test/photo.jpg', shape: 'rounded-rect' },
      });

      const args = mockState.calls[1].args;
      expect(args.some((a: string) => a.includes('roundrectangle'))).toBe(true);
      // Default radius = 20
      expect(args.some((a: string) => a.includes('20,20'))).toBe(true);
    });

    it('uses custom mask image when provided', async () => {
      await client.callTool({
        name: 'mask-apply',
        arguments: { input: '/test/photo.jpg', mask: '/test/mask.png', shape: 'custom' },
      });

      // identify call + mask composite
      const args = mockState.calls[1].args;
      expect(args).toContain('/test/mask.png');
      expect(args).toContain('-compose');
      expect(args).toContain('DstIn');
    });
  });
});
