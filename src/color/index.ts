import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { magick, validateInputFile, ensureOutputDir, resolveOutputPath } from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type AdjustParams,
  type TintParams,
  type BlurParams,
  type SharpenParams,
  type PixelateRegionParams,
  type ColorExtractParams,
  type NormalizeParams,
  type VignetteParams,
  adjustSchema,
  tintSchema,
  blurSchema,
  sharpenSchema,
  pixelateRegionSchema,
  colorExtractSchema,
  normalizeSchema,
  vignetteSchema,
} from './types.js';

/**
 * Register color adjustment and effects tools with the MCP server.
 */
export function registerColorTools(server: McpServer): void {
  registerTool<AdjustParams>(
    server,
    'adjust',
    'Adjust brightness, contrast, saturation, hue, and gamma of an image',
    adjustSchema.shape,
    async (params: AdjustParams) => {
      const { input, output, brightness, contrast, saturation, hue, gamma, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_adjusted', format });
      await ensureOutputDir(outPath);

      const args = [input];
      if (brightness !== 0 || contrast !== 0) {
        args.push('-brightness-contrast', `${brightness}x${contrast}`);
      }
      if (saturation !== 100 || hue !== 100) {
        args.push('-modulate', `100,${saturation},${hue}`);
      }
      if (gamma !== 1.0) {
        args.push('-gamma', String(gamma));
      }

      args.push(outPath);
      await magick(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Adjusted (b:${brightness} c:${contrast} s:${saturation} h:${hue} g:${gamma}): ${outPath}`,
          },
        ],
      };
    },
  );

  registerTool<TintParams>(
    server,
    'tint',
    'Apply a color tint or duotone effect for brand consistency',
    tintSchema.shape,
    async (params: TintParams) => {
      const { input, output, mode, color, shadow_color, intensity, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_tinted', format });
      await ensureOutputDir(outPath);

      if (mode === 'duotone') {
        await magick([
          input,
          '-colorspace',
          'Gray',
          '-fill',
          shadow_color,
          '-tint',
          '100',
          '(',
          '+clone',
          '-fill',
          color,
          '-tint',
          '100',
          ')',
          '-compose',
          'Screen',
          '-composite',
          outPath,
        ]);
      } else {
        await magick([input, '-fill', color, '-tint', String(intensity), outPath]);
      }

      return {
        content: [{ type: 'text' as const, text: `${mode} applied (${color}): ${outPath}` }],
      };
    },
  );

  registerTool<BlurParams>(
    server,
    'blur',
    'Apply Gaussian, motion, or radial blur to an image or a specific region',
    blurSchema.shape,
    async (params: BlurParams) => {
      const { input, output, type, radius, sigma, angle, region, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_blurred', format });
      await ensureOutputDir(outPath);

      const args = [input];
      if (region) {
        args.push('-region', `${region.width}x${region.height}+${region.x}+${region.y}`);
      }

      switch (type) {
        case 'motion':
          args.push('-motion-blur', `${radius}x${sigma}+${angle}`);
          break;
        case 'radial':
          args.push('-radial-blur', String(sigma));
          break;
        default:
          args.push('-blur', `${radius}x${sigma}`);
          break;
      }

      args.push(outPath);
      await magick(args);
      return {
        content: [{ type: 'text' as const, text: `Blur (${type}, σ=${sigma}): ${outPath}` }],
      };
    },
  );

  registerTool<SharpenParams>(
    server,
    'sharpen',
    'Sharpen an image using unsharp mask or adaptive sharpening',
    sharpenSchema.shape,
    async (params: SharpenParams) => {
      const { input, output, type, radius, sigma, amount, threshold, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_sharpened',
        format,
      });
      await ensureOutputDir(outPath);

      const args = [input];
      if (type === 'adaptive') {
        args.push('-adaptive-sharpen', `${radius}x${sigma}`);
      } else {
        args.push('-unsharp', `${radius}x${sigma}+${amount}+${threshold}`);
      }
      args.push(outPath);

      await magick(args);
      return { content: [{ type: 'text' as const, text: `Sharpened (${type}): ${outPath}` }] };
    },
  );

  registerTool<PixelateRegionParams>(
    server,
    'pixelate-region',
    'Pixelate or blur a specific rectangular region — redact sensitive info in screenshots',
    pixelateRegionSchema.shape,
    async (params: PixelateRegionParams) => {
      const { input, output, x, y, width, height, method, block_size, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_redacted', format });
      await ensureOutputDir(outPath);

      if (method === 'pixelate') {
        await magick([
          input,
          '(',
          '+clone',
          '-crop',
          `${width}x${height}+${x}+${y}`,
          '+repage',
          '-scale',
          `${Math.ceil(width / block_size)}x${Math.ceil(height / block_size)}`,
          '-scale',
          `${width}x${height}!`,
          ')',
          '-geometry',
          `+${x}+${y}`,
          '-composite',
          outPath,
        ]);
      } else {
        await magick([
          input,
          '-region',
          `${width}x${height}+${x}+${y}`,
          '-blur',
          `0x${block_size}`,
          outPath,
        ]);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `${method === 'pixelate' ? 'Pixelated' : 'Blurred'} region at (${x},${y}): ${outPath}`,
          },
        ],
      };
    },
  );

  registerTool<ColorExtractParams>(
    server,
    'color-extract',
    'Extract dominant colors from an image as a hex palette — match blog accents to hero images',
    colorExtractSchema.shape,
    async (params: ColorExtractParams) => {
      const { input, count } = params;
      await validateInputFile(input);

      const result = await magick([
        input,
        '-colors',
        String(count),
        '-unique-colors',
        '-format',
        '%c',
        'histogram:info:',
      ]);

      const lines = result.trim().split('\n').filter(Boolean);
      const colors: string[] = [];
      for (const line of lines) {
        const hexMatch = line.match(/#[0-9A-Fa-f]{6}/);
        if (hexMatch) {
          colors.push(hexMatch[0]);
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Dominant colors (${colors.length}):\n${colors.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
          },
        ],
      };
    },
  );

  registerTool<NormalizeParams>(
    server,
    'normalize',
    'Auto-level brightness and contrast for inconsistent source photos',
    normalizeSchema.shape,
    async (params: NormalizeParams) => {
      const { input, output, method, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_normalized',
        format,
      });
      await ensureOutputDir(outPath);

      const flagMap: Record<string, string> = {
        normalize: '-normalize',
        equalize: '-equalize',
        'auto-level': '-auto-level',
        'auto-gamma': '-auto-gamma',
      };

      await magick([input, flagMap[method], outPath]);
      return { content: [{ type: 'text' as const, text: `${method} applied: ${outPath}` }] };
    },
  );

  registerTool<VignetteParams>(
    server,
    'vignette',
    'Apply a dark edge vignette effect to draw focus to the center',
    vignetteSchema.shape,
    async (params: VignetteParams) => {
      const { input, output, radius, sigma, x, y, color, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_vignette', format });
      await ensureOutputDir(outPath);

      await magick([
        input,
        '-background',
        color,
        '-vignette',
        `${radius}x${sigma}+${x}+${y}`,
        outPath,
      ]);
      return { content: [{ type: 'text' as const, text: `Vignette applied: ${outPath}` }] };
    },
  );
}
