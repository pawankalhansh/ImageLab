# ImageLab

A comprehensive, 100% client-side image processing suite.

ImageLab runs entirely in your web browser, meaning your images are never uploaded to any servers. It features a modern, responsive user interface and offers a variety of tools for image manipulation.

## Features

- **Compress** — Reduce JPG, PNG, and WebP file size while keeping quality.
- **Crop & Resize** — Crop, rotate, flip, and resize to exact dimensions (by percent or pixel).
- **Convert** — Convert to/from JPG, PNG, WebP, GIF, and BMP; HTML to image; JPG/PNG to multi-page PDF.
- **Filters** — Brightness, contrast, saturation, grayscale, sepia, and more.
- **Watermark & Blur** — Text watermarks (custom typography, transparency & position) and privacy blur regions.
- **Meme Generator** — Top and bottom text on any image.

## How to Run Locally

You don't need a backend server to run this app!

1. Clone this repository.
2. Serve the folder with any static server:

   ```
   # Python
   python -m http.server 8080

   # Node (npx)
   npx serve .
   ```

3. Open `http://localhost:8080` in your browser.

Opening `index.html` directly via `file://` also works for all tools.

## Privacy

All image processing happens entirely on your device. Images are never uploaded or transmitted anywhere.

## Live Demo

https://pawankalhansh.github.io/ImageLab/
