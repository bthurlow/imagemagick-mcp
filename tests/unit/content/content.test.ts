import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Content Tools', () => {
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

  // ── social-card ────────────────────────────────────────────────────────

  describe('social-card', () => {
    it('generates OG card with correct 1200x630 dimensions', async () => {
      const result = await client.callTool({
        name: 'social-card',
        arguments: {
          input: '/test/hero.jpg',
          output_dir: '/out/social',
          platforms: ['og'],
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/hero.jpg');
      expect(args).toContain('-resize');
      expect(args).toContain('1200x630^');
      expect(args).toContain('-gravity');
      expect(args).toContain('center');
      expect(args).toContain('-extent');
      expect(args).toContain('1200x630');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('social cards');
      expect(content[0].text).toContain('og');
    });

    it('adds title text overlay when title is provided', async () => {
      await client.callTool({
        name: 'social-card',
        arguments: {
          input: '/test/hero.jpg',
          output_dir: '/out/social',
          platforms: ['og'],
          title: 'My Post Title',
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-annotate');
      expect(args).toContain('My Post Title');
      expect(args).toContain('gradient:#00000080-transparent');
    });
  });

  // ── thumbnail ──────────────────────────────────────────────────────────

  describe('thumbnail', () => {
    it('builds correct args with gradient overlay', async () => {
      const result = await client.callTool({
        name: 'thumbnail',
        arguments: {
          input: '/test/frame.jpg',
          title: 'Video Title',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/frame.jpg');
      expect(args).toContain('-resize');
      expect(args).toContain('1280x720^');
      expect(args).toContain('-extent');
      expect(args).toContain('1280x720');
      // Gradient overlay
      expect(args.some((a: string) => a.includes('gradient:transparent-'))).toBe(true);
      expect(args).toContain('-compose');
      expect(args).toContain('Over');
      expect(args).toContain('-composite');
      // Title text
      expect(args).toContain('Video Title');
      expect(args).toContain('-annotate');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Thumbnail');
    });
  });

  // ── collage ────────────────────────────────────────────────────────────

  describe('collage', () => {
    it('uses montage as first arg', async () => {
      const result = await client.callTool({
        name: 'collage',
        arguments: {
          inputs: ['/test/a.jpg', '/test/b.jpg'],
          output: '/out/collage.jpg',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('montage');
      expect(args).toContain('/test/a.jpg');
      expect(args).toContain('/test/b.jpg');
      expect(args).toContain('-tile');
      expect(args).toContain('2x');
      expect(args).toContain('-geometry');
      expect(args).toContain('-background');
      expect(args[args.length - 1]).toBe('/out/collage.jpg');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Collage');
    });
  });

  // ── carousel-set ───────────────────────────────────────────────────────

  describe('carousel-set', () => {
    it('generates output for each input', async () => {
      const result = await client.callTool({
        name: 'carousel-set',
        arguments: {
          inputs: ['/test/slide1.jpg'],
          output_dir: '/out/carousel',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/slide1.jpg');
      expect(args).toContain('-resize');
      expect(args).toContain('1080x1080^');
      expect(args).toContain('-extent');
      expect(args).toContain('1080x1080');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Carousel');
      expect(content[0].text).toContain('1 slides');
    });

    it('adds slide numbers with circle style by default', async () => {
      await client.callTool({
        name: 'carousel-set',
        arguments: {
          inputs: ['/test/slide1.jpg', '/test/slide2.jpg'],
          output_dir: '/out/carousel',
        },
      });

      // 2 slides => 2 magick calls
      expect(mockState.calls.length).toBe(2);
      // Circle badge: draw circle command
      const args = mockState.calls[0].args;
      expect(args).toContain('-draw');
      expect(args.some((a: string) => a.includes('circle'))).toBe(true);
    });
  });

  // ── before-after ───────────────────────────────────────────────────────

  describe('before-after', () => {
    it('builds +append for side-by-side comparison', async () => {
      const result = await client.callTool({
        name: 'before-after',
        arguments: {
          before: '/test/before.jpg',
          after: '/test/after.jpg',
          output: '/out/comparison.jpg',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('+append');
      expect(args).toContain('/test/before.jpg');
      expect(args).toContain('/test/after.jpg');
      expect(args).toContain('Before');
      expect(args).toContain('After');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Before/after');
    });
  });

  // ── gif-from-frames ────────────────────────────────────────────────────

  describe('gif-from-frames', () => {
    it('builds correct -delay and -loop args', async () => {
      const result = await client.callTool({
        name: 'gif-from-frames',
        arguments: {
          inputs: ['/test/frame1.png', '/test/frame2.png'],
          output: '/out/animation.gif',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-delay');
      expect(args).toContain('50');
      expect(args).toContain('-loop');
      expect(args).toContain('0');
      expect(args).toContain('/test/frame1.png');
      expect(args).toContain('/test/frame2.png');
      expect(args[args.length - 1]).toBe('/out/animation.gif');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('GIF created');
    });

    it('includes -layers Optimize when optimize is true', async () => {
      await client.callTool({
        name: 'gif-from-frames',
        arguments: {
          inputs: ['/test/frame1.png', '/test/frame2.png'],
          output: '/out/animation.gif',
          optimize: true,
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-layers');
      expect(args).toContain('Optimize');
    });
  });

  // ── sticker-cutout ─────────────────────────────────────────────────────

  describe('sticker-cutout', () => {
    it('builds -morphology Dilate args for border', async () => {
      const result = await client.callTool({
        name: 'sticker-cutout',
        arguments: { input: '/test/sticker.png' },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/sticker.png');
      expect(args).toContain('-morphology');
      expect(args).toContain('Dilate');
      expect(args.some((a: string) => a.startsWith('Disk:'))).toBe(true);
      expect(args).toContain('-shadow');
      expect(args).toContain('-reverse');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Sticker cutout');
    });
  });

  // ── quote-card ─────────────────────────────────────────────────────────

  describe('quote-card', () => {
    it('builds caption: arg for quote text', async () => {
      const result = await client.callTool({
        name: 'quote-card',
        arguments: {
          output: '/out/quote.png',
          quote: 'The best things in life are free.',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args.some((a: string) => a.startsWith('caption:'))).toBe(true);
      expect(args.some((a: string) => a.includes('The best things in life are free.'))).toBe(true);
      // Default background color
      expect(args.some((a: string) => a.includes('xc:#1a1a2e'))).toBe(true);
      // Quotation mark
      expect(args).toContain('\u201C');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Quote card');
    });

    it('includes attribution when provided', async () => {
      await client.callTool({
        name: 'quote-card',
        arguments: {
          output: '/out/quote.png',
          quote: 'Test quote',
          attribution: '— John Doe',
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('— John Doe');
      // Accent line drawn
      expect(args).toContain('-stroke');
      expect(args.some((a: string) => a.startsWith('line '))).toBe(true);
    });
  });
});
