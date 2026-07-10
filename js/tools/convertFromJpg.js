const ConvertFromJpgTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="cfj-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select JPG Images</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose Files
                        <input type="file" id="cfj-file-input" multiple accept="image/jpeg, image/jpg">
                    </div>
                </div>

                <div id="cfj-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Conversion Settings</h3>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Output Format</span>
                                </div>
                                <select id="cfj-format" class="input-select">
                                    <option value="image/png">PNG</option>
                                    <option value="image/webp">WebP</option>
                                    <option value="image/bmp">BMP</option>
                                </select>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="cfj-btn" class="btn btn-primary w-full">Convert from JPG</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col" id="cfj-results" style="display: none; align-items: stretch; justify-content: start;">
                            <div class="actions-bar mb-16" style="justify-content: flex-end;">
                                <button id="cfj-download-all" class="btn btn-success">Download All</button>
                            </div>
                            <div id="cfj-file-list" style="display: flex; flex-direction: column; gap: 12px; width: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    files: [],
    
    init(config) {
        this.files = [];
        const uploadZone = document.getElementById('cfj-upload-zone');
        const workspace = document.getElementById('cfj-workspace');
        
        setupUploadZone('cfj-upload-zone', 'cfj-file-input', (files) => {
            this.files = Array.from(files).filter(f => f.type === 'image/jpeg' || f.type === 'image/jpg');
            if (this.files.length > 0) {
                uploadZone.classList.add('hidden');
                workspace.classList.add('active');
                Toast.success(`Loaded ${this.files.length} image(s) for conversion`);
            } else {
                Toast.error('Please upload JPG files only');
            }
        });

        document.getElementById('cfj-btn').addEventListener('click', () => this.convertAll());
        document.getElementById('cfj-download-all').addEventListener('click', () => this.downloadAll());
    },

    convertedResults: [],

    async convertAll() {
        const formatOpt = document.getElementById('cfj-format').value;
        const resultsContainer = document.getElementById('cfj-results');
        const fileList = document.getElementById('cfj-file-list');
        
        fileList.innerHTML = '';
        resultsContainer.style.display = 'flex';
        this.convertedResults = [];
        
        const btn = document.getElementById('cfj-btn');
        btn.disabled = true;
        btn.textContent = 'Converting...';

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            
            try {
                const img = await ImageUtils.loadImage(file);
                const { canvas } = ImageUtils.drawToCanvas(img, img.width, img.height);
                
                const blob = await ImageUtils.canvasToBlob(canvas, formatOpt, 0.92);
                const ext = ImageUtils.getExtFromMime(formatOpt);
                const newName = ImageUtils.getOutputFilename(file.name, 'converted', ext);
                
                this.convertedResults.push({ blob, filename: newName });
                
                fileList.innerHTML += `
                    <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${file.name}</span>
                        <div class="flex gap-12 items-center">
                            <span style="color: var(--text-muted); font-size: 0.8rem; background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">JPG → ${ext.toUpperCase()}</span>
                            <span style="color: var(--cat-convert); font-size: 0.9rem; font-weight: bold;">${ImageUtils.formatSize(blob.size)}</span>
                            <button class="btn btn-sm btn-secondary" onclick="ImageUtils.downloadBlob(ConvertFromJpgTool.convertedResults[${i}].blob, '${newName}')">Download</button>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error(e);
                Toast.error(`Failed to convert ${file.name}`);
            }
        }
        
        btn.disabled = false;
        btn.textContent = 'Convert from JPG';
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
