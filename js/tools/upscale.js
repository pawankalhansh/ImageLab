const UpscaleTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc} High-Quality Resolution Enhancement.</p>
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

                            <div class="control-group mt-24">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="upscale-sharpen" checked>
                                    <span>Apply Sharpening filter</span>
                                </label>
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
                            
                            <div class="info-box mt-16" style="background: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107;">
                                <p style="font-size: 0.8rem; color: #ffc107; margin: 0;">
                                    <b>Warning:</b> The resulting image is very large and may take a moment to process or download.
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
                                <div class="loading-text mt-12">Processing...</div>
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
        document.querySelector('.loading-text').textContent = 'Enhancing resolution...';
        
        try {
            // Give UI time to update
            await new Promise(r => setTimeout(r, 100));

            const targetWidth = this.originalImg.width * this.scaleFactor;
            const targetHeight = this.originalImg.height * this.scaleFactor;

            // Create an offscreen canvas for the full resolution upscale
            const offCanvas = document.createElement('canvas');
            offCanvas.width = targetWidth;
            offCanvas.height = targetHeight;
            const offCtx = offCanvas.getContext('2d');
            
            // High quality image smoothing
            offCtx.imageSmoothingEnabled = true;
            offCtx.imageSmoothingQuality = 'high';
            offCtx.drawImage(this.originalImg, 0, 0, targetWidth, targetHeight);

            // Apply sharpening if requested
            if (document.getElementById('upscale-sharpen').checked) {
                this.applyUnsharpMask(offCtx, targetWidth, targetHeight);
            }

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
            
            Toast.success('Image upscaled successfully!');
        } catch (e) {
            console.error(e);
            Toast.error('Failed to upscale image');
            document.getElementById('upscale-btn').disabled = false;
        } finally {
            document.getElementById('upscale-loading').classList.add('hidden');
        }
    },

    applyUnsharpMask(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        
        // Simple 3x3 sharpening kernel
        const kernel = [
             0, -1,  0,
            -1,  5, -1,
             0, -1,  0
        ];
        
        const side = Math.round(Math.sqrt(kernel.length));
        const halfSide = Math.floor(side / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dstOff = (y * width + x) * 4;
                let r = 0, g = 0, b = 0;
                
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = y + cy - halfSide;
                        const scx = x + cx - halfSide;
                        
                        if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                            const srcOff = (scy * width + scx) * 4;
                            const wt = kernel[cy * side + cx];
                            r += copy[srcOff] * wt;
                            g += copy[srcOff + 1] * wt;
                            b += copy[srcOff + 2] * wt;
                        }
                    }
                }
                
                data[dstOff] = Math.min(255, Math.max(0, r));
                data[dstOff + 1] = Math.min(255, Math.max(0, g));
                data[dstOff + 2] = Math.min(255, Math.max(0, b));
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    },

    download() {
        if (!this.processedBlob) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, `upscaled_${this.scaleFactor}x`, 'jpg');
        
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
    }
};
