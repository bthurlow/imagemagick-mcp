import { vi } from 'vitest';

/**
 * Captured call from a mocked magick execution.
 */
export interface MagickCall {
  args: string[];
}

/**
 * Shared mock state — lives at module scope so vi.mock factory and tests
 * reference the same object.
 */
export const mockState = {
  calls: [] as MagickCall[],
  identifyOutput: '1920x1080',
};

/**
 * Smart magick mock: captures args, returns identify output for identify commands.
 */
export const mockMagick = vi.fn(async (args: string[]) => {
  mockState.calls.push({ args });
  if (args[0] === 'identify') {
    return mockState.identifyOutput;
  }
  return '';
});

/**
 * Reset all mock state between tests.
 */
export function resetMock(): void {
  mockState.calls.length = 0;
  mockState.identifyOutput = '1920x1080';
  mockMagick.mockClear();
}

/**
 * Set the output returned by identify commands.
 */
export function setIdentifyOutput(output: string): void {
  mockState.identifyOutput = output;
}

/**
 * Factory for vi.mock('src/utils/exec.js').
 * This function is called at module-load time by vi.mock's hoisted factory.
 */
export function createExecMock(): Record<string, unknown> {
  return {
    magick: mockMagick,
    magickBatch: mockMagick,
    validateInputFile: vi.fn(async () => undefined),
    ensureOutputDir: vi.fn(async () => undefined),
    resolveOutputPath: vi.fn(
      (input: string, opts?: { outputPath?: string; suffix?: string; format?: string }) => {
        if (opts?.outputPath) return opts.outputPath;
        const ext = opts?.format ? `.${opts.format}` : '.png';
        const suffix = opts?.suffix ?? '_output';
        return input.replace(/\.[^.]+$/, `${suffix}${ext}`);
      },
    ),
    getExtension: vi.fn((filePath: string) => {
      const match = filePath.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : '';
    }),
    tempPath: vi.fn((ext: string) => `/tmp/test${ext}`),
    SUPPORTED_FORMATS: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'gif', 'bmp', 'ico', 'svg'],
    IAB_BANNER_SIZES: {
      leaderboard: { width: 728, height: 90 },
      'medium-rect': { width: 300, height: 250 },
      'wide-skyscraper': { width: 160, height: 600 },
      'mobile-banner': { width: 320, height: 50 },
      'half-page': { width: 300, height: 600 },
      billboard: { width: 970, height: 250 },
    },
    SOCIAL_SIZES: {
      og: { width: 1200, height: 630 },
      twitter: { width: 1200, height: 675 },
      'instagram-square': { width: 1080, height: 1080 },
    },
    RESPONSIVE_WIDTHS: [400, 800, 1200, 1600, 2400],
    IOS_ICON_SIZES: [{ size: 1024, scales: [1] }],
    ANDROID_ICON_SIZES: { mdpi: 48, xxxhdpi: 192 },
    ASPECT_RATIOS: {
      '1:1': { w: 1, h: 1 },
      '16:9': { w: 16, h: 9 },
    },
  };
}
