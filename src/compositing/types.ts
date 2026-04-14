import { z } from 'zod';
import type { Gravity } from '../text/types.js';

export type BlendMode =
  | 'Over'
  | 'Multiply'
  | 'Screen'
  | 'Overlay'
  | 'HardLight'
  | 'SoftLight'
  | 'Difference'
  | 'Dissolve'
  | 'Plus'
  | 'Darken'
  | 'Lighten';

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

/** Parameters for the composite tool */
export interface CompositeParams {
  base: string;
  overlay: string;
  output?: string;
  gravity: Gravity;
  x: number;
  y: number;
  blend: BlendMode;
  opacity: number;
  format?: string;
}

export const compositeSchema = z.object({
  base: z.string().describe('Path to the base/background image'),
  overlay: z.string().describe('Path to the overlay/foreground image'),
  output: z.string().optional().describe('Path for the output image'),
  gravity: gravityEnum.default('Center').describe('Position of overlay on base'),
  x: z.number().int().default(0).describe('X offset from gravity position'),
  y: z.number().int().default(0).describe('Y offset from gravity position'),
  blend: z
    .enum([
      'Over',
      'Multiply',
      'Screen',
      'Overlay',
      'HardLight',
      'SoftLight',
      'Difference',
      'Dissolve',
      'Plus',
      'Darken',
      'Lighten',
    ])
    .default('Over')
    .describe('Compositing blend mode'),
  opacity: z.number().min(0).max(100).default(100).describe('Overlay opacity (0-100)'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the watermark tool */
export interface WatermarkParams {
  input: string;
  watermark: string;
  output?: string;
  mode: 'tile' | 'position';
  gravity: Gravity;
  opacity: number;
  format?: string;
}

export const watermarkSchema = z.object({
  input: z.string().describe('Path to the input image'),
  watermark: z.string().describe('Path to the watermark image'),
  output: z.string().optional().describe('Path for the output image'),
  mode: z
    .enum(['tile', 'position'])
    .default('position')
    .describe('tile: repeat, position: place once'),
  gravity: gravityEnum.default('SouthEast').describe('Watermark position (for position mode)'),
  opacity: z.number().min(0).max(100).default(30).describe('Watermark opacity (0-100)'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the gradient-overlay tool */
export interface GradientOverlayParams {
  input: string;
  output?: string;
  type: 'linear' | 'radial';
  direction: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left';
  color_start: string;
  color_end: string;
  format?: string;
}

export const gradientOverlaySchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  type: z.enum(['linear', 'radial']).default('linear').describe('Gradient type'),
  direction: z
    .enum(['top-bottom', 'bottom-top', 'left-right', 'right-left'])
    .default('bottom-top')
    .describe('Gradient direction (linear only)'),
  color_start: z.string().default('#00000000').describe('Starting color (with transparency)'),
  color_end: z.string().default('#000000CC').describe('Ending color (with transparency)'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the background-remove tool */
export interface BackgroundRemoveParams {
  input: string;
  output?: string;
  target_color: string;
  fuzz: number;
  replace_color: string;
  format?: string;
}

export const backgroundRemoveSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  target_color: z.string().default('white').describe('Background color to remove'),
  fuzz: z.number().min(0).max(100).default(20).describe('Color tolerance percentage'),
  replace_color: z.string().default('none').describe('Replacement color ("none" for transparent)'),
  format: z.string().optional().describe('Output format (use png for transparency)'),
});

/** Parameters for the drop-shadow tool */
export interface DropShadowParams {
  input: string;
  output?: string;
  color: string;
  offset_x: number;
  offset_y: number;
  blur: number;
  background: string;
  format?: string;
}

export const dropShadowSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  color: z.string().default('#00000060').describe('Shadow color (with transparency)'),
  offset_x: z.number().int().default(5).describe('Horizontal shadow offset'),
  offset_y: z.number().int().default(5).describe('Vertical shadow offset'),
  blur: z.number().min(0).default(10).describe('Shadow blur radius'),
  background: z.string().default('white').describe('Background color behind the shadow'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the border tool */
export interface BorderParams {
  input: string;
  output?: string;
  width: number;
  color: string;
  style: 'solid' | 'raised' | 'sunken';
  format?: string;
}

export const borderSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  width: z.number().int().min(0).default(10).describe('Border width in pixels'),
  color: z.string().default('white').describe('Border color'),
  style: z.enum(['solid', 'raised', 'sunken']).default('solid').describe('Border style'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the rounded-corners tool */
export interface RoundedCornersParams {
  input: string;
  output?: string;
  radius: number;
  format?: string;
}

export const roundedCornersSchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  radius: z.number().int().positive().default(20).describe('Corner radius in pixels'),
  format: z.string().optional().describe('Output format (default: png for transparency)'),
});

/** Parameters for the mask-apply tool */
export interface MaskApplyParams {
  input: string;
  output?: string;
  mask?: string;
  shape: 'circle' | 'rounded-rect' | 'custom';
  radius?: number;
  format?: string;
}

export const maskApplySchema = z.object({
  input: z.string().describe('Path to the input image'),
  output: z.string().optional().describe('Path for the output image'),
  mask: z.string().optional().describe('Path to a mask image (white=visible, black=hidden)'),
  shape: z.enum(['circle', 'rounded-rect', 'custom']).default('circle').describe('Mask shape'),
  radius: z.number().int().optional().describe('Corner radius for rounded-rect'),
  format: z.string().optional().describe('Output format (default: png)'),
});
