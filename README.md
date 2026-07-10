# ImageLab

A comprehensive, 100% client-side image processing suite.

ImageLab runs entirely in your web browser, meaning your images are never uploaded to any servers. It features a modern, responsive user interface and offers a variety of tools for image manipulation.

## Features

- **Compress** — Reduce JPG, PNG, and WebP file size while keeping quality.
- **Upscale Image** — Enlarge 2x/4x with multi-step high-quality resampling (and optional AI super-resolution).
- **Remove Background** — AI subject segmentation via `@imgly/background-removal` (local, cached model).
- **Crop & Resize** — Crop, rotate, flip, and resize to exact dimensions.
- **Convert** — Convert to/from JPG, PNG, WebP; HTML to image; JPG/PNG to multi-page PDF.
- **Filters** — Brightness, contrast, saturation, grayscale, sepia, and more.
- **Watermark & Blur** — Text watermarks and privacy blur regions.
- **Meme Generator** — Top and bottom text on any image.

## How to Run Locally

You don't need a backend server to run this app!

1. Clone this repository.
2. Serve the folder with any static server (recommended for AI tools that load modules from CDNs):

   ```bash
   # Python
   python -m http.server 8080

   # Node (npx)
   npx serve .
   ```

3. Open `http://localhost:8080` in your browser.

Opening `index.html` via `file://` works for most tools, but **Remove Background** and **AI Upscale** need a local HTTP server because they load ES modules from CDNs.

## Privacy

Image processing happens on your device. AI models for background removal / upscale are downloaded from public CDNs on first use and cached by the browser — your images themselves are not uploaded for processing.

## Live Demo

[https://pawankalhansh.github.io/ImageLab/](https://pawankalhansh.github.io/ImageLab/)
