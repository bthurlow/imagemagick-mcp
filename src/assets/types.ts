import { z } from 'zod';

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:2' | '2:3' | '4:3' | '3:4';

/** Parameters for the responsive-set tool */
export interface ResponsiveSetParams {
  input: string;
  output_dir: string;
  widths: number[];
  format: string;
  quality: number;
  generate_2x: boolean;
}

export const responsiveSetSchema = z.object({
  input: z.string().describe('Path to the high-res source image'),
  output_dir: z.string().describe('Directory to save responsive variants'),
  widths: z
    .array(z.number().int().positive())
    .default([400, 800, 1200, 1600, 2400])
    .describe('Target widths'),
  format: z.string().default('webp').describe('Output format (webp recommended for web)'),
  quality: z.number().int().min(1).max(100).default(80).describe('Output quality'),
  generate_2x: z.boolean().default(false).describe('Also generate @2x retina variants'),
});

/** Parameters for the favicon-set tool */
export interface FaviconSetParams {
  input: string;
  output_dir: string;
  sizes: number[];
  generate_ico: boolean;
}

export const faviconSetSchema = z.object({
  input: z.string().describe('Path to the source image (ideally square, 512px+)'),
  output_dir: z.string().describe('Directory to save favicon files'),
  sizes: z
    .array(z.number().int().positive())
    .default([16, 32, 48, 180, 192, 512])
    .describe('Favicon sizes'),
  generate_ico: z.boolean().default(true).describe('Generate bundled .ico file (16+32+48)'),
});

/** Parameters for the app-icon-set tool */
export interface AppIconSetParams {
  input: string;
  output_dir: string;
  platforms: ('ios' | 'android')[];
}

export const appIconSetSchema = z.object({
  input: z.string().describe('Path to source icon (1024x1024 recommended)'),
  output_dir: z.string().describe('Directory to save icon sets'),
  platforms: z
    .array(z.enum(['ios', 'android']))
    .default(['ios', 'android'])
    .describe('Target platforms'),
});

/** Splash screen size definition */
export interface SplashScreenSize {
  name: string;
  width: number;
  height: number;
}

/** Parameters for the splash-screen tool */
export interface SplashScreenParams {
  input: string;
  output_dir: string;
  background_color: string;
  mode: 'contain' | 'cover';
  sizes: SplashScreenSize[];
}

export const splashScreenSchema = z.object({
  input: z.string().describe('Path to the splash screen source (logo or full design)'),
  output_dir: z.string().describe('Directory to save splash screens'),
  background_color: z.string().default('white').describe('Background color'),
  mode: z.enum(['contain', 'cover']).default('contain').describe('contain: centered, cover: fill'),
  sizes: z
    .array(
      z.object({
        name: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    )
    .default([
      { name: 'iphone', width: 1170, height: 2532 },
      { name: 'iphone-max', width: 1290, height: 2796 },
      { name: 'ipad', width: 2048, height: 2732 },
      { name: 'android-mdpi', width: 320, height: 480 },
      { name: 'android-hdpi', width: 480, height: 800 },
      { name: 'android-xhdpi', width: 720, height: 1280 },
      { name: 'android-xxhdpi', width: 1080, height: 1920 },
      { name: 'android-xxxhdpi', width: 1440, height: 2560 },
    ])
    .describe('Target screen sizes'),
});

/** Parameters for the sprite-sheet tool */
export interface SpriteSheetParams {
  inputs: string[];
  output: string;
  tile_size: number;
  columns: number;
  padding: number;
  background: string;
}

export const spriteSheetSchema = z.object({
  inputs: z.array(z.string()).min(1).describe('Paths to images to combine'),
  output: z.string().describe('Path for the output sprite sheet'),
  tile_size: z.number().int().positive().default(32).describe('Size to resize each sprite to'),
  columns: z.number().int().min(1).default(10).describe('Number of columns'),
  padding: z.number().int().min(0).default(2).describe('Padding between sprites'),
  background: z.string().default('none').describe('Background color'),
});

/** Parameters for the nine-patch tool */
export interface NinePatchParams {
  input: string;
  output?: string;
  stretch_x_start: number;
  stretch_x_end: number;
  stretch_y_start: number;
  stretch_y_end: number;
  padding_left: number;
  padding_top: number;
  padding_right: number;
  padding_bottom: number;
}

export const ninePatchSchema = z.object({
  input: z.string().describe('Path to the source image'),
  output: z.string().optional().describe('Path for the output .9.png'),
  stretch_x_start: z.number().int().min(1).describe('Start of horizontal stretch region'),
  stretch_x_end: z.number().int().min(1).describe('End of horizontal stretch region'),
  stretch_y_start: z.number().int().min(1).describe('Start of vertical stretch region'),
  stretch_y_end: z.number().int().min(1).describe('End of vertical stretch region'),
  padding_left: z.number().int().min(0).default(0).describe('Content padding left'),
  padding_top: z.number().int().min(0).default(0).describe('Content padding top'),
  padding_right: z.number().int().min(0).default(0).describe('Content padding right'),
  padding_bottom: z.number().int().min(0).default(0).describe('Content padding bottom'),
});

/** Parameters for the aspect-crop-set tool */
export interface AspectCropSetParams {
  input: string;
  output_dir: string;
  ratios: AspectRatio[];
  max_dimension: number;
  format?: string;
}

export const aspectCropSetSchema = z.object({
  input: z.string().describe('Path to the source image'),
  output_dir: z.string().describe('Directory to save cropped variants'),
  ratios: z
    .array(z.enum(['1:1', '4:5', '9:16', '16:9', '3:2', '2:3', '4:3', '3:4']))
    .default(['1:1', '4:5', '9:16', '16:9', '3:2'])
    .describe('Target aspect ratios'),
  max_dimension: z.number().int().positive().default(2000).describe('Maximum width or height'),
  format: z.string().optional().describe('Output format'),
});

/** Parameters for the pdf-to-image tool */
export interface PdfToImageParams {
  input: string;
  output_dir: string;
  pages: string;
  dpi: number;
  format: string;
  quality: number;
}

export const pdfToImageSchema = z.object({
  input: z.string().describe('Path to the PDF file'),
  output_dir: z.string().describe('Directory to save page images'),
  pages: z
    .string()
    .default('0')
    .describe('Page range: "0" for first, "0-3" for pages 1-4, or "all"'),
  dpi: z.number().int().min(72).max(600).default(150).describe('Resolution in DPI'),
  format: z.string().default('png').describe('Output format'),
  quality: z.number().int().min(1).max(100).default(90).describe('Output quality'),
});

/** Parameters for the image-diff tool */
export interface ImageDiffParams {
  image_a: string;
  image_b: string;
  output: string;
  highlight_color: string;
  fuzz: number;
  mode: 'highlight' | 'side-by-side' | 'overlay';
}

export const imageDiffSchema = z.object({
  image_a: z.string().describe('Path to the first image'),
  image_b: z.string().describe('Path to the second image'),
  output: z.string().describe('Path for the diff output image'),
  highlight_color: z.string().default('red').describe('Color to highlight differences'),
  fuzz: z.number().min(0).max(100).default(5).describe('Color difference tolerance (%)'),
  mode: z
    .enum(['highlight', 'side-by-side', 'overlay'])
    .default('highlight')
    .describe('highlight: diff regions. side-by-side: A | diff | B. overlay: difference'),
});

/** Parameters for the optimize-batch tool */
export interface OptimizeBatchParams {
  input_dir: string;
  output_dir: string;
  target_format: string;
  quality: number;
  max_width?: number;
  strip_metadata: boolean;
  recursive: boolean;
}

export const optimizeBatchSchema = z.object({
  input_dir: z.string().describe('Directory containing images to optimize'),
  output_dir: z.string().describe('Directory to save optimized images'),
  target_format: z
    .string()
    .default('webp')
    .describe('Target format (webp, avif, or keep original)'),
  quality: z.number().int().min(1).max(100).default(80).describe('Compression quality'),
  max_width: z.number().int().positive().optional().describe('Maximum width (downscale if larger)'),
  strip_metadata: z.boolean().default(true).describe('Strip EXIF/metadata'),
  recursive: z.boolean().default(false).describe('Process subdirectories'),
});
