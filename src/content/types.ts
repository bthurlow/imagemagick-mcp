import { z } from 'zod';

export type SocialPlatform =
  | 'og'
  | 'twitter'
  | 'instagram-square'
  | 'instagram-portrait'
  | 'instagram-story'
  | 'pinterest'
  | 'linkedin'
  | 'facebook-cover'
  | 'youtube-thumb';

/** Parameters for the social-card tool */
export interface SocialCardParams {
  input: string;
  output_dir: string;
  title?: string;
  subtitle?: string;
  platforms: SocialPlatform[];
  font: string;
  text_color: string;
  overlay_color: string;
}

export const socialCardSchema = z.object({
  input: z.string().describe('Path to the background/hero image'),
  output_dir: z.string().describe('Directory to save generated cards'),
  title: z.string().optional().describe('Title text to overlay'),
  subtitle: z.string().optional().describe('Subtitle text'),
  platforms: z
    .array(
      z.enum([
        'og',
        'twitter',
        'instagram-square',
        'instagram-portrait',
        'instagram-story',
        'pinterest',
        'linkedin',
        'facebook-cover',
        'youtube-thumb',
      ]),
    )
    .default(['og', 'twitter'])
    .describe('Target platforms'),
  font: z.string().default('Arial').describe('Font family'),
  text_color: z.string().default('white').describe('Text color'),
  overlay_color: z.string().default('#00000080').describe('Gradient/overlay color'),
});

/** Parameters for the thumbnail tool */
export interface ThumbnailParams {
  input: string;
  output?: string;
  title: string;
  subtitle?: string;
  width: number;
  height: number;
  font: string;
  text_color: string;
  overlay_color: string;
  logo?: string;
  format?: string;
}

export const thumbnailSchema = z.object({
  input: z.string().describe('Path to the source image or video frame'),
  output: z.string().optional().describe('Path for the output thumbnail'),
  title: z.string().describe('Thumbnail title text'),
  subtitle: z.string().optional().describe('Subtitle text'),
  width: z.number().int().positive().default(1280).describe('Thumbnail width'),
  height: z.number().int().positive().default(720).describe('Thumbnail height'),
  font: z.string().default('Arial-Bold').describe('Font family'),
  text_color: z.string().default('white').describe('Text color'),
  overlay_color: z.string().default('#000000AA').describe('Gradient overlay color'),
  logo: z.string().optional().describe('Path to logo image to overlay'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the collage tool */
export interface CollageParams {
  inputs: string[];
  output: string;
  columns: number;
  tile_width: number;
  tile_height: number;
  gap: number;
  background: string;
}

export const collageSchema = z.object({
  inputs: z.array(z.string()).min(2).describe('Paths to images to combine'),
  output: z.string().describe('Path for the output collage'),
  columns: z.number().int().min(1).default(2).describe('Number of columns'),
  tile_width: z.number().int().positive().default(400).describe('Width of each tile'),
  tile_height: z.number().int().positive().default(400).describe('Height of each tile'),
  gap: z.number().int().min(0).default(4).describe('Gap between tiles in pixels'),
  background: z.string().default('white').describe('Background color for gaps'),
});

/** Parameters for the carousel-set tool */
export interface CarouselSetParams {
  inputs: string[];
  output_dir: string;
  width: number;
  height: number;
  show_numbers: boolean;
  number_style: 'circle' | 'plain';
  brand_color: string;
  font: string;
}

export const carouselSetSchema = z.object({
  inputs: z.array(z.string()).min(1).describe('Paths to images for each slide'),
  output_dir: z.string().describe('Directory to save carousel slides'),
  width: z.number().int().positive().default(1080).describe('Slide width'),
  height: z.number().int().positive().default(1080).describe('Slide height'),
  show_numbers: z.boolean().default(true).describe('Show slide numbers'),
  number_style: z.enum(['circle', 'plain']).default('circle').describe('Number badge style'),
  brand_color: z.string().default('#3B82F6').describe('Brand accent color'),
  font: z.string().default('Arial-Bold').describe('Font family'),
});

/** Parameters for the before-after tool */
export interface BeforeAfterParams {
  before: string;
  after: string;
  output: string;
  width: number;
  height: number;
  divider_width: number;
  divider_color: string;
  label_before: string;
  label_after: string;
  font: string;
}

export const beforeAfterSchema = z.object({
  before: z.string().describe('Path to the "before" image'),
  after: z.string().describe('Path to the "after" image'),
  output: z.string().describe('Path for the output comparison image'),
  width: z.number().int().positive().default(1200).describe('Total output width'),
  height: z.number().int().positive().default(600).describe('Total output height'),
  divider_width: z.number().int().min(0).default(4).describe('Divider line width'),
  divider_color: z.string().default('white').describe('Divider line color'),
  label_before: z.string().default('Before').describe('Label for left side'),
  label_after: z.string().default('After').describe('Label for right side'),
  font: z.string().default('Arial-Bold').describe('Font family'),
});

/** Parameters for the gif-from-frames tool */
export interface GifFromFramesParams {
  inputs: string[];
  output: string;
  delay: number;
  loop: number;
  width?: number;
  height?: number;
  optimize: boolean;
}

export const gifFromFramesSchema = z.object({
  inputs: z.array(z.string()).min(2).describe('Paths to frame images (in order)'),
  output: z.string().describe('Path for the output GIF'),
  delay: z.number().int().min(1).default(50).describe('Delay between frames in centiseconds'),
  loop: z.number().int().min(0).default(0).describe('Loop count (0 = infinite)'),
  width: z.number().int().positive().optional().describe('Resize width'),
  height: z.number().int().positive().optional().describe('Resize height'),
  optimize: z.boolean().default(true).describe('Optimize GIF for smaller file size'),
});

/** Parameters for the sticker-cutout tool */
export interface StickerCutoutParams {
  input: string;
  output?: string;
  border_width: number;
  shadow_offset: number;
  shadow_blur: number;
  shadow_color: string;
  format?: string;
}

export const stickerCutoutSchema = z.object({
  input: z.string().describe('Path to the input image (ideally with transparent background)'),
  output: z.string().optional().describe('Path for the output sticker'),
  border_width: z.number().int().min(1).default(8).describe('White border width in pixels'),
  shadow_offset: z.number().int().default(4).describe('Shadow offset'),
  shadow_blur: z.number().min(0).default(6).describe('Shadow blur radius'),
  shadow_color: z.string().default('#00000040').describe('Shadow color'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the quote-card tool */
export interface QuoteCardParams {
  output: string;
  quote: string;
  attribution?: string;
  width: number;
  height: number;
  background_color: string;
  text_color: string;
  accent_color: string;
  font: string;
  background_image?: string;
}

export const quoteCardSchema = z.object({
  output: z.string().describe('Path for the output image'),
  quote: z.string().describe('The quote text'),
  attribution: z.string().optional().describe('Attribution (e.g., "— Jane Doe, CEO")'),
  width: z.number().int().positive().default(1080).describe('Card width'),
  height: z.number().int().positive().default(1080).describe('Card height'),
  background_color: z.string().default('#1a1a2e').describe('Background color'),
  text_color: z.string().default('white').describe('Quote text color'),
  accent_color: z.string().default('#e94560').describe('Accent color (quotation marks, line)'),
  font: z.string().default('Georgia').describe('Quote font'),
  background_image: z.string().optional().describe('Optional background image path'),
});
