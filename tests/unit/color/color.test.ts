import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Color Tools', () => {
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

  // ── adjust ─────────────────────────────────────────────────────────────

  describe('adjust', () => {
    it('builds correct brightness-contrast args', async () => {
      const result = await client.callTool({
        name: 'adjust',
        arguments: { input: '/test/photo.jpg', brightness: 10, contrast: 20 },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-brightness-contrast');
      expect(args).toContain('10x20');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('Adjusted');
    });

    it('includes modulate when saturation is changed', async () => {
      await client.callTool({
        name: 'adjust',
        arguments: { input: '/test/photo.jpg', saturation: 150 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-modulate');
      expect(args).toContain('100,150,100');
    });

    it('includes gamma when specified', async () => {
      await client.callTool({
        name: 'adjust',
        arguments: { input: '/test/photo.jpg', gamma: 2.2 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-gamma');
      expect(args).toContain('2.2');
    });

    it('skips brightness-contrast when both are 0', async () => {
      await client.callTool({
        name: 'adjust',
        arguments: { input: '/test/photo.jpg', brightness: 0, contrast: 0, saturation: 120 },
      });

      const args = mockState.calls[0].args;
      expect(args).not.toContain('-brightness-contrast');
      expect(args).toContain('-modulate');
    });
  });

  // ── tint ───────────────────────────────────────────────────────────────

  describe('tint', () => {
    it('builds correct args for tint mode', async () => {
      const result = await client.callTool({
        name: 'tint',
        arguments: { input: '/test/photo.jpg', mode: 'tint', color: '#FF5500' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-fill');
      expect(args).toContain('#FF5500');
      expect(args).toContain('-tint');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('tint');
    });

    it('builds correct args for duotone mode', async () => {
      const result = await client.callTool({
        name: 'tint',
        arguments: {
          input: '/test/photo.jpg',
          mode: 'duotone',
          color: '#FF0000',
          shadow_color: '#000066',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-colorspace');
      expect(args).toContain('Gray');
      expect(args).toContain('-compose');
      expect(args).toContain('Screen');
      expect(args).toContain('-composite');
      expect(args).toContain('#FF0000');
      expect(args).toContain('#000066');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('duotone');
    });
  });

  // ── blur ───────────────────────────────────────────────────────────────

  describe('blur', () => {
    it('builds correct args for gaussian blur (default)', async () => {
      const result = await client.callTool({
        name: 'blur',
        arguments: { input: '/test/photo.jpg' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-blur');
      expect(args.some((a: string) => a.match(/^\d+x\d+$/))).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Blur');
    });

    it('builds correct args for motion blur', async () => {
      await client.callTool({
        name: 'blur',
        arguments: { input: '/test/photo.jpg', type: 'motion', angle: 45 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-motion-blur');
      expect(args.some((a: string) => a.includes('+45'))).toBe(true);
    });

    it('builds correct args for radial blur', async () => {
      await client.callTool({
        name: 'blur',
        arguments: { input: '/test/photo.jpg', type: 'radial', sigma: 10 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-radial-blur');
      expect(args).toContain('10');
    });

    it('includes region when specified', async () => {
      await client.callTool({
        name: 'blur',
        arguments: {
          input: '/test/photo.jpg',
          region: { x: 10, y: 20, width: 100, height: 50 },
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-region');
      expect(args).toContain('100x50+10+20');
    });
  });

  // ── sharpen ────────────────────────────────────────────────────────────

  describe('sharpen', () => {
    it('builds correct args for unsharp mask (default)', async () => {
      const result = await client.callTool({
        name: 'sharpen',
        arguments: { input: '/test/photo.jpg' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-unsharp');
      expect(args.some((a: string) => a.match(/^\d+x\d+\+[\d.]+\+[\d.]+$/))).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Sharpened');
    });

    it('builds correct args for adaptive sharpening', async () => {
      await client.callTool({
        name: 'sharpen',
        arguments: { input: '/test/photo.jpg', type: 'adaptive', radius: 2, sigma: 1.5 },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-adaptive-sharpen');
      expect(args).toContain('2x1.5');
    });
  });

  // ── pixelate-region ────────────────────────────────────────────────────

  describe('pixelate-region', () => {
    it('builds crop+scale args for pixelate method', async () => {
      const result = await client.callTool({
        name: 'pixelate-region',
        arguments: {
          input: '/test/photo.jpg',
          x: 50,
          y: 100,
          width: 200,
          height: 150,
          method: 'pixelate',
          block_size: 10,
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-crop');
      expect(args).toContain('200x150+50+100');
      expect(args).toContain('-scale');
      expect(args).toContain('-composite');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Pixelated');
    });

    it('builds region+blur args for blur method', async () => {
      const result = await client.callTool({
        name: 'pixelate-region',
        arguments: {
          input: '/test/photo.jpg',
          x: 50,
          y: 100,
          width: 200,
          height: 150,
          method: 'blur',
          block_size: 8,
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-region');
      expect(args).toContain('200x150+50+100');
      expect(args).toContain('-blur');
      expect(args).toContain('0x8');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Blurred');
    });
  });

  // ── color-extract ──────────────────────────────────────────────────────

  describe('color-extract', () => {
    it('builds correct args and parses histogram output', async () => {
      setIdentifyOutput(
        '  1000: (255,0,0) #FF0000 srgb(255,0,0)\n  500: (0,255,0) #00FF00 srgb(0,255,0)',
      );
      // Override the mock to return histogram data for any call (not just identify)
      mockMagick.mockImplementation(async (args: string[]) => {
        mockState.calls.push({ args });
        if (args.includes('-colors')) {
          return '  1000: (255,0,0) #FF0000 srgb(255,0,0)\n  500: (0,255,0) #00FF00 srgb(0,255,0)';
        }
        if (args[0] === 'identify') {
          return '1920x1080';
        }
        return '';
      });

      const result = await client.callTool({
        name: 'color-extract',
        arguments: { input: '/test/photo.jpg', count: 5 },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-colors');
      expect(args).toContain('5');
      expect(args).toContain('-unique-colors');
      expect(args).toContain('histogram:info:');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('#FF0000');
      expect(content[0].text).toContain('#00FF00');
    });
  });

  // ── normalize ──────────────────────────────────────────────────────────

  describe('normalize', () => {
    it('builds correct args with -normalize flag', async () => {
      const result = await client.callTool({
        name: 'normalize',
        arguments: { input: '/test/photo.jpg' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-normalize');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('normalize');
    });

    it('uses equalize method when specified', async () => {
      await client.callTool({
        name: 'normalize',
        arguments: { input: '/test/photo.jpg', method: 'equalize' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-equalize');
    });

    it('uses auto-level method when specified', async () => {
      await client.callTool({
        name: 'normalize',
        arguments: { input: '/test/photo.jpg', method: 'auto-level' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-auto-level');
    });
  });

  // ── vignette ───────────────────────────────────────────────────────────

  describe('vignette', () => {
    it('builds correct args with -vignette flag', async () => {
      const result = await client.callTool({
        name: 'vignette',
        arguments: { input: '/test/photo.jpg' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/photo.jpg');
      expect(args).toContain('-vignette');
      expect(args).toContain('-background');
      expect(args).toContain('black');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Vignette');
    });

    it('uses custom color when specified', async () => {
      await client.callTool({
        name: 'vignette',
        arguments: { input: '/test/photo.jpg', color: '#330033' },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('#330033');
    });
  });
});
