const ResizeTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="resize-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="resize-file-input" accept="image/*">
                    </div>
                </div>

                <div id="resize-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Dimensions</h3>
                            <div id="resize-file-info" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                            
                            <div class="control-group">
                                <div class="controls-row" style="margin-bottom: 12px;">
                                    <div style="flex: 1;">
                                        <div class="control-label">Width (px)</div>
                                        <input type="number" id="resize-width" class="input-field" style="font-family: monospace;">
                                    </div>
                                    <div style="flex: 1;">
                                        <div class="control-label">Height (px)</div>
                                        <input type="number" id="resize-height" class="input-field" style="font-family: monospace;">
                                    </div>
                                </div>
                                <label class="toggle-wrap">
                                    <input type="checkbox" id="resize-aspect" checked>
                                    <div class="toggle"></div>
                                    <span class="toggle-label">Maintain aspect ratio</span>
                                </label>
                            </div>

                            <div class="control-group mt-24">
                                <div class="control-label">Resize by Percentage</div>
                                <div class="preset-group">
                                    <button class="preset-btn resize-pct" data-val="0.25">25%</button>
                                    <button class="preset-btn resize-pct" data-val="0.5">50%</button>
                                    <button class="preset-btn resize-pct" data-val="0.75">75%</button>
                                    <button class="preset-btn resize-pct" data-val="1.5">150%</button>
                                    <button class="preset-btn resize-pct" data-val="2">200%</button>
                                </div>
                            </div>

                            <div class="control-group mt-16">
                                <div class="control-label">Standard Dimensions</div>
                                <div class="preset-group">
                                    <button class="preset-btn resize-dim" data-w="1080" data-h="1080">1080 × 1080</button>
                                    <button class="preset-btn resize-dim" data-w="1920" data-h="1080">1920 × 1080</button>
                                    <button class="preset-btn resize-dim" data-w="1280" data-h="720">1280 × 720</button>
                                </div>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="resize-btn" class="btn btn-primary w-full mb-12">Resize Image</button>
                                <button id="resize-reset-btn" class="btn btn-outline w-full">Change Image</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="resize-canvas" style="display: none;"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    file: null,
    originalImg: null,
    aspectRatio: 1,
    
    init(config) {
        this.file = null;
        this.originalImg = null;
        this.aspectRatio = 1;

        setupUploadZone('resize-upload-zone', 'resize-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.aspectRatio = this.originalImg.width / this.originalImg.height;
                    
                    const fileInfo = document.getElementById('resize-file-info');
                    if (fileInfo) {
                        fileInfo.textContent = `${this.file.name} (${this.originalImg.width} × ${this.originalImg.height}px)`; // SAFE textContent
                        fileInfo.title = this.file.name;
                    }

                    document.getElementById('resize-width').value = this.originalImg.width;
                    document.getElementById('resize-height').value = this.originalImg.height;
                    
                    this.updatePreview();
                    
                    document.getElementById('resize-upload-zone').classList.add('hidden');
                    document.getElementById('resize-workspace').classList.add('active');
                    Toast.success('Image loaded successfully');
                } catch (e) {
                    console.error(e);
                    Toast.error('Failed to load image');
                }
            }
        });

        const widthInput = document.getElementById('resize-width');
        const heightInput = document.getElementById('resize-height');
        const aspectToggle = document.getElementById('resize-aspect');

        widthInput.addEventListener('input', () => {
            if (aspectToggle.checked && widthInput.value && this.aspectRatio) {
                heightInput.value = Math.max(1, Math.round(widthInput.value / this.aspectRatio));
            }
        });

        heightInput.addEventListener('input', () => {
            if (aspectToggle.checked && heightInput.value && this.aspectRatio) {
                widthInput.value = Math.max(1, Math.round(heightInput.value * this.aspectRatio));
            }
        });

        aspectToggle.addEventListener('change', () => {
            if (aspectToggle.checked && widthInput.value && this.aspectRatio) {
                heightInput.value = Math.max(1, Math.round(widthInput.value / this.aspectRatio));
            }
        });

        document.querySelectorAll('.resize-pct').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.originalImg) return;
                const scale = parseFloat(e.target.dataset.val);
                widthInput.value = Math.max(1, Math.round(this.originalImg.width * scale));
                heightInput.value = Math.max(1, Math.round(this.originalImg.height * scale));
                if (!aspectToggle.checked) aspectToggle.checked = true;
            });
        });

        document.querySelectorAll('.resize-dim').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.originalImg) return;
                widthInput.value = parseInt(e.target.dataset.w);
                heightInput.value = parseInt(e.target.dataset.h);
                aspectToggle.checked = false;
            });
        });

        document.getElementById('resize-btn').addEventListener('click', () => this.processResize());
        document.getElementById('resize-reset-btn').addEventListener('click', () => this.resetTool());
    },

    resetTool() {
        this.file = null;
        this.originalImg = null;
        this.aspectRatio = 1;

        const uploadZone = document.getElementById('resize-upload-zone');
        const workspace = document.getElementById('resize-workspace');
        const fileInput = document.getElementById('resize-file-input');
        const canvas = document.getElementById('resize-canvas');
        const fileInfo = document.getElementById('resize-file-info');
        const widthInput = document.getElementById('resize-width');
        const heightInput = document.getElementById('resize-height');

        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.textContent = '';
        if (widthInput) widthInput.value = '';
        if (heightInput) heightInput.value = '';

        if (canvas) {
            canvas.style.display = 'none';
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (workspace) workspace.classList.remove('active');
        if (uploadZone) uploadZone.classList.remove('hidden');
    },

    updatePreview() {
        if (!this.originalImg) return;
        const canvas = document.getElementById('resize-canvas');
        if (!canvas) return;
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.originalImg.width;
        canvas.height = this.originalImg.height;
        ctx.drawImage(this.originalImg, 0, 0);
    },

    processResize() {
        if (!this.originalImg || !this.file) {
            Toast.error('Please upload an image first');
            return;
        }
        
        const w = parseInt(document.getElementById('resize-width').value);
        const h = parseInt(document.getElementById('resize-height').value);
        
        if (!w || !h || w <= 0 || h <= 0) {
            Toast.error('Please enter valid positive dimensions');
            return;
        }

        const { canvas } = ImageUtils.drawToCanvas(this.originalImg, w, h);
        const newName = ImageUtils.getOutputFilename(this.file.name, 'resized');
        ImageUtils.downloadCanvas(canvas, newName, this.file.type);
        Toast.success('Image resized and downloaded!');
    },

    destroy() {
        this.resetTool();
    }
};
