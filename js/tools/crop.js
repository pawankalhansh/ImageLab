const CropTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="crop-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="crop-file-input" accept="image/*">
                    </div>
                </div>

                <div id="crop-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Crop Options</h3>
                            <div id="crop-file-info" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                            
                            <div class="control-group">
                                <div class="control-label">Aspect Ratio</div>
                                <div class="preset-group">
                                    <button class="preset-btn crop-ratio active" data-val="free">Free</button>
                                    <button class="preset-btn crop-ratio" data-val="1">1:1</button>
                                    <button class="preset-btn crop-ratio" data-val="1.777">16:9</button>
                                    <button class="preset-btn crop-ratio" data-val="0.5625">9:16</button>
                                    <button class="preset-btn crop-ratio" data-val="1.333">4:3</button>
                                    <button class="preset-btn crop-ratio" data-val="1.5">3:2</button>
                                </div>
                            </div>
                            
                            <div class="control-group mt-24">
                                <div class="controls-row" style="margin-bottom: 12px;">
                                    <div style="flex: 1;">
                                        <div class="control-label">Width (px)</div>
                                        <input type="number" id="crop-w" class="input-field" style="font-family: monospace;">
                                    </div>
                                    <div style="flex: 1;">
                                        <div class="control-label">Height (px)</div>
                                        <input type="number" id="crop-h" class="input-field" style="font-family: monospace;">
                                    </div>
                                </div>
                                <div class="controls-row">
                                    <div style="flex: 1;">
                                        <div class="control-label">X Position</div>
                                        <input type="number" id="crop-x" class="input-field" style="font-family: monospace;">
                                    </div>
                                    <div style="flex: 1;">
                                        <div class="control-label">Y Position</div>
                                        <input type="number" id="crop-y" class="input-field" style="font-family: monospace;">
                                    </div>
                                </div>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="crop-btn" class="btn btn-primary w-full mb-12">Apply Crop</button>
                                <button id="crop-change-btn" class="btn btn-outline w-full">Change Image</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col">
                            <div class="crop-container" id="crop-container" style="touch-action: none; user-select: none;">
                                <canvas id="crop-canvas"></canvas>
                                <div id="crop-selection" class="crop-selection" style="display:none;"></div>
                            </div>
                            <div class="actions-bar mt-16" id="crop-download-wrap" style="display:none; gap: 12px;">
                                <button id="crop-reset" class="btn btn-secondary">Reset Crop</button>
                                <button id="crop-download" class="btn btn-success">Download Cropped Image</button>
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
    selection: null,
    container: null,
    croppedCanvas: null,
    
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    
    ratio: 'free',
    scale: 1,

    // Bound listeners for leak-free cleanup
    _boundMouseDown: null,
    _boundTouchStart: null,
    _boundMouseMove: null,
    _boundTouchMove: null,
    _boundMouseUp: null,
    _boundTouchEnd: null,

    init(config) {
        this.removeListeners();
        this.file = null;
        this.originalImg = null;
        this.croppedCanvas = null;
        this.ratio = 'free';
        this.scale = 1;

        setupUploadZone('crop-upload-zone', 'crop-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    
                    const fileInfo = document.getElementById('crop-file-info');
                    if (fileInfo) {
                        fileInfo.textContent = `${this.file.name} (${this.originalImg.width} × ${this.originalImg.height}px)`;
                        fileInfo.title = this.file.name;
                    }

                    document.getElementById('crop-upload-zone').classList.add('hidden');
                    document.getElementById('crop-workspace').classList.add('active');
                    this.setupCanvas();
                    Toast.success('Image loaded for cropping');
                } catch (e) {
                    console.error(e);
                    Toast.error('Failed to load image');
                }
            }
        });

        this.canvas = document.getElementById('crop-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('crop-container');
        this.selection = document.getElementById('crop-selection');

        // Setup pointer handlers (mouse + touch)
        this._boundMouseDown = (e) => this.onPointerDown(e);
        this._boundTouchStart = (e) => this.onPointerDown(e);
        this._boundMouseMove = (e) => this.onPointerMove(e);
        this._boundTouchMove = (e) => this.onPointerMove(e);
        this._boundMouseUp = (e) => this.onPointerUp(e);
        this._boundTouchEnd = (e) => this.onPointerUp(e);

        this.container.addEventListener('mousedown', this._boundMouseDown);
        this.container.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        window.addEventListener('mouseup', this._boundMouseUp);
        window.addEventListener('touchend', this._boundTouchEnd);
        window.addEventListener('touchcancel', this._boundTouchEnd);

        document.querySelectorAll('.crop-ratio').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.crop-ratio').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.ratio = btn.dataset.val;
                this.selection.style.display = 'none';
            });
        });

        document.getElementById('crop-btn').addEventListener('click', () => this.applyCrop());
        document.getElementById('crop-reset').addEventListener('click', () => this.resetCrop());
        document.getElementById('crop-download').addEventListener('click', () => this.downloadCrop());
        document.getElementById('crop-change-btn').addEventListener('click', () => this.resetTool());
        
        ['crop-x', 'crop-y', 'crop-w', 'crop-h'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateSelectionFromInputs());
        });
    },

    removeListeners() {
        if (this._boundMouseDown && this.container) {
            this.container.removeEventListener('mousedown', this._boundMouseDown);
        }
        if (this._boundTouchStart && this.container) {
            this.container.removeEventListener('touchstart', this._boundTouchStart);
        }
        if (this._boundMouseMove) {
            window.removeEventListener('mousemove', this._boundMouseMove);
        }
        if (this._boundTouchMove) {
            window.removeEventListener('touchmove', this._boundTouchMove);
        }
        if (this._boundMouseUp) {
            window.removeEventListener('mouseup', this._boundMouseUp);
        }
        if (this._boundTouchEnd) {
            window.removeEventListener('touchend', this._boundTouchEnd);
            window.removeEventListener('touchcancel', this._boundTouchEnd);
        }
    },

    setupCanvas() {
        if (!this.originalImg || !this.canvas) return;
        const parentW = this.container.parentElement ? this.container.parentElement.clientWidth : 800;
        const maxWidth = Math.max(300, parentW - 40);
        const maxHeight = 500;
        
        const w = this.originalImg.width;
        const h = this.originalImg.height;
        
        this.scale = Math.min(1, maxWidth / w, maxHeight / h);
        
        this.canvas.width = Math.round(w * this.scale);
        this.canvas.height = Math.round(h * this.scale);
        
        this.ctx.drawImage(this.originalImg, 0, 0, this.canvas.width, this.canvas.height);
        this.selection.style.display = 'none';
        
        document.getElementById('crop-w').value = w;
        document.getElementById('crop-h').value = h;
        document.getElementById('crop-x').value = 0;
        document.getElementById('crop-y').value = 0;
    },

    getEventPos(e) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        return {
            x: Math.max(0, Math.min(clientX - rect.left, this.canvas.width)),
            y: Math.max(0, Math.min(clientY - rect.top, this.canvas.height))
        };
    },

    onPointerDown(e) {
        if (!this.canvas || !this.originalImg) return;
        if (e.target !== this.canvas && e.target !== this.selection) return;
        if (e.cancelable) e.preventDefault();
        
        const pos = this.getEventPos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.isDragging = true;
        this.selection.style.display = 'block';
        this.updateSelectionBox(this.startX, this.startY, 0, 0);
    },

    onPointerMove(e) {
        if (!this.isDragging || !this.canvas) return;
        if (e.cancelable) e.preventDefault();
        
        const pos = this.getEventPos(e);
        this.currentX = pos.x;
        this.currentY = pos.y;
        
        const rawW = this.currentX - this.startX;
        const rawH = this.currentY - this.startY;
        
        let w = rawW;
        let h = rawH;
        
        if (this.ratio !== 'free') {
            const r = parseFloat(this.ratio);
            if (!isNaN(r) && r > 0) {
                const signX = rawW >= 0 ? 1 : -1;
                const signY = rawH >= 0 ? 1 : -1;
                
                let absW = Math.abs(rawW);
                let absH = Math.abs(rawH);
                
                if (absW / absH > r) {
                    absH = absW / r;
                } else {
                    absW = absH * r;
                }
                
                // Bounds clamp so crop box stays strictly inside the canvas
                const maxW = signX > 0 ? (this.canvas.width - this.startX) : this.startX;
                const maxH = signY > 0 ? (this.canvas.height - this.startY) : this.startY;
                
                if (absW > maxW) {
                    absW = maxW;
                    absH = absW / r;
                }
                if (absH > maxH) {
                    absH = maxH;
                    absW = absH * r;
                }
                
                w = signX * absW;
                h = signY * absH;
            }
        }
        
        this.updateSelectionBox(this.startX, this.startY, w, h);
    },

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        const left = parseFloat(this.selection.style.left) || 0;
        const top = parseFloat(this.selection.style.top) || 0;
        const width = parseFloat(this.selection.style.width) || 0;
        const height = parseFloat(this.selection.style.height) || 0;
        
        if (width > 5 && height > 5 && this.scale > 0 && this.originalImg) {
            let x = Math.max(0, Math.round(left / this.scale));
            let y = Math.max(0, Math.round(top / this.scale));
            let w = Math.max(1, Math.round(width / this.scale));
            let h = Math.max(1, Math.round(height / this.scale));
            
            if (x + w > this.originalImg.width) w = Math.max(1, this.originalImg.width - x);
            if (y + h > this.originalImg.height) h = Math.max(1, this.originalImg.height - y);
            
            document.getElementById('crop-x').value = x;
            document.getElementById('crop-y').value = y;
            document.getElementById('crop-w').value = w;
            document.getElementById('crop-h').value = h;
        } else {
            this.selection.style.display = 'none';
        }
    },

    updateSelectionBox(x, y, w, h) {
        if (!this.canvas) return;
        let left = w < 0 ? x + w : x;
        let top = h < 0 ? y + h : y;
        let width = Math.abs(w);
        let height = Math.abs(h);
        
        // Strict boundary checking against canvas edges
        left = Math.max(0, Math.min(this.canvas.width, left));
        top = Math.max(0, Math.min(this.canvas.height, top));
        width = Math.min(width, this.canvas.width - left);
        height = Math.min(height, this.canvas.height - top);
        
        this.selection.style.left = `${Math.round(left)}px`;
        this.selection.style.top = `${Math.round(top)}px`;
        this.selection.style.width = `${Math.round(width)}px`;
        this.selection.style.height = `${Math.round(height)}px`;
    },
    
    updateSelectionFromInputs() {
        if (!this.originalImg || !this.scale) return;
        
        let x = parseInt(document.getElementById('crop-x').value);
        let y = parseInt(document.getElementById('crop-y').value);
        let w = parseInt(document.getElementById('crop-w').value);
        let h = parseInt(document.getElementById('crop-h').value);
        
        if (isNaN(x) || x < 0) x = 0;
        if (isNaN(y) || y < 0) y = 0;
        if (isNaN(w) || w < 1) w = 1;
        if (isNaN(h) || h < 1) h = 1;
        
        if (x >= this.originalImg.width) x = Math.max(0, this.originalImg.width - 1);
        if (y >= this.originalImg.height) y = Math.max(0, this.originalImg.height - 1);
        if (x + w > this.originalImg.width) w = Math.max(1, this.originalImg.width - x);
        if (y + h > this.originalImg.height) h = Math.max(1, this.originalImg.height - y);
        
        document.getElementById('crop-x').value = x;
        document.getElementById('crop-y').value = y;
        document.getElementById('crop-w').value = w;
        document.getElementById('crop-h').value = h;
        
        this.selection.style.display = 'block';
        this.updateSelectionBox(x * this.scale, y * this.scale, w * this.scale, h * this.scale);
    },

    applyCrop() {
        if (!this.originalImg) return;
        if (this.selection.style.display === 'none') {
            Toast.error('Please make a selection first');
            return;
        }

        let x = parseInt(document.getElementById('crop-x').value);
        let y = parseInt(document.getElementById('crop-y').value);
        let w = parseInt(document.getElementById('crop-w').value);
        let h = parseInt(document.getElementById('crop-h').value);

        if (isNaN(x) || x < 0) x = 0;
        if (isNaN(y) || y < 0) y = 0;
        if (isNaN(w) || w <= 0) w = 0;
        if (isNaN(h) || h <= 0) h = 0;

        if (x + w > this.originalImg.width) w = Math.max(0, this.originalImg.width - x);
        if (y + h > this.originalImg.height) h = Math.max(0, this.originalImg.height - y);

        if (w <= 0 || h <= 0) {
            Toast.error('Invalid crop dimensions');
            return;
        }

        this.croppedCanvas = document.createElement('canvas');
        this.croppedCanvas.width = w;
        this.croppedCanvas.height = h;
        const ctx = this.croppedCanvas.getContext('2d');
        
        ctx.drawImage(this.originalImg, x, y, w, h, 0, 0, w, h);
        
        // Show cropped result in the display canvas
        this.canvas.width = Math.round(w * this.scale);
        this.canvas.height = Math.round(h * this.scale);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.croppedCanvas, 0, 0, this.canvas.width, this.canvas.height);
        
        this.selection.style.display = 'none';
        document.getElementById('crop-download-wrap').style.display = 'flex';
        Toast.success('Crop applied');
    },

    resetCrop() {
        this.setupCanvas();
        const dlWrap = document.getElementById('crop-download-wrap');
        if (dlWrap) dlWrap.style.display = 'none';
        this.croppedCanvas = null;
    },

    resetTool() {
        this.isDragging = false;
        this.file = null;
        this.originalImg = null;
        this.croppedCanvas = null;

        const uploadZone = document.getElementById('crop-upload-zone');
        const workspace = document.getElementById('crop-workspace');
        const fileInput = document.getElementById('crop-file-input');
        const fileInfo = document.getElementById('crop-file-info');
        const dlWrap = document.getElementById('crop-download-wrap');

        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.textContent = '';
        if (dlWrap) dlWrap.style.display = 'none';
        if (this.selection) this.selection.style.display = 'none';
        if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (workspace) workspace.classList.remove('active');
        if (uploadZone) uploadZone.classList.remove('hidden');
    },

    downloadCrop() {
        if (this.croppedCanvas && this.file) {
            const newName = ImageUtils.getOutputFilename(this.file.name, 'cropped');
            ImageUtils.downloadCanvas(this.croppedCanvas, newName, this.file.type);
        } else {
            Toast.error('Please apply crop first');
        }
    },

    destroy() {
        this.removeListeners();
        this.resetTool();
        this.canvas = null;
        this.ctx = null;
        this.selection = null;
        this.container = null;
    }
};
