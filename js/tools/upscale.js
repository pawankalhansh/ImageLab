const UpscaleTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="upscale-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="upscale-file-input" accept="image/*">
                    </div>
                </div>

                <div id="upscale-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Upscale Settings</h3>
                            
                            <div class="control-group mt-16">
                                <div class="control-label">Scale Factor</div>
                                <div class="options-grid w-full mt-8">
                                    <button type="button" class="preset-btn active" data-scale="2">2x</button>
                                    <button type="button" class="preset-btn" data-scale="4">4x</button>
                                </div>
                            </div>

                            <div class="info-box mt-24">
                                <div class="info-row">
                                    <span>Original:</span>
                                    <span id="upscale-orig-size" class="text-white">-</span>
                                </div>
                                <div class="info-row mt-8">
                                    <span>Upscaled:</span>
                                    <span id="upscale-new-size" class="text-accent font-medium">-</span>
                                </div>
                            </div>
                            
                            <div class="info-box mt-16" id="upscale-method-note" style="background: rgba(144, 238, 144, 0.1); border-left: 3px solid #4ade80;">
                                <p style="font-size: 0.8rem; color: #4ade80; margin: 0;">
                                    <b>High Quality:</b> Multi-step resampling with sharpening. Fast, private, works offline.
                                </p>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="upscale-btn" class="btn btn-primary w-full">Upscale Image</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="upscale-canvas"></canvas>
                            
                            <div id="upscale-loading" class="loading-overlay hidden">
                                <div class="spinner"></div>
                                <div class="loading-text mt-12 text-center" style="max-width: 220px;">Processing...</div>
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
    scaleFactor: 2,
    processedBlob: null,

    init(config) {
        setupUploadZone('upscale-upload-zone', 'upscale-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('upscale-canvas');
                    this.ctx = this.canvas.getContext('2d');

                    document.getElementById('upscale-upload-zone').classList.add('hidden');
                    document.getElementById('upscale-workspace').classList.add('active');

                    this.updateInfo();
                    this.drawPreview();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        document.querySelectorAll('#upscale-workspace .preset-btn[data-scale]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#upscale-workspace .preset-btn[data-scale]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.scaleFactor = parseInt(e.currentTarget.dataset.scale, 10);
                this.updateInfo();
            });
        });

        document.getElementById('upscale-btn').addEventListener('click', () => {
            if (this.processedBlob) {
                this.download();
            } else {
                this.processUpscale();
            }
        });
    },

    updateInfo() {
        if (!this.originalImg) return;
        const w = this.originalImg.width;
        const h = this.originalImg.height;
        document.getElementById('upscale-orig-size').textContent = `${w} \u00d7 ${h}`;
        document.getElementById('upscale-new-size').textContent = `${w * this.scaleFactor} \u00d7 ${h * this.scaleFactor}`;
        this.processedBlob = null;

        const btn = document.getElementById('upscale-btn');
        btn.textContent = 'Upscale Image';
        btn.className = 'btn btn-primary w-full';
        btn.disabled = false;
    },

    drawPreview(source) {
        const img = source || this.originalImg;
        if (!img) return;

        const maxSize = 800;
        let w = img.width;
        let h = img.height;

        if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(img, 0, 0, w, h);
    },

    async processUpscale() {
        if (!this.originalImg) return;

        const loadingOverlay = document.getElementById('upscale-loading');
        const loadingText = document.querySelector('#upscale-loading .loading-text');
        const btn = document.getElementById('upscale-btn');

        loadingOverlay.classList.remove('hidden');
        btn.disabled = true;

        try {
            await new Promise(r => setTimeout(r, 50));

            loadingText.textContent = 'High-quality resampling...';
            const resultCanvas = canvasUpscale(this.originalImg, this.scaleFactor);

            this.drawPreview(resultCanvas);

            // Determine output format — keep PNG for PNGs, use JPEG for others
            const isPng = this.file.type === 'image/png' || this.file.name.toLowerCase().endsWith('.png');
            const mimeType = isPng ? 'image/png' : 'image/jpeg';
            const quality = isPng ? undefined : 0.95;

            this.processedBlob = await ImageUtils.canvasToBlob(resultCanvas, mimeType, quality);

            btn.textContent = 'Download Image';
            btn.className = 'btn btn-success w-full';
            btn.disabled = false;
            Toast.success(`Image upscaled to ${this.originalImg.width * this.scaleFactor} \u00d7 ${this.originalImg.height * this.scaleFactor}!`);
        } catch (e) {
            console.error(e);
            Toast.error('Failed to upscale: ' + (e.message || e));
            btn.disabled = false;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    },

    download() {
        if (!this.processedBlob) return;
        const isPng = this.processedBlob.type === 'image/png';
        const ext = isPng ? 'png' : 'jpg';
        const newName = ImageUtils.getOutputFilename(
            this.file.name,
            `upscaled_${this.scaleFactor}x`,
            ext
        );
        ImageUtils.downloadBlob(this.processedBlob, newName);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
        this.processedBlob = null;
    }
};
