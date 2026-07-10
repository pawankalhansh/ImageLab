const RemoveBgTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>AI background removal that runs entirely in your browser. No uploads.</p>
                </div>
                
                <div id="rbg-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="rbg-file-input" accept="image/*">
                    </div>
                </div>

                <div id="rbg-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Background Removal</h3>
                            <p class="text-slate-400 mt-8 text-sm">
                                Automatically detects the main subject and removes the background using a local AI model.
                            </p>

                            <div class="info-box mt-16" style="background: rgba(144, 238, 144, 0.1); border-left: 3px solid #4ade80;">
                                <p style="font-size: 0.8rem; color: #4ade80; margin: 0;" id="rbg-model-status">
                                    <b>Note:</b> The AI model downloads on first use (~40–80MB) and is cached for later.
                                </p>
                            </div>
                            
                            <div class="actions-bar mt-24" style="flex-direction: column;">
                                <button id="rbg-process-btn" class="btn btn-primary w-full mb-12">Remove Background</button>
                                <button id="rbg-reset-btn" class="btn btn-outline w-full mb-12">Reset Image</button>
                                <button id="rbg-download-btn" class="btn btn-success w-full" disabled>Download PNG</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="rbg-canvas"></canvas>
                            
                            <div id="rbg-loading" class="loading-overlay hidden">
                                <div class="spinner"></div>
                                <div class="loading-text mt-12 text-center" style="max-width: 250px;">
                                    <div id="rbg-status-title" class="font-bold">Loading AI Engine...</div>
                                    <div id="rbg-progress-text" class="text-sm mt-4 text-slate-300">Preparing...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    file: null,
    originalImg: null,
    canvas: null,
    ctx: null,
    processedBlob: null,
    removeBackgroundFn: null,

    init(config) {
        setupUploadZone('rbg-upload-zone', 'rbg-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('rbg-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    this.processedBlob = null;
                    document.getElementById('rbg-download-btn').disabled = true;
                    document.getElementById('rbg-process-btn').disabled = false;
                    document.getElementById('rbg-process-btn').textContent = 'Remove Background';

                    document.getElementById('rbg-upload-zone').classList.add('hidden');
                    document.getElementById('rbg-workspace').classList.add('active');

                    this.drawPreview(this.originalImg);
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        document.getElementById('rbg-process-btn').addEventListener('click', () => {
            this.processBackground();
        });

        document.getElementById('rbg-reset-btn').addEventListener('click', () => {
            this.processedBlob = null;
            document.getElementById('rbg-download-btn').disabled = true;
            document.getElementById('rbg-workspace').classList.remove('active');
            document.getElementById('rbg-upload-zone').classList.remove('hidden');
            document.getElementById('rbg-file-input').value = '';
            document.getElementById('rbg-process-btn').textContent = 'Remove Background';
            document.getElementById('rbg-process-btn').disabled = false;
        });

        document.getElementById('rbg-download-btn').addEventListener('click', () => {
            if (this.processedBlob) this.download();
        });
    },

    drawPreview(source) {
        const maxSize = 800;
        let w = source.width || source.naturalWidth;
        let h = source.height || source.naturalHeight;

        if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.clearRect(0, 0, w, h);

        // Checkerboard for transparent PNGs
        this.drawCheckerboard(w, h);
        this.ctx.drawImage(source, 0, 0, w, h);
    },

    drawCheckerboard(w, h) {
        const size = 12;
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                const dark = ((x / size) + (y / size)) % 2 === 0;
                this.ctx.fillStyle = dark ? '#2a2a3a' : '#3a3a4a';
                this.ctx.fillRect(x, y, size, size);
            }
        }
    },

    async ensureLibrary() {
        if (this.removeBackgroundFn) return this.removeBackgroundFn;

        const statusTitle = document.getElementById('rbg-status-title');
        const progressText = document.getElementById('rbg-progress-text');
        statusTitle.textContent = 'Loading AI library...';
        progressText.textContent = 'Downloading @imgly/background-removal';

        // Prefer ESM import from jsDelivr
        const mod = await import(
            'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs'
        );
        this.removeBackgroundFn = mod.removeBackground || mod.default?.removeBackground || mod.default;
        if (typeof this.removeBackgroundFn !== 'function') {
            throw new Error('Background removal library failed to initialize');
        }
        return this.removeBackgroundFn;
    },

    async processBackground() {
        if (!this.file) return;

        const loadingOverlay = document.getElementById('rbg-loading');
        const statusTitle = document.getElementById('rbg-status-title');
        const progressText = document.getElementById('rbg-progress-text');
        const processBtn = document.getElementById('rbg-process-btn');

        loadingOverlay.classList.remove('hidden');
        processBtn.disabled = true;
        document.getElementById('rbg-download-btn').disabled = true;

        try {
            const removeBackground = await this.ensureLibrary();

            statusTitle.textContent = 'Removing background...';
            progressText.textContent = 'Running neural network (first run downloads the model)';

            const resultBlob = await removeBackground(this.file, {
                progress: (key, current, total) => {
                    if (total > 0) {
                        const pct = Math.round((current / total) * 100);
                        progressText.textContent = `${key || 'Progress'}: ${pct}%`;
                    } else {
                        progressText.textContent = key || 'Processing...';
                    }
                },
            });

            this.processedBlob = resultBlob;

            const resultUrl = URL.createObjectURL(resultBlob);
            const resultImg = await ImageUtils.loadImageFromURL(resultUrl);
            this.drawPreview(resultImg);
            URL.revokeObjectURL(resultUrl);

            document.getElementById('rbg-model-status').innerHTML =
                '<b>Ready:</b> Model is cached in your browser for faster next runs.';
            document.getElementById('rbg-download-btn').disabled = false;
            processBtn.textContent = 'Process Again';
            processBtn.disabled = false;
            Toast.success('Background removed successfully!');
        } catch (e) {
            console.error(e);
            Toast.error('Failed to remove background: ' + (e.message || e));
            processBtn.disabled = false;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    },

    download() {
        if (!this.processedBlob) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'nobg', 'png');
        ImageUtils.downloadBlob(this.processedBlob, newName);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
        this.processedBlob = null;
        // Keep library loaded for reuse across navigations within the session
    }
};
