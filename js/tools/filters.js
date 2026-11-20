const FiltersTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="filters-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="filters-file-input" accept="image/*">
                    </div>
                </div>

                <div id="filters-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Presets</h3>
                            <div id="filters-file-info" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                            
                            <div class="preset-group mb-16">
                                <button class="preset-btn filter-preset active" data-preset="original">Original</button>
                                <button class="preset-btn filter-preset" data-preset="grayscale">Grayscale</button>
                                <button class="preset-btn filter-preset" data-preset="sepia">Sepia</button>
                                <button class="preset-btn filter-preset" data-preset="vintage">Vintage</button>
                                <button class="preset-btn filter-preset" data-preset="cool">Cool</button>
                                <button class="preset-btn filter-preset" data-preset="warm">Warm</button>
                                <button class="preset-btn filter-preset" data-preset="highcontrast">Contrast</button>
                            </div>

                            <h3>Adjustments</h3>
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Brightness</span>
                                    <span class="control-value" id="val-brightness">100%</span>
                                </div>
                                <input type="range" id="flt-brightness" min="0" max="200" value="100" class="filter-slider">
                            </div>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Contrast</span>
                                    <span class="control-value" id="val-contrast">100%</span>
                                </div>
                                <input type="range" id="flt-contrast" min="0" max="200" value="100" class="filter-slider">
                            </div>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Saturation</span>
                                    <span class="control-value" id="val-saturate">100%</span>
                                </div>
                                <input type="range" id="flt-saturate" min="0" max="200" value="100" class="filter-slider">
                            </div>
                            
                            <div class="control-group">
                                <div class="control-label">
                                    <span>Hue Rotate</span>
                                    <span class="control-value" id="val-huerotate">0°</span>
                                </div>
                                <input type="range" id="flt-huerotate" min="0" max="360" value="0" class="filter-slider">
                            </div>

                            <div class="control-group">
                                <div class="control-label">
                                    <span>Blur</span>
                                    <span class="control-value" id="val-blur">0px</span>
                                </div>
                                <input type="range" id="flt-blur" min="0" max="20" value="0" class="filter-slider">
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="flt-download" class="btn btn-primary w-full mb-12">Download Image</button>
                                <button id="flt-compare" class="btn btn-secondary w-full mb-12" title="Press and hold to preview original image">Hold to Compare Original</button>
                                <button id="flt-reset" class="btn btn-secondary w-full mb-12">Reset Filters</button>
                                <button id="flt-change-btn" class="btn btn-outline w-full">Change Image</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="filters-canvas" style="display: none; max-height: 500px;"></canvas>
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

    presets: {
        original: { brightness: 100, contrast: 100, saturate: 100, huerotate: 0, blur: 0, sepia: 0, grayscale: 0 },
        grayscale: { brightness: 100, contrast: 100, saturate: 100, huerotate: 0, blur: 0, sepia: 0, grayscale: 100 },
        sepia: { brightness: 100, contrast: 100, saturate: 100, huerotate: 0, blur: 0, sepia: 100, grayscale: 0 },
        vintage: { brightness: 90, contrast: 110, saturate: 80, huerotate: 0, blur: 0, sepia: 50, grayscale: 0 },
        cool: { brightness: 100, contrast: 100, saturate: 120, huerotate: 180, blur: 0, sepia: 0, grayscale: 0 },
        warm: { brightness: 105, contrast: 110, saturate: 130, huerotate: 340, blur: 0, sepia: 20, grayscale: 0 },
        highcontrast: { brightness: 110, contrast: 150, saturate: 120, huerotate: 0, blur: 0, sepia: 0, grayscale: 0 }
    },
    
    currentFilters: {},

    init(config) {
        this.file = null;
        this.originalImg = null;
        this.currentFilters = { ...this.presets.original };
        
        setupUploadZone('filters-upload-zone', 'filters-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('filters-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    const fileInfo = document.getElementById('filters-file-info');
                    if (fileInfo) {
                        fileInfo.textContent = `${this.file.name} (${this.originalImg.width} × ${this.originalImg.height}px)`;
                        fileInfo.title = this.file.name;
                    }

                    document.getElementById('filters-upload-zone').classList.add('hidden');
                    document.getElementById('filters-workspace').classList.add('active');
                    this.canvas.style.display = 'block';
                    
                    this.canvas.width = this.originalImg.width;
                    this.canvas.height = this.originalImg.height;
                    
                    this.applyFilters();
                    Toast.success('Image loaded successfully');
                } catch (e) {
                    console.error(e);
                    Toast.error('Failed to load image');
                }
            }
        });

        // Setup Sliders
        document.querySelectorAll('.filter-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const id = e.target.id.replace('flt-', '');
                this.currentFilters[id] = parseInt(e.target.value) || 0;
                
                let unit = '%';
                if (id === 'huerotate') unit = '°';
                if (id === 'blur') unit = 'px';
                
                const valElem = document.getElementById(`val-${id}`);
                if (valElem) valElem.textContent = `${e.target.value}${unit}`;
                this.applyFilters();
                
                // Clear active preset
                document.querySelectorAll('.filter-preset').forEach(b => b.classList.remove('active'));
            });
        });

        // Setup Presets
        document.querySelectorAll('.filter-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const preset = this.presets[e.target.dataset.preset];
                if (!preset) return;
                this.currentFilters = { ...preset };
                
                // Update sliders
                Object.keys(this.currentFilters).forEach(key => {
                    const slider = document.getElementById(`flt-${key}`);
                    if (slider) {
                        slider.value = this.currentFilters[key];
                        let unit = '%';
                        if (key === 'huerotate') unit = '°';
                        if (key === 'blur') unit = 'px';
                        const valElem = document.getElementById(`val-${key}`);
                        if (valElem) valElem.textContent = `${this.currentFilters[key]}${unit}`;
                    }
                });
                
                this.applyFilters();
            });
        });

        // Hold to compare original
        const compareBtn = document.getElementById('flt-compare');
        if (compareBtn) {
            const showOriginal = (e) => {
                if (e.cancelable) e.preventDefault();
                if (!this.originalImg || !this.ctx || !this.canvas) return;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.filter = 'none';
                this.ctx.drawImage(this.originalImg, 0, 0);
            };
            const hideOriginal = (e) => {
                if (e && e.cancelable) e.preventDefault();
                this.applyFilters();
            };

            compareBtn.addEventListener('mousedown', showOriginal);
            compareBtn.addEventListener('touchstart', showOriginal, { passive: false });
            compareBtn.addEventListener('mouseup', hideOriginal);
            compareBtn.addEventListener('mouseleave', hideOriginal);
            compareBtn.addEventListener('touchend', hideOriginal);
            compareBtn.addEventListener('touchcancel', hideOriginal);
        }

        document.getElementById('flt-reset').addEventListener('click', () => {
            const origBtn = document.querySelector('[data-preset="original"]');
            if (origBtn) origBtn.click();
        });

        document.getElementById('flt-download').addEventListener('click', () => this.download());
        document.getElementById('flt-change-btn').addEventListener('click', () => this.resetTool());
    },

    getFilterString() {
        const f = this.currentFilters;
        return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale || 0}%) sepia(${f.sepia || 0}%) hue-rotate(${f.huerotate}deg) blur(${f.blur}px)`;
    },

    applyFilters() {
        if (!this.originalImg || !this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.filter = this.getFilterString();
        this.ctx.drawImage(this.originalImg, 0, 0);
    },

    resetTool() {
        this.file = null;
        this.originalImg = null;
        this.currentFilters = { ...this.presets.original };

        const uploadZone = document.getElementById('filters-upload-zone');
        const workspace = document.getElementById('filters-workspace');
        const fileInput = document.getElementById('filters-file-input');
        const fileInfo = document.getElementById('filters-file-info');
        const canvas = document.getElementById('filters-canvas');

        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.textContent = '';
        if (canvas) {
            canvas.style.display = 'none';
            if (this.ctx) this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Reset sliders to default
        const origBtn = document.querySelector('[data-preset="original"]');
        if (origBtn) origBtn.click();

        if (workspace) workspace.classList.remove('active');
        if (uploadZone) uploadZone.classList.remove('hidden');
    },

    download() {
        if (!this.originalImg || !this.file || !this.canvas) {
            Toast.error('Please upload an image first');
            return;
        }
        const newName = ImageUtils.getOutputFilename(this.file.name, 'filtered');
        ImageUtils.downloadCanvas(this.canvas, newName, this.file.type);
        Toast.success('Filtered image downloaded!');
    },

    destroy() {
        this.resetTool();
        this.canvas = null;
        this.ctx = null;
    }
};
