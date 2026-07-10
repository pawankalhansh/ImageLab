const WatermarkTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="wm-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="wm-file-input" accept="image/*">
                    </div>
                </div>

                <div id="wm-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Watermark Settings</h3>
                            
                            <div class="control-group">
                                <div class="control-label">Text</div>
                                <input type="text" id="wm-text" class="input-field" value="© ImageLab" placeholder="Enter watermark text...">
                            </div>

                            <div class="control-group mt-16">
                                <div class="controls-row">
                                    <div style="flex: 1;">
                                        <div class="control-label">Color</div>
                                        <input type="color" id="wm-color" class="input-field" value="#ffffff" style="padding: 2px 4px; height: 38px;">
                                    </div>
                                    <div style="flex: 1;">
                                        <div class="control-label">Position</div>
                                        <select id="wm-pos" class="input-select">
                                            <option value="center">Center</option>
                                            <option value="bottom-right">Bottom Right</option>
                                            <option value="bottom-left">Bottom Left</option>
                                            <option value="top-right">Top Right</option>
                                            <option value="top-left">Top Left</option>
                                            <option value="tile">Tile / Repeat</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="control-group mt-16">
                                <div class="control-label">
                                    <span>Size</span>
                                    <span class="control-value" id="val-wm-size">48px</span>
                                </div>
                                <input type="range" id="wm-size" min="12" max="200" value="48" class="wm-slider">
                            </div>

                            <div class="control-group" id="wm-spacing-group" style="display: none;">
                                <div class="control-label">
                                    <span>Tile Spacing</span>
                                    <span class="control-value" id="val-wm-spacing">100px</span>
                                </div>
                                <input type="range" id="wm-spacing" min="10" max="400" value="100" class="wm-slider">
                            </div>

                            <div class="control-group">
                                <div class="control-label">
                                    <span>Opacity</span>
                                    <span class="control-value" id="val-wm-opacity">50%</span>
                                </div>
                                <input type="range" id="wm-opacity" min="0" max="100" value="50" class="wm-slider">
                            </div>

                            <div class="control-group">
                                <div class="control-label">
                                    <span>Rotation</span>
                                    <span class="control-value" id="val-wm-rotation">-45°</span>
                                </div>
                                <input type="range" id="wm-rotation" min="-180" max="180" value="-45" class="wm-slider">
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="wm-download" class="btn btn-primary w-full">Download Image</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="wm-canvas" style="display: none; max-height: 500px;"></canvas>
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

    init(config) {
        setupUploadZone('wm-upload-zone', 'wm-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('wm-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    document.getElementById('wm-upload-zone').classList.add('hidden');
                    document.getElementById('wm-workspace').classList.add('active');
                    this.canvas.style.display = 'block';
                    
                    this.canvas.width = this.originalImg.width;
                    this.canvas.height = this.originalImg.height;
                    
                    this.draw();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        const redrawEvents = ['input', 'change'];
        const controls = ['wm-text', 'wm-color', 'wm-pos'];
        
        controls.forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                if (id === 'wm-pos') {
                    document.getElementById('wm-spacing-group').style.display = e.target.value === 'tile' ? 'block' : 'none';
                }
                this.draw();
            });
        });

        document.querySelectorAll('.wm-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const id = e.target.id;
                let unit = '';
                if (id === 'wm-size' || id === 'wm-spacing') unit = 'px';
                if (id === 'wm-opacity') unit = '%';
                if (id === 'wm-rotation') unit = '°';
                document.getElementById(`val-${id}`).textContent = `${e.target.value}${unit}`;
                this.draw();
            });
        });

        document.getElementById('wm-download').addEventListener('click', () => this.download());
    },

    draw() {
        if (!this.originalImg) return;
        
        // Draw original
        this.ctx.globalAlpha = 1;
        this.ctx.drawImage(this.originalImg, 0, 0);

        // Get settings
        const text = document.getElementById('wm-text').value;
        if (!text) return;
        
        const color = document.getElementById('wm-color').value;
        const pos = document.getElementById('wm-pos').value;
        const size = parseInt(document.getElementById('wm-size').value);
        const opacity = parseInt(document.getElementById('wm-opacity').value) / 100;
        const rotation = parseInt(document.getElementById('wm-rotation').value) * Math.PI / 180;

        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = color;
        this.ctx.font = `bold ${size}px 'Inter', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const padding = size;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        if (pos === 'tile') {
            // Draw in a grid with alternating offsets (Adobe Stock style)
            const spacing = parseInt(document.getElementById('wm-spacing').value);
            const metrics = this.ctx.measureText(text);
            const textW = metrics.width + spacing;
            const textH = size + spacing;
            
            let rowIdx = 0;
            for (let y = -h; y < h * 2; y += textH) {
                const offsetX = (rowIdx % 2 === 1) ? textW / 2 : 0;
                for (let x = -w * 2 + offsetX; x < w * 2; x += textW) {
                    this.drawRotatedText(text, x, y, rotation);
                }
                rowIdx++;
            }
        } else {
            let x = w / 2, y = h / 2;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            if (pos.includes('left')) { x = padding; this.ctx.textAlign = 'left'; }
            if (pos.includes('right')) { x = w - padding; this.ctx.textAlign = 'right'; }
            if (pos.includes('top')) { y = padding; }
            if (pos.includes('bottom')) { y = h - padding; }
            
            this.drawRotatedText(text, x, y, rotation);
        }
    },

    drawRotatedText(text, x, y, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.fillText(text, 0, 0);
        this.ctx.restore();
    },

    download() {
        if (!this.originalImg) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'watermark');
        ImageUtils.downloadCanvas(this.canvas, newName, this.file.type);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
    }
};
