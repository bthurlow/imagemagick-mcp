import { z } from 'zod';

/** Parameters for the resize tool */
export interface ResizeParams {
  input: string;
  output?: string;
  width: number;
  height: number;
  mode: 'fit' | 'fill' | 'stretch';
  format?: string;
}

export const resizeSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image (default: input_resized.ext)'),
  width: z.number().int().positive().describe('Target width in pixels'),
  height: z.number().int().positive().describe('Target height in pixels'),
  mode: z
    .enum(['fit', 'fill', 'stretch'])
    .default('fit')
    .describe('fit: fit within bounds. fill: crop to fill. stretch: ignore aspect ratio'),
  format: z.string().optional().describe('Output format (png, webp, jpg, etc.)'),
});

/** Parameters for the crop tool */
export interface CropParams {
  input: string;
  output?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  format?: string;
}

export const cropSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  width: z.number().int().positive().describe('Crop width in pixels'),
  height: z.number().int().positive().describe('Crop height in pixels'),
  x: z.number().int().min(0).default(0).describe('X offset from top-left'),
  y: z.number().int().min(0).default(0).describe('Y offset from top-left'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the smart-crop tool */
export interface SmartCropParams {
  input: string;
  output?: string;
  width: number;
  height: number;
  format?: string;
}

export const smartCropSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  width: z.number().int().positive().describe('Target width'),
  height: z.number().int().positive().describe('Target height'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the rotate tool */
export interface RotateParams {
  input: string;
  output?: string;
  degrees: number;
  background: string;
  format?: string;
}

export const rotateSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  degrees: z.number().describe('Rotation angle in degrees (positive = clockwise)'),
  background: z.string().default('transparent').describe('Background color for exposed areas'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the flip tool */
export interface FlipParams {
  input: string;
  output?: string;
  direction: 'horizontal' | 'vertical';
  format?: string;
}

export const flipSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  direction: z.enum(['horizontal', 'vertical']).describe('Flip direction'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the format-convert tool */
export interface FormatConvertParams {
  input: string;
  output?: string;
  format: string;
  quality?: number;
}

export const formatConvertSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  format: z.string().describe('Target format (png, webp, avif, jpg, tiff, ico, etc.)'),
  quality: z.number().int().min(1).max(100).optional().describe('Output quality (1-100)'),
});

/** Parameters for the compress tool */
export interface CompressParams {
  input: string;
  output?: string;
  quality: number;
  strip: boolean;
  format?: string;
}

export const compressSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  quality: z.number().int().min(1).max(100).default(85).describe('Compression quality (1-100)'),
  strip: z.boolean().default(true).describe('Strip metadata to reduce size'),
  format: z.string().optional().describe('Output format (default: same as input)'),
});

/** Parameters for the info tool */
export interface InfoParams {
  input: string;
}

export const infoSchema = z.object({
  input: z.string().describe('Path to the input image'),
});

/** Parameters for the strip-metadata tool */
export interface StripMetadataParams {
  input: string;
  output?: string;
  format?: string;
}

export const stripMetadataSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the batch tool */
export interface BatchParams {
  input: string;
  output: string;
  operations: string[];
}

export const batchSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().describe('Path for the output image'),
  operations: z
    .array(z.string())
    .describe('Array of ImageMagick operation strings, e.g. ["-resize 800x600", "-quality 85"]'),
});
