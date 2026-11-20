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
                                    <option value="keep">Keep Original Format</option>
                                    <option value="image/webp">WebP (Recommended - Smallest & Transparency)</option>
                                    <option value="image/jpeg">JPG (Best for Photos)</option>
                                    <option value="image/png">PNG (Lossless)</option>
                                </select>
                                <div id="compress-png-notice" style="display: none; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-sm, 6px); padding: 10px 12px; margin-top: 10px; font-size: 0.85rem; line-height: 1.4; color: var(--text-main);">
                                    <div>ℹ️ <strong>PNG Note:</strong> Browser canvas cannot lossy-compress PNGs via quality. Select <strong>WebP</strong> for 60–80% smaller size while preserving transparency.</div>
                                    <button type="button" id="compress-switch-webp-btn" class="btn btn-sm btn-outline" style="margin-top: 8px; width: 100%;">Switch to WebP</button>
                                </div>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="compress-btn" class="btn btn-primary w-full mb-12">Compress Images</button>
                                <button id="compress-reset-btn" class="btn btn-outline w-full">Reset / Change Images</button>
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
    compressedResults: [],
    
    init(config) {
        this.files = [];
        this.compressedResults = [];
        const uploadZone = document.getElementById('compress-upload-zone');
        const workspace = document.getElementById('compress-workspace');
        
        setupUploadZone('compress-upload-zone', 'compress-file-input', (files) => {
            this.files = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (this.files.length > 0) {
                uploadZone.classList.add('hidden');
                workspace.classList.add('active');
                this.updatePngNotice();
                Toast.success(`Loaded ${this.files.length} image(s)`);
            } else {
                Toast.error('Please upload valid image files');
            }
        }, 'image/*');

        const qualitySlider = document.getElementById('compress-quality');
        const qualityVal = document.getElementById('compress-quality-val');
        const formatSelect = document.getElementById('compress-format');
        const switchWebpBtn = document.getElementById('compress-switch-webp-btn');
        
        qualitySlider.addEventListener('input', (e) => {
            qualityVal.textContent = `${e.target.value}%`;
        });

        formatSelect.addEventListener('change', () => {
            this.updatePngNotice();
        });

        if (switchWebpBtn) {
            switchWebpBtn.addEventListener('click', () => {
                formatSelect.value = 'image/webp';
                this.updatePngNotice();
                Toast.info('Switched output to WebP for high compression & transparency');
            });
        }

        document.getElementById('compress-btn').addEventListener('click', () => this.compressAll());
        document.getElementById('compress-download-all').addEventListener('click', () => this.downloadAll());
        document.getElementById('compress-reset-btn').addEventListener('click', () => this.resetTool());
    },

    updatePngNotice() {
        const notice = document.getElementById('compress-png-notice');
        if (!notice) return;
        const formatOpt = document.getElementById('compress-format').value;
        const hasPngFiles = this.files.some(f => f.type === 'image/png');
        
        if (formatOpt === 'image/png' || (formatOpt === 'keep' && hasPngFiles)) {
            notice.style.display = 'block';
        } else {
            notice.style.display = 'none';
        }
    },

    resetTool() {
        this.files = [];
        this.compressedResults = [];
        const uploadZone = document.getElementById('compress-upload-zone');
        const workspace = document.getElementById('compress-workspace');
        const fileInput = document.getElementById('compress-file-input');
        const resultsContainer = document.getElementById('compress-results');
        const fileList = document.getElementById('compress-file-list');
        const notice = document.getElementById('compress-png-notice');

        if (fileInput) fileInput.value = '';
        if (fileList) fileList.innerHTML = '';
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (notice) notice.style.display = 'none';
        if (workspace) workspace.classList.remove('active');
        if (uploadZone) uploadZone.classList.remove('hidden');

        const btn = document.getElementById('compress-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Compress Images';
        }
    },

    async compressAll() {
        if (!this.files.length) {
            Toast.error('No images to compress');
            return;
        }

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
                
                // If output is PNG, canvas toBlob ignores quality and can inflate file size
                let finalBlob = blob;
                let savings = ((file.size - finalBlob.size) / file.size * 100).toFixed(1);
                let savingsDisplay = `-${savings}%`;
                
                if (mime === 'image/png' && finalBlob.size >= file.size) {
                    // Avoid delivering an inflated PNG to user
                    finalBlob = file;
                    savings = '0.0';
                    savingsDisplay = '0% (PNG lossless)';
                }

                const ext = ImageUtils.getExtFromMime(mime);
                const newName = ImageUtils.getOutputFilename(file.name, 'compressed', ext);
                
                const resultIndex = this.compressedResults.length;
                this.compressedResults.push({ blob: finalBlob, filename: newName });
                
                // Safe DOM creation - prevents HTML injection in file name and download handler
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;';
                nameSpan.textContent = file.name; // SAFE: prevents XSS
                nameSpan.title = file.name;
                
                const rightDiv = document.createElement('div');
                rightDiv.className = 'flex gap-12 items-center';
                
                const oldSizeSpan = document.createElement('span');
                oldSizeSpan.style.cssText = 'color: var(--text-muted); font-size: 0.8rem;';
                const delTag = document.createElement('del');
                delTag.textContent = ImageUtils.formatSize(file.size);
                oldSizeSpan.appendChild(delTag);
                
                const newSizeSpan = document.createElement('span');
                newSizeSpan.style.cssText = 'color: var(--cat-optimize); font-size: 0.9rem; font-weight: bold;';
                newSizeSpan.textContent = `${ImageUtils.formatSize(finalBlob.size)} (${savingsDisplay})`;
                
                const dlBtn = document.createElement('button');
                dlBtn.className = 'btn btn-sm btn-secondary';
                dlBtn.textContent = 'Download';
                const targetBlob = finalBlob;
                const targetName = newName;
                dlBtn.addEventListener('click', () => {
                    ImageUtils.downloadBlob(targetBlob, targetName);
                });
                
                rightDiv.appendChild(oldSizeSpan);
                rightDiv.appendChild(newSizeSpan);
                rightDiv.appendChild(dlBtn);
                
                item.appendChild(nameSpan);
                item.appendChild(rightDiv);
                fileList.appendChild(item);
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
        this.resetTool();
    }
};
