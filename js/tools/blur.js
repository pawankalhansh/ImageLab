const BlurTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="blur-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="blur-file-input" accept="image/*">
                    </div>
                </div>

                <div id="blur-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Blur Settings</h3>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Blur Intensity</span>
                                    <span class="control-value" id="val-blur-amt">15</span>
                                </div>
                                <input type="range" id="blur-amt" min="2" max="50" value="15">
                            </div>
                            
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 16px;">
                                Draw rectangles on the image to blur specific areas.
                            </p>

                            <div class="actions-bar mt-24">
                                <button id="blur-btn" class="btn btn-primary w-full mb-12">Apply Blur</button>
                                <button id="blur-clear" class="btn btn-secondary w-full mb-12">Clear All Regions</button>
                                <button id="blur-reset" class="btn btn-outline w-full">Reset / Change Image</button>
                            </div>
                            
                            <div class="mt-24" id="blur-download-wrap" style="display: none;">
                                <button id="blur-download" class="btn btn-success w-full">Download Image</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col" style="overflow: hidden;">
                            <div class="blur-canvas-container" id="blur-container" style="cursor: crosshair; touch-action: none;">
                                <canvas id="blur-canvas"></canvas>
                                <div id="blur-rect" class="blur-rect" style="display:none;"></div>
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
    container: null,
    rectEl: null,
    
    regions: [],
    
    isDrawing: false,
    startX: 0,
    startY: 0,
    scale: 1,

    _onMouseDown: null,
    _onMouseMove: null,
    _onMouseUp: null,
    _onTouchStart: null,
    _onTouchMove: null,
    _onTouchEnd: null,

    init(config) {
        setupUploadZone('blur-upload-zone', 'blur-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('blur-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    this.container = document.getElementById('blur-container');
                    this.rectEl = document.getElementById('blur-rect');
                    
                    document.getElementById('blur-upload-zone').classList.add('hidden');
                    document.getElementById('blur-workspace').classList.add('active');
                    
                    this.setupCanvas();
                    this.setupEvents();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        const slider = document.getElementById('blur-amt');
        slider.addEventListener('input', (e) => {
            document.getElementById('val-blur-amt').textContent = e.target.value;
        });

        document.getElementById('blur-clear').addEventListener('click', () => this.clearRegions());
        document.getElementById('blur-btn').addEventListener('click', () => this.applyBlur());
        document.getElementById('blur-download').addEventListener('click', () => this.download());
        document.getElementById('blur-reset')?.addEventListener('click', () => this.reset());
    },

    setupCanvas() {
        if (!this.container || !this.originalImg) return;
        const parent = this.container.parentElement;
        const maxWidth = (parent ? parent.clientWidth : 800) - 40;
        const maxHeight = 600;
        
        const w = this.originalImg.width;
        const h = this.originalImg.height;
        
        this.scale = Math.min(1, maxWidth / w, maxHeight / h);
        
        this.canvas.width = Math.round(w * this.scale);
        this.canvas.height = Math.round(h * this.scale);
        
        this.drawAll();
    },

    setupEvents() {
        this.removeEvents();

        this._onMouseDown = (e) => this.onMouseDown(e);
        this._onMouseMove = (e) => this.onMouseMove(e);
        this._onMouseUp = () => this.onMouseUp();
        this._onTouchStart = (e) => this.onTouchStart(e);
        this._onTouchMove = (e) => this.onTouchMove(e);
        this._onTouchEnd = (e) => this.onTouchEnd(e);

        if (this.container) {
            this.container.addEventListener('mousedown', this._onMouseDown);
            this.container.addEventListener('touchstart', this._onTouchStart, { passive: false });
        }
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
        window.addEventListener('touchend', this._onTouchEnd);
        window.addEventListener('touchcancel', this._onTouchEnd);
    },

    removeEvents() {
        if (this.container) {
            if (this._onMouseDown) this.container.removeEventListener('mousedown', this._onMouseDown);
            if (this._onTouchStart) this.container.removeEventListener('touchstart', this._onTouchStart);
        }
        if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove);
        if (this._onMouseUp) window.removeEventListener('mouseup', this._onMouseUp);
        if (this._onTouchMove) window.removeEventListener('touchmove', this._onTouchMove);
        if (this._onTouchEnd) {
            window.removeEventListener('touchend', this._onTouchEnd);
            window.removeEventListener('touchcancel', this._onTouchEnd);
        }

        this._onMouseDown = null;
        this._onMouseMove = null;
        this._onMouseUp = null;
        this._onTouchStart = null;
        this._onTouchMove = null;
        this._onTouchEnd = null;
    },

    startDrawing(clientX, clientY) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = clientX - rect.left;
        this.startY = clientY - rect.top;
        this.isDrawing = true;
        if (this.rectEl) {
            this.rectEl.style.display = 'block';
            this.updateRect(this.startX, this.startY, 0, 0);
        }
    },

    moveDrawing(clientX, clientY) {
        if (!this.isDrawing || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(clientX - rect.left, this.canvas.width));
        const currentY = Math.max(0, Math.min(clientY - rect.top, this.canvas.height));
        
        const w = currentX - this.startX;
        const h = currentY - this.startY;
        
        this.updateRect(this.startX, this.startY, w, h);
    },

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            if (this.rectEl) {
                const left = parseFloat(this.rectEl.style.left) || 0;
                const top = parseFloat(this.rectEl.style.top) || 0;
                const width = parseFloat(this.rectEl.style.width) || 0;
                const height = parseFloat(this.rectEl.style.height) || 0;
                
                if (width > 10 && height > 10) {
                    this.regions.push({
                        x: Math.round(left / this.scale),
                        y: Math.round(top / this.scale),
                        w: Math.round(width / this.scale),
                        h: Math.round(height / this.scale)
                    });
                    
                    this.drawAll();
                }
                
                this.rectEl.style.display = 'none';
            }
            const dlWrap = document.getElementById('blur-download-wrap');
            if (dlWrap) dlWrap.style.display = 'none';
        }
    },

    onMouseDown(e) {
        if (e.target !== this.canvas && e.target !== this.rectEl) return;
        this.startDrawing(e.clientX, e.clientY);
    },

    onMouseMove(e) {
        if (!this.isDrawing) return;
        this.moveDrawing(e.clientX, e.clientY);
    },

    onMouseUp() {
        this.stopDrawing();
    },

    onTouchStart(e) {
        if (e.target !== this.canvas && e.target !== this.rectEl) return;
        if (e.touches && e.touches.length > 0) {
            if (e.cancelable) e.preventDefault();
            this.startDrawing(e.touches[0].clientX, e.touches[0].clientY);
        }
    },

    onTouchMove(e) {
        if (!this.isDrawing) return;
        if (e.touches && e.touches.length > 0) {
            if (e.cancelable) e.preventDefault();
            this.moveDrawing(e.touches[0].clientX, e.touches[0].clientY);
        }
    },

    onTouchEnd(e) {
        if (this.isDrawing) {
            if (e && e.cancelable) e.preventDefault();
            this.stopDrawing();
        }
    },

    updateRect(x, y, w, h) {
        const left = w < 0 ? x + w : x;
        const top = h < 0 ? y + h : y;
        const width = Math.abs(w);
        const height = Math.abs(h);
        
        this.rectEl.style.left = `${left}px`;
        this.rectEl.style.top = `${top}px`;
        this.rectEl.style.width = `${width}px`;
        this.rectEl.style.height = `${height}px`;
    },

    drawAll() {
        // Draw image
        this.ctx.drawImage(this.originalImg, 0, 0, this.canvas.width, this.canvas.height);
        
        // Draw semi-transparent boxes to show selected regions before applying
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        this.ctx.strokeStyle = 'var(--accent)';
        this.ctx.lineWidth = 1;
        
        this.regions.forEach(r => {
            this.ctx.fillRect(r.x * this.scale, r.y * this.scale, r.w * this.scale, r.h * this.scale);
            this.ctx.strokeRect(r.x * this.scale, r.y * this.scale, r.w * this.scale, r.h * this.scale);
        });
    },

    clearRegions() {
        this.regions = [];
        this.drawAll();
        document.getElementById('blur-download-wrap').style.display = 'none';
    },

    resultCanvas: null,

    applyBlur() {
        if (this.regions.length === 0) {
            Toast.error('Please draw an area to blur first');
            return;
        }

        const amt = parseInt(document.getElementById('blur-amt').value);
        
        // Create full size canvas
        this.resultCanvas = document.createElement('canvas');
        this.resultCanvas.width = this.originalImg.width;
        this.resultCanvas.height = this.originalImg.height;
        const resCtx = this.resultCanvas.getContext('2d');
        
        resCtx.drawImage(this.originalImg, 0, 0);
        
        // Apply blur to each region on the full size canvas
        this.regions.forEach(r => {
            ImageUtils.blurRegion(this.resultCanvas, r.x, r.y, r.w, r.h, amt);
        });
        
        // Update display
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.resultCanvas, 0, 0, this.canvas.width, this.canvas.height);
        
        document.getElementById('blur-download-wrap').style.display = 'block';
        Toast.success('Blur applied');
    },

    download() {
        if (!this.resultCanvas) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'blurred');
        ImageUtils.downloadCanvas(this.resultCanvas, newName, this.file.type);
    },

    reset() {
        this.removeEvents();
        this.file = null;
        this.originalImg = null;
        this.resultCanvas = null;
        this.regions = [];
        this.isDrawing = false;
        if (this.rectEl) this.rectEl.style.display = 'none';
        const uploadZone = document.getElementById('blur-upload-zone');
        const workspace = document.getElementById('blur-workspace');
        const fileInput = document.getElementById('blur-file-input');
        const dlWrap = document.getElementById('blur-download-wrap');
        if (uploadZone) uploadZone.classList.remove('hidden');
        if (workspace) workspace.classList.remove('active');
        if (fileInput) fileInput.value = '';
        if (dlWrap) dlWrap.style.display = 'none';
    },

    destroy() {
        this.reset();
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.rectEl = null;
    }
};
