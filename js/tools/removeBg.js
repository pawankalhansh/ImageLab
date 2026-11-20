const RemoveBgTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
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
                                Automatically detects the main subject and removes the background using a local AI model.
                            </p>

                            <div class="info-box mt-16" style="background: rgba(144, 238, 144, 0.1); border-left: 3px solid #4ade80;">
                                <p style="font-size: 0.8rem; color: #4ade80; margin: 0;" id="rbg-model-status">
                                    <b>Note:</b> The AI model downloads on first use (~40-80MB) and is cached for later.
                                </p>
                            </div>
                            
                            <div class="actions-bar mt-24" style="flex-direction: column;">
                                <button id="rbg-process-btn" class="btn btn-primary w-full mb-12">Remove Background</button>
                                <button id="rbg-reset-btn" class="btn btn-secondary w-full mb-12">Reset / Change Image</button>
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
    resultImg: null,
    canvas: null,
    ctx: null,
    processedBlob: null,
    removeBackgroundFn: null,
    sliderPos: 0.5,
    isDragging: false,
    hoveringSlider: false,

    _onMouseDown: null,
    _onMouseMove: null,
    _onMouseUp: null,
    _onTouchStart: null,
    _onTouchMove: null,
    _onTouchEnd: null,

    init(config) {
        setupUploadZone('rbg-upload-zone', 'rbg-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('rbg-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    this.processedBlob = null;
                    this.resultImg = null;
                    this.sliderPos = 0.5;
                    document.getElementById('rbg-download-btn').disabled = true;
                    document.getElementById('rbg-process-btn').disabled = false;
                    document.getElementById('rbg-process-btn').textContent = 'Remove Background';

                    document.getElementById('rbg-upload-zone').classList.add('hidden');
                    document.getElementById('rbg-workspace').classList.add('active');

                    this.drawPreview(this.originalImg);
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        document.getElementById('rbg-process-btn').addEventListener('click', () => {
            this.processBackground();
        });

        document.getElementById('rbg-reset-btn').addEventListener('click', () => {
            this.reset();
        });

        document.getElementById('rbg-download-btn').addEventListener('click', () => {
            if (this.processedBlob) this.download();
        });

        this.setupSliderEvents();
    },

    setupSliderEvents() {
        this.removeSliderEvents();

        const getMousePos = (e) => {
            if (!this.canvas) return 0.5;
            const rect = this.canvas.getBoundingClientRect();
            let clientX = e.clientX;
            if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
            return (clientX - rect.left) / rect.width;
        };

        const updateCursor = (e) => {
            if (!this.resultImg || !this.canvas) return;
            const pos = getMousePos(e);
            const sliderPixel = this.sliderPos;
            if (Math.abs(pos - sliderPixel) < 0.05) {
                this.canvas.style.cursor = 'ew-resize';
                this.hoveringSlider = true;
            } else {
                this.canvas.style.cursor = 'default';
                this.hoveringSlider = false;
            }
        };

        const startDrag = (e) => {
            if (!this.resultImg) return;
            const pos = getMousePos(e);
            if (Math.abs(pos - this.sliderPos) < 0.1 || e.type === 'touchstart') {
                this.isDragging = true;
                this.sliderPos = Math.max(0, Math.min(1, pos));
                this.drawPreview();
            }
        };

        const onDrag = (e) => {
            if (!this.resultImg) return;
            updateCursor(e);
            if (this.isDragging) {
                this.sliderPos = Math.max(0, Math.min(1, getMousePos(e)));
                this.drawPreview();
                if (e.cancelable) e.preventDefault();
            }
        };

        const endDrag = () => {
            this.isDragging = false;
        };

        this._onMouseDown = (e) => {
            if (e.target.id === 'rbg-canvas') startDrag(e);
        };
        this._onMouseMove = (e) => {
            if (e.target.id === 'rbg-canvas' || this.isDragging) onDrag(e);
        };
        this._onMouseUp = endDrag;

        this._onTouchStart = (e) => {
            if (e.target.id === 'rbg-canvas') startDrag(e);
        };
        this._onTouchMove = (e) => {
            if (this.isDragging) onDrag(e);
        };
        this._onTouchEnd = endDrag;

        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        
        document.addEventListener('touchstart', this._onTouchStart, { passive: false });
        document.addEventListener('touchmove', this._onTouchMove, { passive: false });
        document.addEventListener('touchend', this._onTouchEnd);
    },

    removeSliderEvents() {
        if (this._onMouseDown) document.removeEventListener('mousedown', this._onMouseDown);
        if (this._onMouseMove) document.removeEventListener('mousemove', this._onMouseMove);
        if (this._onMouseUp) document.removeEventListener('mouseup', this._onMouseUp);
        if (this._onTouchStart) document.removeEventListener('touchstart', this._onTouchStart);
        if (this._onTouchMove) document.removeEventListener('touchmove', this._onTouchMove);
        if (this._onTouchEnd) document.removeEventListener('touchend', this._onTouchEnd);

        this._onMouseDown = null;
        this._onMouseMove = null;
        this._onMouseUp = null;
        this._onTouchStart = null;
        this._onTouchMove = null;
        this._onTouchEnd = null;
    },

    drawPreview(sourceOverride) {
        if (!this.canvas || !this.ctx) return;
        
        const source = sourceOverride || this.originalImg;
        if (!source) return;

        const maxSize = 800;
        let w = source.width || source.naturalWidth;
        let h = source.height || source.naturalHeight;

        if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.clearRect(0, 0, w, h);

        if (this.resultImg) {
            // Draw split view
            const splitX = w * this.sliderPos;
            
            // Draw original on left
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(0, 0, splitX, h);
            this.ctx.clip();
            this.ctx.drawImage(this.originalImg, 0, 0, w, h);
            this.ctx.restore();
            
            // Draw result on right (with checkerboard)
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(splitX, 0, w - splitX, h);
            this.ctx.clip();
            this.drawCheckerboard(w, h);
            this.ctx.drawImage(this.resultImg, 0, 0, w, h);
            this.ctx.restore();
            
            // Draw slider line
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(splitX - 1.5, 0, 3, h);
            
            // Draw slider handle
            this.ctx.beginPath();
            this.ctx.arc(splitX, h / 2, 16, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
            this.ctx.shadowBlur = 6;
            this.ctx.fill();
            this.ctx.shadowColor = 'transparent';
            
            // Draw arrows
            this.ctx.fillStyle = '#64748b';
            this.ctx.beginPath();
            this.ctx.moveTo(splitX - 6, h / 2);
            this.ctx.lineTo(splitX - 2, h / 2 - 4);
            this.ctx.lineTo(splitX - 2, h / 2 + 4);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.moveTo(splitX + 6, h / 2);
            this.ctx.lineTo(splitX + 2, h / 2 - 4);
            this.ctx.lineTo(splitX + 2, h / 2 + 4);
            this.ctx.fill();
            
        } else {
            // Checkerboard for transparent PNGs if original has transparency
            this.drawCheckerboard(w, h);
            this.ctx.drawImage(source, 0, 0, w, h);
        }
    },

    drawCheckerboard(w, h) {
        const size = 12;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const color1 = isDark ? '#2a2a3a' : '#e5e7eb';
        const color2 = isDark ? '#3a3a4a' : '#f9fafb';
        
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                const isEven = ((x / size) + (y / size)) % 2 === 0;
                this.ctx.fillStyle = isEven ? color1 : color2;
                this.ctx.fillRect(x, y, size, size);
            }
        }
    },

    async ensureLibrary() {
        if (this.removeBackgroundFn) return this.removeBackgroundFn;

        const statusTitle = document.getElementById('rbg-status-title');
        const progressText = document.getElementById('rbg-progress-text');
        statusTitle.textContent = 'Loading AI library...';
        progressText.textContent = 'Downloading background-removal engine';

        // Try multiple CDN sources for reliability, using +esm for browser compatibility
        const cdnUrls = [
            'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm',
            'https://unpkg.com/@imgly/background-removal@1.5.5/dist/index.mjs',
            'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm'
        ];

        let mod = null;
        for (const url of cdnUrls) {
            try {
                mod = await import(url);
                break;
            } catch (e) {
                console.warn('Failed to load from:', url, e);
                continue;
            }
        }

        if (!mod) {
            throw new Error('Could not load background removal library from any CDN. Please check your network connection.');
        }

        this.removeBackgroundFn = mod.removeBackground || mod.default?.removeBackground || mod.default;
        if (typeof this.removeBackgroundFn !== 'function') {
            throw new Error('Background removal library failed to initialize');
        }
        return this.removeBackgroundFn;
    },

    formatErrorMessage(e) {
        const msg = (e && e.message) ? e.message : String(e);
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('Could not load')) {
            return 'Network error downloading AI model assets. Check connection or ad-blocker';
        }
        if (msg.includes('wasm') || msg.includes('WebAssembly') || msg.includes('memory') || msg.includes('WebGL')) {
            return 'Hardware acceleration error. Check browser graphics settings';
        }
        return msg || 'An unexpected error occurred while processing';
    },

    async processBackground() {
        if (!this.file) return;

        const loadingOverlay = document.getElementById('rbg-loading');
        const statusTitle = document.getElementById('rbg-status-title');
        const progressText = document.getElementById('rbg-progress-text');
        const processBtn = document.getElementById('rbg-process-btn');

        loadingOverlay.classList.remove('hidden');
        processBtn.disabled = true;
        document.getElementById('rbg-download-btn').disabled = true;

        try {
            const removeBackground = await this.ensureLibrary();

            statusTitle.textContent = 'Removing background...';
            progressText.textContent = 'Running neural network (first run downloads the model)';

            let targetInput = this.file;
            // The library supports png, jpeg, webp. Convert others like AVIF to PNG first.
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(this.file.type)) {
                progressText.textContent = 'Converting image format...';
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.originalImg.width;
                tempCanvas.height = this.originalImg.height;
                tempCanvas.getContext('2d').drawImage(this.originalImg, 0, 0);
                targetInput = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
            }

            const runRemoval = async (publicPath) => {
                return await removeBackground(targetInput, {
                    publicPath,
                    progress: (key, current, total) => {
                        if (total > 0) {
                            const pct = Math.round((current / total) * 100);
                            progressText.textContent = `${key || 'Progress'}: ${pct}%`;
                        } else {
                            progressText.textContent = key || 'Processing...';
                        }
                    },
                });
            };

            let resultBlob;
            const primaryPath = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.5.5/dist/';
            const fallbackPath = 'https://unpkg.com/@imgly/background-removal-data@1.5.5/dist/';

            try {
                resultBlob = await runRemoval(primaryPath);
            } catch (err1) {
                console.warn('Primary CDN publicPath failed, trying fallback CDN...', err1);
                statusTitle.textContent = 'Retrying with backup mirror...';
                progressText.textContent = 'Connecting to fallback model server...';
                resultBlob = await runRemoval(fallbackPath);
            }

            this.processedBlob = resultBlob;
            
            const resultUrl = URL.createObjectURL(resultBlob);
            this.resultImg = await ImageUtils.loadImageFromURL(resultUrl);
            this.sliderPos = 0.5; // Reset slider to middle
            this.drawPreview();
            URL.revokeObjectURL(resultUrl);

            document.getElementById('rbg-model-status').innerHTML =
                '<b>Ready:</b> Model is cached in your browser for faster next runs.';
            document.getElementById('rbg-download-btn').disabled = false;
            processBtn.textContent = 'Process Again';
            processBtn.disabled = false;
            Toast.success('Background removed successfully!');
        } catch (e) {
            console.error(e);
            const friendlyMsg = this.formatErrorMessage(e);
            Toast.error('Failed to remove background: ' + friendlyMsg);
            
            const modelStatus = document.getElementById('rbg-model-status');
            if (modelStatus) {
                modelStatus.innerHTML = `<span style="color: #ef4444;"><b>Error:</b> ${friendlyMsg}. Check your connection and try again.</span>`;
            }

            processBtn.textContent = 'Retry Background Removal';
            processBtn.disabled = false;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    },

    download() {
        if (!this.processedBlob) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'nobg', 'png');
        ImageUtils.downloadBlob(this.processedBlob, newName);
    },

    reset() {
        this.file = null;
        this.originalImg = null;
        this.resultImg = null;
        this.processedBlob = null;
        this.sliderPos = 0.5;
        this.isDragging = false;
        this.hoveringSlider = false;

        if (this.canvas) {
            const ctx = this.canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        const workspace = document.getElementById('rbg-workspace');
        const uploadZone = document.getElementById('rbg-upload-zone');
        const fileInput = document.getElementById('rbg-file-input');
        const processBtn = document.getElementById('rbg-process-btn');
        const downloadBtn = document.getElementById('rbg-download-btn');
        const modelStatus = document.getElementById('rbg-model-status');

        if (workspace) workspace.classList.remove('active');
        if (uploadZone) uploadZone.classList.remove('hidden');
        if (fileInput) fileInput.value = '';
        if (downloadBtn) downloadBtn.disabled = true;
        if (processBtn) {
            processBtn.textContent = 'Remove Background';
            processBtn.disabled = false;
        }
        if (modelStatus) {
            modelStatus.innerHTML = '<b>Note:</b> The AI model downloads on first use (~40-80MB) and is cached for later.';
        }
    },

    destroy() {
        this.removeSliderEvents();
        this.reset();
        this.canvas = null;
        this.ctx = null;
        // Keep library loaded for reuse across navigations within the session
    }
};
