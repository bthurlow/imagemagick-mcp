import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  magick,
  magickBatch,
  validateInputFile,
  ensureOutputDir,
  resolveOutputPath,
  getExtension,
} from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type ResizeParams,
  type CropParams,
  type SmartCropParams,
  type RotateParams,
  type FlipParams,
  type FormatConvertParams,
  type CompressParams,
  type InfoParams,
  type StripMetadataParams,
  type BatchParams,
  resizeSchema,
  cropSchema,
  smartCropSchema,
  rotateSchema,
  flipSchema,
  formatConvertSchema,
  compressSchema,
  infoSchema,
  stripMetadataSchema,
  batchSchema,
} from './types.js';

/**
 * Register all core image operation tools with the MCP server.
 */
export function registerCoreTools(server: McpServer): void {
  registerTool<ResizeParams>(
    server,
    'resize',
    'Resize an image with aspect ratio control (fit, fill, or stretch)',
    resizeSchema.shape,
    async (params: ResizeParams) => {
      const { input, output, width, height, mode, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_resized', format });
      await ensureOutputDir(outPath);

      const geometry = `${width}x${height}`;
      let args: string[];

      switch (mode) {
        case 'fill':
          args = [
            input,
            '-resize',
            `${geometry}^`,
            '-gravity',
            'center',
            '-extent',
            geometry,
            outPath,
          ];
          break;
        case 'stretch':
          args = [input, '-resize', `${geometry}!`, outPath];
          break;
        case 'fit':
        default:
          args = [input, '-resize', geometry, outPath];
          break;
      }

      await magick(args);
      return {
        content: [
          { type: 'text' as const, text: `Resized to ${width}x${height} (${mode}): ${outPath}` },
        ],
      };
    },
  );

  registerTool<CropParams>(
    server,
    'crop',
    'Crop a rectangular region from an image by coordinates',
    cropSchema.shape,
    async (params: CropParams) => {
      const { input, output, width, height, x, y, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_cropped', format });
      await ensureOutputDir(outPath);

      await magick([input, '-crop', `${width}x${height}+${x}+${y}`, '+repage', outPath]);
      return {
        content: [
          { type: 'text' as const, text: `Cropped ${width}x${height} at (${x},${y}): ${outPath}` },
        ],
      };
    },
  );

  registerTool<SmartCropParams>(
    server,
    'smart-crop',
    'Content-aware crop that detects the focal point and crops around it',
    smartCropSchema.shape,
    async (params: SmartCropParams) => {
      const { input, output, width, height, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_smartcrop',
        format,
      });
      await ensureOutputDir(outPath);

      const geometry = `${width}x${height}`;
      await magick([
        input,
        '-resize',
        `${geometry}^`,
        '-gravity',
        'center',
        '-extent',
        geometry,
        outPath,
      ]);
      return {
        content: [
          { type: 'text' as const, text: `Smart-cropped to ${width}x${height}: ${outPath}` },
        ],
      };
    },
  );

  registerTool<RotateParams>(
    server,
    'rotate',
    'Rotate an image by degrees with optional background fill color',
    rotateSchema.shape,
    async (params: RotateParams) => {
      const { input, output, degrees, background, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_rotated', format });
      await ensureOutputDir(outPath);

      await magick([input, '-background', background, '-rotate', String(degrees), outPath]);
      return { content: [{ type: 'text' as const, text: `Rotated ${degrees}°: ${outPath}` }] };
    },
  );

  registerTool<FlipParams>(
    server,
    'flip',
    'Flip an image horizontally or vertically',
    flipSchema.shape,
    async (params: FlipParams) => {
      const { input, output, direction, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_flipped', format });
      await ensureOutputDir(outPath);

      const flag = direction === 'horizontal' ? '-flop' : '-flip';
      await magick([input, flag, outPath]);
      return { content: [{ type: 'text' as const, text: `Flipped ${direction}: ${outPath}` }] };
    },
  );

  registerTool<FormatConvertParams>(
    server,
    'format-convert',
    'Convert an image between formats (PNG, WebP, AVIF, JPEG, TIFF, ICO, SVG rasterize)',
    formatConvertSchema.shape,
    async (params: FormatConvertParams) => {
      const { input, output, format, quality } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '', format });
      await ensureOutputDir(outPath);

      const args = [input];
      if (quality !== undefined) {
        args.push('-quality', String(quality));
      }
      args.push(outPath);

      await magick(args);
      return { content: [{ type: 'text' as const, text: `Converted to ${format}: ${outPath}` }] };
    },
  );

  registerTool<CompressParams>(
    server,
    'compress',
    'Optimize image file size with format-aware compression defaults',
    compressSchema.shape,
    async (params: CompressParams) => {
      const { input, output, quality, strip, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_compressed',
        format,
      });
      await ensureOutputDir(outPath);

      const args = [input, '-quality', String(quality)];
      if (strip) {
        args.push('-strip');
      }
      const ext = getExtension(outPath);
      if (ext === 'jpg' || ext === 'jpeg') {
        args.push('-sampling-factor', '4:2:0', '-interlace', 'JPEG');
      } else if (ext === 'png') {
        args.push('-define', 'png:compression-level=9');
      }
      args.push(outPath);

      await magick(args);
      return {
        content: [{ type: 'text' as const, text: `Compressed (quality ${quality}): ${outPath}` }],
      };
    },
  );

  registerTool<InfoParams>(
    server,
    'info',
    'Get image metadata: dimensions, format, color space, file size, DPI, alpha channel',
    infoSchema.shape,
    async (params: InfoParams) => {
      const { input } = params;
      await validateInputFile(input);

      const result = await magick([
        'identify',
        '-format',
        'Format: %m\\nDimensions: %wx%h\\nColor Space: %[colorspace]\\nDepth: %z-bit\\nSize: %b\\nDPI: %x x %y\\nAlpha: %A\\nType: %[type]',
        input,
      ]);

      return { content: [{ type: 'text' as const, text: result.trim() }] };
    },
  );

  registerTool<StripMetadataParams>(
    server,
    'strip-metadata',
    'Remove EXIF, GPS, ICC, and other metadata from an image for privacy and smaller file size',
    stripMetadataSchema.shape,
    async (params: StripMetadataParams) => {
      const { input, output, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_stripped', format });
      await ensureOutputDir(outPath);

      await magick([input, '-strip', outPath]);
      return { content: [{ type: 'text' as const, text: `Metadata stripped: ${outPath}` }] };
    },
  );

  registerTool<BatchParams>(
    server,
    'batch',
    'Chain multiple ImageMagick operations on one image in a single call',
    batchSchema.shape,
    async (params: BatchParams) => {
      const { input, output, operations } = params;
      await validateInputFile(input);
      await ensureOutputDir(output);

      const args = [input];
      for (const op of operations) {
        args.push(...op.split(/\s+/));
      }
      args.push(output);

      await magickBatch(args);
      return {
        content: [
          { type: 'text' as const, text: `Batch (${operations.length} ops) complete: ${output}` },
        ],
      };
    },
  );
}
