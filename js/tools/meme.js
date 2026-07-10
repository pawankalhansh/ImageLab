const MemeTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="meme-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="meme-file-input" accept="image/*">
                    </div>
                </div>

                <div id="meme-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Meme Text</h3>
                            
                            <div class="control-group">
                                <div class="control-label">Top Text</div>
                                <input type="text" id="meme-top" class="input-field" placeholder="TOP TEXT">
                            </div>

                            <div class="control-group">
                                <div class="control-label">Bottom Text</div>
                                <input type="text" id="meme-bottom" class="input-field" placeholder="BOTTOM TEXT">
                            </div>

                            <div class="control-group mt-16">
                                <div class="control-label">
                                    <span>Font Size</span>
                                    <span class="control-value" id="val-meme-size">40px</span>
                                </div>
                                <input type="range" id="meme-size" min="20" max="120" value="40" class="meme-slider">
                            </div>
                            
                            <div class="control-group mt-16">
                                <div class="controls-row">
                                    <div style="flex: 1;">
                                        <div class="control-label">Text Color</div>
                                        <input type="color" id="meme-color" class="input-field" value="#ffffff" style="padding: 2px 4px; height: 38px;">
                                    </div>
                                    <div style="flex: 1;">
                                        <div class="control-label">Outline Color</div>
                                        <input type="color" id="meme-stroke" class="input-field" value="#000000" style="padding: 2px 4px; height: 38px;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Outline Width</span>
                                    <span class="control-value" id="val-meme-sw">3px</span>
                                </div>
                                <input type="range" id="meme-sw" min="0" max="10" value="3" class="meme-slider">
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="meme-download" class="btn btn-primary w-full">Download Meme</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="meme-canvas" style="display: none; max-height: 500px;"></canvas>
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
        setupUploadZone('meme-upload-zone', 'meme-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('meme-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    document.getElementById('meme-upload-zone').classList.add('hidden');
                    document.getElementById('meme-workspace').classList.add('active');
                    this.canvas.style.display = 'block';
                    
                    this.canvas.width = this.originalImg.width;
                    this.canvas.height = this.originalImg.height;
                    
                    this.draw();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        const inputs = ['meme-top', 'meme-bottom', 'meme-color', 'meme-stroke'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.draw());
        });

        document.querySelectorAll('.meme-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const id = e.target.id;
                document.getElementById(`val-${id}`).textContent = `${e.target.value}px`;
                this.draw();
            });
        });

        document.getElementById('meme-download').addEventListener('click', () => this.download());
    },

    draw() {
        if (!this.originalImg) return;
        
        // Draw original image
        this.ctx.drawImage(this.originalImg, 0, 0);

        const topText = document.getElementById('meme-top').value.toUpperCase();
        const bottomText = document.getElementById('meme-bottom').value.toUpperCase();
        
        const size = parseInt(document.getElementById('meme-size').value);
        const color = document.getElementById('meme-color').value;
        const strokeColor = document.getElementById('meme-stroke').value;
        const strokeWidth = parseInt(document.getElementById('meme-sw').value);
        
        // Scale font size based on image width to keep it proportional
        // Using a baseline width of 800px for the default size
        const scale = this.canvas.width / 800;
        const scaledSize = size * Math.max(0.5, scale);
        
        this.ctx.font = `900 ${scaledSize}px Impact, "Arial Black", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth * Math.max(0.5, scale);
        this.ctx.lineJoin = 'round';
        
        const x = this.canvas.width / 2;
        
        if (topText) {
            this.ctx.textBaseline = 'top';
            this.wrapText(topText, x, scaledSize * 0.5, this.canvas.width * 0.95, scaledSize * 1.2);
        }
        
        if (bottomText) {
            this.ctx.textBaseline = 'bottom';
            // We need to calculate height of wrapped text to position from bottom
            const lines = this.getLines(bottomText, this.canvas.width * 0.95);
            const startY = this.canvas.height - (scaledSize * 0.5) - ((lines.length - 1) * scaledSize * 1.2);
            this.wrapText(bottomText, x, startY, this.canvas.width * 0.95, scaledSize * 1.2);
        }
    },
    
    getLines(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0] || '';
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = this.ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    },

    wrapText(text, x, y, maxWidth, lineHeight) {
        const lines = this.getLines(text, maxWidth);
        
        for (let i = 0; i < lines.length; i++) {
            if (this.ctx.lineWidth > 0) {
                this.ctx.strokeText(lines[i], x, y + (i * lineHeight));
            }
            this.ctx.fillText(lines[i], x, y + (i * lineHeight));
        }
    },

    download() {
        if (!this.originalImg) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'meme');
        ImageUtils.downloadCanvas(this.canvas, newName, this.file.type);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
    }
};
