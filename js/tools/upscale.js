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
                                <button id="upscale-btn" class="btn btn-primary w-full">Upscale Image</button>
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

  async ensurePica() {
    if (this.picaInst) return this.picaInst;

    return new Promise((resolve, reject) => {
      const loadScript = (src) =>
        new Promise((res, rej) => {
          if (document.querySelector(`script[src="${src}"]`)) return res();
          const s = document.createElement("script");
          s.src = src;
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });

      loadScript("https://cdn.jsdelivr.net/npm/pica@9.0.1/dist/pica.min.js")
        .then(() => {
          if (window.pica) {
            this.picaInst = window.pica();
            resolve(this.picaInst);
          } else {
            reject(new Error("Pica library failed to load"));
          }
        })
        .catch(reject);
    });
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

    this.setupSliderEvents();
  },

  setupSliderEvents() {
    const getMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      let clientX = e.clientX;
      if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
      return (clientX - rect.left) / rect.width;
    };

    const updateCursor = (e) => {
      if (!this.resultImg) return;
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

    document.addEventListener("mousedown", (e) => {
      if (e.target.id === "upscale-canvas") startDrag(e);
    });
    document.addEventListener("mousemove", (e) => {
      if (e.target.id === "upscale-canvas" || this.isDragging) onDrag(e);
    });
    document.addEventListener("mouseup", endDrag);

    document.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.id === "upscale-canvas") startDrag(e);
      },
      { passive: false },
    );
    document.addEventListener(
      "touchmove",
      (e) => {
        if (this.isDragging) onDrag(e);
      },
      { passive: false },
    );
    document.addEventListener("touchend", endDrag);
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
      try {
        const targetW = this.originalImg.width * this.scaleFactor;
        const targetH = this.originalImg.height * this.scaleFactor;

        if (this.upscaleMode === "artwork") {
          statusTitle.textContent = "Vectorizing Edges...";
          progressText.textContent = `Applying Edge-Enhancement (${this.scaleFactor}x)...`;

          // Step 1: Smooth upscale
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = targetW;
          tempCanvas.height = targetH;
          const tCtx = tempCanvas.getContext("2d");
          tCtx.imageSmoothingEnabled = true;
          tCtx.imageSmoothingQuality = "high";
          tCtx.drawImage(this.originalImg, 0, 0, targetW, targetH);

          // Step 2: High contrast pass to sharpen edges perfectly
          const destCanvas = document.createElement("canvas");
          destCanvas.width = targetW;
          destCanvas.height = targetH;
          const dCtx = destCanvas.getContext("2d");
          dCtx.filter = "contrast(400%)";
          dCtx.drawImage(tempCanvas, 0, 0);

          resultCanvas = destCanvas;
        } else {
          const pica = await this.ensurePica();

          statusTitle.textContent = "Upscaling image...";
          progressText.textContent = `Applying Lanczos3 (${this.scaleFactor}x)...`;

          const srcCanvas = document.createElement("canvas");
          srcCanvas.width = this.originalImg.width;
          srcCanvas.height = this.originalImg.height;
          srcCanvas.getContext("2d").drawImage(this.originalImg, 0, 0);

          const destCanvas = document.createElement("canvas");
          destCanvas.width = targetW;
          destCanvas.height = targetH;

          await pica.resize(srcCanvas, destCanvas, {
            unsharpAmount: 80, // Lower amount to prevent halo ringing
            unsharpRadius: 0.6,
            unsharpThreshold: 0,
          });

          resultCanvas = destCanvas;
        }
      } catch (picaError) {
        console.error("Pica Error:", picaError);
        statusTitle.textContent = "Upscaling Failed";
        progressText.textContent = picaError.message || String(picaError);
        progressText.style.color = "#ef4444"; // Red error text

        // Keep the loading overlay visible for 3 seconds so the user can read the error
        await new Promise((r) => setTimeout(r, 4000));
        throw new Error(
          "HQ Upscaling failed: " + (picaError.message || String(picaError)),
        );
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

  destroy() {
    this.file = null;
    this.originalImg = null;
    this.processedBlob = null;
  },
};
