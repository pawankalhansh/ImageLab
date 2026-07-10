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

                            <div class="actions-bar mt-24">
                                <button id="c2j-btn" class="btn btn-primary w-full">Convert to JPG</button>
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
    
    init(config) {
        this.files = [];
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

        document.getElementById('c2j-btn').addEventListener('click', () => this.convertAll());
        document.getElementById('c2j-download-all').addEventListener('click', () => this.downloadAll());
    },

    convertedResults: [],

    async convertAll() {
        const quality = parseInt(document.getElementById('c2j-quality').value) / 100;
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
                
                // Fill white background in case of transparent PNG/WebP before converting to JPG
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const blob = await ImageUtils.canvasToBlob(canvas, 'image/jpeg', quality);
                const newName = ImageUtils.getOutputFilename(file.name, 'converted', 'jpg');
                
                this.convertedResults.push({ blob, filename: newName });
                
                const origExt = ImageUtils.getExtension(file.name).toUpperCase();
                
                fileList.innerHTML += `
                    <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${file.name}</span>
                        <div class="flex gap-12 items-center">
                            <span style="color: var(--text-muted); font-size: 0.8rem; background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">${origExt} → JPG</span>
                            <span style="color: var(--cat-convert); font-size: 0.9rem; font-weight: bold;">${ImageUtils.formatSize(blob.size)}</span>
                            <button class="btn btn-sm btn-secondary" onclick="ImageUtils.downloadBlob(ConvertToJpgTool.convertedResults[${i}].blob, '${newName}')">Download</button>
                        </div>
                    </div>
                `;
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
        this.files = [];
        this.convertedResults = [];
    }
};
