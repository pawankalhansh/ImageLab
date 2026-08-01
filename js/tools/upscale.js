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
    resultImg: null,
    sliderPos: 0.5,
    isDragging: false,
    hoveringSlider: false,

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
                loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js').then(() => {
                    return loadScript('https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@1.0.0/dist/browser/umd/index.min.js');
                }).then(() => {
                    return loadScript('https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js');
                })
            ]).then(() => {
                if (window.Upscaler) {
                    this.upscalerInst = new window.Upscaler({
                        model: window['@upscalerjs/default-model']
                    });
                    resolve(this.upscalerInst);
                } else {
                    reject(new Error("Upscaler not found on window"));
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

        this.setupSliderEvents();
    },

    setupSliderEvents() {
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            let clientX = e.clientX;
            if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
            return (clientX - rect.left) / rect.width;
        };

        const updateCursor = (e) => {
            if (!this.resultImg) return;
            const pos = getMousePos(e);
            const sliderPixel = this.sliderPos;
            if (Math.abs(pos - sliderPixel) < 0.05) {
                this.canvas.style.cursor = 'ew-resize';
                this.hoveringSlider = true;
            } else {
                this.canvas.style.cursor = 'default';
                this.hoveringSlider = false;
            }
        };

        const startDrag = (e) => {
            if (!this.resultImg) return;
            const pos = getMousePos(e);
            if (Math.abs(pos - this.sliderPos) < 0.1 || e.type === 'touchstart') {
                this.isDragging = true;
                this.sliderPos = Math.max(0, Math.min(1, pos));
                this.drawPreview();
            }
        };

        const onDrag = (e) => {
            if (!this.resultImg) return;
            updateCursor(e);
            if (this.isDragging) {
                this.sliderPos = Math.max(0, Math.min(1, getMousePos(e)));
                this.drawPreview();
                if (e.cancelable) e.preventDefault();
            }
        };

        const endDrag = () => {
            this.isDragging = false;
        };

        document.addEventListener('mousedown', (e) => {
            if (e.target.id === 'upscale-canvas') startDrag(e);
        });
        document.addEventListener('mousemove', (e) => {
            if (e.target.id === 'upscale-canvas' || this.isDragging) onDrag(e);
        });
        document.addEventListener('mouseup', endDrag);
        
        document.addEventListener('touchstart', (e) => {
            if (e.target.id === 'upscale-canvas') startDrag(e);
        }, { passive: false });
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) onDrag(e);
        }, { passive: false });
        document.addEventListener('touchend', endDrag);
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

    drawPreview(sourceOverride) {
        if (!this.canvas || !this.ctx) return;
        
        const targetImg = this.resultImg || sourceOverride || this.originalImg;
        if (!targetImg) return;

        const maxSize = 800;
        let w = targetImg.width || targetImg.naturalWidth;
        let h = targetImg.height || targetImg.naturalHeight;

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

        if (this.resultImg) {
            // Split view mode
            const splitX = w * this.sliderPos;
            
            // Draw original on left
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(0, 0, splitX, h);
            this.ctx.clip();
            this.ctx.drawImage(this.originalImg, 0, 0, w, h);
            this.ctx.restore();
            
            // Draw upscaled result on right
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(splitX, 0, w - splitX, h);
            this.ctx.clip();
            this.ctx.drawImage(this.resultImg, 0, 0, w, h);
            this.ctx.restore();
            
            // Draw slider line
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(splitX - 1.5, 0, 3, h);
            
            // Draw slider handle
            this.ctx.beginPath();
            this.ctx.arc(splitX, h / 2, 16, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
            this.ctx.shadowBlur = 6;
            this.ctx.fill();
            this.ctx.shadowColor = 'transparent';
            
            // Draw arrows
            this.ctx.fillStyle = '#64748b';
            this.ctx.beginPath();
            this.ctx.moveTo(splitX - 6, h / 2);
            this.ctx.lineTo(splitX - 2, h / 2 - 4);
            this.ctx.lineTo(splitX - 2, h / 2 + 4);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.moveTo(splitX + 6, h / 2);
            this.ctx.lineTo(splitX + 2, h / 2 - 4);
            this.ctx.lineTo(splitX + 2, h / 2 + 4);
            this.ctx.fill();
            
        } else {
            // Normal view
            this.ctx.drawImage(targetImg, 0, 0, w, h);
        }
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
                    
                    currentImg = await upscaler.upscale(currentImg, {
                        patchSize: 64,
                        padding: 2,
                        progress: (percent) => {
                            progressText.textContent = `Processing: ${Math.round(percent * 100)}%`;
                        }
                    });
                    
                    currentScale *= 2;
                }
                
                // Convert result back to canvas
                const img = new Image();
                img.src = currentImg;
                await new Promise((r, reject) => {
                    img.onload = r;
                    img.onerror = () => reject(new Error("Failed to load AI upscaled image source"));
                });
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width || this.originalImg.width * this.scaleFactor;
                tempCanvas.height = img.height || this.originalImg.height * this.scaleFactor;
                tempCanvas.getContext('2d').drawImage(img, 0, 0);
                resultCanvas = tempCanvas;
                
            } catch (aiError) {
                console.error("AI Upscaling Error:", aiError);
                statusTitle.textContent = 'AI Upscaling Failed';
                progressText.textContent = aiError.message || String(aiError);
                progressText.style.color = '#ef4444'; // Red error text
                
                // Keep the loading overlay visible for 3 seconds so the user can read the error
                await new Promise(r => setTimeout(r, 4000));
                throw new Error("AI Upscaling failed: " + (aiError.message || String(aiError)));
            }

            this.resultImg = resultCanvas;
            this.sliderPos = 0.5;
            this.drawPreview();

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
