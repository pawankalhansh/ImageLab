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

                            <div class="actions-bar mt-24">
                                <button id="resize-btn" class="btn btn-primary w-full">Resize Image</button>
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
        setupUploadZone('resize-upload-zone', 'resize-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.aspectRatio = this.originalImg.width / this.originalImg.height;
                    
                    document.getElementById('resize-width').value = this.originalImg.width;
                    document.getElementById('resize-height').value = this.originalImg.height;
                    
                    this.updatePreview();
                    
                    document.getElementById('resize-upload-zone').classList.add('hidden');
                    document.getElementById('resize-workspace').classList.add('active');
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        const widthInput = document.getElementById('resize-width');
        const heightInput = document.getElementById('resize-height');
        const aspectToggle = document.getElementById('resize-aspect');

        widthInput.addEventListener('input', () => {
            if (aspectToggle.checked && widthInput.value) {
                heightInput.value = Math.round(widthInput.value / this.aspectRatio);
            }
        });

        heightInput.addEventListener('input', () => {
            if (aspectToggle.checked && heightInput.value) {
                widthInput.value = Math.round(heightInput.value * this.aspectRatio);
            }
        });

        aspectToggle.addEventListener('change', () => {
            if (aspectToggle.checked && widthInput.value) {
                heightInput.value = Math.round(widthInput.value / this.aspectRatio);
            }
        });

        document.querySelectorAll('.resize-pct').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scale = parseFloat(e.target.dataset.val);
                widthInput.value = Math.round(this.originalImg.width * scale);
                heightInput.value = Math.round(this.originalImg.height * scale);
                if (!aspectToggle.checked) aspectToggle.checked = true;
            });
        });

        document.getElementById('resize-btn').addEventListener('click', () => this.processResize());
    },

    updatePreview() {
        const canvas = document.getElementById('resize-canvas');
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        
        // For preview, draw original image. Canvas CSS object-fit will handle display.
        canvas.width = this.originalImg.width;
        canvas.height = this.originalImg.height;
        ctx.drawImage(this.originalImg, 0, 0);
    },

    processResize() {
        if (!this.originalImg) return;
        
        const w = parseInt(document.getElementById('resize-width').value);
        const h = parseInt(document.getElementById('resize-height').value);
        
        if (!w || !h || w <= 0 || h <= 0) {
            Toast.error('Invalid dimensions');
            return;
        }

        const { canvas } = ImageUtils.drawToCanvas(this.originalImg, w, h);
        const newName = ImageUtils.getOutputFilename(this.file.name, 'resized');
        ImageUtils.downloadCanvas(canvas, newName, this.file.type);
        Toast.success('Image resized and downloaded!');
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
    }
};
