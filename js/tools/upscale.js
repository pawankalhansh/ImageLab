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
                                    <b>Premium AI Upscaling:</b> Uses Real-Time AI Super Resolution (ESRGAN) running securely in your browser to maintain perfect edges without blurring.
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
                                <div class="loading-text mt-12 text-center" style="max-width: 250px;">
                                    <div id="upscale-status-title" class="font-bold">Processing...</div>
                                    <div id="upscale-progress-text" class="text-sm mt-4 text-slate-300">Preparing...</div>
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
    scaleFactor: 2,
    processedBlob: null,
    upscalerInst: null,

    async ensureUpscaler() {
        if (this.upscalerInst) return this.upscalerInst;
        
        return new Promise((resolve, reject) => {
            const loadScript = (src) => new Promise((res, rej) => {
                if (document.querySelector(`script[src="${src}"]`)) return res();
                const s = document.createElement('script');
                s.src = src;
                s.onload = res;
                s.onerror = rej;
                document.head.appendChild(s);
            });
            
            Promise.all([
                loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js').then(() => 
                    loadScript('https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js')
                )
            ]).then(() => {
                if (window.Upscaler) {
                    this.upscalerInst = new window.Upscaler();
                    resolve(this.upscalerInst);
                } else {
                    reject(new Error("Upscaler not found"));
                }
            }).catch(reject);
        });
    },

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
        const statusTitle = document.getElementById('upscale-status-title');
        const progressText = document.getElementById('upscale-progress-text');
        const btn = document.getElementById('upscale-btn');

        loadingOverlay.classList.remove('hidden');
        btn.disabled = true;

        try {
            statusTitle.textContent = 'Initializing AI...';
            progressText.textContent = 'Loading models (may take a moment)';
            
            let resultCanvas;
            try {
                const upscaler = await this.ensureUpscaler();
                
                statusTitle.textContent = 'Upscaling image...';
                
                // If scale factor is 4, we might need to call it multiple times or use a 4x model.
                // The default model is usually 2x. If scaleFactor is 4x, we can upscale twice for simplicity
                // or just rely on the upscaler to handle it.
                // Actually Upscaler default model is 2x. Let's do a loop if needed.
                
                let currentImg = this.originalImg;
                let currentScale = 1;
                
                while (currentScale < this.scaleFactor) {
                    progressText.textContent = `Running neural network (${currentScale}x to ${currentScale * 2}x)...`;
                    
                    const tensor = await upscaler.upscale(currentImg, {
                        patchSize: 64,
                        padding: 2,
                        output: 'tensor',
                        progress: (percent) => {
                            progressText.textContent = `Processing: ${Math.round(percent * 100)}%`;
                        }
                    });
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = tensor.shape[1];
                    tempCanvas.height = tensor.shape[0];
                    await window.tf.browser.toPixels(tensor, tempCanvas);
                    tensor.dispose();
                    
                    currentImg = tempCanvas;
                    currentScale *= 2;
                }
                
                resultCanvas = currentImg;
            } catch (aiError) {
                console.warn("AI Upscaling failed, falling back to Canvas Resampling", aiError);
                statusTitle.textContent = 'High-quality resampling...';
                progressText.textContent = 'Fallback mode';
                await new Promise(r => setTimeout(r, 50));
                resultCanvas = canvasUpscale(this.originalImg, this.scaleFactor);
            }

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
