const RotateTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="rotate-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="rotate-file-input" accept="image/*">
                    </div>
                </div>

                <div id="rotate-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Transform</h3>
                            
                            <div class="control-group">
                                <div class="control-label">Rotate (90°)</div>
                                <div class="preset-group">
                                    <button class="btn btn-secondary btn-icon" id="rot-ccw" title="Rotate Counter-Clockwise">↺</button>
                                    <button class="btn btn-secondary btn-icon" id="rot-cw" title="Rotate Clockwise">↻</button>
                                </div>
                            </div>
                            
                            <div class="control-group mt-16">
                                <div class="control-label">Flip</div>
                                <div class="preset-group">
                                    <button class="btn btn-secondary btn-icon" id="flip-h" title="Flip Horizontal">↔</button>
                                    <button class="btn btn-secondary btn-icon" id="flip-v" title="Flip Vertical">↕</button>
                                </div>
                            </div>

                            <div class="control-group mt-24">
                                <div class="control-label">
                                    <span>Custom Angle</span>
                                    <span class="control-value" id="rot-angle-val">0°</span>
                                </div>
                                <input type="range" id="rot-angle" min="0" max="360" value="0">
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="rot-reset" class="btn btn-secondary w-full mb-16">Reset</button>
                                <button id="rot-download" class="btn btn-primary w-full">Download Image</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="rotate-canvas" style="display: none; max-height: 500px;"></canvas>
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
    
    angle: 0,
    flipH: 1,
    flipV: 1,

    init(config) {
        setupUploadZone('rotate-upload-zone', 'rotate-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('rotate-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    document.getElementById('rotate-upload-zone').classList.add('hidden');
                    document.getElementById('rotate-workspace').classList.add('active');
                    this.canvas.style.display = 'block';
                    
                    this.reset();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        document.getElementById('rot-ccw').addEventListener('click', () => this.updateTransform(-90, 1, 1));
        document.getElementById('rot-cw').addEventListener('click', () => this.updateTransform(90, 1, 1));
        document.getElementById('flip-h').addEventListener('click', () => this.updateTransform(0, -1, 1));
        document.getElementById('flip-v').addEventListener('click', () => this.updateTransform(0, 1, -1));

        const angleSlider = document.getElementById('rot-angle');
        const angleVal = document.getElementById('rot-angle-val');
        
        angleSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            angleVal.textContent = `${val}°`;
            this.angle = val;
            this.renderCanvas();
        });

        document.getElementById('rot-reset').addEventListener('click', () => this.reset());
        document.getElementById('rot-download').addEventListener('click', () => this.download());
    },

    updateTransform(rot, fh, fv) {
        this.angle = (this.angle + rot) % 360;
        if (this.angle < 0) this.angle += 360;
        
        this.flipH *= fh;
        this.flipV *= fv;
        
        document.getElementById('rot-angle').value = this.angle;
        document.getElementById('rot-angle-val').textContent = `${this.angle}°`;
        
        this.renderCanvas();
    },

    reset() {
        this.angle = 0;
        this.flipH = 1;
        this.flipV = 1;
        
        document.getElementById('rot-angle').value = 0;
        document.getElementById('rot-angle-val').textContent = `0°`;
        
        this.renderCanvas();
    },

    renderCanvas() {
        if (!this.originalImg) return;
        
        const rad = this.angle * Math.PI / 180;
        
        // Calculate new bounding box dimensions
        const w = this.originalImg.width;
        const h = this.originalImg.height;
        const absCos = Math.abs(Math.cos(rad));
        const absSin = Math.abs(Math.sin(rad));
        
        const newW = w * absCos + h * absSin;
        const newH = w * absSin + h * absCos;
        
        this.canvas.width = newW;
        this.canvas.height = newH;
        
        this.ctx.clearRect(0, 0, newW, newH);
        
        // Translate to center, rotate, scale (flip), translate back
        this.ctx.translate(newW / 2, newH / 2);
        this.ctx.rotate(rad);
        this.ctx.scale(this.flipH, this.flipV);
        this.ctx.translate(-w / 2, -h / 2);
        
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(this.originalImg, 0, 0);
    },

    download() {
        if (!this.originalImg) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'rotated');
        ImageUtils.downloadCanvas(this.canvas, newName, this.file.type);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
    }
};
