const CompressTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="compress-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Images</h3>
                    <p>or drag and drop here (JPG, PNG, WebP)</p>
                    <div class="btn btn-primary btn-upload">
                        Choose Files
                        <input type="file" id="compress-file-input" multiple accept="image/jpeg, image/png, image/webp">
                    </div>
                </div>

                <div id="compress-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Compression Settings</h3>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Quality</span>
                                    <span class="control-value" id="compress-quality-val">80%</span>
                                </div>
                                <input type="range" id="compress-quality" min="1" max="100" value="80">
                            </div>

                            <div class="control-group">
                                <div class="control-label">
                                    <span>Output Format</span>
                                </div>
                                <select id="compress-format" class="input-select">
                                    <option value="keep">Keep Original</option>
                                    <option value="image/jpeg">JPG</option>
                                    <option value="image/webp">WebP</option>
                                </select>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="compress-btn" class="btn btn-primary w-full">Compress Images</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col" id="compress-results" style="display: none; align-items: stretch; justify-content: start;">
                            <div class="actions-bar mb-16" style="justify-content: flex-end;">
                                <button id="compress-download-all" class="btn btn-success">Download All</button>
                            </div>
                            <div id="compress-file-list" style="display: flex; flex-direction: column; gap: 12px; width: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    files: [],
    
    init(config) {
        this.files = [];
        const uploadZone = document.getElementById('compress-upload-zone');
        const workspace = document.getElementById('compress-workspace');
        const fileInput = document.getElementById('compress-file-input');
        
        setupUploadZone('compress-upload-zone', 'compress-file-input', (files) => {
            this.files = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (this.files.length > 0) {
                uploadZone.classList.add('hidden');
                workspace.classList.add('active');
                Toast.success(`Loaded ${this.files.length} image(s)`);
            } else {
                Toast.error('Please upload valid image files');
            }
        }, 'image/*');

        const qualitySlider = document.getElementById('compress-quality');
        const qualityVal = document.getElementById('compress-quality-val');
        
        qualitySlider.addEventListener('input', (e) => {
            qualityVal.textContent = `${e.target.value}%`;
        });

        document.getElementById('compress-btn').addEventListener('click', () => this.compressAll());
        document.getElementById('compress-download-all').addEventListener('click', () => this.downloadAll());
    },

    compressedResults: [],

    async compressAll() {
        const quality = parseInt(document.getElementById('compress-quality').value) / 100;
        const formatOpt = document.getElementById('compress-format').value;
        const resultsContainer = document.getElementById('compress-results');
        const fileList = document.getElementById('compress-file-list');
        
        fileList.innerHTML = '';
        resultsContainer.style.display = 'flex';
        this.compressedResults = [];
        
        const btn = document.getElementById('compress-btn');
        btn.disabled = true;
        btn.textContent = 'Compressing...';

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const mime = formatOpt === 'keep' ? file.type : formatOpt;
            
            try {
                const img = await ImageUtils.loadImage(file);
                const { canvas } = ImageUtils.drawToCanvas(img, img.width, img.height);
                const blob = await ImageUtils.canvasToBlob(canvas, mime, quality);
                
                const savings = ((file.size - blob.size) / file.size * 100).toFixed(1);
                const ext = ImageUtils.getExtFromMime(mime);
                const newName = ImageUtils.getOutputFilename(file.name, 'compressed', ext);
                
                this.compressedResults.push({ blob, filename: newName });
                
                fileList.innerHTML += `
                    <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${file.name}</span>
                        <div class="flex gap-12 items-center">
                            <span style="color: var(--text-muted); font-size: 0.8rem;"><del>${ImageUtils.formatSize(file.size)}</del></span>
                            <span style="color: var(--cat-optimize); font-size: 0.9rem; font-weight: bold;">${ImageUtils.formatSize(blob.size)} (-${savings}%)</span>
                            <button class="btn btn-sm btn-secondary" onclick="ImageUtils.downloadBlob(CompressTool.compressedResults[${i}].blob, '${newName}')">Download</button>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error(e);
                Toast.error(`Failed to compress ${file.name}`);
            }
        }
        
        btn.disabled = false;
        btn.textContent = 'Compress Images';
        Toast.success('Compression complete!');
    },

    downloadAll() {
        this.compressedResults.forEach(res => {
            ImageUtils.downloadBlob(res.blob, res.filename);
        });
        Toast.success('Downloads started');
    },

    destroy() {
        this.files = [];
        this.compressedResults = [];
    }
};
