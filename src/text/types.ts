import { z } from 'zod';

export type Gravity =
  | 'NorthWest'
  | 'North'
  | 'NorthEast'
  | 'West'
  | 'Center'
  | 'East'
  | 'SouthWest'
  | 'South'
  | 'SouthEast';

const gravityEnum = z.enum([
  'NorthWest',
  'North',
  'NorthEast',
  'West',
  'Center',
  'East',
  'SouthWest',
  'South',
  'SouthEast',
]);

/** Parameters for the text-overlay tool */
export interface TextOverlayParams {
  input: string;
  output?: string;
  text: string;
  font: string;
  size: number;
  color: string;
  x: number;
  y: number;
  gravity: Gravity;
  rotation: number;
  stroke_color?: string;
  stroke_width?: number;
  background?: string;
  format?: string;
}

export const textOverlaySchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  text: z.string().describe('Text to overlay'),
  font: z.string().default('Arial').describe('Font family name'),
  size: z.number().int().positive().default(32).describe('Font size in points'),
  color: z.string().default('white').describe('Text color (name, hex, or rgba)'),
  x: z.number().int().default(0).describe('X position from top-left'),
  y: z.number().int().default(0).describe('Y position from top-left'),
  gravity: gravityEnum.default('NorthWest').describe('Gravity anchor for positioning'),
  rotation: z.number().default(0).describe('Text rotation in degrees'),
  stroke_color: z.string().optional().describe('Text outline/stroke color'),
  stroke_width: z.number().int().min(0).optional().describe('Stroke width in pixels'),
  background: z.string().optional().describe('Background color behind text'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the text-fit tool */
export interface TextFitParams {
  input: string;
  output?: string;
  text: string;
  box_width: number;
  box_height: number;
  x: number;
  y: number;
  font: string;
  color: string;
  gravity: Gravity;
  background?: string;
  format?: string;
}

export const textFitSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  text: z.string().describe('Text to render'),
  box_width: z.number().int().positive().describe('Bounding box width in pixels'),
  box_height: z.number().int().positive().describe('Bounding box height in pixels'),
  x: z.number().int().default(0).describe('Box X position'),
  y: z.number().int().default(0).describe('Box Y position'),
  font: z.string().default('Arial').describe('Font family'),
  color: z.string().default('white').describe('Text color'),
  gravity: gravityEnum.default('Center').describe('Text alignment within box'),
  background: z.string().optional().describe('Background color behind text'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the text-path tool */
export interface TextPathParams {
  input: string;
  output?: string;
  text: string;
  font: string;
  size: number;
  color: string;
  arc_degrees: number;
  rotation: number;
  gravity: Gravity;
  format?: string;
}

export const textPathSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  text: z.string().describe('Text to render along the path'),
  font: z.string().default('Arial').describe('Font family'),
  size: z.number().int().positive().default(32).describe('Font size'),
  color: z.string().default('white').describe('Text color'),
  arc_degrees: z.number().default(180).describe('Arc angle in degrees (360 = full circle)'),
  rotation: z.number().default(0).describe('Starting rotation offset'),
  gravity: gravityEnum.default('Center').describe('Position on the image'),
  format: z.string().optional().describe('Output format'),
});

/** Annotation definition for the annotate tool */
export interface Annotation {
  type: 'arrow' | 'circle' | 'rectangle' | 'number';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  radius?: number;
  label?: string;
  color: string;
  stroke_width: number;
}

/** Parameters for the annotate tool */
export interface AnnotateParams {
  input: string;
  output?: string;
  annotations: Annotation[];
  format?: string;
}

export const annotateSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  annotations: z
    .array(
      z.object({
        type: z.enum(['arrow', 'circle', 'rectangle', 'number']).describe('Annotation type'),
        x: z.number().int().describe('X position'),
        y: z.number().int().describe('Y position'),
        x2: z.number().int().optional().describe('End X (for arrows and rectangles)'),
        y2: z.number().int().optional().describe('End Y (for arrows and rectangles)'),
        radius: z.number().int().optional().describe('Radius (for circles)'),
        label: z.string().optional().describe('Label text (for numbers/labels)'),
        color: z.string().default('red').describe('Annotation color'),
        stroke_width: z.number().int().default(3).describe('Line thickness'),
      }),
    )
    .describe('Array of annotations to draw'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the caption-bar tool */
export interface CaptionBarParams {
  input: string;
  output?: string;
  text: string;
  position: 'top' | 'bottom';
  bar_height: number;
  bar_color: string;
  font: string;
  font_size: number;
  text_color: string;
  format?: string;
}

export const captionBarSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  text: z.string().describe('Caption text'),
  position: z.enum(['top', 'bottom']).default('bottom').describe('Bar position'),
  bar_height: z.number().int().positive().default(60).describe('Bar height in pixels'),
  bar_color: z
    .string()
    .default('#000000CC')
    .describe('Bar background color (supports transparency)'),
  font: z.string().default('Arial').describe('Font family'),
  font_size: z.number().int().positive().default(28).describe('Font size'),
  text_color: z.string().default('white').describe('Text color'),
  format: z.string().optional().describe('Output format'),
});
