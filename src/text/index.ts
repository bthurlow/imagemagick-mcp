import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { magick, validateInputFile, ensureOutputDir, resolveOutputPath } from '../utils/exec.js';
import { registerTool } from '../utils/register.js';
import {
  type TextOverlayParams,
  type TextFitParams,
  type TextPathParams,
  type AnnotateParams,
  type CaptionBarParams,
  textOverlaySchema,
  textFitSchema,
  textPathSchema,
  annotateSchema,
  captionBarSchema,
} from './types.js';

/**
 * Register text and typography tools with the MCP server.
 */
export function registerTextTools(server: McpServer): void {
  registerTool<TextOverlayParams>(
    server,
    'text-overlay',
    'Add text to an image with full control over font, size, color, position, and rotation',
    textOverlaySchema.shape,
    async (params: TextOverlayParams) => {
      const {
        input,
        output,
        text,
        font,
        size,
        color,
        x,
        y,
        gravity,
        rotation,
        stroke_color,
        stroke_width,
        background,
        format,
      } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_text', format });
      await ensureOutputDir(outPath);

      const args = [
        input,
        '-gravity',
        gravity,
        '-font',
        font,
        '-pointsize',
        String(size),
        '-fill',
        color,
      ];

      if (stroke_color) {
        args.push('-stroke', stroke_color);
        args.push('-strokewidth', String(stroke_width ?? 1));
      }

      if (background) {
        args.push('-undercolor', background);
      }

      if (rotation !== 0) {
        args.push('-annotate', `${rotation}x${rotation}+${x}+${y}`, text);
      } else {
        args.push('-annotate', `+${x}+${y}`, text);
      }

      args.push(outPath);
      await magick(args);
      return { content: [{ type: 'text' as const, text: `Text overlay added: ${outPath}` }] };
    },
  );

  registerTool<TextFitParams>(
    server,
    'text-fit',
    'Auto-size text to fill a bounding box without overflow — critical for dynamic ad copy',
    textFitSchema.shape,
    async (params: TextFitParams) => {
      const {
        input,
        output,
        text,
        box_width,
        box_height,
        x,
        y,
        font,
        color,
        gravity,
        background,
        format,
      } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_textfit', format });
      await ensureOutputDir(outPath);

      const args = [
        input,
        '(',
        '-size',
        `${box_width}x${box_height}`,
        '-background',
        background ?? 'none',
        '-fill',
        color,
        '-font',
        font,
        '-gravity',
        gravity,
        'caption:' + text,
        ')',
        '-gravity',
        'NorthWest',
        '-geometry',
        `+${x}+${y}`,
        '-composite',
        outPath,
      ];

      await magick(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Text auto-fitted in ${box_width}x${box_height} box: ${outPath}`,
          },
        ],
      };
    },
  );

  registerTool<TextPathParams>(
    server,
    'text-path',
    'Render text along a curved or circular path — badges, stamps, logo treatments',
    textPathSchema.shape,
    async (params: TextPathParams) => {
      const { input, output, text, font, size, color, arc_degrees, rotation, gravity, format } =
        params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, { outputPath: output, suffix: '_textpath', format });
      await ensureOutputDir(outPath);

      const args = [
        input,
        '(',
        '-font',
        font,
        '-pointsize',
        String(size),
        '-fill',
        color,
        '-background',
        'none',
        `label:${text}`,
        '-virtual-pixel',
        'transparent',
        '-distort',
        'Arc',
        `${arc_degrees} ${rotation}`,
        ')',
        '-gravity',
        gravity,
        '-composite',
        outPath,
      ];

      await magick(args);
      return {
        content: [{ type: 'text' as const, text: `Text on arc (${arc_degrees}°): ${outPath}` }],
      };
    },
  );

  registerTool<AnnotateParams>(
    server,
    'annotate',
    'Add arrows, circles, and numbered callouts to images for tutorials and documentation',
    annotateSchema.shape,
    async (params: AnnotateParams) => {
      const { input, output, annotations, format } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_annotated',
        format,
      });
      await ensureOutputDir(outPath);

      const drawCommands: string[] = [];

      for (const ann of annotations) {
        const c = ann.color;
        const sw = ann.stroke_width;

        switch (ann.type) {
          case 'circle':
            drawCommands.push(
              `-stroke ${c} -strokewidth ${sw} -fill none`,
              `-draw "circle ${ann.x},${ann.y} ${ann.x + (ann.radius ?? 20)},${ann.y}"`,
            );
            break;
          case 'rectangle':
            drawCommands.push(
              `-stroke ${c} -strokewidth ${sw} -fill none`,
              `-draw "rectangle ${ann.x},${ann.y} ${ann.x2 ?? ann.x + 100},${ann.y2 ?? ann.y + 100}"`,
            );
            break;
          case 'arrow':
            drawCommands.push(
              `-stroke ${c} -strokewidth ${sw} -fill ${c}`,
              `-draw "line ${ann.x},${ann.y} ${ann.x2 ?? ann.x + 50},${ann.y2 ?? ann.y}"`,
              `-draw "polygon ${ann.x2 ?? ann.x + 50},${ann.y2 ?? ann.y} ${(ann.x2 ?? ann.x + 50) - 10},${(ann.y2 ?? ann.y) - 7} ${(ann.x2 ?? ann.x + 50) - 10},${(ann.y2 ?? ann.y) + 7}"`,
            );
            break;
          case 'number':
            drawCommands.push(
              `-stroke ${c} -strokewidth ${sw} -fill ${c}`,
              `-draw "circle ${ann.x},${ann.y} ${ann.x + 16},${ann.y}"`,
              `-fill white -stroke none -pointsize 18 -gravity NorthWest`,
              `-draw "text ${ann.x - 6},${ann.y - 10} '${ann.label ?? '1'}'"`,
            );
            break;
        }
      }

      const args = [input];
      for (const cmd of drawCommands) {
        args.push(...cmd.split(/\s+(?=-)/).flatMap((s) => s.split(/\s+/)));
      }
      args.push(outPath);

      await magick(args);
      return {
        content: [
          { type: 'text' as const, text: `${annotations.length} annotation(s) added: ${outPath}` },
        ],
      };
    },
  );

  registerTool<CaptionBarParams>(
    server,
    'caption-bar',
    'Add a solid or gradient bar with text at the top or bottom of an image — video thumbnail style',
    captionBarSchema.shape,
    async (params: CaptionBarParams) => {
      const {
        input,
        output,
        text,
        position,
        bar_height,
        bar_color,
        font,
        font_size,
        text_color,
        format,
      } = params;
      await validateInputFile(input);
      const outPath = resolveOutputPath(input, {
        outputPath: output,
        suffix: '_captioned',
        format,
      });
      await ensureOutputDir(outPath);

      const gravity = position === 'top' ? 'North' : 'South';
      const info = await magick(['identify', '-format', '%w', input]);
      const imgWidth = parseInt(info.trim(), 10);

      const args = [
        input,
        '(',
        '-size',
        `${imgWidth}x${bar_height}`,
        `xc:${bar_color}`,
        '-font',
        font,
        '-pointsize',
        String(font_size),
        '-fill',
        text_color,
        '-gravity',
        'Center',
        '-annotate',
        '+0+0',
        text,
        ')',
        '-gravity',
        gravity,
        '-composite',
        outPath,
      ];

      await magick(args);
      return {
        content: [{ type: 'text' as const, text: `Caption bar (${position}): ${outPath}` }],
      };
    },
  );
}
