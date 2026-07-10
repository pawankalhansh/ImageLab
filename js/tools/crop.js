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
                            
                            <div class="control-group">
                                <div class="control-label">Aspect Ratio</div>
                                <div class="preset-group">
                                    <button class="preset-btn crop-ratio active" data-val="free">Free</button>
                                    <button class="preset-btn crop-ratio" data-val="1">1:1</button>
                                    <button class="preset-btn crop-ratio" data-val="1.777">16:9</button>
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
                                <button id="crop-btn" class="btn btn-primary w-full">Apply Crop</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col">
                            <div class="crop-container" id="crop-container">
                                <canvas id="crop-canvas"></canvas>
                                <div id="crop-selection" class="crop-selection" style="display:none;"></div>
                            </div>
                            <div class="actions-bar mt-16" id="crop-download-wrap" style="display:none;">
                                <button id="crop-reset" class="btn btn-secondary">Reset</button>
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
    
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    
    ratio: 'free',
    scale: 1,

    init(config) {
        setupUploadZone('crop-upload-zone', 'crop-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    document.getElementById('crop-upload-zone').classList.add('hidden');
                    document.getElementById('crop-workspace').classList.add('active');
                    this.setupCanvas();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        this.canvas = document.getElementById('crop-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('crop-container');
        this.selection = document.getElementById('crop-selection');

        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());

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
        
        ['crop-x', 'crop-y', 'crop-w', 'crop-h'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateSelectionFromInputs());
        });
    },

    setupCanvas() {
        const maxWidth = this.container.parentElement.clientWidth - 40;
        const maxHeight = 500;
        
        let w = this.originalImg.width;
        let h = this.originalImg.height;
        
        this.scale = Math.min(1, maxWidth / w, maxHeight / h);
        
        this.canvas.width = w * this.scale;
        this.canvas.height = h * this.scale;
        
        this.ctx.drawImage(this.originalImg, 0, 0, this.canvas.width, this.canvas.height);
        this.selection.style.display = 'none';
        
        document.getElementById('crop-w').value = w;
        document.getElementById('crop-h').value = h;
        document.getElementById('crop-x').value = 0;
        document.getElementById('crop-y').value = 0;
    },

    onMouseDown(e) {
        if (e.target !== this.canvas && e.target !== this.selection) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        this.isDragging = true;
        this.selection.style.display = 'block';
        this.updateSelectionBox(this.startX, this.startY, 0, 0);
    },

    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.currentX = Math.max(0, Math.min(e.clientX - rect.left, this.canvas.width));
        this.currentY = Math.max(0, Math.min(e.clientY - rect.top, this.canvas.height));
        
        let w = this.currentX - this.startX;
        let h = this.currentY - this.startY;
        
        if (this.ratio !== 'free') {
            const r = parseFloat(this.ratio);
            if (Math.abs(w) / Math.abs(h) > r) {
                h = Math.sign(h) * Math.abs(w) / r;
            } else {
                w = Math.sign(w) * Math.abs(h) * r;
            }
        }
        
        this.updateSelectionBox(this.startX, this.startY, w, h);
    },

    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            // Update inputs
            const left = parseFloat(this.selection.style.left);
            const top = parseFloat(this.selection.style.top);
            const width = parseFloat(this.selection.style.width);
            const height = parseFloat(this.selection.style.height);
            
            if (width > 5 && height > 5) {
                document.getElementById('crop-x').value = Math.round(left / this.scale);
                document.getElementById('crop-y').value = Math.round(top / this.scale);
                document.getElementById('crop-w').value = Math.round(width / this.scale);
                document.getElementById('crop-h').value = Math.round(height / this.scale);
            } else {
                this.selection.style.display = 'none';
            }
        }
    },

    updateSelectionBox(x, y, w, h) {
        const left = w < 0 ? x + w : x;
        const top = h < 0 ? y + h : y;
        const width = Math.abs(w);
        const height = Math.abs(h);
        
        this.selection.style.left = `${left}px`;
        this.selection.style.top = `${top}px`;
        this.selection.style.width = `${width}px`;
        this.selection.style.height = `${height}px`;
    },
    
    updateSelectionFromInputs() {
        const x = parseInt(document.getElementById('crop-x').value) * this.scale;
        const y = parseInt(document.getElementById('crop-y').value) * this.scale;
        const w = parseInt(document.getElementById('crop-w').value) * this.scale;
        const h = parseInt(document.getElementById('crop-h').value) * this.scale;
        
        this.selection.style.display = 'block';
        this.updateSelectionBox(x, y, w, h);
    },

    croppedCanvas: null,

    applyCrop() {
        if (this.selection.style.display === 'none') {
            Toast.error('Please make a selection first');
            return;
        }

        const x = parseInt(document.getElementById('crop-x').value);
        const y = parseInt(document.getElementById('crop-y').value);
        const w = parseInt(document.getElementById('crop-w').value);
        const h = parseInt(document.getElementById('crop-h').value);

        if (w <= 0 || h <= 0) return;

        this.croppedCanvas = document.createElement('canvas');
        this.croppedCanvas.width = w;
        this.croppedCanvas.height = h;
        const ctx = this.croppedCanvas.getContext('2d');
        
        ctx.drawImage(this.originalImg, x, y, w, h, 0, 0, w, h);
        
        // Show cropped result in the display canvas
        this.canvas.width = w * this.scale;
        this.canvas.height = h * this.scale;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.croppedCanvas, 0, 0, this.canvas.width, this.canvas.height);
        
        this.selection.style.display = 'none';
        document.getElementById('crop-download-wrap').style.display = 'flex';
        Toast.success('Crop applied');
    },

    resetCrop() {
        this.setupCanvas();
        document.getElementById('crop-download-wrap').style.display = 'none';
        this.croppedCanvas = null;
    },

    downloadCrop() {
        if (this.croppedCanvas) {
            const newName = ImageUtils.getOutputFilename(this.file.name, 'cropped');
            ImageUtils.downloadCanvas(this.croppedCanvas, newName, this.file.type);
        }
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
    }
};
