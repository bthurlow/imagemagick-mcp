import { z } from 'zod';

/** Parameters for the adjust tool */
export interface AdjustParams {
  input: string;
  output?: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  format?: string;
}

export const adjustSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  brightness: z
    .number()
    .min(-100)
    .max(100)
    .default(0)
    .describe('Brightness adjustment (-100 to 100)'),
  contrast: z.number().min(-100).max(100).default(0).describe('Contrast adjustment (-100 to 100)'),
  saturation: z
    .number()
    .min(0)
    .max(200)
    .default(100)
    .describe('Saturation (0=grayscale, 100=normal)'),
  hue: z.number().min(0).max(200).default(100).describe('Hue shift (100=no change)'),
  gamma: z.number().min(0.1).max(10).default(1.0).describe('Gamma correction (1.0=no change)'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the tint tool */
export interface TintParams {
  input: string;
  output?: string;
  mode: 'tint' | 'duotone';
  color: string;
  shadow_color: string;
  intensity: number;
  format?: string;
}

export const tintSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  mode: z
    .enum(['tint', 'duotone'])
    .default('tint')
    .describe('tint: single color, duotone: two-color'),
  color: z.string().default('#3B82F6').describe('Tint color (or highlight for duotone)'),
  shadow_color: z.string().default('#1E3A5F').describe('Shadow color (duotone only)'),
  intensity: z.number().min(0).max(100).default(50).describe('Tint intensity (0-100)'),
  format: z.string().optional().describe('Output format'),
});

/** Region for selective blur */
export interface BlurRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Parameters for the blur tool */
export interface BlurParams {
  input: string;
  output?: string;
  type: 'gaussian' | 'motion' | 'radial';
  radius: number;
  sigma: number;
  angle: number;
  region?: BlurRegion;
  format?: string;
}

export const blurSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  type: z.enum(['gaussian', 'motion', 'radial']).default('gaussian').describe('Blur type'),
  radius: z.number().min(0).default(0).describe('Blur radius (0=auto)'),
  sigma: z.number().min(0.1).default(5).describe('Blur sigma/strength'),
  angle: z.number().default(0).describe('Angle for motion blur'),
  region: z
    .object({
      x: z.number().int(),
      y: z.number().int(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional()
    .describe('Optional region to blur'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the sharpen tool */
export interface SharpenParams {
  input: string;
  output?: string;
  type: 'unsharp' | 'adaptive';
  radius: number;
  sigma: number;
  amount: number;
  threshold: number;
  format?: string;
}

export const sharpenSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  type: z.enum(['unsharp', 'adaptive']).default('unsharp').describe('Sharpening method'),
  radius: z.number().min(0).default(0).describe('Radius (0=auto)'),
  sigma: z.number().min(0.1).default(1).describe('Sigma/strength'),
  amount: z.number().min(0).default(1).describe('Amount/gain (unsharp mask)'),
  threshold: z.number().min(0).default(0.05).describe('Threshold to prevent sharpening noise'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the pixelate-region tool */
export interface PixelateRegionParams {
  input: string;
  output?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  method: 'pixelate' | 'blur';
  block_size: number;
  format?: string;
}

export const pixelateRegionSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  x: z.number().int().min(0).describe('Region X position'),
  y: z.number().int().min(0).describe('Region Y position'),
  width: z.number().int().positive().describe('Region width'),
  height: z.number().int().positive().describe('Region height'),
  method: z.enum(['pixelate', 'blur']).default('pixelate').describe('Redaction method'),
  block_size: z.number().int().min(2).default(10).describe('Pixel block size or blur sigma'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the color-extract tool */
export interface ColorExtractParams {
  input: string;
  count: number;
}

export const colorExtractSchema = z.object({
  input: z.string().describe('Path to the input image'),
  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe('Number of dominant colors to extract'),
});

/** Parameters for the normalize tool */
export interface NormalizeParams {
  input: string;
  output?: string;
  method: 'normalize' | 'equalize' | 'auto-level' | 'auto-gamma';
  format?: string;
}

export const normalizeSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  method: z
    .enum(['normalize', 'equalize', 'auto-level', 'auto-gamma'])
    .default('normalize')
    .describe('Normalization method'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the vignette tool */
export interface VignetteParams {
  input: string;
  output?: string;
  radius: number;
  sigma: number;
  x: number;
  y: number;
  color: string;
  format?: string;
}

export const vignetteSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  radius: z.number().min(0).default(0).describe('Vignette radius (0=auto)'),
  sigma: z.number().min(0.1).default(20).describe('Vignette spread/softness'),
  x: z.number().int().default(10).describe('Horizontal edge offset'),
  y: z.number().int().default(10).describe('Vertical edge offset'),
  color: z.string().default('black').describe('Vignette color'),
  format: z.string().optional().describe('Output format'),
});
