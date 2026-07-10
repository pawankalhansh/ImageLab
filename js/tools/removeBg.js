const RemoveBgTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>State-of-the-art background removal using RMBG-1.4. Runs entirely in your browser.</p>
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
                            <p class="text-slate-400 mt-8 text-sm">
                                Automatically detects the main subject and removes the background using a highly accurate local AI model (RMBG-1.4).
                            </p>

                            <div class="info-box mt-16" style="background: rgba(144, 238, 144, 0.1); border-left: 3px solid #4ade80;">
                                <p style="font-size: 0.8rem; color: #4ade80; margin: 0;" id="rbg-model-status">
                                    <b>Note:</b> The AI model will be downloaded on first run (approx ~170MB). This may take a few minutes.
                                </p>
                            </div>
                            
                            <div class="actions-bar mt-24">
                                <button id="rbg-reset-btn" class="btn btn-outline w-full mb-12">Reset Image</button>
                                <button id="rbg-download-btn" class="btn btn-success w-full" disabled>Download PNG</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="rbg-canvas"></canvas>
                            
                            <div id="rbg-loading" class="loading-overlay hidden">
                                <div class="spinner"></div>
                                <div class="loading-text mt-12 text-center" style="max-width: 250px;">
                                    <div id="rbg-status-title" class="font-bold">Loading AI Engine...</div>
                                    <div id="rbg-progress-text" class="text-sm mt-4 text-slate-300">Preparing...</div>
                                </div>
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
    segmenter: null,

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
                    
                    this.drawPreview(this.originalImg);
                    this.processBackground();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        document.getElementById('rbg-reset-btn').addEventListener('click', () => {
            this.processedBlob = null;
            document.getElementById('rbg-download-btn').disabled = true;
            document.getElementById('rbg-workspace').classList.remove('active');
            document.getElementById('rbg-upload-zone').classList.remove('hidden');
            document.getElementById('rbg-file-input').value = '';
        });

        document.getElementById('rbg-download-btn').addEventListener('click', () => {
            if (this.processedBlob) {
                this.download();
            }
        });
    },

    drawPreview(img) {
        const maxSize = 800;
        let w = img.width;
        let h = img.height;
        
        if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w *= ratio;
            h *= ratio;
        }
        
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.drawImage(img, 0, 0, w, h);
    },

    async processBackground() {
        const loadingOverlay = document.getElementById('rbg-loading');
        const statusTitle = document.getElementById('rbg-status-title');
        const progressText = document.getElementById('rbg-progress-text');
        
        loadingOverlay.classList.remove('hidden');
        document.getElementById('rbg-download-btn').disabled = true;
        
        try {
            // Load Transformers.js dynamically
            statusTitle.textContent = 'Initializing AI...';
            progressText.textContent = 'Loading Transformers.js';
            
            const { pipeline, env, RawImage } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
            
            // Configure transformers.js for browser
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            // Load the model
            if (!this.segmenter) {
                statusTitle.textContent = 'Downloading Model...';
                
                this.segmenter = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
                    progress_callback: (info) => {
                        if (info.status === 'downloading') {
                            const percent = Math.round((info.loaded / info.total) * 100);
                            progressText.textContent = `Downloading ${info.file}: ${percent}%`;
                        } else if (info.status === 'done') {
                            progressText.textContent = `Finished downloading ${info.file}`;
                        } else if (info.status === 'ready') {
                            progressText.textContent = `Model Ready!`;
                        }
                    }
                });
                
                document.getElementById('rbg-model-status').innerHTML = '<b>Note:</b> Model is now cached in your browser for instant future use!';
            }

            statusTitle.textContent = 'Segmenting Image...';
            progressText.textContent = 'Running RMBG-1.4 Neural Network';
            
            // Convert file to URL and process
            const url = URL.createObjectURL(this.file);
            const image = await RawImage.fromURL(url);
            
            // Run inference
            const result = await this.segmenter(image);
            
            // The result is an array with a mask
            let maskRaw;
            if (Array.isArray(result)) {
                maskRaw = result[0].mask;
            } else {
                maskRaw = result.mask || result;
            }
            
            // Create a canvas from the output mask
            const maskCanvas = maskRaw.toCanvas();
            
            // Create final canvas to compose original image and mask
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = this.originalImg.width;
            finalCanvas.height = this.originalImg.height;
            const finalCtx = finalCanvas.getContext('2d');
            
            // Draw original image
            finalCtx.drawImage(this.originalImg, 0, 0);
            
            // Apply mask via globalCompositeOperation
            finalCtx.globalCompositeOperation = 'destination-in';
            // Draw the mask canvas, stretched to fit original size
            finalCtx.drawImage(maskCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
            
            // Restore context
            finalCtx.globalCompositeOperation = 'source-over';

            // Show result
            this.drawPreview(finalCanvas);

            // Export to blob
            this.processedBlob = await new Promise(resolve => {
                finalCanvas.toBlob(resolve, 'image/png');
            });
            
            document.getElementById('rbg-download-btn').disabled = false;
            Toast.success('Background removed successfully!');
            URL.revokeObjectURL(url);
            
        } catch (e) {
            console.error(e);
            Toast.error('Failed to process image with AI: ' + e.message);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    },

    download() {
        if (!this.processedBlob) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'nobg', 'png');
        
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
        // Don't destroy segmenter so it stays in memory across multiple image uses
    }
};
