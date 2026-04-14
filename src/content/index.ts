import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  magick,
  magickBatch,
  validateInputFile,
  ensureOutputDir,
  resolveOutputPath,
  SOCIAL_SIZES,
} from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type SocialCardParams,
  type ThumbnailParams,
  type CollageParams,
  type CarouselSetParams,
  type BeforeAfterParams,
  type GifFromFramesParams,
  type StickerCutoutParams,
  type QuoteCardParams,
  socialCardSchema,
  thumbnailSchema,
  collageSchema,
  carouselSetSchema,
  beforeAfterSchema,
  gifFromFramesSchema,
  stickerCutoutSchema,
  quoteCardSchema,
} from './types.js';
import { join } from 'node:path';

/**
 * Register content creative tools with the MCP server.
 */
export function registerContentTools(server: McpServer): void {
  // ── social-card ─────────────────────────────────────────────────────────
  registerTool<SocialCardParams>(
    server,
    'social-card',
    'Generate platform-sized social media cards (OG, Twitter, Instagram, Pinterest, LinkedIn, YouTube, Facebook Cover)',
    socialCardSchema.shape,
    async (params: SocialCardParams) => {
      const { input, output_dir, title, subtitle, platforms, font, text_color, overlay_color } =
        params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const generated: string[] = [];

      for (const platform of platforms) {
        const size = SOCIAL_SIZES[platform];
        if (!size) continue;

        const outPath = join(output_dir, `social_${platform}.png`);
        const args = [
          input,
          '-resize',
          `${size.width}x${size.height}^`,
          '-gravity',
          'center',
          '-extent',
          `${size.width}x${size.height}`,
        ];

        // Add gradient overlay for text readability
        if (title) {
          args.push(
            '(',
            '-size',
            `${size.width}x${size.height}`,
            `gradient:${overlay_color}-transparent`,
            '-rotate',
            '180',
            ')',
            '-compose',
            'Over',
            '-composite',
          );

          // Add title
          const titleSize = Math.floor(size.width / 18);
          args.push(
            '-gravity',
            'SouthWest',
            '-font',
            font,
            '-pointsize',
            String(titleSize),
            '-fill',
            text_color,
            '-annotate',
            `+${Math.floor(size.width * 0.05)}+${Math.floor(size.height * 0.12)}`,
            title,
          );

          // Add subtitle
          if (subtitle) {
            const subSize = Math.floor(titleSize * 0.6);
            args.push(
              '-pointsize',
              String(subSize),
              '-annotate',
              `+${Math.floor(size.width * 0.05)}+${Math.floor(size.height * 0.05)}`,
              subtitle,
            );
          }
        }

        args.push(outPath);
        await magick(args);
        generated.push(`${platform} (${size.width}x${size.height}): ${outPath}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} social cards:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── thumbnail ───────────────────────────────────────────────────────────
  registerTool<ThumbnailParams>(
    server,
    'thumbnail',
    'Generate a video thumbnail with title text, gradient overlay, and branding',
    thumbnailSchema.shape,
    async (params: ThumbnailParams) => {
      const {
        input,
        output,
        title,
        subtitle,
        width,
        height,
        font,
        text_color,
        overlay_color,
        logo,
        format,
      } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_thumb',
        format: format ?? 'png',
      });
      await ensureOutputDir(outPath);

      const args = [
        input,
        '-resize',
        `${width}x${height}^`,
        '-gravity',
        'center',
        '-extent',
        `${width}x${height}`,
        // Gradient overlay
        '(',
        '-size',
        `${width}x${height}`,
        `gradient:transparent-${overlay_color}`,
        ')',
        '-compose',
        'Over',
        '-composite',
        // Title text
        '-gravity',
        'SouthWest',
        '-font',
        font,
        '-pointsize',
        String(Math.floor(width / 16)),
        '-fill',
        text_color,
        '-annotate',
        `+${Math.floor(width * 0.05)}+${Math.floor(height * 0.15)}`,
        title,
      ];

      if (subtitle) {
        args.push(
          '-pointsize',
          String(Math.floor(width / 28)),
          '-annotate',
          `+${Math.floor(width * 0.05)}+${Math.floor(height * 0.06)}`,
          subtitle,
        );
      }

      if (logo) {
        await validateInputFile(logo);
        const logoSize = Math.floor(height * 0.12);
        args.push(
          '(',
          logo,
          '-resize',
          `${logoSize}x${logoSize}`,
          ')',
          '-gravity',
          'NorthEast',
          '-geometry',
          `+${Math.floor(width * 0.03)}+${Math.floor(height * 0.03)}`,
          '-composite',
        );
      }

      args.push(outPath);
      await magick(args);
      return { content: [{ type: 'text', text: `Thumbnail (${width}x${height}): ${outPath}` }] };
    },
  );

  // ── collage ─────────────────────────────────────────────────────────────
  registerTool<CollageParams>(
    server,
    'collage',
    'Combine multiple images into a grid layout — recipe steps, before/after, feature showcases',
    collageSchema.shape,
    async (params: CollageParams) => {
      const { inputs, output, columns, tile_width, tile_height, gap, background } = params;
      for (const img of inputs) {
        await validateInputFile(img);
      }
      await ensureOutputDir(output);

      const args = ['montage'];
      args.push(...inputs);
      args.push(
        '-tile',
        `${columns}x`,
        '-geometry',
        `${tile_width}x${tile_height}+${gap}+${gap}`,
        '-background',
        background,
        '-gravity',
        'center',
        output,
      );

      await magickBatch(args);
      return {
        content: [
          { type: 'text', text: `Collage (${inputs.length} images, ${columns} cols): ${output}` },
        ],
      };
    },
  );

  // ── carousel-set ────────────────────────────────────────────────────────
  registerTool<CarouselSetParams>(
    server,
    'carousel-set',
    'Generate numbered carousel slides with consistent branding — Instagram, Facebook ad carousels',
    carouselSetSchema.shape,
    async (params: CarouselSetParams) => {
      const { inputs, output_dir, width, height, show_numbers, number_style, brand_color, font } =
        params;
      await ensureOutputDir(join(output_dir, 'placeholder'));
      const generated: string[] = [];

      for (let i = 0; i < inputs.length; i++) {
        await validateInputFile(inputs[i]);
        const outPath = join(output_dir, `carousel_${String(i + 1).padStart(2, '0')}.png`);

        const args = [
          inputs[i],
          '-resize',
          `${width}x${height}^`,
          '-gravity',
          'center',
          '-extent',
          `${width}x${height}`,
        ];

        if (show_numbers) {
          const numSize = Math.floor(width * 0.04);
          if (number_style === 'circle') {
            // Draw a circle badge with the number
            const cx = Math.floor(width * 0.06);
            const cy = Math.floor(height * 0.06);
            const r = Math.floor(numSize * 1.2);
            args.push(
              '-fill',
              brand_color,
              '-draw',
              `circle ${cx},${cy} ${cx + r},${cy}`,
              '-fill',
              'white',
              '-font',
              font,
              '-pointsize',
              String(numSize),
              '-gravity',
              'NorthWest',
              '-annotate',
              `+${cx - Math.floor(numSize * 0.35)}+${cy - Math.floor(numSize * 0.45)}`,
              String(i + 1),
            );
          } else {
            args.push(
              '-fill',
              brand_color,
              '-font',
              font,
              '-pointsize',
              String(numSize * 2),
              '-gravity',
              'NorthWest',
              '-annotate',
              '+20+10',
              String(i + 1),
            );
          }
        }

        // Progress bar at bottom
        const barHeight = Math.floor(height * 0.005);
        const barWidth = Math.floor(((i + 1) / inputs.length) * width);
        args.push(
          '-fill',
          brand_color,
          '-draw',
          `rectangle 0,${height - barHeight},${barWidth},${height}`,
        );

        args.push(outPath);
        await magick(args);
        generated.push(outPath);
      }

      return {
        content: [
          { type: 'text', text: `Carousel (${generated.length} slides): ${generated.join('\n')}` },
        ],
      };
    },
  );

  // ── before-after ────────────────────────────────────────────────────────
  registerTool<BeforeAfterParams>(
    server,
    'before-after',
    'Create a side-by-side comparison image with a divider line and labels',
    beforeAfterSchema.shape,
    async (params: BeforeAfterParams) => {
      const {
        before,
        after,
        output,
        width,
        height,
        divider_width,
        divider_color,
        label_before,
        label_after,
        font,
      } = params;
      await validateInputFile(before);
      await validateInputFile(after);
      await ensureOutputDir(output);

      const halfWidth = Math.floor((width - divider_width) / 2);
      const labelSize = Math.floor(height * 0.04);
      const labelPad = Math.floor(height * 0.03);

      const args = [
        '(',
        before,
        '-resize',
        `${halfWidth}x${height}^`,
        '-gravity',
        'center',
        '-extent',
        `${halfWidth}x${height}`,
        '-fill',
        '#00000060',
        '-draw',
        `rectangle 0,${height - labelSize * 3},${halfWidth},${height}`,
        '-fill',
        'white',
        '-font',
        font,
        '-pointsize',
        String(labelSize),
        '-gravity',
        'South',
        '-annotate',
        `+0+${labelPad}`,
        label_before,
        ')',
        '(',
        after,
        '-resize',
        `${halfWidth}x${height}^`,
        '-gravity',
        'center',
        '-extent',
        `${halfWidth}x${height}`,
        '-fill',
        '#00000060',
        '-draw',
        `rectangle 0,${height - labelSize * 3},${halfWidth},${height}`,
        '-fill',
        'white',
        '-font',
        font,
        '-pointsize',
        String(labelSize),
        '-gravity',
        'South',
        '-annotate',
        `+0+${labelPad}`,
        label_after,
        ')',
        '+append',
      ];

      if (divider_width > 0) {
        // Add divider by splicing a colored column
        args.push(
          '-gravity',
          'center',
          '-background',
          divider_color,
          '-splice',
          `${divider_width}x0+${halfWidth}+0`,
        );
      }

      args.push(output);
      await magick(args);
      return { content: [{ type: 'text', text: `Before/after comparison: ${output}` }] };
    },
  );

  // ── gif-from-frames ─────────────────────────────────────────────────────
  registerTool<GifFromFramesParams>(
    server,
    'gif-from-frames',
    'Create an animated GIF from a sequence of images — recipe process animations, tutorials',
    gifFromFramesSchema.shape,
    async (params: GifFromFramesParams) => {
      const { inputs, output, delay, loop, width, height, optimize } = params;
      for (const img of inputs) {
        await validateInputFile(img);
      }
      await ensureOutputDir(output);

      const args = ['-delay', String(delay), '-loop', String(loop)];

      for (const img of inputs) {
        args.push(img);
      }

      if (width || height) {
        const geometry =
          width && height ? `${width}x${height}` : width ? `${width}x` : `x${height}`;
        args.push('-resize', geometry);
      }

      if (optimize) {
        args.push('-layers', 'Optimize');
      }

      args.push(output);
      await magickBatch(args);
      return {
        content: [
          {
            type: 'text',
            text: `GIF created (${inputs.length} frames, ${delay}cs delay): ${output}`,
          },
        ],
      };
    },
  );

  // ── sticker-cutout ──────────────────────────────────────────────────────
  registerTool<StickerCutoutParams>(
    server,
    'sticker-cutout',
    'Create a die-cut sticker effect with white border and shadow — perfect for Stories and Reels',
    stickerCutoutSchema.shape,
    async (params: StickerCutoutParams) => {
      const { input, output, border_width, shadow_offset, shadow_blur, shadow_color, format } =
        params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_sticker',
        format: format ?? 'png',
      });
      await ensureOutputDir(outPath);

      const args = [
        input,
        // Add white border/outline effect
        '(',
        '+clone',
        '-alpha',
        'extract',
        '-morphology',
        'Dilate',
        `Disk:${border_width}`,
        '-background',
        'white',
        '-alpha',
        'shape',
        ')',
        // Add shadow
        '(',
        '+clone',
        '-background',
        shadow_color,
        '-shadow',
        `100x${shadow_blur}+${shadow_offset}+${shadow_offset}`,
        ')',
        // Stack: shadow, white border, original
        '-reverse',
        '-background',
        'none',
        '-layers',
        'merge',
        '+repage',
        outPath,
      ];

      await magick(args);
      return { content: [{ type: 'text', text: `Sticker cutout created: ${outPath}` }] };
    },
  );

  // ── quote-card ──────────────────────────────────────────────────────────
  registerTool<QuoteCardParams>(
    server,
    'quote-card',
    'Create a stylized quote image with attribution — testimonials, pull quotes, social sharing',
    quoteCardSchema.shape,
    async (params: QuoteCardParams) => {
      const {
        output,
        quote,
        attribution,
        width,
        height,
        background_color,
        text_color,
        accent_color,
        font,
        background_image,
      } = params;
      await ensureOutputDir(output);

      const quoteSize = Math.floor(width / 22);
      const attrSize = Math.floor(quoteSize * 0.55);
      const margin = Math.floor(width * 0.1);
      const textWidth = width - margin * 2;

      let args: string[];

      if (background_image) {
        await validateInputFile(background_image);
        args = [
          background_image,
          '-resize',
          `${width}x${height}^`,
          '-gravity',
          'center',
          '-extent',
          `${width}x${height}`,
          // Dark overlay for readability
          '(',
          '-size',
          `${width}x${height}`,
          `xc:${background_color}AA`,
          ')',
          '-compose',
          'Over',
          '-composite',
        ];
      } else {
        args = ['-size', `${width}x${height}`, `xc:${background_color}`];
      }

      // Large quotation mark
      args.push(
        '-fill',
        accent_color,
        '-font',
        font,
        '-pointsize',
        String(quoteSize * 4),
        '-gravity',
        'NorthWest',
        '-annotate',
        `+${margin}+${Math.floor(height * 0.12)}`,
        '\u201C',
      );

      // Quote text (auto-wrapped using caption)
      args.push(
        '(',
        '-size',
        `${textWidth}x`,
        '-background',
        'none',
        '-fill',
        text_color,
        '-font',
        font,
        '-pointsize',
        String(quoteSize),
        '-gravity',
        'West',
        `caption:${quote}`,
        ')',
        '-gravity',
        'Center',
        '-geometry',
        '+0-20',
        '-composite',
      );

      // Attribution
      if (attribution) {
        args.push(
          '-fill',
          accent_color,
          '-font',
          font,
          '-pointsize',
          String(attrSize),
          '-gravity',
          'South',
          '-annotate',
          `+0+${Math.floor(height * 0.08)}`,
          attribution,
        );

        // Accent line above attribution
        const lineY = height - Math.floor(height * 0.13);
        const lineStartX = Math.floor(width * 0.35);
        const lineEndX = Math.floor(width * 0.65);
        args.push(
          '-stroke',
          accent_color,
          '-strokewidth',
          '2',
          '-draw',
          `line ${lineStartX},${lineY} ${lineEndX},${lineY}`,
        );
      }

      args.push(output);
      await magick(args);
      return { content: [{ type: 'text', text: `Quote card created: ${output}` }] };
    },
  );
}
