# imagemagick-mcp

[![CI](https://github.com/bthurlow/imagemagick-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/bthurlow/imagemagick-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/bthurlow/imagemagick-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/bthurlow/imagemagick-mcp/actions/workflows/release.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fbthurlow.github.io%2Fimagemagick-mcp%2Fbadges%2Fcoverage.json&cacheSeconds=300)](https://github.com/bthurlow/imagemagick-mcp/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/bthurlow/imagemagick-mcp)](https://github.com/bthurlow/imagemagick-mcp/releases/latest)
[![License: MIT](https://img.shields.io/github/license/bthurlow/imagemagick-mcp)](https://github.com/bthurlow/imagemagick-mcp/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple)](https://modelcontextprotocol.io/)

MCP server for ImageMagick — 57 tools for image processing, content creatives, ad generation, and web/mobile asset management.

Built for the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP). Works with Claude Code, Claude Desktop, Cursor, and any MCP-compatible client.

**Repository:** [github.com/bthurlow/imagemagick-mcp](https://github.com/bthurlow/imagemagick-mcp)

## Prerequisites

- **Node.js** 18+
- **ImageMagick 7+** installed with `magick` available in PATH
  - Windows: `choco install imagemagick` or [download installer](https://imagemagick.org/script/download.php#windows)
  - macOS: `brew install imagemagick`
  - Linux: `sudo apt install imagemagick` (ensure v7+ — some distros ship v6)

Verify installation:

```bash
magick --version
# ImageMagick 7.x.x ...
```

## Installation

### From Source

```bash
git clone https://github.com/bthurlow/imagemagick-mcp.git
cd imagemagick-mcp
yarn install
yarn build
```

### Claude Code

```bash
claude mcp add imagemagick -- node /path/to/imagemagick-mcp/dist/index.js
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "imagemagick": {
      "command": "node",
      "args": ["/path/to/imagemagick-mcp/dist/index.js"]
    }
  }
}
```

### Cursor

Add to your MCP settings:

```json
{
  "mcpServers": {
    "imagemagick": {
      "command": "node",
      "args": ["/path/to/imagemagick-mcp/dist/index.js"]
    }
  }
}
```

### npx (once published to npm)

<!-- TODO: Uncomment once published to npm
```bash
# Claude Code
claude mcp add imagemagick -- npx imagemagick-mcp

# Claude Desktop / Cursor
{
  "mcpServers": {
    "imagemagick": {
      "command": "npx",
      "args": ["imagemagick-mcp"]
    }
  }
}
```
-->

## Tools (57)

### Core Operations (10)

| Tool | Description |
|------|-------------|
| `resize` | Resize with aspect ratio control (fit, fill, stretch) |
| `crop` | Rectangular crop by coordinates |
| `smart-crop` | Content-aware crop detecting focal point |
| `rotate` | Rotate by degrees with background fill |
| `flip` | Horizontal/vertical mirror |
| `format-convert` | Convert between PNG, WebP, AVIF, JPEG, TIFF, ICO, SVG |
| `compress` | Quality/size optimization with format-aware defaults |
| `info` | Get dimensions, format, color space, DPI, alpha |
| `strip-metadata` | Remove EXIF/GPS/ICC for privacy and smaller files |
| `batch` | Chain multiple operations in a single call |

### Text & Typography (5)

| Tool | Description |
|------|-------------|
| `text-overlay` | Add text with font, size, color, position, rotation |
| `text-fit` | Auto-size text to fill a bounding box |
| `text-path` | Curved/circular text for badges and stamps |
| `annotate` | Arrows, circles, numbered callouts for tutorials |
| `caption-bar` | Solid/gradient bar with text at top or bottom |

### Compositing & Layers (8)

| Tool | Description |
|------|-------------|
| `composite` | Layer images with blend modes (multiply, screen, overlay) |
| `watermark` | Tiled or positioned watermark with opacity |
| `gradient-overlay` | Linear/radial gradient for text readability |
| `background-remove` | Remove/replace backgrounds via color keying |
| `drop-shadow` | Realistic drop shadow for product shots |
| `border` | Solid, raised, or sunken borders |
| `rounded-corners` | Round corners with transparent background |
| `mask-apply` | Circle, rounded-rect, or custom image masks |

### Color & Effects (8)

| Tool | Description |
|------|-------------|
| `adjust` | Brightness, contrast, saturation, hue, gamma |
| `tint` | Single-color tint or duotone effect |
| `blur` | Gaussian, motion, or radial blur (full or region) |
| `sharpen` | Unsharp mask or adaptive sharpening |
| `pixelate-region` | Pixelate or blur a region to redact info |
| `color-extract` | Extract dominant colors as hex palette |
| `normalize` | Auto-level, equalize, auto-gamma |
| `vignette` | Dark edge vignette effect |

### Content Creatives (8)

| Tool | Description |
|------|-------------|
| `social-card` | Generate cards for OG, Twitter, Instagram, Pinterest, LinkedIn, YouTube, Facebook |
| `thumbnail` | Video thumbnail with title, gradient, branding |
| `collage` | Grid layout from multiple images |
| `carousel-set` | Numbered slides with branding and progress bar |
| `before-after` | Side-by-side comparison with divider and labels |
| `gif-from-frames` | Animated GIF from image sequence |
| `sticker-cutout` | Die-cut sticker with white border and shadow |
| `quote-card` | Stylized quote with attribution and accent line |

### Ad Creatives (8)

| Tool | Description |
|------|-------------|
| `banner-set` | All IAB standard sizes from one design |
| `cta-button` | Call-to-action button with gradient and shadow |
| `price-badge` | Circle, star, rectangle, or ribbon badges |
| `a-b-variants` | Color/copy/style variations for split testing |
| `template-fill` | Fill templates with dynamic text and images |
| `qr-code-overlay` | Composite QR codes onto materials |
| `product-mockup` | Place screenshots onto device frames |
| `email-header` | Email-safe headers at standard widths |

### Web & Mobile Assets (10)

| Tool | Description |
|------|-------------|
| `responsive-set` | srcset variants (400w-2400w) with optional @2x |
| `favicon-set` | All favicon sizes plus ICO bundle |
| `app-icon-set` | iOS (all point sizes) + Android (mdpi-xxxhdpi) icons |
| `splash-screen` | Launch screens for all device sizes |
| `sprite-sheet` | Combine images into sprite with CSS offset data |
| `nine-patch` | Android 9-patch with stretch region markers |
| `aspect-crop-set` | Crop to all common ratios (1:1, 4:5, 9:16, 16:9, 3:2) |
| `pdf-to-image` | Convert PDF pages to images |
| `image-diff` | Compare images with highlight, side-by-side, or overlay |
| `optimize-batch` | Bulk compress with format conversion and size reports |

## Development

```bash
# Install dependencies
yarn install

# Run in development (tsx, no build needed)
yarn dev

# Build for production
yarn build

# Run checks
yarn lint          # ESLint (typescript-eslint strict)
yarn lint:fix      # ESLint auto-fix
yarn format        # Prettier write
yarn format:check  # Prettier check
yarn typecheck     # tsc --noEmit
yarn check         # lint + format:check + build
```

## Architecture

```
src/
├── index.ts              # Server entry, tool registration
├── core/                 # resize, crop, rotate, flip, convert, compress, info, batch
│   ├── types.ts          # Interfaces + Zod schemas
│   └── index.ts          # Tool handlers
├── text/                 # text-overlay, text-fit, text-path, annotate, caption-bar
├── compositing/          # composite, watermark, gradient, bg-remove, shadow, border, mask
├── color/                # adjust, tint, blur, sharpen, pixelate, color-extract, normalize
├── content/              # social-card, thumbnail, collage, carousel, before-after, gif, sticker, quote
├── ads/                  # banner-set, cta-button, price-badge, a-b-variants, template-fill, qr, mockup, email
├── assets/               # responsive-set, favicon, app-icon, splash, sprite, nine-patch, aspect-crop, pdf, diff, optimize
└── utils/
    ├── exec.ts           # ImageMagick CLI wrapper, file validation, constants
    └── register.ts       # Type-erased server.tool() wrapper (see ADR-001)
```

Each category follows the same pattern:
- `types.ts` — TypeScript interfaces + colocated Zod schemas
- `index.ts` — Tool handlers using `registerTool<ParamType>()` wrapper

See [docs/adr/](docs/adr/) for architectural decision records.

## License

MIT
