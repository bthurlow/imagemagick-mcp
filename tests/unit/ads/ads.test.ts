import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../../src/utils/exec.js', async () => {
  const { createExecMock } = await import('../../helpers/mock-exec.js');
  return createExecMock();
});

import { mockState, resetMock, setIdentifyOutput, mockMagick } from '../../helpers/mock-exec.js';
import { createTestServerClient } from '../../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Ad Tools', () => {
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

  // ── banner-set ─────────────────────────────────────────────────────────

  describe('banner-set', () => {
    it('generates multiple magick calls for different banner sizes', async () => {
      const result = await client.callTool({
        name: 'banner-set',
        arguments: {
          input: '/test/design.jpg',
          output_dir: '/out/banners',
        },
      });

      // Default sizes: leaderboard, medium-rect, wide-skyscraper, mobile-banner, half-page, billboard
      // The mock only has 6 sizes defined so at least some calls should be made
      expect(mockState.calls.length).toBeGreaterThan(0);

      // Each call should have resize + extent
      for (const call of mockState.calls) {
        expect(call.args[0]).toBe('/test/design.jpg');
        expect(call.args).toContain('-resize');
        expect(call.args).toContain('-gravity');
        expect(call.args).toContain('center');
        expect(call.args).toContain('-extent');
      }

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('banner sizes');
    });

    it('generates only requested sizes', async () => {
      await client.callTool({
        name: 'banner-set',
        arguments: {
          input: '/test/design.jpg',
          output_dir: '/out/banners',
          sizes: ['leaderboard', 'medium-rect'],
        },
      });

      // leaderboard: 728x90, medium-rect: 300x250
      expect(mockState.calls.length).toBe(2);
      expect(mockState.calls[0].args).toContain('728x90^');
      expect(mockState.calls[0].args).toContain('728x90');
      expect(mockState.calls[1].args).toContain('300x250^');
      expect(mockState.calls[1].args).toContain('300x250');
    });
  });

  // ── cta-button ─────────────────────────────────────────────────────────

  describe('cta-button', () => {
    it('builds roundrectangle draw command', async () => {
      const result = await client.callTool({
        name: 'cta-button',
        arguments: {
          output: '/out/button.png',
          text: 'Buy Now',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-draw');
      expect(args.some((a: string) => a.includes('roundrectangle'))).toBe(true);
      expect(args).toContain('Buy Now');
      expect(args).toContain('-fill');
      expect(args).toContain('-font');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('CTA button');
    });

    it('includes shadow when shadow is true (default)', async () => {
      await client.callTool({
        name: 'cta-button',
        arguments: {
          output: '/out/button.png',
          text: 'Click Me',
        },
      });

      const args = mockState.calls[0].args;
      // Shadow layer draws a roundrectangle with shadow color
      expect(args).toContain('#00000030');
    });
  });

  // ── price-badge ────────────────────────────────────────────────────────

  describe('price-badge', () => {
    it('builds circle draw for default shape', async () => {
      const result = await client.callTool({
        name: 'price-badge',
        arguments: {
          output: '/out/badge.png',
          text: '$9.99',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args).toContain('-draw');
      expect(args.some((a: string) => a.includes('circle'))).toBe(true);
      expect(args).toContain('$9.99');
      expect(args).toContain('-gravity');
      expect(args).toContain('Center');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Price badge');
      expect(content[0].text).toContain('circle');
    });

    it('builds star polygon for star shape', async () => {
      await client.callTool({
        name: 'price-badge',
        arguments: {
          output: '/out/badge.png',
          text: '50% OFF',
          shape: 'star',
        },
      });

      const args = mockState.calls[0].args;
      expect(args.some((a: string) => a.includes('polygon'))).toBe(true);
    });
  });

  // ── a-b-variants ───────────────────────────────────────────────────────

  describe('a-b-variants', () => {
    it('generates one magick call per variant', async () => {
      const result = await client.callTool({
        name: 'a-b-variants',
        arguments: {
          input: '/test/base.jpg',
          output_dir: '/out/variants',
          variants: [
            { name: 'warm', brightness: 10 },
            { name: 'cool', brightness: -10 },
          ],
        },
      });

      expect(mockState.calls.length).toBe(2);
      // First variant: brightness 10
      expect(mockState.calls[0].args).toContain('-brightness-contrast');
      expect(mockState.calls[0].args).toContain('10x0');
      // Second variant: brightness -10
      expect(mockState.calls[1].args).toContain('-brightness-contrast');
      expect(mockState.calls[1].args).toContain('-10x0');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('2 A/B variants');
    });

    it('adds text overlay when specified in variant', async () => {
      await client.callTool({
        name: 'a-b-variants',
        arguments: {
          input: '/test/base.jpg',
          output_dir: '/out/variants',
          variants: [{ name: 'text-a', text_overlay: 'Free Shipping!', text_position: 'top' }],
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('Free Shipping!');
      expect(args).toContain('-gravity');
      expect(args).toContain('North');
      expect(args).toContain('-annotate');
    });
  });

  // ── template-fill ──────────────────────────────────────────────────────

  describe('template-fill', () => {
    it('builds -composite for text fill', async () => {
      const result = await client.callTool({
        name: 'template-fill',
        arguments: {
          template: '/test/template.png',
          output: '/out/filled.png',
          fills: [
            {
              type: 'text',
              content: 'Hello World',
              x: 100,
              y: 50,
              width: 400,
              height: 100,
            },
          ],
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/template.png');
      expect(args).toContain('-composite');
      expect(args.some((a: string) => a.startsWith('caption:Hello World'))).toBe(true);
      expect(args).toContain('+100+50');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Template filled');
    });

    it('uses -annotate for text fill without dimensions', async () => {
      await client.callTool({
        name: 'template-fill',
        arguments: {
          template: '/test/template.png',
          output: '/out/filled.png',
          fills: [
            {
              type: 'text',
              content: 'Simple Text',
              x: 50,
              y: 30,
            },
          ],
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('-annotate');
      expect(args).toContain('+50+30');
      expect(args).toContain('Simple Text');
    });
  });

  // ── qr-code-overlay ────────────────────────────────────────────────────

  describe('qr-code-overlay', () => {
    it('resizes QR image and composites it', async () => {
      const result = await client.callTool({
        name: 'qr-code-overlay',
        arguments: {
          input: '/test/flyer.jpg',
          qr_image: '/test/qr.png',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/flyer.jpg');
      expect(args).toContain('/test/qr.png');
      expect(args).toContain('-resize');
      expect(args).toContain('150x150');
      expect(args).toContain('-composite');
      expect(args).toContain('-gravity');
      expect(args).toContain('SouthEast');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('QR code overlaid');
    });
  });

  // ── product-mockup ─────────────────────────────────────────────────────

  describe('product-mockup', () => {
    it('calls identify for frame dimensions then composites', async () => {
      const result = await client.callTool({
        name: 'product-mockup',
        arguments: {
          screenshot: '/test/screenshot.png',
          frame: '/test/iphone-frame.png',
          output: '/out/mockup.png',
          screen_x: 100,
          screen_y: 200,
          screen_width: 375,
          screen_height: 812,
        },
      });

      // First call is identify for frame dimensions, second is the composite
      expect(mockState.calls.length).toBe(2);
      const identifyArgs = mockState.calls[0].args;
      expect(identifyArgs[0]).toBe('identify');
      expect(identifyArgs).toContain('-format');
      expect(identifyArgs).toContain('%wx%h');

      const compositeArgs = mockState.calls[1].args;
      expect(compositeArgs).toContain('/test/screenshot.png');
      expect(compositeArgs).toContain('-resize');
      expect(compositeArgs).toContain('375x812!');
      expect(compositeArgs).toContain('-composite');
      expect(compositeArgs).toContain('/test/iphone-frame.png');
      expect(compositeArgs).toContain('+100+200');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Product mockup');
    });
  });

  // ── email-header ───────────────────────────────────────────────────────

  describe('email-header', () => {
    it('builds correct default 600x200 size args', async () => {
      const result = await client.callTool({
        name: 'email-header',
        arguments: {
          output: '/out/email-header.png',
        },
      });

      expect(mockState.calls.length).toBeGreaterThan(0);
      const args = mockState.calls[0].args;
      // No input => solid color background
      expect(args).toContain('-size');
      expect(args).toContain('600x200');
      expect(args.some((a: string) => a.startsWith('xc:'))).toBe(true);
      expect(args[args.length - 1]).toBe('/out/email-header.png');
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain('Email header');
      expect(content[0].text).toContain('600x200');
    });

    it('resizes input image when provided', async () => {
      await client.callTool({
        name: 'email-header',
        arguments: {
          input: '/test/banner.jpg',
          output: '/out/email-header.png',
        },
      });

      const args = mockState.calls[0].args;
      expect(args[0]).toBe('/test/banner.jpg');
      expect(args).toContain('-resize');
      expect(args).toContain('600x200^');
      expect(args).toContain('-extent');
      expect(args).toContain('600x200');
    });

    it('adds title text when specified', async () => {
      await client.callTool({
        name: 'email-header',
        arguments: {
          output: '/out/email-header.png',
          title: 'Weekly Newsletter',
        },
      });

      const args = mockState.calls[0].args;
      expect(args).toContain('Weekly Newsletter');
      expect(args).toContain('-annotate');
    });
  });
});
