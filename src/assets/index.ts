import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  magick,
  magickBatch,
  validateInputFile,
  ensureOutputDir,
  IOS_ICON_SIZES,
  ANDROID_ICON_SIZES,
  ASPECT_RATIOS,
} from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type ResponsiveSetParams,
  type FaviconSetParams,
  type AppIconSetParams,
  type SplashScreenParams,
  type SpriteSheetParams,
  type NinePatchParams,
  type AspectCropSetParams,
  type PdfToImageParams,
  type ImageDiffParams,
  type OptimizeBatchParams,
  responsiveSetSchema,
  faviconSetSchema,
  appIconSetSchema,
  splashScreenSchema,
  spriteSheetSchema,
  ninePatchSchema,
  aspectCropSetSchema,
  pdfToImageSchema,
  imageDiffSchema,
  optimizeBatchSchema,
} from './types.js';
import { join, parse } from 'node:path';
import { readdir, stat } from 'node:fs/promises';

/**
 * Register web and mobile asset tools with the MCP server.
 */
export function registerAssetTools(server: McpServer): void {
  // ── responsive-set ──────────────────────────────────────────────────────
  registerTool<ResponsiveSetParams>(
    server,
    'responsive-set',
    'Generate srcset variants (400w, 800w, 1200w, 1600w, 2400w) from one source image for responsive web',
    responsiveSetSchema.shape,
    async (params: ResponsiveSetParams) => {
      const { input, output_dir, widths, format, quality, generate_2x } = params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const parsed = parse(input);
      const generated: string[] = [];

      for (const w of widths) {
        const outPath = join(output_dir, `${parsed.name}_${w}w.${format}`);
        await magick([input, '-resize', `${w}x`, '-quality', String(quality), '-strip', outPath]);
        generated.push(`${w}w: ${outPath}`);

        if (generate_2x) {
          const outPath2x = join(output_dir, `${parsed.name}_${w}w@2x.${format}`);
          await magick([
            input,
            '-resize',
            `${w * 2}x`,
            '-quality',
            String(quality),
            '-strip',
            outPath2x,
          ]);
          generated.push(`${w}w@2x: ${outPath2x}`);
        }
      }

      // Generate srcset attribute
      const srcset = widths.map((w) => `${parsed.name}_${w}w.${format} ${w}w`).join(', ');

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} responsive variants:\n${generated.join('\n')}\n\nsrcset="${srcset}"`,
          },
        ],
      };
    },
  );

  // ── favicon-set ─────────────────────────────────────────────────────────
  registerTool<FaviconSetParams>(
    server,
    'favicon-set',
    'Generate all favicon sizes from one source image (16, 32, 48, 180, 192, 512) plus ICO bundle',
    faviconSetSchema.shape,
    async (params: FaviconSetParams) => {
      const { input, output_dir, sizes, generate_ico } = params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const generated: string[] = [];

      for (const size of sizes) {
        const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
        const outPath = join(output_dir, name);
        await magick([input, '-resize', `${size}x${size}!`, '-strip', outPath]);
        generated.push(`${size}x${size}: ${outPath}`);
      }

      if (generate_ico) {
        const icoPath = join(output_dir, 'favicon.ico');
        const icoSizes = sizes.filter((s) => s <= 48);
        const icoInputs = icoSizes.map((s) =>
          s === 180
            ? join(output_dir, 'apple-touch-icon.png')
            : join(output_dir, `favicon-${s}x${s}.png`),
        );
        await magick([...icoInputs, icoPath]);
        generated.push(`ICO bundle: ${icoPath}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} favicon files:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── app-icon-set ────────────────────────────────────────────────────────
  registerTool<AppIconSetParams>(
    server,
    'app-icon-set',
    'Generate iOS and Android app icon sets from one source image',
    appIconSetSchema.shape,
    async (params: AppIconSetParams) => {
      const { input, output_dir, platforms } = params;
      await validateInputFile(input);

      const generated: string[] = [];

      if (platforms.includes('ios')) {
        const iosDir = join(output_dir, 'ios');
        await ensureOutputDir(join(iosDir, 'placeholder'));

        for (const icon of IOS_ICON_SIZES) {
          for (const scale of icon.scales) {
            const px = Math.round(icon.size * scale);
            const name = `icon_${icon.size}pt@${scale}x.png`;
            const outPath = join(iosDir, name);
            await magick([input, '-resize', `${px}x${px}!`, '-strip', outPath]);
            generated.push(`iOS ${icon.size}pt@${scale}x (${px}px): ${outPath}`);
          }
        }
      }

      if (platforms.includes('android')) {
        const androidDir = join(output_dir, 'android');

        for (const [density, px] of Object.entries(ANDROID_ICON_SIZES)) {
          const densityDir = join(androidDir, `mipmap-${density}`);
          await ensureOutputDir(join(densityDir, 'placeholder'));

          const outPath = join(densityDir, 'ic_launcher.png');
          await magick([input, '-resize', `${px}x${px}!`, '-strip', outPath]);
          generated.push(`Android ${density} (${px}px): ${outPath}`);

          // Round icon variant
          const roundPath = join(densityDir, 'ic_launcher_round.png');
          const cx = Math.floor(px / 2);
          await magick([
            '(',
            input,
            '-resize',
            `${px}x${px}!`,
            '-alpha',
            'set',
            ')',
            '(',
            '-size',
            `${px}x${px}`,
            'xc:none',
            '-fill',
            'white',
            '-draw',
            `circle ${cx},${cx} ${cx},0`,
            ')',
            '-compose',
            'DstIn',
            '-composite',
            '-strip',
            roundPath,
          ]);
          generated.push(`Android ${density} round (${px}px): ${roundPath}`);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} app icons:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── splash-screen ───────────────────────────────────────────────────────
  registerTool<SplashScreenParams>(
    server,
    'splash-screen',
    'Generate splash/launch screen images for all common device sizes',
    splashScreenSchema.shape,
    async (params: SplashScreenParams) => {
      const { input, output_dir, background_color, mode, sizes } = params;
      await validateInputFile(input);

      const generated: string[] = [];

      for (const screen of sizes) {
        const outPath = join(
          output_dir,
          `splash_${screen.name}_${screen.width}x${screen.height}.png`,
        );
        await ensureOutputDir(outPath);

        if (mode === 'cover') {
          await magick([
            input,
            '-resize',
            `${screen.width}x${screen.height}^`,
            '-gravity',
            'center',
            '-extent',
            `${screen.width}x${screen.height}`,
            outPath,
          ]);
        } else {
          // Contain: center logo on background
          const logoSize = Math.floor(Math.min(screen.width, screen.height) * 0.3);
          await magick([
            '-size',
            `${screen.width}x${screen.height}`,
            `xc:${background_color}`,
            '(',
            input,
            '-resize',
            `${logoSize}x${logoSize}`,
            ')',
            '-gravity',
            'Center',
            '-composite',
            outPath,
          ]);
        }

        generated.push(`${screen.name} (${screen.width}x${screen.height}): ${outPath}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} splash screens:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── sprite-sheet ────────────────────────────────────────────────────────
  registerTool<SpriteSheetParams>(
    server,
    'sprite-sheet',
    'Combine multiple small images into one sprite sheet with CSS offset data for web performance',
    spriteSheetSchema.shape,
    async (params: SpriteSheetParams) => {
      const { inputs, output, tile_size, columns, padding, background } = params;
      for (const img of inputs) {
        await validateInputFile(img);
      }
      await ensureOutputDir(output);

      const args = ['montage'];
      args.push(...inputs);
      args.push(
        '-geometry',
        `${tile_size}x${tile_size}+${padding}+${padding}`,
        '-tile',
        `${columns}x`,
        '-background',
        background,
        output,
      );

      await magickBatch(args);

      // Generate CSS offset data
      const cssOffsets: string[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * (tile_size + padding * 2);
        const y = row * (tile_size + padding * 2);
        const name = parse(inputs[i]).name;
        cssOffsets.push(
          `.sprite-${name} { background-position: -${x}px -${y}px; width: ${tile_size}px; height: ${tile_size}px; }`,
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Sprite sheet (${inputs.length} sprites): ${output}\n\nCSS offsets:\n${cssOffsets.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── nine-patch ──────────────────────────────────────────────────────────
  registerTool<NinePatchParams>(
    server,
    'nine-patch',
    'Generate an Android 9-patch image with stretch region markers',
    ninePatchSchema.shape,
    async (params: NinePatchParams) => {
      const {
        input,
        output,
        stretch_x_start,
        stretch_x_end,
        stretch_y_start,
        stretch_y_end,
        padding_left,
        padding_top,
        padding_right,
        padding_bottom,
      } = params;
      await validateInputFile(input);
      const outPath = output ?? input.replace(/\.[^.]+$/, '.9.png');
      await ensureOutputDir(outPath);

      const info = await magick(['identify', '-format', '%wx%h', input]);
      const [w, h] = info.trim().split('x').map(Number);

      // 9-patch has 1px black lines on edges to define stretch/padding regions
      const newW = w + 2;
      const newH = h + 2;

      const args = [
        // Create transparent canvas 2px larger
        '-size',
        `${newW}x${newH}`,
        'xc:none',
        // Place original image at (1,1)
        input,
        '-gravity',
        'NorthWest',
        '-geometry',
        '+1+1',
        '-composite',
        // Draw stretch markers (top and left edges)
        '-fill',
        'black',
        '-draw',
        `line ${stretch_x_start + 1},0 ${stretch_x_end + 1},0`, // top edge
        '-draw',
        `line 0,${stretch_y_start + 1} 0,${stretch_y_end + 1}`, // left edge
      ];

      // Draw content padding markers (bottom and right edges)
      if (padding_left > 0 || padding_right > 0 || padding_top > 0 || padding_bottom > 0) {
        const contentLeft = padding_left + 1;
        const contentRight = newW - 1 - padding_right;
        const contentTop = padding_top + 1;
        const contentBottom = newH - 1 - padding_bottom;
        args.push(
          '-draw',
          `line ${contentLeft},${newH - 1} ${contentRight},${newH - 1}`, // bottom edge
          '-draw',
          `line ${newW - 1},${contentTop} ${newW - 1},${contentBottom}`, // right edge
        );
      }

      args.push(outPath);
      await magick(args);
      return { content: [{ type: 'text', text: `9-patch created (${newW}x${newH}): ${outPath}` }] };
    },
  );

  // ── aspect-crop-set ─────────────────────────────────────────────────────
  registerTool<AspectCropSetParams>(
    server,
    'aspect-crop-set',
    'Generate one image cropped to all common aspect ratios (1:1, 4:5, 9:16, 16:9, 3:2) with smart focal point',
    aspectCropSetSchema.shape,
    async (params: AspectCropSetParams) => {
      const { input, output_dir, ratios, max_dimension, format } = params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const parsed = parse(input);
      const ext = format ?? parsed.ext.slice(1);
      const generated: string[] = [];

      for (const ratio of ratios) {
        const ar = ASPECT_RATIOS[ratio];
        if (!ar) continue;

        // Calculate dimensions respecting max_dimension
        let w: number, h: number;
        if (ar.w >= ar.h) {
          w = max_dimension;
          h = Math.round((max_dimension * ar.h) / ar.w);
        } else {
          h = max_dimension;
          w = Math.round((max_dimension * ar.w) / ar.h);
        }

        const ratioName = ratio.replace(':', 'x');
        const outPath = join(output_dir, `${parsed.name}_${ratioName}.${ext}`);

        await magick([
          input,
          '-resize',
          `${w}x${h}^`,
          '-gravity',
          'center',
          '-extent',
          `${w}x${h}`,
          outPath,
        ]);

        generated.push(`${ratio} (${w}x${h}): ${outPath}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${generated.length} aspect ratio crops:\n${generated.join('\n')}`,
          },
        ],
      };
    },
  );

  // ── pdf-to-image ────────────────────────────────────────────────────────
  registerTool<PdfToImageParams>(
    server,
    'pdf-to-image',
    'Convert PDF pages to images for web embedding or blog content',
    pdfToImageSchema.shape,
    async (params: PdfToImageParams) => {
      const { input, output_dir, pages, dpi, format, quality } = params;
      await validateInputFile(input);
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const parsed = parse(input);

      // ImageMagick uses [page] syntax for PDFs
      let pageSpec: string;
      if (pages === 'all') {
        pageSpec = '';
      } else if (pages.includes('-')) {
        const [start, end] = pages.split('-').map(Number);
        pageSpec = `[${start}-${end}]`;
      } else {
        pageSpec = `[${pages}]`;
      }

      const outPattern = join(output_dir, `${parsed.name}_page_%03d.${format}`);

      await magickBatch([
        '-density',
        String(dpi),
        `${input}${pageSpec}`,
        '-quality',
        String(quality),
        outPattern,
      ]);

      return { content: [{ type: 'text', text: `PDF pages exported to: ${output_dir}` }] };
    },
  );

  // ── image-diff ──────────────────────────────────────────────────────────
  registerTool<ImageDiffParams>(
    server,
    'image-diff',
    'Compare two images and highlight differences — useful for QA, design review, and regression testing',
    imageDiffSchema.shape,
    async (params: ImageDiffParams) => {
      const { image_a, image_b, output, highlight_color, fuzz, mode } = params;
      await validateInputFile(image_a);
      await validateInputFile(image_b);
      await ensureOutputDir(output);

      if (mode === 'side-by-side') {
        // Side by side: A | diff | B
        await magick([
          '(',
          image_a,
          ')',
          '(',
          image_a,
          image_b,
          '-fuzz',
          `${fuzz}%`,
          '-compose',
          'Src',
          '-highlight-color',
          highlight_color,
          '-lowlight-color',
          'white',
          '-compare',
          ')',
          '(',
          image_b,
          ')',
          '+append',
          output,
        ]);
      } else if (mode === 'overlay') {
        // Blend both images
        await magick([
          image_a,
          image_b,
          '-compose',
          'Difference',
          '-composite',
          '-auto-level',
          output,
        ]);
      } else {
        // Highlight differences
        await magick([
          image_a,
          image_b,
          '-fuzz',
          `${fuzz}%`,
          '-compose',
          'Src',
          '-highlight-color',
          highlight_color,
          '-lowlight-color',
          'white',
          '-compare',
          output,
        ]);
      }

      // Get metrics
      let metrics = '';
      try {
        const result = await magick([
          image_a,
          image_b,
          '-fuzz',
          `${fuzz}%`,
          '-metric',
          'AE',
          '-compare',
          'null:',
        ]);
        metrics = `\nDifferent pixels: ${result.trim()}`;
      } catch {
        // Metrics command returns non-zero when images differ — that's expected
      }

      return { content: [{ type: 'text', text: `Image diff (${mode}): ${output}${metrics}` }] };
    },
  );

  // ── optimize-batch ──────────────────────────────────────────────────────
  registerTool<OptimizeBatchParams>(
    server,
    'optimize-batch',
    'Analyze and compress all images in a directory for web — with format recommendations and size reports',
    optimizeBatchSchema.shape,
    async (params: OptimizeBatchParams) => {
      const {
        input_dir,
        output_dir,
        target_format,
        quality,
        max_width,
        strip_metadata,
        recursive,
      } = params;
      await ensureOutputDir(join(output_dir, 'placeholder'));

      const imageExtensions = new Set([
        'png',
        'jpg',
        'jpeg',
        'gif',
        'bmp',
        'tiff',
        'tif',
        'webp',
        'avif',
        'heic',
      ]);

      // Read directory
      const entries = await readdir(input_dir, { withFileTypes: true, recursive });
      const files = entries
        .filter(
          (e) => e.isFile() && imageExtensions.has(e.name.split('.').pop()?.toLowerCase() ?? ''),
        )
        .map((e) => join(e.parentPath ?? e.path ?? input_dir, e.name));

      const results: string[] = [];
      let totalOriginal = 0;
      let totalOptimized = 0;

      for (const file of files) {
        const parsed = parse(file);
        const ext = target_format === 'keep' ? parsed.ext.slice(1) : target_format;
        const relativePath = file.replace(input_dir, '').replace(/^[/\\]/, '');
        const outPath = join(output_dir, relativePath.replace(/\.[^.]+$/, `.${ext}`));
        await ensureOutputDir(outPath);

        const args = [file];
        if (max_width) {
          args.push('-resize', `${max_width}x>`); // Only downscale, never upscale
        }
        args.push('-quality', String(quality));
        if (strip_metadata) {
          args.push('-strip');
        }
        args.push(outPath);

        await magick(args);

        const originalStat = await stat(file);
        const optimizedStat = await stat(outPath);
        totalOriginal += originalStat.size;
        totalOptimized += optimizedStat.size;

        const savings = Math.round((1 - optimizedStat.size / originalStat.size) * 100);
        results.push(
          `${relativePath}: ${formatBytes(originalStat.size)} → ${formatBytes(optimizedStat.size)} (${savings}% saved)`,
        );
      }

      const totalSavings = Math.round((1 - totalOptimized / totalOriginal) * 100);

      return {
        content: [
          {
            type: 'text',
            text: `Optimized ${files.length} images:\n${results.join('\n')}\n\nTotal: ${formatBytes(totalOriginal)} → ${formatBytes(totalOptimized)} (${totalSavings}% saved)`,
          },
        ],
      };
    },
  );
}

/** Format bytes to human readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
