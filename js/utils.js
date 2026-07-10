/* ========================================
   ImageLab — Shared Utilities
   ======================================== */

const ImageUtils = {
    /**
     * Load an image file and return a promise with the Image element
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Load image from a data URL
     */
    loadImageFromURL(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = url;
        });
    },

    /**
     * Draw image to a new canvas with specified dimensions
     */
    drawToCanvas(img, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        return { canvas, ctx };
    },

    /**
     * Convert canvas to blob
     */
    canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), type, quality);
        });
    },

    /**
     * Download a blob or canvas as a file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    downloadCanvas(canvas, filename, type = 'image/png', quality = 0.92) {
        canvas.toBlob((blob) => {
            if (blob) this.downloadBlob(blob, filename);
        }, type, quality);
    },

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get file extension
     */
    getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    /**
     * Get MIME type from extension
     */
    getMimeType(ext) {
        const map = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'webp': 'image/webp',
            'gif': 'image/gif', 'bmp': 'image/bmp',
            'svg': 'image/svg+xml', 'ico': 'image/x-icon',
            'tiff': 'image/tiff', 'tif': 'image/tiff',
        };
        return map[ext] || 'image/png';
    },

    /**
     * Get extension from MIME type
     */
    getExtFromMime(mime) {
        const map = {
            'image/jpeg': 'jpg', 'image/png': 'png',
            'image/webp': 'webp', 'image/gif': 'gif',
            'image/bmp': 'bmp', 'image/svg+xml': 'svg'
        };
        return map[mime] || 'png';
    },

    /**
     * Generate output filename
     */
    getOutputFilename(originalName, suffix, newExt) {
        const base = originalName.replace(/\.[^.]+$/, '');
        const ext = newExt || this.getExtension(originalName);
        return `${base}_${suffix}.${ext}`;
    },

    /**
     * Apply CSS filters to a canvas via an offscreen canvas
     */
    applyFilters(sourceCanvas, filters) {
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        const ctx = canvas.getContext('2d');
        ctx.filter = filters;
        ctx.drawImage(sourceCanvas, 0, 0);
        return canvas;
    },

    /**
     * Apply box blur to a region of the canvas
     */
    blurRegion(canvas, x, y, w, h, radius = 10) {
        const ctx = canvas.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the region
        tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

        // Scale down and up for blur effect
        const scale = Math.max(1, radius);
        const smallW = Math.max(1, Math.floor(w / scale));
        const smallH = Math.max(1, Math.floor(h / scale));

        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = smallW;
        smallCanvas.height = smallH;
        const smallCtx = smallCanvas.getContext('2d');

        smallCtx.drawImage(tempCanvas, 0, 0, smallW, smallH);
        tempCtx.clearRect(0, 0, w, h);
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.drawImage(smallCanvas, 0, 0, w, h);

        // Draw back
        ctx.drawImage(tempCanvas, x, y);
        return canvas;
    }
};

/* ---- Toast System ---- */
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 3000) {
        this.init();
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
        this.container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); },
    warning(msg) { this.show(msg, 'warning'); }
};

/* ---- Upload Zone Helper ---- */
function setupUploadZone(zoneId, fileInputId, onFiles, accept = 'image/*') {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(fileInputId);
    if (!zone || !input) return;

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length) onFiles(e.target.files);
    });
}

/* ---- Dynamic script loader (cached) ---- */
const _loadedScripts = new Map();
function loadScript(src) {
    if (_loadedScripts.has(src)) return _loadedScripts.get(src);
    const promise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === '1') return resolve();
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = '1';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
    _loadedScripts.set(src, promise);
    return promise;
}

/**
 * High-quality canvas upscale with multi-step scaling + unsharp mask.
 * Reliable offline fallback when AI upscalers fail to load.
 */
function canvasUpscale(img, scaleFactor) {
    let src = img;
    let currentW = img.width;
    let currentH = img.height;
    const targetW = Math.round(img.width * scaleFactor);
    const targetH = Math.round(img.height * scaleFactor);

    // Step up by at most 2x per pass for better interpolation quality
    while (currentW < targetW || currentH < targetH) {
        const nextW = Math.min(targetW, Math.round(currentW * 2));
        const nextH = Math.min(targetH, Math.round(currentH * 2));
        const canvas = document.createElement('canvas');
        canvas.width = nextW;
        canvas.height = nextH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, nextW, nextH);
        src = canvas;
        currentW = nextW;
        currentH = nextH;
    }

    // Light unsharp mask for perceived sharpness
    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const octx = out.getContext('2d');
    octx.drawImage(src, 0, 0);

    const imageData = octx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);
    const amount = 0.35;
    const w = targetW;

    for (let y = 1; y < targetH - 1; y++) {
        for (let x = 1; x < targetW - 1; x++) {
            const i = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
                const center = copy[i + c];
                const blur =
                    (copy[i - w * 4 + c] +
                        copy[i + w * 4 + c] +
                        copy[i - 4 + c] +
                        copy[i + 4 + c] +
                        center) /
                    5;
                data[i + c] = Math.max(0, Math.min(255, center + (center - blur) * amount));
            }
        }
    }
    octx.putImageData(imageData, 0, 0);
    return out;
}
