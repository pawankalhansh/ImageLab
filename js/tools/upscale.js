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

                            <div class="control-group mt-16">
                                <div class="control-label">Method</div>
                                <div class="options-grid w-full mt-8">
                                    <button type="button" class="preset-btn method-btn active" data-method="quality">High Quality</button>
                                    <button type="button" class="preset-btn method-btn" data-method="ai">AI (slower)</button>
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
                                    <b>High Quality:</b> Multi-step resampling + sharpening. Fast and private.
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
    method: 'quality',
    processedBlob: null,
    upscaler: null,
    aiLoadFailed: false,

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

        document.querySelectorAll('#upscale-workspace .method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#upscale-workspace .method-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.method = e.currentTarget.dataset.method;
                this.updateMethodNote();
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

    updateMethodNote() {
        const note = document.getElementById('upscale-method-note');
        if (this.method === 'ai') {
            note.innerHTML = `<p style="font-size: 0.8rem; color: #4ade80; margin: 0;">
                <b>AI:</b> UpscalerJS ESRGAN (downloads ~TF.js models). Falls back to high quality if AI fails.
            </p>`;
        } else {
            note.innerHTML = `<p style="font-size: 0.8rem; color: #4ade80; margin: 0;">
                <b>High Quality:</b> Multi-step resampling + sharpening. Fast and private.
            </p>`;
        }
    },

    updateInfo() {
        if (!this.originalImg) return;
        document.getElementById('upscale-orig-size').textContent =
            `${this.originalImg.width} × ${this.originalImg.height}`;
        document.getElementById('upscale-new-size').textContent =
            `${this.originalImg.width * this.scaleFactor} × ${this.originalImg.height * this.scaleFactor}`;
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

    async loadAiUpscaler() {
        if (this.upscaler) return this.upscaler;
        if (this.aiLoadFailed) throw new Error('AI upscaler previously failed to load');

        const loadingText = document.querySelector('#upscale-loading .loading-text');
        loadingText.textContent = 'Loading TensorFlow.js...';

        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
        loadingText.textContent = 'Loading AI model...';
        await loadScript('https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@1.0.0/dist/umd/index.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js');

        if (typeof Upscaler === 'undefined') {
            throw new Error('UpscalerJS failed to load');
        }

        const model = typeof DefaultUpscalerJSModel !== 'undefined'
            ? (DefaultUpscalerJSModel.default || DefaultUpscalerJSModel)
            : undefined;

        this.upscaler = model
            ? new Upscaler({ model })
            : new Upscaler();

        return this.upscaler;
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

            let resultCanvas;

            if (this.method === 'ai') {
                try {
                    loadingText.innerHTML = 'Running AI super-resolution...<br><small>May take a minute</small>';
                    const upscaler = await this.loadAiUpscaler();

                    // Default model is 2x; for 4x we run quality scale after AI 2x
                    const dataUrl = await upscaler.upscale(this.originalImg, {
                        patchSize: 64,
                        padding: 5,
                    });

                    const aiImg = await ImageUtils.loadImageFromURL(dataUrl);

                    if (this.scaleFactor === 2) {
                        resultCanvas = document.createElement('canvas');
                        resultCanvas.width = aiImg.width;
                        resultCanvas.height = aiImg.height;
                        resultCanvas.getContext('2d').drawImage(aiImg, 0, 0);
                    } else {
                        // Stretch AI 2x result to 4x target with high-quality resampling
                        const extra = this.scaleFactor / 2;
                        resultCanvas = canvasUpscale(aiImg, extra);
                    }
                } catch (aiErr) {
                    console.warn('AI upscale failed, using quality fallback:', aiErr);
                    this.aiLoadFailed = true;
                    Toast.warning('AI upscale unavailable — using high-quality resampling');
                    loadingText.textContent = 'High-quality resampling...';
                    resultCanvas = canvasUpscale(this.originalImg, this.scaleFactor);
                }
            } else {
                loadingText.textContent = 'High-quality resampling...';
                resultCanvas = canvasUpscale(this.originalImg, this.scaleFactor);
            }

            this.drawPreview(resultCanvas);

            this.processedBlob = await ImageUtils.canvasToBlob(resultCanvas, 'image/jpeg', 0.95);

            btn.textContent = 'Download Image';
            btn.className = 'btn btn-success w-full';
            btn.disabled = false;
            Toast.success('Image upscaled successfully!');
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
        const newName = ImageUtils.getOutputFilename(
            this.file.name,
            `upscaled_${this.scaleFactor}x`,
            'jpg'
        );
        ImageUtils.downloadBlob(this.processedBlob, newName);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
        this.processedBlob = null;
        if (this.upscaler) {
            try {
                this.upscaler.dispose && this.upscaler.dispose();
            } catch (_) { /* ignore */ }
            this.upscaler = null;
        }
    }
};
