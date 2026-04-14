import { z } from 'zod';

export type BannerSize =
  | 'leaderboard'
  | 'medium-rect'
  | 'wide-skyscraper'
  | 'mobile-banner'
  | 'half-page'
  | 'billboard'
  | 'large-leaderboard'
  | 'mobile-large'
  | 'square';

/** Parameters for the banner-set tool */
export interface BannerSetParams {
  input: string;
  output_dir: string;
  sizes: BannerSize[];
  format: string;
}

export const bannerSetSchema = z.object({
  input: z.string().describe('Path to the source design image'),
  output_dir: z.string().describe('Directory to save all banner sizes'),
  sizes: z
    .array(
      z.enum([
        'leaderboard',
        'medium-rect',
        'wide-skyscraper',
        'mobile-banner',
        'half-page',
        'billboard',
        'large-leaderboard',
        'mobile-large',
        'square',
      ]),
    )
    .default([
      'leaderboard',
      'medium-rect',
      'wide-skyscraper',
      'mobile-banner',
      'half-page',
      'billboard',
    ])
    .describe('Banner sizes to generate'),
  format: z.string().default('png').describe('Output format'),
});

/** Parameters for the cta-button tool */
export interface CtaButtonParams {
  output: string;
  text: string;
  width: number;
  height: number;
  color: string;
  text_color: string;
  font: string;
  font_size: number;
  corner_radius: number;
  shadow: boolean;
  border_color?: string;
  border_width: number;
}

export const ctaButtonSchema = z.object({
  output: z.string().describe('Path for the output button image'),
  text: z.string().describe('Button text (e.g., "Get Started Free")'),
  width: z.number().int().positive().default(300).describe('Button width'),
  height: z.number().int().positive().default(60).describe('Button height'),
  color: z.string().default('#3B82F6').describe('Button background color'),
  text_color: z.string().default('white').describe('Text color'),
  font: z.string().default('Arial-Bold').describe('Font family'),
  font_size: z.number().int().positive().default(20).describe('Font size'),
  corner_radius: z.number().int().min(0).default(8).describe('Corner radius'),
  shadow: z.boolean().default(true).describe('Add drop shadow'),
  border_color: z.string().optional().describe('Optional border color'),
  border_width: z.number().int().min(0).default(0).describe('Border width'),
});

/** Parameters for the price-badge tool */
export interface PriceBadgeParams {
  output: string;
  text: string;
  shape: 'circle' | 'star' | 'rectangle' | 'ribbon';
  size: number;
  background_color: string;
  text_color: string;
  font: string;
  border_color?: string;
}

export const priceBadgeSchema = z.object({
  output: z.string().describe('Path for the output badge image'),
  text: z.string().describe('Badge text (e.g., "50% OFF", "$9.99")'),
  shape: z
    .enum(['circle', 'star', 'rectangle', 'ribbon'])
    .default('circle')
    .describe('Badge shape'),
  size: z.number().int().positive().default(200).describe('Badge size in pixels'),
  background_color: z.string().default('#e94560').describe('Badge background color'),
  text_color: z.string().default('white').describe('Text color'),
  font: z.string().default('Arial-Bold').describe('Font family'),
  border_color: z.string().optional().describe('Optional border color'),
});

/** A/B test variant configuration */
export interface ABVariant {
  name: string;
  tint_color?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  text_overlay?: string;
  text_color?: string;
  text_position?: 'top' | 'center' | 'bottom';
}

/** Parameters for the a-b-variants tool */
export interface ABVariantsParams {
  input: string;
  output_dir: string;
  variants: ABVariant[];
}

export const abVariantsSchema = z.object({
  input: z.string().describe('Path to the base image'),
  output_dir: z.string().describe('Directory to save variants'),
  variants: z
    .array(
      z.object({
        name: z.string().describe('Variant name'),
        tint_color: z.string().optional().describe('Color tint to apply'),
        brightness: z.number().min(-100).max(100).optional().describe('Brightness adjustment'),
        contrast: z.number().min(-100).max(100).optional().describe('Contrast adjustment'),
        saturation: z.number().min(0).max(200).optional().describe('Saturation adjustment'),
        text_overlay: z.string().optional().describe('Text to overlay'),
        text_color: z.string().optional().describe('Text color'),
        text_position: z.enum(['top', 'center', 'bottom']).optional().describe('Text position'),
      }),
    )
    .min(1)
    .describe('Array of variant configurations'),
});

/** Template fill element */
export interface TemplateFill {
  type: 'text' | 'image';
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  font?: string;
  font_size?: number;
  color?: string;
  gravity?: string;
}

/** Parameters for the template-fill tool */
export interface TemplateFillParams {
  template: string;
  output: string;
  fills: TemplateFill[];
}

export const templateFillSchema = z.object({
  template: z.string().describe('Path to the template image'),
  output: z.string().describe('Path for the output image'),
  fills: z
    .array(
      z.object({
        type: z.enum(['text', 'image']).describe('Fill type'),
        content: z.string().describe('Text content or image path'),
        x: z.number().int().describe('X position'),
        y: z.number().int().describe('Y position'),
        width: z.number().int().positive().optional().describe('Width'),
        height: z.number().int().positive().optional().describe('Height'),
        font: z.string().optional().describe('Font (text only)'),
        font_size: z.number().int().optional().describe('Font size (text only)'),
        color: z.string().optional().describe('Text color'),
        gravity: z.string().optional().describe('Gravity for positioning'),
      }),
    )
    .describe('Array of fill operations'),
});

/** Parameters for the qr-code-overlay tool */
export interface QrCodeOverlayParams {
  input: string;
  qr_image: string;
  output?: string;
  size: number;
  gravity: string;
  x: number;
  y: number;
  background: string;
  padding: number;
  format?: string;
}

export const qrCodeOverlaySchema = z.object({
  input: z.string().describe('Path to the base image'),
  qr_image: z.string().describe('Path to the QR code image'),
  output: z.string().optional().describe('Path for the output image'),
  size: z.number().int().positive().default(150).describe('QR code display size in pixels'),
  gravity: z
    .enum([
      'NorthWest',
      'North',
      'NorthEast',
      'West',
      'Center',
      'East',
      'SouthWest',
      'South',
      'SouthEast',
    ])
    .default('SouthEast')
    .describe('QR code position'),
  x: z.number().int().default(10).describe('X offset from gravity'),
  y: z.number().int().default(10).describe('Y offset from gravity'),
  background: z.string().default('white').describe('Background behind QR code'),
  padding: z.number().int().min(0).default(8).describe('Padding around QR code'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the product-mockup tool */
export interface ProductMockupParams {
  screenshot: string;
  frame: string;
  output: string;
  screen_x: number;
  screen_y: number;
  screen_width: number;
  screen_height: number;
  background: string;
}

export const productMockupSchema = z.object({
  screenshot: z.string().describe('Path to the screenshot/content image'),
  frame: z.string().describe('Path to the device frame image (transparent PNG)'),
  output: z.string().describe('Path for the output mockup'),
  screen_x: z.number().int().describe('X position of screen area on frame'),
  screen_y: z.number().int().describe('Y position of screen area on frame'),
  screen_width: z.number().int().positive().describe('Width of screen area on frame'),
  screen_height: z.number().int().positive().describe('Height of screen area on frame'),
  background: z.string().default('white').describe('Background color behind the device'),
});

/** Parameters for the email-header tool */
export interface EmailHeaderParams {
  input?: string;
  output: string;
  width: number;
  height: number;
  title?: string;
  subtitle?: string;
  background_color: string;
  text_color: string;
  font: string;
  format: string;
}

export const emailHeaderSchema = z.object({
  input: z.string().optional().describe('Path to a source image (or omit for solid color)'),
  output: z.string().describe('Path for the output email header'),
  width: z.number().int().positive().default(600).describe('Email width (standard: 600)'),
  height: z.number().int().positive().default(200).describe('Header height'),
  title: z.string().optional().describe('Header title text'),
  subtitle: z.string().optional().describe('Subtitle text'),
  background_color: z.string().default('#3B82F6').describe('Background color (if no input image)'),
  text_color: z.string().default('white').describe('Text color'),
  font: z.string().default('Arial-Bold').describe('Font family'),
  format: z.string().default('png').describe('Output format (png or jpg — email safe)'),
});
