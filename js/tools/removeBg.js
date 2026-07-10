const RemoveBgTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc} True AI Subject Segmentation.</p>
                </div>
                
                <div id="rbg-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="rbg-file-input" accept="image/*">
                    </div>
                </div>

                <div id="rbg-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Background Removal</h3>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                                Automatically detects the main subject and removes the background using a local AI model.
                            </p>
                            
                            <div class="actions-bar mt-24">
                                <button id="rbg-btn" class="btn btn-primary w-full mb-12">Remove Background</button>
                                <button id="rbg-reset" class="btn btn-secondary w-full mb-12">Reset Image</button>
                                <button id="rbg-download" class="btn btn-success w-full" style="display: none;">Download PNG</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col" style="position: relative; background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: #444;">
                            <canvas id="rbg-canvas" style="max-height: 500px; display: none;"></canvas>
                            
                            <div id="rbg-loading" class="loading-overlay hidden">
                                <div class="spinner"></div>
                                <div class="loading-text mt-12">Processing...</div>
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
    processedBlob: null,

    init(config) {
        setupUploadZone('rbg-upload-zone', 'rbg-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('rbg-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    document.getElementById('rbg-upload-zone').classList.add('hidden');
                    document.getElementById('rbg-workspace').classList.add('active');
                    this.canvas.style.display = 'block';
                    
                    this.reset();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        // Dynamically load imgly background removal via ES module
        if (!document.getElementById('imgly-script')) {
            const script = document.createElement('script');
            script.id = 'imgly-script';
            script.type = 'module';
            script.textContent = `
                import imglyRemoveBackground from 'https://esm.sh/@imgly/background-removal@1.4.3';
                window.imglyRemoveBackground = imglyRemoveBackground;
            `;
            document.head.appendChild(script);
        }

        document.getElementById('rbg-btn').addEventListener('click', () => this.processRemoveBg());
        document.getElementById('rbg-reset').addEventListener('click', () => this.reset());
        document.getElementById('rbg-download').addEventListener('click', () => this.download());
    },

    reset() {
        if (!this.originalImg) return;
        this.canvas.width = this.originalImg.width;
        this.canvas.height = this.originalImg.height;
        this.ctx.drawImage(this.originalImg, 0, 0);
        this.processedBlob = null;
        document.getElementById('rbg-download').style.display = 'none';
        document.getElementById('rbg-btn').style.display = 'block';
    },

    async processRemoveBg() {
        if (!this.file) return;
        
        document.getElementById('rbg-loading').classList.remove('hidden');
        document.getElementById('rbg-btn').disabled = true;
        document.querySelector('.loading-text').textContent = 'AI is segmenting image...';
        
        try {
            if (typeof imglyRemoveBackground === 'undefined') {
                throw new Error('AI library is still loading. Please try again in a moment.');
            }

            // Call imgly background removal with explicit publicPath for unpkg to avoid CORS
            const config = {
                publicPath: 'https://unpkg.com/@imgly/background-removal-data@1.4.3/dist/'
            };
            const blob = await imglyRemoveBackground(this.file, config);
            
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.src = url;
            
            await new Promise((resolve) => {
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0);
                    resolve();
                };
            });
            
            this.processedBlob = blob;
            document.getElementById('rbg-download').style.display = 'block';
            document.getElementById('rbg-btn').style.display = 'none';
            Toast.success('Background removed successfully!');
        } catch (e) {
            console.error(e);
            Toast.error(e.message || 'Failed to remove background');
        } finally {
            document.getElementById('rbg-loading').classList.add('hidden');
            document.getElementById('rbg-btn').disabled = false;
        }
    },

    download() {
        if (!this.processedBlob) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'nobg', 'png');
        
        // Use a temporary anchor to download the blob directly
        const url = URL.createObjectURL(this.processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = newName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
        this.processedBlob = null;
    }
};
