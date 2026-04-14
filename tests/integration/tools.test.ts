/**
 * Integration tests — run real ImageMagick commands against real images.
 * One test per category to verify actual image processing works.
 *
 * Requires ImageMagick 7+ installed.
 * Skipped automatically if ImageMagick is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServerClient } from '../helpers/server.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, stat, access } from 'node:fs/promises';
import { readdirSync, accessSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

/**
 * Synchronously find ImageMagick. Checks PATH first, then common install locations.
 * Must be sync so the result is available at test-definition time for skipIf/runIf.
 */
function findImageMagickSync(): boolean {
  // Try PATH first
  try {
    execFileSync('magick', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    // Not on PATH
  }

  const candidates: string[] = [];

  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
    try {
      const entries = readdirSync(programFiles);
      for (const entry of entries) {
        if (entry.startsWith('ImageMagick')) {
          candidates.push(join(programFiles, entry));
        }
      }
    } catch {
      // Can't read Program Files
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/opt/homebrew/bin', '/usr/local/bin');
  } else {
    candidates.push('/usr/bin', '/usr/local/bin');
  }

  for (const dir of candidates) {
    const magickPath = process.platform === 'win32' ? join(dir, 'magick.exe') : join(dir, 'magick');
    try {
      accessSync(magickPath);
      // Found — add to PATH for child processes
      const sep = process.platform === 'win32' ? ';' : ':';
      process.env['PATH'] = `${dir}${sep}${process.env['PATH'] ?? ''}`;
      // Verify it actually runs
      execFileSync('magick', ['--version'], { stdio: 'ignore' });
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

const hasImageMagick = findImageMagickSync();

let testDir: string;
let fixtureImage: string;
let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  if (!hasImageMagick) return;

  // Create temp directory for test outputs
  testDir = join(tmpdir(), `imagemagick-mcp-test-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });

  // Create a simple test fixture image (100x100 red square)
  fixtureImage = join(testDir, 'fixture.png');
  await execFileAsync('magick', ['-size', '100x100', 'xc:red', fixtureImage]);

  // Set up MCP server + client
  const setup = await createTestServerClient();
  client = setup.client;
  cleanup = setup.cleanup;
});

afterAll(async () => {
  if (cleanup) await cleanup();
  if (testDir) {
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  }
});

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fileSize(path: string): Promise<number> {
  const s = await stat(path);
  return s.size;
}

describe('Integration: Core', () => {
  it.skipIf(!hasImageMagick)('resize produces correct dimensions', async () => {
    const output = join(testDir, 'resized.png');
    const result = await client.callTool({
      name: 'resize',
      arguments: { input: fixtureImage, output, width: 50, height: 50 },
    });

    expect(await fileExists(output)).toBe(true);
    expect(await fileSize(output)).toBeGreaterThan(0);

    const { stdout } = await execFileAsync('magick', ['identify', '-format', '%wx%h', output]);
    expect(stdout.trim()).toBe('50x50');

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Resized');
  });
});

describe('Integration: Text', () => {
  it.skipIf(!hasImageMagick)('text-overlay adds text to image', async () => {
    const output = join(testDir, 'text_overlay.png');
    const result = await client.callTool({
      name: 'text-overlay',
      arguments: {
        input: fixtureImage,
        output,
        text: 'Hello',
        size: 16,
        color: 'white',
        x: 10,
        y: 10,
      },
    });

    expect(await fileExists(output)).toBe(true);
    expect(await fileSize(output)).toBeGreaterThan(0);

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Text overlay added');
  });
});

describe('Integration: Compositing', () => {
  it.skipIf(!hasImageMagick)('border adds border to image', async () => {
    const output = join(testDir, 'bordered.png');
    const result = await client.callTool({
      name: 'border',
      arguments: { input: fixtureImage, output, width: 5, color: 'blue' },
    });

    expect(await fileExists(output)).toBe(true);

    const { stdout } = await execFileAsync('magick', ['identify', '-format', '%wx%h', output]);
    expect(stdout.trim()).toBe('110x110');

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Border added');
  });
});

describe('Integration: Color', () => {
  it.skipIf(!hasImageMagick)('adjust modifies image brightness', async () => {
    const output = join(testDir, 'adjusted.png');
    const result = await client.callTool({
      name: 'adjust',
      arguments: { input: fixtureImage, output, brightness: 50 },
    });

    expect(await fileExists(output)).toBe(true);
    expect(await fileSize(output)).toBeGreaterThan(0);

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Adjusted');
  });
});

describe('Integration: Content', () => {
  it.skipIf(!hasImageMagick)('before-after creates comparison image', async () => {
    const fixture2 = join(testDir, 'fixture_blue.png');
    await execFileAsync('magick', ['-size', '100x100', 'xc:blue', fixture2]);

    const output = join(testDir, 'before_after.png');
    const result = await client.callTool({
      name: 'before-after',
      arguments: {
        before: fixtureImage,
        after: fixture2,
        output,
        width: 200,
        height: 100,
      },
    });

    expect(await fileExists(output)).toBe(true);
    expect(await fileSize(output)).toBeGreaterThan(0);

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Before/after comparison');
  });
});

describe('Integration: Ads', () => {
  it.skipIf(!hasImageMagick)('cta-button generates button image', async () => {
    const output = join(testDir, 'cta_button.png');
    const result = await client.callTool({
      name: 'cta-button',
      arguments: { output, text: 'Click Me', width: 200, height: 50 },
    });

    expect(await fileExists(output)).toBe(true);
    expect(await fileSize(output)).toBeGreaterThan(0);

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('CTA button created');
  });
});

describe('Integration: Assets', () => {
  it.skipIf(!hasImageMagick)('favicon-set generates multiple sizes', async () => {
    const outputDir = join(testDir, 'favicons');
    await mkdir(outputDir, { recursive: true });

    const result = await client.callTool({
      name: 'favicon-set',
      arguments: {
        input: fixtureImage,
        output_dir: outputDir,
        sizes: [16, 32],
        generate_ico: false,
      },
    });

    expect(await fileExists(join(outputDir, 'favicon-16x16.png'))).toBe(true);
    expect(await fileExists(join(outputDir, 'favicon-32x32.png'))).toBe(true);

    const { stdout } = await execFileAsync('magick', [
      'identify',
      '-format',
      '%wx%h',
      join(outputDir, 'favicon-16x16.png'),
    ]);
    expect(stdout.trim()).toBe('16x16');

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Generated');
  });
});
