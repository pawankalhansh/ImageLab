const JpgToPdfTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>
                
                <div id="j2p-upload-zone" class="upload-zone">
                    <div class="upload-icon">${config.icon}</div>
                    <h3>Select Images (JPG, PNG, WebP)</h3>
                    <p>Select multiple images to create a multi-page PDF.</p>
                    <div class="btn btn-primary btn-upload">
                        Choose Files
                        <input type="file" id="j2p-file-input" accept="image/jpeg,image/png,image/webp" multiple>
                    </div>
                </div>

                <div id="j2p-workspace" class="tool-workspace">
                    <div class="tool-layout">
                        <div class="controls-panel">
                            <h3>PDF Settings</h3>
                            
                            <div class="control-group mt-16">
                                <label class="control-label">Page Size</label>
                                <select id="j2p-page-size" class="input-select">
                                    <option value="fit">Fit to Image Size</option>
                                    <option value="a4">A4 (Portrait)</option>
                                </select>
                            </div>

                            <div class="control-group mt-16">
                                <div class="control-label">
                                    <span>Margin</span>
                                    <span class="control-value" id="j2p-margin-val">0 px</span>
                                </div>
                                <input type="range" id="j2p-margin" min="0" max="100" value="0">
                            </div>
                            
                            <div class="actions-bar mt-24" style="flex-direction: column;">
                                <button id="j2p-reset-btn" class="btn btn-outline w-full mb-12">Clear Images</button>
                                <button id="j2p-download-btn" class="btn btn-success w-full">Download PDF</button>
                            </div>
                        </div>

                        <div class="preview-container flex-col" style="align-items: stretch; justify-content: flex-start;">
                            <h3 class="mb-12">Selected Images (<span id="j2p-count">0</span>)</h3>
                            <div id="j2p-image-list" class="grid gap-12" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); width: 100%;">
                            </div>
                            
                            <div id="j2p-loading" class="loading-overlay hidden">
                                <div class="spinner"></div>
                                <div class="loading-text mt-12">Generating PDF...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    files: [],
    previewUrls: [],

    init(config) {
        this.files = [];
        this.previewUrls = [];

        setupUploadZone('j2p-upload-zone', 'j2p-file-input', async (files) => {
            const images = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (images.length > 0) {
                this.files = images;
                document.getElementById('j2p-upload-zone').classList.add('hidden');
                document.getElementById('j2p-workspace').classList.add('active');
                this.renderPreviews();
                Toast.success(`Loaded ${images.length} image(s)`);
            } else {
                Toast.error('Please upload image files');
            }
        });

        document.getElementById('j2p-reset-btn').addEventListener('click', () => {
            this.clearPreviews();
            this.files = [];
            document.getElementById('j2p-workspace').classList.remove('active');
            document.getElementById('j2p-upload-zone').classList.remove('hidden');
            document.getElementById('j2p-file-input').value = '';
            document.getElementById('j2p-count').textContent = '0';
            document.getElementById('j2p-image-list').innerHTML = '';
        });

        document.getElementById('j2p-margin').addEventListener('input', (e) => {
            document.getElementById('j2p-margin-val').textContent = `${e.target.value} px`;
        });

        document.getElementById('j2p-download-btn').addEventListener('click', () => {
            this.generatePdf();
        });
    },

    clearPreviews() {
        this.previewUrls.forEach(url => URL.revokeObjectURL(url));
        this.previewUrls = [];
    },

    renderPreviews() {
        this.clearPreviews();
        const list = document.getElementById('j2p-image-list');
        list.innerHTML = '';
        document.getElementById('j2p-count').textContent = this.files.length;

        this.files.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            this.previewUrls.push(url);
            const div = document.createElement('div');
            div.className = 'relative rounded overflow-hidden bg-slate-800 border border-slate-700 aspect-square flex items-center justify-center';
            div.innerHTML = `
                <img src="${url}" alt="Page ${index + 1}" class="max-w-full max-h-full object-contain">
                <div class="absolute top-0 right-0 bg-opacity-75 text-xs px-2 py-1 text-white">${index + 1}</div>
            `;
            list.appendChild(div);
        });
    },

    async ensureJsPdf() {
        if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF failed to load');
        }
        return window.jspdf.jsPDF;
    },

    async generatePdf() {
        if (this.files.length === 0) {
            Toast.error('No images selected');
            return;
        }

        const loadingOverlay = document.getElementById('j2p-loading');
        loadingOverlay.classList.remove('hidden');
        document.getElementById('j2p-download-btn').disabled = true;

        try {
            const jsPDF = await this.ensureJsPdf();
            const pageSize = document.getElementById('j2p-page-size').value;
            const marginPx = parseInt(document.getElementById('j2p-margin').value, 10) || 0;

            const firstImg = await ImageUtils.loadImage(this.files[0]);
            let pdf;

            if (pageSize === 'fit') {
                // Use points (1/72") so large pixel images don't explode PDF page size
                const pxToPt = 0.75; // 96dpi → 72dpi approx
                const w = Math.max(1, (firstImg.width + marginPx * 2) * pxToPt);
                const h = Math.max(1, (firstImg.height + marginPx * 2) * pxToPt);
                pdf = new jsPDF({
                    orientation: firstImg.width >= firstImg.height ? 'l' : 'p',
                    unit: 'pt',
                    format: [w, h],
                    compress: true,
                });
            } else {
                pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: 'a4',
                    compress: true,
                });
            }

            for (let i = 0; i < this.files.length; i++) {
                const imgObj = await ImageUtils.loadImage(this.files[i]);
                // Always encode as JPEG for predictable addImage behavior & smaller PDFs
                const imgData = await this.getImageDataURL(imgObj);

                if (i > 0) {
                    if (pageSize === 'fit') {
                        const pxToPt = 0.75;
                        const w = Math.max(1, (imgObj.width + marginPx * 2) * pxToPt);
                        const h = Math.max(1, (imgObj.height + marginPx * 2) * pxToPt);
                        pdf.addPage([w, h], imgObj.width >= imgObj.height ? 'l' : 'p');
                    } else {
                        pdf.addPage();
                    }
                }

                if (pageSize === 'fit') {
                    const pxToPt = 0.75;
                    const m = marginPx * pxToPt;
                    pdf.addImage(
                        imgData,
                        'JPEG',
                        m,
                        m,
                        imgObj.width * pxToPt,
                        imgObj.height * pxToPt
                    );
                } else {
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const mmMargin = marginPx * 0.264583;

                    const contentWidth = pdfWidth - mmMargin * 2;
                    const contentHeight = pdfHeight - mmMargin * 2;
                    const ratio = Math.min(contentWidth / imgObj.width, contentHeight / imgObj.height);

                    const drawWidth = imgObj.width * ratio;
                    const drawHeight = imgObj.height * ratio;
                    const x = mmMargin + (contentWidth - drawWidth) / 2;
                    const y = mmMargin + (contentHeight - drawHeight) / 2;

                    pdf.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight);
                }
            }

            const outName = ImageUtils.getOutputFilename(this.files[0].name, 'converted', 'pdf');
            pdf.save(outName);
            Toast.success('PDF generated successfully!');
        } catch (e) {
            console.error(e);
            Toast.error('Failed to generate PDF: ' + (e.message || e));
        } finally {
            loadingOverlay.classList.add('hidden');
            document.getElementById('j2p-download-btn').disabled = false;
        }
    },

    getImageDataURL(img) {
        return new Promise(resolve => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            // White background so transparent PNGs don't become black in JPEG
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
        });
    },

    destroy() {
        this.clearPreviews();
        this.files = [];
    }
};
