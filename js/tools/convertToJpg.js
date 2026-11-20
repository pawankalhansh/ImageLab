const ConvertToJpgTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="c2j-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Images</h3>
                    <p>or drag and drop here (PNG, WebP, GIF, BMP)</p>
                    <div class="btn btn-primary btn-upload">
                        Choose Files
                        <input type="file" id="c2j-file-input" multiple accept="image/png, image/webp, image/gif, image/bmp">
                    </div>
                </div>

                <div id="c2j-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Conversion Settings</h3>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>JPG Quality</span>
                                    <span class="control-value" id="c2j-quality-val">92%</span>
                                </div>
                                <input type="range" id="c2j-quality" min="1" max="100" value="92">
                            </div>

                            <div class="control-group">
                                <div class="control-label">
                                    <span>Background Fill (for transparent areas)</span>
                                </div>
                                <div class="flex gap-12 items-center mt-8">
                                    <input type="color" id="c2j-bg-color" value="#ffffff" style="width: 44px; height: 36px; padding: 2px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); cursor: pointer;">
                                    <span id="c2j-bg-color-label" style="font-size: 0.85rem; color: var(--text-muted); font-family: monospace;">#FFFFFF (White)</span>
                                </div>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="c2j-btn" class="btn btn-primary w-full mb-12">Convert to JPG</button>
                                <button id="c2j-reset-btn" class="btn btn-outline w-full">Reset / Change Images</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col" id="c2j-results" style="display: none; align-items: stretch; justify-content: start;">
                            <div class="actions-bar mb-16" style="justify-content: flex-end;">
                                <button id="c2j-download-all" class="btn btn-success">Download All</button>
                            </div>
                            <div id="c2j-file-list" style="display: flex; flex-direction: column; gap: 12px; width: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    files: [],
    convertedResults: [],
    
    init(config) {
        this.files = [];
        this.convertedResults = [];
        const uploadZone = document.getElementById('c2j-upload-zone');
        const workspace = document.getElementById('c2j-workspace');
        
        setupUploadZone('c2j-upload-zone', 'c2j-file-input', (files) => {
            this.files = Array.from(files).filter(f => f.type.startsWith('image/') && f.type !== 'image/jpeg');
            if (this.files.length > 0) {
                uploadZone.classList.add('hidden');
                workspace.classList.add('active');
                Toast.success(`Loaded ${this.files.length} image(s) for conversion`);
            } else {
                Toast.error('Please upload PNG, WebP, GIF or BMP files');
            }
        });

        const qualitySlider = document.getElementById('c2j-quality');
        const qualityVal = document.getElementById('c2j-quality-val');
        
        qualitySlider.addEventListener('input', (e) => {
            qualityVal.textContent = `${e.target.value}%`;
        });

        const colorInput = document.getElementById('c2j-bg-color');
        const colorLabel = document.getElementById('c2j-bg-color-label');
        if (colorInput && colorLabel) {
            colorInput.addEventListener('input', (e) => {
                colorLabel.textContent = e.target.value.toUpperCase();
            });
        }

        document.getElementById('c2j-btn').addEventListener('click', () => this.convertAll());
        document.getElementById('c2j-download-all').addEventListener('click', () => this.downloadAll());
        document.getElementById('c2j-reset-btn').addEventListener('click', () => this.resetTool());
    },

    resetTool() {
        this.files = [];
        this.convertedResults = [];

        const uploadZone = document.getElementById('c2j-upload-zone');
        const workspace = document.getElementById('c2j-workspace');
        const fileInput = document.getElementById('c2j-file-input');
        const resultsContainer = document.getElementById('c2j-results');
        const fileList = document.getElementById('c2j-file-list');

        if (fileInput) fileInput.value = '';
        if (fileList) fileList.innerHTML = '';
        if (resultsContainer) resultsContainer.style.display = 'none';

        if (workspace) workspace.classList.remove('active');
        if (uploadZone) uploadZone.classList.remove('hidden');

        const btn = document.getElementById('c2j-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Convert to JPG';
        }
    },

    async convertAll() {
        if (!this.files.length) {
            Toast.error('No images to convert');
            return;
        }

        const quality = parseInt(document.getElementById('c2j-quality').value) / 100;
        const bgColor = document.getElementById('c2j-bg-color') ? document.getElementById('c2j-bg-color').value : '#ffffff';
        const resultsContainer = document.getElementById('c2j-results');
        const fileList = document.getElementById('c2j-file-list');
        
        fileList.innerHTML = '';
        resultsContainer.style.display = 'flex';
        this.convertedResults = [];
        
        const btn = document.getElementById('c2j-btn');
        btn.disabled = true;
        btn.textContent = 'Converting...';

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            
            try {
                const img = await ImageUtils.loadImage(file);
                const { canvas, ctx } = ImageUtils.drawToCanvas(img, img.width, img.height);
                
                // Fill matte background for transparent areas before converting to JPG
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const blob = await ImageUtils.canvasToBlob(canvas, 'image/jpeg', quality);
                const newName = ImageUtils.getOutputFilename(file.name, 'converted', 'jpg');
                
                this.convertedResults.push({ blob, filename: newName });
                
                const origExt = ImageUtils.getExtension(file.name).toUpperCase();
                
                // Safe DOM creation - prevents HTML injection
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;';
                nameSpan.textContent = file.name; // SAFE
                nameSpan.title = file.name;
                
                const rightDiv = document.createElement('div');
                rightDiv.className = 'flex gap-12 items-center';
                
                const badge = document.createElement('span');
                badge.style.cssText = 'color: var(--text-muted); font-size: 0.8rem; background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;';
                badge.textContent = `${origExt} → JPG`;
                
                const sizeSpan = document.createElement('span');
                sizeSpan.style.cssText = 'color: var(--cat-convert); font-size: 0.9rem; font-weight: bold;';
                sizeSpan.textContent = ImageUtils.formatSize(blob.size);
                
                const dlBtn = document.createElement('button');
                dlBtn.className = 'btn btn-sm btn-secondary';
                dlBtn.textContent = 'Download';
                const curBlob = blob;
                const curName = newName;
                dlBtn.addEventListener('click', () => {
                    ImageUtils.downloadBlob(curBlob, curName);
                });
                
                rightDiv.appendChild(badge);
                rightDiv.appendChild(sizeSpan);
                rightDiv.appendChild(dlBtn);
                
                item.appendChild(nameSpan);
                item.appendChild(rightDiv);
                fileList.appendChild(item);
            } catch (e) {
                console.error(e);
                Toast.error(`Failed to convert ${file.name}`);
            }
        }
        
        btn.disabled = false;
        btn.textContent = 'Convert to JPG';
        Toast.success('Conversion complete!');
    },

    downloadAll() {
        this.convertedResults.forEach(res => {
            ImageUtils.downloadBlob(res.blob, res.filename);
        });
        Toast.success('Downloads started');
    },

    destroy() {
        this.resetTool();
    }
};
