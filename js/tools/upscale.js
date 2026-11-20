const UpscaleTool = {
  render(config) {
    return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="upscale-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Image</h3>
                    <p>or drag and drop here</p>
                    <div class="btn btn-primary btn-upload">
                        Choose File
                        <input type="file" id="upscale-file-input" accept="image/*">
                    </div>
                </div>

                <div id="upscale-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>Upscale Settings</h3>
                            
                            <div class="control-group">
                                <label class="control-label">Scale Factor</label>
                                <div class="preset-buttons" style="display:flex; gap:0.5rem;" id="upscale-scale-btns">
                                    <button class="btn preset-btn active" data-scale="2" style="flex:1">2x</button>
                                    <button class="btn preset-btn" data-scale="4" style="flex:1">4x</button>
                                </div>
                            </div>
                            
                            <div class="control-group mt-16">
                                <label class="control-label">Image Type</label>
                                <div class="preset-buttons" style="display:flex; gap:0.5rem;" id="upscale-mode-btns">
                                    <button class="btn preset-btn active" data-mode="artwork" style="flex:1">Artwork / Logo</button>
                                    <button class="btn preset-btn" data-mode="photo" style="flex:1">Photo</button>
                                </div>
                            </div>

                            <div class="info-box mt-24">
                                <div class="info-row">
                                    <span>Original:</span>
                                    <span id="upscale-orig-size" class="text-white">-</span>
                                </div>
                                <div class="info-row mt-8">
                                    <span>Upscaled:</span>
                                    <span id="upscale-new-size" class="text-accent font-medium">-</span>
                                </div>
                            </div>
                            
                            <div class="info-box mt-16" id="upscale-method-note" style="background: rgba(144, 238, 144, 0.1); border-left: 3px solid #4ade80;">
                                <p style="font-size: 0.8rem; color: #4ade80; margin: 0;">
                                    <b>Artwork Mode:</b> Enhances edges dynamically to keep graphics and logos perfectly crisp and vector-like. 
                                </p>
                            </div>

                            <div class="actions-bar mt-24">
                                <button id="upscale-btn" class="btn btn-primary w-full mb-12">Upscale Image</button>
                                <button id="upscale-reset-btn" class="btn btn-secondary w-full">Reset / Change Image</button>
                            </div>
                        </div>

                        <div class="preview-container">
                            <canvas id="upscale-canvas"></canvas>
                            
                            <div id="upscale-loading" class="loading-overlay hidden">
                                <div class="spinner"></div>
                                <div class="loading-text mt-12 text-center" style="max-width: 250px;">
                                    <div id="upscale-status-title" class="font-bold">Processing...</div>
                                    <div id="upscale-progress-text" class="text-sm mt-4 text-slate-300">Preparing...</div>
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
  scaleFactor: 2,
  upscaleMode: "artwork",
  processedBlob: null,
  picaInst: null,
  resultImg: null,
  sliderPos: 0.5,
  isDragging: false,
  hoveringSlider: false,

  _onMouseDown: null,
  _onMouseMove: null,
  _onMouseUp: null,
  _onTouchStart: null,
  _onTouchMove: null,
  _onTouchEnd: null,

  async ensurePica() {
    if (this.picaInst) return this.picaInst;
    if (window.pica) {
      this.picaInst = window.pica();
      return this.picaInst;
    }

    const cdnUrls = [
      "https://cdn.jsdelivr.net/npm/pica@9.0.1/dist/pica.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/pica/9.0.1/pica.min.js",
      "https://unpkg.com/pica@9.0.1/dist/pica.min.js"
    ];

    for (const url of cdnUrls) {
      try {
        await loadScript(url);
        if (window.pica) {
          this.picaInst = window.pica();
          return this.picaInst;
        }
      } catch (err) {
        console.warn("Failed to load Pica from:", url, err);
      }
    }

    throw new Error("Pica library failed to load");
  },

  init(config) {
    setupUploadZone(
      "upscale-upload-zone",
      "upscale-file-input",
      async (files) => {
        if (files.length > 0) {
          this.file = files[0];
          try {
            this.originalImg = await ImageUtils.loadImage(this.file);
            this.canvas = document.getElementById("upscale-canvas");
            this.ctx = this.canvas.getContext("2d");

            document
              .getElementById("upscale-upload-zone")
              .classList.add("hidden");
            document
              .getElementById("upscale-workspace")
              .classList.add("active");

            this.updateInfo();
            this.drawPreview();
          } catch (e) {
            Toast.error("Failed to load image");
          }
        }
      },
    );

    const scaleBtns = document.querySelectorAll(
      "#upscale-scale-btns .preset-btn",
    );
    scaleBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        scaleBtns.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.scaleFactor = parseInt(e.target.dataset.scale);
        if (this.originalImg) {
          this.processUpscale();
        }
      });
    });

    const modeBtns = document.querySelectorAll(
      "#upscale-mode-btns .preset-btn",
    );
    const methodNote = document
      .getElementById("upscale-method-note")
      .querySelector("p");
    modeBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        modeBtns.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.upscaleMode = e.target.dataset.mode;

        if (this.upscaleMode === "artwork") {
          methodNote.innerHTML =
            "<b>Artwork Mode:</b> Enhances edges dynamically to keep graphics and logos perfectly crisp and vector-like.";
        } else {
          methodNote.innerHTML =
            "<b>Photo Mode:</b> Uses Lanczos3 algorithm to naturally enhance photographs with fine details.";
        }

        if (this.originalImg) {
          this.processUpscale();
        }
      });
    });

    document.getElementById("upscale-btn").addEventListener("click", () => {
      if (this.processedBlob) {
        this.download();
      } else {
        this.processUpscale();
      }
    });

    document.getElementById("upscale-reset-btn")?.addEventListener("click", () => {
      this.reset();
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
        this.canvas.style.cursor = "ew-resize";
        this.hoveringSlider = true;
      } else {
        this.canvas.style.cursor = "default";
        this.hoveringSlider = false;
      }
    };

    const startDrag = (e) => {
      if (!this.resultImg) return;
      const pos = getMousePos(e);
      if (Math.abs(pos - this.sliderPos) < 0.1 || e.type === "touchstart") {
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
      if (e.target.id === "upscale-canvas") startDrag(e);
    };
    this._onMouseMove = (e) => {
      if (e.target.id === "upscale-canvas" || this.isDragging) onDrag(e);
    };
    this._onMouseUp = endDrag;

    this._onTouchStart = (e) => {
      if (e.target.id === "upscale-canvas") startDrag(e);
    };
    this._onTouchMove = (e) => {
      if (this.isDragging) onDrag(e);
    };
    this._onTouchEnd = endDrag;

    document.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mouseup", this._onMouseUp);

    document.addEventListener("touchstart", this._onTouchStart, { passive: false });
    document.addEventListener("touchmove", this._onTouchMove, { passive: false });
    document.addEventListener("touchend", this._onTouchEnd);
  },

  removeSliderEvents() {
    if (this._onMouseDown) document.removeEventListener("mousedown", this._onMouseDown);
    if (this._onMouseMove) document.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseUp) document.removeEventListener("mouseup", this._onMouseUp);
    if (this._onTouchStart) document.removeEventListener("touchstart", this._onTouchStart);
    if (this._onTouchMove) document.removeEventListener("touchmove", this._onTouchMove);
    if (this._onTouchEnd) document.removeEventListener("touchend", this._onTouchEnd);

    this._onMouseDown = null;
    this._onMouseMove = null;
    this._onMouseUp = null;
    this._onTouchStart = null;
    this._onTouchMove = null;
    this._onTouchEnd = null;
  },

  updateInfo() {
    if (!this.originalImg) return;
    const w = this.originalImg.width;
    const h = this.originalImg.height;
    document.getElementById("upscale-orig-size").textContent =
      `${w} \u00d7 ${h}`;
    document.getElementById("upscale-new-size").textContent =
      `${w * this.scaleFactor} \u00d7 ${h * this.scaleFactor}`;
    this.processedBlob = null;

    const btn = document.getElementById("upscale-btn");
    btn.textContent = "Upscale Image";
    btn.className = "btn btn-primary w-full";
    btn.disabled = false;
  },

  drawPreview(sourceOverride) {
    if (!this.canvas || !this.ctx) return;

    const targetImg = this.resultImg || sourceOverride || this.originalImg;
    if (!targetImg) return;

    const maxSize = 800;
    let w = targetImg.width || targetImg.naturalWidth;
    let h = targetImg.height || targetImg.naturalHeight;

    if (w > maxSize || h > maxSize) {
      const ratio = Math.min(maxSize / w, maxSize / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    if (this.resultImg) {
      // Split view mode
      const splitX = w * this.sliderPos;

      // Draw original on left
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, splitX, h);
      this.ctx.clip();
      this.ctx.drawImage(this.originalImg, 0, 0, w, h);
      this.ctx.restore();

      // Draw upscaled result on right
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(splitX, 0, w - splitX, h);
      this.ctx.clip();
      this.ctx.drawImage(this.resultImg, 0, 0, w, h);
      this.ctx.restore();

      // Draw slider line
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(splitX - 1.5, 0, 3, h);

      // Draw slider handle
      this.ctx.beginPath();
      this.ctx.arc(splitX, h / 2, 16, 0, Math.PI * 2);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fill();
      this.ctx.shadowColor = "rgba(0,0,0,0.3)";
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
      this.ctx.shadowColor = "transparent";

      // Draw arrows
      this.ctx.fillStyle = "#64748b";
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
      // Normal view
      this.ctx.drawImage(targetImg, 0, 0, w, h);
    }
  },

  async processUpscale() {
    if (!this.originalImg) return;

    const loadingOverlay = document.getElementById("upscale-loading");
    const statusTitle = document.getElementById("upscale-status-title");
    const progressText = document.getElementById("upscale-progress-text");
    const btn = document.getElementById("upscale-btn");

    loadingOverlay.classList.remove("hidden");
    btn.disabled = true;

    try {
      statusTitle.textContent = "Initializing Engine...";
      progressText.textContent = "Loading HQ Resampler...";

      let resultCanvas;
      const targetW = this.originalImg.width * this.scaleFactor;
      const targetH = this.originalImg.height * this.scaleFactor;

      if (this.upscaleMode === "artwork") {
        statusTitle.textContent = "Enhancing Edges...";
        progressText.textContent = `Applying Edge-Preserving Upscale (${this.scaleFactor}x)...`;

        try {
          const pica = await this.ensurePica();
          const srcCanvas = document.createElement("canvas");
          srcCanvas.width = this.originalImg.width;
          srcCanvas.height = this.originalImg.height;
          srcCanvas.getContext("2d").drawImage(this.originalImg, 0, 0);

          const destCanvas = document.createElement("canvas");
          destCanvas.width = targetW;
          destCanvas.height = targetH;

          // Artwork mode: tune Lanczos3 + unsharp filter for clean graphics without blowing out colors
          await pica.resize(srcCanvas, destCanvas, {
            unsharpAmount: 110,
            unsharpRadius: 0.5,
            unsharpThreshold: 2,
          });
          resultCanvas = destCanvas;
        } catch (picaError) {
          console.warn("Pica unavailable, falling back to canvasUpscale:", picaError);
          resultCanvas = canvasUpscale(this.originalImg, this.scaleFactor);
        }
      } else {
        statusTitle.textContent = "Upscaling image...";
        progressText.textContent = `Applying Lanczos3 (${this.scaleFactor}x)...`;

        try {
          const pica = await this.ensurePica();
          const srcCanvas = document.createElement("canvas");
          srcCanvas.width = this.originalImg.width;
          srcCanvas.height = this.originalImg.height;
          srcCanvas.getContext("2d").drawImage(this.originalImg, 0, 0);

          const destCanvas = document.createElement("canvas");
          destCanvas.width = targetW;
          destCanvas.height = targetH;

          await pica.resize(srcCanvas, destCanvas, {
            unsharpAmount: 80,
            unsharpRadius: 0.6,
            unsharpThreshold: 0,
          });
          resultCanvas = destCanvas;
        } catch (picaError) {
          console.warn("Pica unavailable, falling back to canvasUpscale:", picaError);
          resultCanvas = canvasUpscale(this.originalImg, this.scaleFactor);
        }
      }

      this.resultImg = resultCanvas;
      this.sliderPos = 0.5;
      this.drawPreview();

      // Determine output format — keep PNG for PNGs, use JPEG for others
      const isPng =
        this.file.type === "image/png" ||
        this.file.name.toLowerCase().endsWith(".png");
      const mimeType = isPng ? "image/png" : "image/jpeg";
      const quality = isPng ? undefined : 0.95;

      this.processedBlob = await ImageUtils.canvasToBlob(
        resultCanvas,
        mimeType,
        quality,
      );

      btn.textContent = "Download Image";
      btn.className = "btn btn-success w-full";
      btn.disabled = false;
      Toast.success(
        `Image upscaled to ${this.originalImg.width * this.scaleFactor} \u00d7 ${this.originalImg.height * this.scaleFactor}!`,
      );
    } catch (e) {
      console.error(e);
      Toast.error("Failed to upscale: " + (e.message || e));
      btn.disabled = false;
    } finally {
      loadingOverlay.classList.add("hidden");
    }
  },

  download() {
    if (!this.processedBlob) return;
    const isPng = this.processedBlob.type === "image/png";
    const ext = isPng ? "png" : "jpg";
    const newName = ImageUtils.getOutputFilename(
      this.file.name,
      `upscaled_${this.scaleFactor}x`,
      ext,
    );
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
    const uploadZone = document.getElementById('upscale-upload-zone');
    const workspace = document.getElementById('upscale-workspace');
    const fileInput = document.getElementById('upscale-file-input');
    const btn = document.getElementById('upscale-btn');
    if (uploadZone) uploadZone.classList.remove('hidden');
    if (workspace) workspace.classList.remove('active');
    if (fileInput) fileInput.value = '';
    if (btn) {
      btn.textContent = 'Upscale Image';
      btn.className = 'btn btn-primary w-full mb-12';
      btn.disabled = false;
    }
    const origSize = document.getElementById('upscale-orig-size');
    const newSize = document.getElementById('upscale-new-size');
    if (origSize) origSize.textContent = '-';
    if (newSize) newSize.textContent = '-';
  },

  destroy() {
    this.removeSliderEvents();
    this.reset();
    this.canvas = null;
    this.ctx = null;
  },
};
