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
                                <button id="flt-reset" class="btn btn-secondary w-full mb-16">Reset</button>
                                <button id="flt-download" class="btn btn-primary w-full">Download Image</button>
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
        this.currentFilters = { ...this.presets.original };
        
        setupUploadZone('filters-upload-zone', 'filters-file-input', async (files) => {
            if (files.length > 0) {
                this.file = files[0];
                try {
                    this.originalImg = await ImageUtils.loadImage(this.file);
                    this.canvas = document.getElementById('filters-canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    document.getElementById('filters-upload-zone').classList.add('hidden');
                    document.getElementById('filters-workspace').classList.add('active');
                    this.canvas.style.display = 'block';
                    
                    this.canvas.width = this.originalImg.width;
                    this.canvas.height = this.originalImg.height;
                    
                    this.applyFilters();
                } catch (e) {
                    Toast.error('Failed to load image');
                }
            }
        });

        // Setup Sliders
        document.querySelectorAll('.filter-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const id = e.target.id.replace('flt-', '');
                this.currentFilters[id] = parseInt(e.target.value);
                
                let unit = '%';
                if (id === 'huerotate') unit = '°';
                if (id === 'blur') unit = 'px';
                
                document.getElementById(`val-${id}`).textContent = `${e.target.value}${unit}`;
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
                this.currentFilters = { ...preset };
                
                // Update sliders
                Object.keys(this.currentFilters).forEach(key => {
                    const slider = document.getElementById(`flt-${key}`);
                    if (slider) {
                        slider.value = this.currentFilters[key];
                        let unit = '%';
                        if (key === 'huerotate') unit = '°';
                        if (key === 'blur') unit = 'px';
                        document.getElementById(`val-${key}`).textContent = `${this.currentFilters[key]}${unit}`;
                    }
                });
                
                this.applyFilters();
            });
        });

        document.getElementById('flt-reset').addEventListener('click', () => {
            document.querySelector('[data-preset="original"]').click();
        });
        document.getElementById('flt-download').addEventListener('click', () => this.download());
    },

    getFilterString() {
        const f = this.currentFilters;
        return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale || 0}%) sepia(${f.sepia || 0}%) hue-rotate(${f.huerotate}deg) blur(${f.blur}px)`;
    },

    applyFilters() {
        if (!this.originalImg) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.filter = this.getFilterString();
        this.ctx.drawImage(this.originalImg, 0, 0);
    },

    download() {
        if (!this.originalImg) return;
        const newName = ImageUtils.getOutputFilename(this.file.name, 'filtered');
        ImageUtils.downloadCanvas(this.canvas, newName, this.file.type);
    },

    destroy() {
        this.file = null;
        this.originalImg = null;
    }
};
