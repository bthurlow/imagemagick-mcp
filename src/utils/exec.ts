import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, stat } from 'node:fs/promises';
import { dirname, extname, join, parse } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

/** Maximum execution time for ImageMagick commands (30 seconds) */
const EXEC_TIMEOUT = 30_000;

/** Maximum execution time for batch operations (120 seconds) */
const BATCH_TIMEOUT = 120_000;

/**
 * Execute an ImageMagick command via the `magick` CLI.
 * Returns stdout on success, throws on failure with stderr details.
 */
export async function magick(args: string[], options?: { timeout?: number }): Promise<string> {
  const timeout = options?.timeout ?? EXEC_TIMEOUT;
  try {
    const { stdout, stderr } = await execFileAsync('magick', args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stderr && !stderr.includes('warning')) {
      // ImageMagick writes some info to stderr that isn't an error
    }
    return stdout;
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    const message = err.stderr || err.message || 'Unknown ImageMagick error';
    throw new Error(`ImageMagick failed: ${message}`, { cause: error });
  }
}

/**
 * Execute an ImageMagick command with the batch timeout.
 */
export async function magickBatch(args: string[]): Promise<string> {
  return magick(args, { timeout: BATCH_TIMEOUT });
}

/**
 * Validate that a file exists and is readable.
 */
export async function validateInputFile(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
  const stats = await stat(filePath);
  if (!stats.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }
}

/**
 * Ensure the output directory exists, creating it if needed.
 */
export async function ensureOutputDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

/**
 * Generate an output path based on the input path and a suffix/format.
 * If outputPath is provided, uses that. Otherwise generates from input.
 */
export function resolveOutputPath(
  inputPath: string,
  options?: {
    outputPath?: string;
    suffix?: string;
    format?: string;
  },
): string {
  if (options?.outputPath) {
    return options.outputPath;
  }
  const parsed = parse(inputPath);
  const suffix = options?.suffix ?? '_output';
  const ext = options?.format ? `.${options.format}` : parsed.ext;
  return join(parsed.dir, `${parsed.name}${suffix}${ext}`);
}

/**
 * Create a temporary file path with the given extension.
 */
export function tempPath(ext: string): string {
  return join(tmpdir(), `imagemagick-mcp-${randomUUID()}${ext}`);
}

/**
 * Get the file extension without the dot, lowercased.
 */
export function getExtension(filePath: string): string {
  return extname(filePath).slice(1).toLowerCase();
}

/** Common image formats supported by ImageMagick */
export const SUPPORTED_FORMATS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'tiff',
  'tif',
  'gif',
  'bmp',
  'ico',
  'svg',
  'pdf',
  'heic',
  'heif',
] as const;

/** Standard IAB ad banner sizes */
export const IAB_BANNER_SIZES: Record<string, { width: number; height: number }> = {
  leaderboard: { width: 728, height: 90 },
  'medium-rect': { width: 300, height: 250 },
  'wide-skyscraper': { width: 160, height: 600 },
  'mobile-banner': { width: 320, height: 50 },
  'half-page': { width: 300, height: 600 },
  billboard: { width: 970, height: 250 },
  'large-leaderboard': { width: 970, height: 90 },
  'mobile-large': { width: 320, height: 100 },
  square: { width: 250, height: 250 },
};

/** Social media image sizes */
export const SOCIAL_SIZES: Record<string, { width: number; height: number }> = {
  og: { width: 1200, height: 630 },
  twitter: { width: 1200, height: 675 },
  'instagram-square': { width: 1080, height: 1080 },
  'instagram-portrait': { width: 1080, height: 1350 },
  'instagram-story': { width: 1080, height: 1920 },
  pinterest: { width: 1000, height: 1500 },
  linkedin: { width: 1200, height: 627 },
  'facebook-cover': { width: 820, height: 312 },
  'youtube-thumb': { width: 1280, height: 720 },
};

/** Common responsive breakpoint widths */
export const RESPONSIVE_WIDTHS = [400, 800, 1200, 1600, 2400];

/** iOS app icon sizes (point size × scale) */
export const IOS_ICON_SIZES = [
  { size: 20, scales: [2, 3] },
  { size: 29, scales: [2, 3] },
  { size: 38, scales: [2, 3] },
  { size: 40, scales: [2, 3] },
  { size: 60, scales: [2, 3] },
  { size: 64, scales: [2, 3] },
  { size: 68, scales: [2] },
  { size: 76, scales: [2] },
  { size: 83.5, scales: [2] },
  { size: 1024, scales: [1] },
];

/** Android drawable density pixel sizes for launcher icons */
export const ANDROID_ICON_SIZES: Record<string, number> = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

/** Common aspect ratios as width:height fractions */
export const ASPECT_RATIOS: Record<string, { w: number; h: number }> = {
  '1:1': { w: 1, h: 1 },
  '4:5': { w: 4, h: 5 },
  '9:16': { w: 9, h: 16 },
  '16:9': { w: 16, h: 9 },
  '3:2': { w: 3, h: 2 },
  '2:3': { w: 2, h: 3 },
  '4:3': { w: 4, h: 3 },
  '3:4': { w: 3, h: 4 },
};
