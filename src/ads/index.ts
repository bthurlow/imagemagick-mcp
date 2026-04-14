import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  magick,
  magickBatch,
  validateInputFile,
  ensureOutputDir,
  resolveOutputPath,
  IAB_BANNER_SIZES,
} from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type BannerSetParams,
  type CtaButtonParams,
  type PriceBadgeParams,
  type ABVariantsParams,
  type TemplateFillParams,
  type QrCodeOverlayParams,
  type ProductMockupParams,
  type EmailHeaderParams,
  bannerSetSchema,
  ctaButtonSchema,
  priceBadgeSchema,
  abVariantsSchema,
  templateFillSchema,
  qrCodeOverlaySchema,
  productMockupSchema,
  emailHeaderSchema,
} from './types.js';
import { join } from 'node:path';

/**
 * Register ad creative tools with the MCP server.
 */
export function registerAdTools(server: McpServer): void {
  // ── banner-set ──────────────────────────────────────────────────────────
  registerTool<BannerSetParams>(
    server,
    'banner-set',
    'Generate all IAB standard ad banner sizes from one design (leaderboard, medium-rect, skyscraper, mobile, half-page, billboard)',
    bannerSetSchema.shape,
    async (params: BannerSetParams) => {
      const { input, output_dir, sizes, format } = params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const generated: string[] = [];

      for (const sizeName of sizes) {
        const size = IAB_BANNER_SIZES[sizeName];
        if (!size) continue;

        const outPath = join(
          output_dir,
          `banner_${sizeName}_${size.width}x${size.height}.${format}`,
        );
        await magick([
          input,
          '-resize',
          `${size.width}x${size.height}^`,
          '-gravity',
          'center',
          '-extent',
          `${size.width}x${size.height}`,
          outPath,
        ]);
        generated.push(`${sizeName} (${size.width}x${size.height}): ${outPath}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} banner sizes:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── cta-button ──────────────────────────────────────────────────────────
  registerTool<CtaButtonParams>(
    server,
    'cta-button',
    'Generate a call-to-action button image with rounded rectangle, gradient, shadow, and text',
    ctaButtonSchema.shape,
    async (params: CtaButtonParams) => {
      const {
        output,
        text,
        width,
        height,
        color,
        text_color,
        font,
        font_size,
        corner_radius,
        shadow,
        border_color,
        border_width,
      } = params;
      await ensureOutputDir(output);

      // Create button with rounded rectangle
      const totalWidth = width + (shadow ? 20 : 0);
      const totalHeight = height + (shadow ? 20 : 0);

      const args = ['-size', `${totalWidth}x${totalHeight}`, 'xc:none'];

      // Shadow layer
      if (shadow) {
        args.push(
          '-fill',
          '#00000030',
          '-draw',
          `roundrectangle 5,5,${width + 4},${height + 4},${corner_radius},${corner_radius}`,
        );
      }

      // Button body
      args.push(
        '-fill',
        color,
        '-draw',
        `roundrectangle 0,0,${width - 1},${height - 1},${corner_radius},${corner_radius}`,
      );

      // Border
      if (border_color && border_width > 0) {
        args.push(
          '-fill',
          'none',
          '-stroke',
          border_color,
          '-strokewidth',
          String(border_width),
          '-draw',
          `roundrectangle 0,0,${width - 1},${height - 1},${corner_radius},${corner_radius}`,
        );
      }

      // Text
      args.push(
        '-fill',
        text_color,
        '-stroke',
        'none',
        '-font',
        font,
        '-pointsize',
        String(font_size),
        '-gravity',
        'NorthWest',
        '-annotate',
        `+${Math.floor(width / 2 - font_size * text.length * 0.3)}+${Math.floor(height / 2 - font_size * 0.4)}`,
        text,
      );

      args.push(output);
      await magick(args);
      return { content: [{ type: 'text', text: `CTA button created: ${output}` }] };
    },
  );

  // ── price-badge ─────────────────────────────────────────────────────────
  registerTool<PriceBadgeParams>(
    server,
    'price-badge',
    'Generate price tags, sale badges, or percentage-off circles for marketing materials',
    priceBadgeSchema.shape,
    async (params: PriceBadgeParams) => {
      const { output, text, shape, size, background_color, text_color, font, border_color } =
        params;
      await ensureOutputDir(output);

      const fontSize = Math.floor(size / (text.length > 6 ? 5 : 4));
      const args = ['-size', `${size}x${size}`, 'xc:none'];

      switch (shape) {
        case 'circle':
          args.push(
            '-fill',
            background_color,
            '-draw',
            `circle ${size / 2},${size / 2} ${size / 2},2`,
          );
          if (border_color) {
            args.push(
              '-fill',
              'none',
              '-stroke',
              border_color,
              '-strokewidth',
              '3',
              '-draw',
              `circle ${size / 2},${size / 2} ${size / 2},5`,
            );
          }
          break;
        case 'star': {
          // 5-pointed star using polygon
          const cx = size / 2;
          const cy = size / 2;
          const outer = size * 0.45;
          const inner = size * 0.2;
          const points: string[] = [];
          for (let i = 0; i < 5; i++) {
            const outerAngle = (i * 72 - 90) * (Math.PI / 180);
            const innerAngle = (i * 72 + 36 - 90) * (Math.PI / 180);
            points.push(
              `${cx + outer * Math.cos(outerAngle)},${cy + outer * Math.sin(outerAngle)}`,
            );
            points.push(
              `${cx + inner * Math.cos(innerAngle)},${cy + inner * Math.sin(innerAngle)}`,
            );
          }
          args.push('-fill', background_color, '-draw', `polygon ${points.join(' ')}`);
          break;
        }
        case 'rectangle':
          args.push(
            '-fill',
            background_color,
            '-draw',
            `roundrectangle 5,${size * 0.2},${size - 5},${size * 0.8},8,8`,
          );
          break;
        case 'ribbon':
          // Ribbon/banner shape
          args.push(
            '-fill',
            background_color,
            '-draw',
            `polygon ${size * 0.05},${size * 0.25} ${size * 0.95},${size * 0.25} ${size * 0.85},${size * 0.5} ${size * 0.95},${size * 0.75} ${size * 0.05},${size * 0.75} ${size * 0.15},${size * 0.5}`,
          );
          break;
      }

      // Text
      args.push(
        '-fill',
        text_color,
        '-stroke',
        'none',
        '-font',
        font,
        '-pointsize',
        String(fontSize),
        '-gravity',
        'Center',
        '-annotate',
        '+0+0',
        text,
      );

      args.push(output);
      await magick(args);
      return { content: [{ type: 'text', text: `Price badge (${shape}): ${output}` }] };
    },
  );

  // ── a-b-variants ────────────────────────────────────────────────────────
  registerTool<ABVariantsParams>(
    server,
    'a-b-variants',
    'Generate color, copy, or style variations of an image for A/B split testing',
    abVariantsSchema.shape,
    async (params: ABVariantsParams) => {
      const { input, output_dir, variants } = params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const generated: string[] = [];

      for (const variant of variants) {
        const ext = input.split('.').pop() ?? 'png';
        const outPath = join(output_dir, `variant_${variant.name}.${ext}`);

        const args = [input];

        if (variant.brightness !== undefined || variant.contrast !== undefined) {
          args.push('-brightness-contrast', `${variant.brightness ?? 0}x${variant.contrast ?? 0}`);
        }
        if (variant.saturation !== undefined) {
          args.push('-modulate', `100,${variant.saturation},100`);
        }
        if (variant.tint_color) {
          args.push('-fill', variant.tint_color, '-tint', '30');
        }
        if (variant.text_overlay) {
          const gravity =
            variant.text_position === 'top'
              ? 'North'
              : variant.text_position === 'center'
                ? 'Center'
                : 'South';
          args.push(
            '-fill',
            variant.text_color ?? 'white',
            '-pointsize',
            '36',
            '-gravity',
            gravity,
            '-annotate',
            '+0+20',
            variant.text_overlay,
          );
        }

        args.push(outPath);
        await magick(args);
        generated.push(`${variant.name}: ${outPath}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} A/B variants:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── template-fill ───────────────────────────────────────────────────────
  registerTool<TemplateFillParams>(
    server,
    'template-fill',
    'Fill a reusable template with dynamic text and images — generate campaign creatives from templates',
    templateFillSchema.shape,
    async (params: TemplateFillParams) => {
      const { template, output, fills } = params;
      await validateInputFile(template);
      await ensureOutputDir(output);

      const args = [template];

      for (const fill of fills) {
        if (fill.type === 'text') {
          if (fill.width && fill.height) {
            // Auto-sized text within bounding box
            args.push(
              '(',
              '-size',
              `${fill.width}x${fill.height}`,
              '-background',
              'none',
              '-fill',
              fill.color ?? 'white',
              '-font',
              fill.font ?? 'Arial',
              '-pointsize',
              String(fill.font_size ?? 24),
              '-gravity',
              fill.gravity ?? 'Center',
              `caption:${fill.content}`,
              ')',
              '-gravity',
              'NorthWest',
              '-geometry',
              `+${fill.x}+${fill.y}`,
              '-composite',
            );
          } else {
            args.push(
              '-fill',
              fill.color ?? 'white',
              '-font',
              fill.font ?? 'Arial',
              '-pointsize',
              String(fill.font_size ?? 24),
              '-gravity',
              'NorthWest',
              '-annotate',
              `+${fill.x}+${fill.y}`,
              fill.content,
            );
          }
        } else {
          // Image fill
          await validateInputFile(fill.content);
          const resizeArgs =
            fill.width && fill.height
              ? [
                  '-resize',
                  `${fill.width}x${fill.height}^`,
                  '-gravity',
                  'center',
                  '-extent',
                  `${fill.width}x${fill.height}`,
                ]
              : fill.width
                ? ['-resize', `${fill.width}x`]
                : [];

          args.push(
            '(',
            fill.content,
            ...resizeArgs,
            ')',
            '-gravity',
            'NorthWest',
            '-geometry',
            `+${fill.x}+${fill.y}`,
            '-composite',
          );
        }
      }

      args.push(output);
      await magickBatch(args);
      return {
        content: [{ type: 'text', text: `Template filled (${fills.length} elements): ${output}` }],
      };
    },
  );

  // ── qr-code-overlay ─────────────────────────────────────────────────────
  registerTool<QrCodeOverlayParams>(
    server,
    'qr-code-overlay',
    'Composite a QR code image onto marketing materials at a specified position and size',
    qrCodeOverlaySchema.shape,
    async (params: QrCodeOverlayParams) => {
      const { input, qr_image, output, size, gravity, x, y, background, padding, format } = params;
      await validateInputFile(input);
      await validateInputFile(qr_image);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_qr', format });
      await ensureOutputDir(outPath);

      const totalSize = size + padding * 2;

      const args = [
        input,
        '(',
        '-size',
        `${totalSize}x${totalSize}`,
        `xc:${background}`,
        '(',
        qr_image,
        '-resize',
        `${size}x${size}`,
        ')',
        '-gravity',
        'Center',
        '-composite',
        ')',
        '-gravity',
        gravity,
        '-geometry',
        `+${x}+${y}`,
        '-composite',
        outPath,
      ];

      await magick(args);
      return { content: [{ type: 'text', text: `QR code overlaid (${size}px): ${outPath}` }] };
    },
  );

  // ── product-mockup ──────────────────────────────────────────────────────
  registerTool<ProductMockupParams>(
    server,
    'product-mockup',
    'Place a screenshot onto a device frame (phone, laptop, tablet) for marketing and app store images',
    productMockupSchema.shape,
    async (params: ProductMockupParams) => {
      const {
        screenshot,
        frame,
        output,
        screen_x,
        screen_y,
        screen_width,
        screen_height,
        background,
      } = params;
      await validateInputFile(screenshot);
      await validateInputFile(frame);
      await ensureOutputDir(output);

      // Get frame dimensions
      const info = await magick(['identify', '-format', '%wx%h', frame]);
      const [frameW, frameH] = info.trim().split('x').map(Number);

      const args = [
        // Background
        '-size',
        `${frameW}x${frameH}`,
        `xc:${background}`,
        // Resize screenshot to fit screen area and place it
        '(',
        screenshot,
        '-resize',
        `${screen_width}x${screen_height}!`,
        ')',
        '-gravity',
        'NorthWest',
        '-geometry',
        `+${screen_x}+${screen_y}`,
        '-composite',
        // Overlay the device frame on top
        frame,
        '-gravity',
        'NorthWest',
        '-composite',
        output,
      ];

      await magick(args);
      return { content: [{ type: 'text', text: `Product mockup created: ${output}` }] };
    },
  );

  // ── email-header ────────────────────────────────────────────────────────
  registerTool<EmailHeaderParams>(
    server,
    'email-header',
    'Generate email-safe header images at standard email width (600px) with fallback-friendly formats',
    emailHeaderSchema.shape,
    async (params: EmailHeaderParams) => {
      const {
        input,
        output,
        width,
        height,
        title,
        subtitle,
        background_color,
        text_color,
        font,
        format: _format,
      } = params;
      void _format; // Format is encoded in the output path
      await ensureOutputDir(output);

      const args: string[] = [];

      if (input) {
        await validateInputFile(input);
        args.push(
          input,
          '-resize',
          `${width}x${height}^`,
          '-gravity',
          'center',
          '-extent',
          `${width}x${height}`,
        );
      } else {
        args.push('-size', `${width}x${height}`, `xc:${background_color}`);
      }

      if (title) {
        const titleSize = Math.floor(height * 0.2);
        args.push(
          '-fill',
          text_color,
          '-font',
          font,
          '-pointsize',
          String(titleSize),
          '-gravity',
          'Center',
          '-annotate',
          '+0-10',
          title,
        );
      }

      if (subtitle) {
        const subSize = Math.floor(height * 0.1);
        args.push(
          '-pointsize',
          String(subSize),
          '-annotate',
          `+0+${Math.floor(height * 0.15)}`,
          subtitle,
        );
      }

      args.push(output);
      await magick(args);
      return { content: [{ type: 'text', text: `Email header (${width}x${height}): ${output}` }] };
    },
  );
}
