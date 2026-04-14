import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { magick, validateInputFile, ensureOutputDir, resolveOutputPath } from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type CompositeParams,
  type WatermarkParams,
  type GradientOverlayParams,
  type BackgroundRemoveParams,
  type DropShadowParams,
  type BorderParams,
  type RoundedCornersParams,
  type MaskApplyParams,
  compositeSchema,
  watermarkSchema,
  gradientOverlaySchema,
  backgroundRemoveSchema,
  dropShadowSchema,
  borderSchema,
  roundedCornersSchema,
  maskApplySchema,
} from './types.js';

/**
 * Register compositing and layer tools with the MCP server.
 */
export function registerCompositingTools(server: McpServer): void {
  registerTool<CompositeParams>(
    server,
    'composite',
    'Layer images together with blend modes (overlay, multiply, screen, etc.)',
    compositeSchema.shape,
    async (params: CompositeParams) => {
      const { base, overlay, output, gravity, x, y, blend, opacity, format } = params;
      await validateInputFile(base);
      await validateInputFile(overlay);
      const outPath = resolveOutputPath(base, { outputPath: output, suffix: '_composite', format });
      await ensureOutputDir(outPath);

      const args = [base];
      if (opacity < 100) {
        args.push(
          '(',
          overlay,
          '-alpha',
          'set',
          '-channel',
          'A',
          '-evaluate',
          'multiply',
          String(opacity / 100),
          '+channel',
          ')',
        );
      } else {
        args.push(overlay);
      }
      args.push(
        '-gravity',
        gravity,
        '-geometry',
        `+${x}+${y}`,
        '-compose',
        blend,
        '-composite',
        outPath,
      );

      await magick(args);
      return {
        content: [
          { type: 'text' as const, text: `Composited (${blend}, ${opacity}% opacity): ${outPath}` },
        ],
      };
    },
  );

  registerTool<WatermarkParams>(
    server,
    'watermark',
    'Add a watermark to an image — tiled across the entire image or positioned at a specific location',
    watermarkSchema.shape,
    async (params: WatermarkParams) => {
      const { input, watermark, output, mode, gravity, opacity, format } = params;
      await validateInputFile(input);
      await validateInputFile(watermark);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_watermarked',
        format,
      });
      await ensureOutputDir(outPath);

      if (mode === 'tile') {
        await magick([
          input,
          '(',
          watermark,
          '-alpha',
          'set',
          '-channel',
          'A',
          '-evaluate',
          'multiply',
          String(opacity / 100),
          '+channel',
          '-write',
          'mpr:wm',
          '+delete',
          ')',
          '-fill',
          'mpr:wm',
          '-draw',
          'color 0,0 reset',
          '-compose',
          'Over',
          '-composite',
          outPath,
        ]);
      } else {
        await magick([
          input,
          '(',
          watermark,
          '-alpha',
          'set',
          '-channel',
          'A',
          '-evaluate',
          'multiply',
          String(opacity / 100),
          '+channel',
          ')',
          '-gravity',
          gravity,
          '-composite',
          outPath,
        ]);
      }

      return {
        content: [
          { type: 'text' as const, text: `Watermark added (${mode}, ${opacity}%): ${outPath}` },
        ],
      };
    },
  );

  registerTool<GradientOverlayParams>(
    server,
    'gradient-overlay',
    'Apply a linear or radial gradient overlay — great for making text readable over photos',
    gradientOverlaySchema.shape,
    async (params: GradientOverlayParams) => {
      const { input, output, type, direction, color_start, color_end, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_gradient', format });
      await ensureOutputDir(outPath);

      const info = await magick(['identify', '-format', '%wx%h', input]);
      const dimensions = info.trim();

      const gradientSpec =
        type === 'radial'
          ? `radial-gradient:${color_start}-${color_end}`
          : `gradient:${color_start}-${color_end}`;

      let rotateArgs: string[] = [];
      if (type === 'linear') {
        switch (direction) {
          case 'top-bottom':
            break;
          case 'bottom-top':
            rotateArgs = ['-rotate', '180'];
            break;
          case 'left-right':
            rotateArgs = ['-rotate', '90'];
            break;
          case 'right-left':
            rotateArgs = ['-rotate', '270'];
            break;
        }
      }

      await magick([
        input,
        '(',
        '-size',
        dimensions,
        gradientSpec,
        ...rotateArgs,
        ')',
        '-compose',
        'Over',
        '-composite',
        outPath,
      ]);
      return {
        content: [
          { type: 'text' as const, text: `Gradient overlay (${type} ${direction}): ${outPath}` },
        ],
      };
    },
  );

  registerTool<BackgroundRemoveParams>(
    server,
    'background-remove',
    'Remove or replace image backgrounds using color keying or flood fill',
    backgroundRemoveSchema.shape,
    async (params: BackgroundRemoveParams) => {
      const { input, output, target_color, fuzz, replace_color, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_nobg',
        format: format ?? 'png',
      });
      await ensureOutputDir(outPath);

      const args = [input, '-fuzz', `${fuzz}%`, '-transparent', target_color];
      if (replace_color !== 'none') {
        args.push('-background', replace_color, '-flatten');
      }
      args.push(outPath);

      await magick(args);
      return {
        content: [
          { type: 'text' as const, text: `Background removed (fuzz ${fuzz}%): ${outPath}` },
        ],
      };
    },
  );

  registerTool<DropShadowParams>(
    server,
    'drop-shadow',
    'Add a realistic drop shadow to an image — great for product shots and app screenshots',
    dropShadowSchema.shape,
    async (params: DropShadowParams) => {
      const { input, output, color, offset_x, offset_y, blur, background, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_shadow', format });
      await ensureOutputDir(outPath);

      await magick([
        input,
        '(',
        '+clone',
        '-background',
        color,
        '-shadow',
        `100x${blur}+${offset_x}+${offset_y}`,
        ')',
        '+swap',
        '-background',
        background,
        '-layers',
        'merge',
        '+repage',
        outPath,
      ]);
      return { content: [{ type: 'text' as const, text: `Drop shadow added: ${outPath}` }] };
    },
  );

  registerTool<BorderParams>(
    server,
    'border',
    'Add borders, padding, or frames with color or pattern fill',
    borderSchema.shape,
    async (params: BorderParams) => {
      const { input, output, width, color, style, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_bordered', format });
      await ensureOutputDir(outPath);

      let args: string[];
      switch (style) {
        case 'raised':
          args = [
            input,
            '-bordercolor',
            color,
            '-border',
            String(width),
            '-raise',
            `${width}x${width}`,
            outPath,
          ];
          break;
        case 'sunken':
          args = [
            input,
            '-bordercolor',
            color,
            '-border',
            String(width),
            '+raise',
            `${width}x${width}`,
            outPath,
          ];
          break;
        default:
          args = [input, '-bordercolor', color, '-border', String(width), outPath];
          break;
      }

      await magick(args);
      return {
        content: [
          { type: 'text' as const, text: `Border added (${style}, ${width}px): ${outPath}` },
        ],
      };
    },
  );

  registerTool<RoundedCornersParams>(
    server,
    'rounded-corners',
    'Round the corners of an image with transparent background — app screenshots, UI previews',
    roundedCornersSchema.shape,
    async (params: RoundedCornersParams) => {
      const { input, output, radius, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_rounded',
        format: format ?? 'png',
      });
      await ensureOutputDir(outPath);

      const info = await magick(['identify', '-format', '%wx%h', input]);
      const dimensions = info.trim();

      await magick([
        '(',
        input,
        '-alpha',
        'set',
        ')',
        '(',
        '-size',
        dimensions,
        'xc:none',
        '-draw',
        `roundrectangle 0,0,%[fx:w-1],%[fx:h-1],${radius},${radius}`,
        ')',
        '-compose',
        'DstIn',
        '-composite',
        outPath,
      ]);
      return {
        content: [{ type: 'text' as const, text: `Rounded corners (${radius}px): ${outPath}` }],
      };
    },
  );

  registerTool<MaskApplyParams>(
    server,
    'mask-apply',
    'Apply a shape mask to an image (circle, rounded rectangle, or custom SVG/image mask)',
    maskApplySchema.shape,
    async (params: MaskApplyParams) => {
      const { input, output, mask, shape, radius, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_masked',
        format: format ?? 'png',
      });
      await ensureOutputDir(outPath);

      const info = await magick(['identify', '-format', '%wx%h', input]);
      const [w, h] = info.trim().split('x').map(Number);

      if (mask) {
        await validateInputFile(mask);
        await magick([input, '-alpha', 'set', mask, '-compose', 'DstIn', '-composite', outPath]);
      } else if (shape === 'circle') {
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        const r = Math.min(cx, cy);
        await magick([
          '(',
          input,
          '-alpha',
          'set',
          ')',
          '(',
          '-size',
          `${w}x${h}`,
          'xc:none',
          '-fill',
          'white',
          '-draw',
          `circle ${cx},${cy} ${cx},${cy - r}`,
          ')',
          '-compose',
          'DstIn',
          '-composite',
          outPath,
        ]);
      } else {
        const r = radius ?? 20;
        await magick([
          '(',
          input,
          '-alpha',
          'set',
          ')',
          '(',
          '-size',
          `${w}x${h}`,
          'xc:none',
          '-draw',
          `roundrectangle 0,0,${w - 1},${h - 1},${r},${r}`,
          ')',
          '-compose',
          'DstIn',
          '-composite',
          outPath,
        ]);
      }

      return {
        content: [
          { type: 'text' as const, text: `Mask applied (${mask ? 'custom' : shape}): ${outPath}` },
        ],
      };
    },
  );
}
