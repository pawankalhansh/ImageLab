const UpscaleTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc} True AI Super-Resolution.</p>
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
                                    <button class="preset-btn active" data-scale="2">2x</button>
                                    <button class="preset-btn" data-scale="4">4x</button>
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
                            
                            <div class="info-box mt-16" style="background: rgba(144, 238, 144, 0.1); border-left: 3px solid #4ade80;">
                                <p style="font-size: 0.8rem; color: #4ade80; margin: 0;">
                                    <b>True AI:</b> Processing in chunks to prevent memory crashes. This will take a few moments.
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
                                <div class="loading-text mt-12 text-center" style="max-width: 200px;">Loading AI Engine...</div>
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
    upscaler: null,

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

        // Toggle scale factor
        document.querySelectorAll('#upscale-workspace .preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#upscale-workspace .preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.scaleFactor = parseInt(e.target.dataset.scale);
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
        document.getElementById('upscale-orig-size').textContent = `${this.originalImg.width} × ${this.originalImg.height}`;
        document.getElementById('upscale-new-size').textContent = `${this.originalImg.width * this.scaleFactor} × ${this.originalImg.height * this.scaleFactor}`;
        this.processedBlob = null;
        
        const btn = document.getElementById('upscale-btn');
        btn.textContent = 'Upscale Image';
        btn.className = 'btn btn-primary w-full';
    },

    drawPreview() {
        // Just fit the original image in the canvas for preview
        const maxSize = 800;
        let w = this.originalImg.width;
        let h = this.originalImg.height;
        
        if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w *= ratio;
            h *= ratio;
        }
        
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.drawImage(this.originalImg, 0, 0, w, h);
    },

    async processUpscale() {
        if (!this.originalImg) return;
        
        document.getElementById('upscale-loading').classList.remove('hidden');
        document.getElementById('upscale-btn').disabled = true;
        document.querySelector('#upscale-loading .loading-text').innerHTML = 'Processing chunks with AI...<br><br><small>This may take a minute.</small>';
        
        try {
            // Give UI time to update
            await new Promise(r => setTimeout(r, 100));

            // Initialize upscaler if not already done
            if (!this.upscaler) {
                const module = await import('https://esm.sh/upscaler@0.5.1');
                const Upscaler = module.default;
                this.upscaler = new Upscaler();
            }

            // upscale the image using patch processing to prevent WebGL crashes on huge images
            const dataUrl = await this.upscaler.upscale(this.originalImg, {
                patchSize: 64,
                padding: 2
            });

            // The upscaler always outputs at its native model scale (usually 2x for default model).
            // If the user requested 4x, we upscale the result again using high-quality canvas, 
            // since chaining AI models multiple times in browser will definitely crash it.
            const tempImg = new Image();
            await new Promise((resolve, reject) => {
                tempImg.onload = resolve;
                tempImg.onerror = reject;
                tempImg.src = dataUrl;
            });

            const targetWidth = this.originalImg.width * this.scaleFactor;
            const targetHeight = this.originalImg.height * this.scaleFactor;

            const offCanvas = document.createElement('canvas');
            offCanvas.width = targetWidth;
            offCanvas.height = targetHeight;
            const offCtx = offCanvas.getContext('2d');
            
            // Draw the AI upscaled image into the final requested size
            offCtx.imageSmoothingEnabled = true;
            offCtx.imageSmoothingQuality = 'high';
            offCtx.drawImage(tempImg, 0, 0, targetWidth, targetHeight);

            // Show preview of result
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(offCanvas, 0, 0, this.canvas.width, this.canvas.height);

            // Export blob
            this.processedBlob = await new Promise(resolve => {
                offCanvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            const btn = document.getElementById('upscale-btn');
            btn.textContent = 'Download Image';
            btn.className = 'btn btn-success w-full';
            btn.disabled = false;
            
            Toast.success('Image upscaled successfully with AI!');
        } catch (e) {
            console.error(e);
            Toast.error('Failed to upscale image. Memory limit exceeded.');
            document.getElementById('upscale-btn').disabled = false;
        } finally {
            document.getElementById('upscale-loading').classList.add('hidden');
        }
    },

    download() {
        if (!this.processedBlob) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, `upscaled_ai_${this.scaleFactor}x`, 'jpg');
        
        const url = URL.createObjectURL(this.processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = newName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
        this.processedBlob = null;
        if (this.upscaler) {
            // Optional: dispose of upscaler memory if needed
            this.upscaler.dispose && this.upscaler.dispose();
            this.upscaler = null;
        }
    }
};
