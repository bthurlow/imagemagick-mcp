import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(async () => [
      {
        name: 'photo.jpg',
        isFile: () => true,
        isDirectory: () => false,
        parentPath: '/test/input',
        path: '/test/input',
      },
      {
        name: 'banner.png',
        isFile: () => true,
        isDirectory: () => false,
        parentPath: '/test/input',
        path: '/test/input',
      },
      {
        name: 'readme.txt',
        isFile: () => true,
        isDirectory: () => false,
        parentPath: '/test/input',
        path: '/test/input',
      },
    ]),
    stat: vi.fn(async () => ({ size: 50000 })),
  };
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Asset Tools', () => {
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

  // ── responsive-set ─────────────────────────────────────────────────────

  describe('responsive-set', () => {
    it('generates magick call for each width', async () => {
      const result = await client.callTool({
        name: 'responsive-set',
        arguments: {
          input: '/test/hero.jpg',
          output_dir: '/out/responsive',
          widths: [400, 800, 1200],
        },
      });

      // 3 widths => 3 magick calls
      expect(mockState.calls.length).toBe(3);
      expect(mockState.calls[0].args).toContain('-resize');
      expect(mockState.calls[0].args).toContain('400x');
      expect(mockState.calls[0].args).toContain('-quality');
      expect(mockState.calls[0].args).toContain('-strip');

      expect(mockState.calls[1].args).toContain('800x');
      expect(mockState.calls[2].args).toContain('1200x');

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('3 responsive variants');
      expect(content[0].text).toContain('srcset=');
    });

    it('generates 2x variants when generate_2x is true', async () => {
      await client.callTool({
        name: 'responsive-set',
        arguments: {
          input: '/test/hero.jpg',
          output_dir: '/out/responsive',
          widths: [400],
          generate_2x: true,
        },
      });

      // 1 width + 1 @2x = 2 calls
      expect(mockState.calls.length).toBe(2);
      expect(mockState.calls[0].args).toContain('400x');
      expect(mockState.calls[1].args).toContain('800x');
    });
  });

  // ── favicon-set ────────────────────────────────────────────────────────

  describe('favicon-set', () => {
    it('generates magick call for each default size', async () => {
      const result = await client.callTool({
        name: 'favicon-set',
        arguments: {
          input: '/test/icon.png',
          output_dir: '/out/favicons',
        },
      });

      // Default sizes: 16, 32, 48, 180, 192, 512 = 6 calls + 1 for ICO = 7
      expect(mockState.calls.length).toBe(7);
      // Each size call should have -resize with forced dimensions
      expect(mockState.calls[0].args).toContain('-resize');
      expect(mockState.calls[0].args).toContain('16x16!');
      expect(mockState.calls[0].args).toContain('-strip');

      expect(mockState.calls[1].args).toContain('32x32!');
      expect(mockState.calls[2].args).toContain('48x48!');
      expect(mockState.calls[3].args).toContain('180x180!');
      expect(mockState.calls[4].args).toContain('192x192!');
      expect(mockState.calls[5].args).toContain('512x512!');

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('favicon files');
    });

    it('skips ICO generation when generate_ico is false', async () => {
      await client.callTool({
        name: 'favicon-set',
        arguments: {
          input: '/test/icon.png',
          output_dir: '/out/favicons',
          generate_ico: false,
        },
      });

      // 6 size calls only, no ICO bundle
      expect(mockState.calls.length).toBe(6);
    });
  });

  // ── app-icon-set ───────────────────────────────────────────────────────

  describe('app-icon-set', () => {
    it('generates iOS and Android icon calls', async () => {
      const result = await client.callTool({
        name: 'app-icon-set',
        arguments: {
          input: '/test/icon.png',
          output_dir: '/out/icons',
        },
      });

      // At least some calls for iOS + Android
      expect(mockState.calls.length).toBeGreaterThan(0);

      // Check for iOS: IOS_ICON_SIZES has [{size: 1024, scales: [1]}] in mock
      // => 1 iOS call (1024px)
      // Check for Android: ANDROID_ICON_SIZES has {mdpi: 48, xxxhdpi: 192} in mock
      // => 2 densities x 2 (normal + round) = 4 Android calls
      // Total: 1 + 4 = 5
      expect(mockState.calls.length).toBe(5);

      // iOS call
      expect(mockState.calls[0].args).toContain('-resize');
      expect(mockState.calls[0].args).toContain('1024x1024!');

      // Android calls should include round icon (circle mask)
      const roundCalls = mockState.calls.filter((c) =>
        c.args.some((a: string) => a.includes('circle')),
      );
      expect(roundCalls.length).toBeGreaterThan(0);

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('app icons');
    });

    it('generates only iOS icons when platform is ios only', async () => {
      await client.callTool({
        name: 'app-icon-set',
        arguments: {
          input: '/test/icon.png',
          output_dir: '/out/icons',
          platforms: ['ios'],
        },
      });

      // Mock has IOS_ICON_SIZES = [{size: 1024, scales: [1]}] => 1 call
      expect(mockState.calls.length).toBe(1);
      expect(mockState.calls[0].args).toContain('1024x1024!');
    });
  });

  // ── splash-screen ──────────────────────────────────────────────────────

  describe('splash-screen', () => {
    it('centers logo in contain mode', async () => {
      const result = await client.callTool({
        name: 'splash-screen',
        arguments: {
          input: '/test/logo.png',
          output_dir: '/out/splash',
          sizes: [{ name: 'test', width: 1080, height: 1920 }],
        },
      });

      expect(mockState.calls.length).toBe(1);
      const args = mockState.calls[0].args;
      // Contain mode: creates background + composites centered logo
      expect(args).toContain('-size');
      expect(args).toContain('1080x1920');
      expect(args.some((a: string) => a.startsWith('xc:'))).toBe(true);
      expect(args).toContain('-gravity');
      expect(args).toContain('Center');
      expect(args).toContain('-composite');
      // Logo resized to 30% of min dimension
      const logoSize = Math.floor(Math.min(1080, 1920) * 0.3);
      expect(args).toContain(`${logoSize}x${logoSize}`);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('splash screens');
    });

    it('uses cover mode when specified', async () => {
      await client.callTool({
        name: 'splash-screen',
        arguments: {
          input: '/test/splash-bg.jpg',
          output_dir: '/out/splash',
          mode: 'cover',
          sizes: [{ name: 'phone', width: 1080, height: 1920 }],
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-resize');
      expect(args).toContain('1080x1920^');
      expect(args).toContain('-extent');
      expect(args).toContain('1080x1920');
    });
  });

  // ── sprite-sheet ───────────────────────────────────────────────────────

  describe('sprite-sheet', () => {
    it('uses montage as first arg', async () => {
      const result = await client.callTool({
        name: 'sprite-sheet',
        arguments: {
          inputs: ['/test/icon1.png', '/test/icon2.png'],
          output: '/out/sprites.png',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('montage');
      expect(args).toContain('/test/icon1.png');
      expect(args).toContain('/test/icon2.png');
      expect(args).toContain('-geometry');
      expect(args).toContain('-tile');
      expect(args).toContain('-background');
      expect(args[args.length - 1]).toBe('/out/sprites.png');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Sprite sheet');
      expect(content[0].text).toContain('CSS offsets');
    });
  });

  // ── nine-patch ─────────────────────────────────────────────────────────

  describe('nine-patch', () => {
    it('calls identify then draws line markers', async () => {
      const result = await client.callTool({
        name: 'nine-patch',
        arguments: {
          input: '/test/button.png',
          stretch_x_start: 10,
          stretch_x_end: 90,
          stretch_y_start: 10,
          stretch_y_end: 40,
        },
      });

      // First call is identify, second is the 9-patch generation
      expect(mockState.calls.length).toBe(2);

      const identifyArgs = mockState.calls[0].args;
      expect(identifyArgs[0]).toBe('identify');
      expect(identifyArgs).toContain('-format');
      expect(identifyArgs).toContain('%wx%h');

      const drawArgs = mockState.calls[1].args;
      expect(drawArgs).toContain('-draw');
      // Should draw stretch markers as lines
      expect(drawArgs.some((a: string) => a.startsWith('line '))).toBe(true);
      expect(drawArgs).toContain('-fill');
      expect(drawArgs).toContain('black');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('9-patch');
    });

    it('draws content padding markers when padding is specified', async () => {
      await client.callTool({
        name: 'nine-patch',
        arguments: {
          input: '/test/button.png',
          stretch_x_start: 10,
          stretch_x_end: 90,
          stretch_y_start: 10,
          stretch_y_end: 40,
          padding_left: 5,
          padding_top: 5,
          padding_right: 5,
          padding_bottom: 5,
        },
      });

      const drawArgs = mockState.calls[1].args;
      // Should have 4 line draws: top stretch, left stretch, bottom padding, right padding
      const lineArgs = drawArgs.filter((a: string) => a.startsWith('line '));
      expect(lineArgs.length).toBe(4);
    });
  });

  // ── aspect-crop-set ────────────────────────────────────────────────────

  describe('aspect-crop-set', () => {
    it('generates crops for multiple aspect ratios', async () => {
      const result = await client.callTool({
        name: 'aspect-crop-set',
        arguments: {
          input: '/test/photo.jpg',
          output_dir: '/out/crops',
          ratios: ['1:1', '16:9'],
        },
      });

      // 2 ratios => 2 magick calls
      expect(mockState.calls.length).toBe(2);

      // 1:1 crop at max_dimension 2000 => 2000x2000
      expect(mockState.calls[0].args).toContain('-resize');
      expect(mockState.calls[0].args).toContain('2000x2000^');
      expect(mockState.calls[0].args).toContain('-extent');
      expect(mockState.calls[0].args).toContain('2000x2000');

      // 16:9 crop => 2000x1125
      expect(mockState.calls[1].args).toContain('-resize');
      expect(mockState.calls[1].args).toContain('2000x1125^');
      expect(mockState.calls[1].args).toContain('-extent');
      expect(mockState.calls[1].args).toContain('2000x1125');

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('2 aspect ratio crops');
    });
  });

  // ── pdf-to-image ───────────────────────────────────────────────────────

  describe('pdf-to-image', () => {
    it('builds correct -density arg', async () => {
      const result = await client.callTool({
        name: 'pdf-to-image',
        arguments: {
          input: '/test/document.pdf',
          output_dir: '/out/pages',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-density');
      expect(args).toContain('150');
      expect(args).toContain('-quality');
      expect(args.some((a: string) => a.includes('/test/document.pdf'))).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('PDF pages exported');
    });

    it('uses page range syntax', async () => {
      await client.callTool({
        name: 'pdf-to-image',
        arguments: {
          input: '/test/document.pdf',
          output_dir: '/out/pages',
          pages: '0-3',
        },
      });

      const args = mockState.calls[0].args;
      expect(args.some((a: string) => a.includes('[0-3]'))).toBe(true);
    });
  });

  // ── image-diff ─────────────────────────────────────────────────────────

  describe('image-diff', () => {
    it('builds -compare arg for highlight mode', async () => {
      const result = await client.callTool({
        name: 'image-diff',
        arguments: {
          image_a: '/test/v1.png',
          image_b: '/test/v2.png',
          output: '/out/diff.png',
        },
      });

      // highlight mode + metrics call = 2 calls
      expect(mockState.calls.length).toBe(2);
      const args = mockState.calls[0].args;
      expect(args).toContain('/test/v1.png');
      expect(args).toContain('/test/v2.png');
      expect(args).toContain('-compare');
      expect(args).toContain('-fuzz');
      expect(args).toContain('-highlight-color');
      expect(args).toContain('red');
      expect(args[args.length - 1]).toBe('/out/diff.png');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Image diff');
      expect(content[0].text).toContain('highlight');
    });

    it('uses side-by-side mode with +append', async () => {
      await client.callTool({
        name: 'image-diff',
        arguments: {
          image_a: '/test/v1.png',
          image_b: '/test/v2.png',
          output: '/out/diff.png',
          mode: 'side-by-side',
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('+append');
      expect(args).toContain('-compare');
    });
  });

  // ── optimize-batch ─────────────────────────────────────────────────────

  describe('optimize-batch', () => {
    it('processes image files and skips non-images', async () => {
      const result = await client.callTool({
        name: 'optimize-batch',
        arguments: {
          input_dir: '/test/input',
          output_dir: '/test/output',
        },
      });

      // Should process photo.jpg and banner.png but skip readme.txt
      expect(mockState.calls.length).toBe(2);

      const text = (result.content as { type: string; text: string }[])[0].text;
      expect(text).toContain('Optimized 2 images');
    });

    it('passes quality and strip flags', async () => {
      await client.callTool({
        name: 'optimize-batch',
        arguments: {
          input_dir: '/test/input',
          output_dir: '/test/output',
          quality: 60,
          strip_metadata: true,
        },
      });

      for (const call of mockState.calls) {
        expect(call.args).toContain('-quality');
        expect(call.args).toContain('60');
        expect(call.args).toContain('-strip');
      }
    });

    it('applies max_width resize constraint', async () => {
      await client.callTool({
        name: 'optimize-batch',
        arguments: {
          input_dir: '/test/input',
          output_dir: '/test/output',
          max_width: 1200,
        },
      });

      for (const call of mockState.calls) {
        expect(call.args).toContain('-resize');
        expect(call.args.some((a: string) => a.includes('1200x>'))).toBe(true);
      }
    });
  });
});
