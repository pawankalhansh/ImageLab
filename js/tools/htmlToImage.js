const HtmlToImageTool = {
    render(config) {
        return `
            <div class="tool-page">
                <div class="tool-header">
                    <h1>${config.name}</h1>
                    <p>${config.desc}</p>
                </div>

                <div class="tool-workspace active">
                    <div class="controls-row mb-16">
                        <div class="control-group" style="flex: 1;">
                            <div class="control-label">Width (px)</div>
                            <input type="number" id="h2i-width" class="input-field font-mono" value="800">
                        </div>
                        <div class="control-group" style="flex: 1;">
                            <div class="control-label">Height (px)</div>
                            <input type="number" id="h2i-height" class="input-field font-mono" value="600">
                        </div>
                        <div class="control-group" style="flex: 1;">
                            <div class="control-label">Output Format</div>
                            <select id="h2i-format" class="input-select">
                                <option value="image/png">PNG</option>
                                <option value="image/jpeg">JPG</option>
                            </select>
                        </div>
                        <div class="control-group" style="flex: 1; display: flex; align-items: flex-end;">
                            <button id="h2i-capture" class="btn btn-primary w-full" style="height: 42px;">Capture Image</button>
                        </div>
                    </div>

                    <div class="html-editor">
                        <div class="editor-col">
                            <div class="control-label" style="display: flex; justify-content: space-between; align-items: center;">
                                <span>HTML & CSS Code</span>
                                <div style="display: flex; gap: 8px;">
                                    <button id="h2i-reset-btn" class="btn btn-sm btn-secondary" style="font-size: 0.8rem; padding: 4px 8px;">Reset Code</button>
                                    <div class="btn btn-sm btn-secondary" style="position: relative; overflow: hidden; font-size: 0.8rem; padding: 4px 8px;">
                                        Upload .html
                                        <input type="file" id="h2i-file-upload" accept=".html,.htm" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                                    </div>
                                </div>
                            </div>
                            <textarea id="h2i-code" spellcheck="false">&lt;div class="card"&gt;
  &lt;h1&gt;Hello ImageLab&lt;/h1&gt;
  &lt;p&gt;This is rendered from HTML/CSS into an image.&lt;/p&gt;
&lt;/div&gt;

&lt;style&gt;
body { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  margin: 0; 
  height: 100vh;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  font-family: system-ui, sans-serif;
}
.card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  text-align: center;
}
h1 { margin: 0 0 10px; color: #111; }
p { margin: 0; color: #666; font-size: 1.2rem; }
&lt;/style&gt;</textarea>
                        </div>
                        
                        <div class="editor-col">
                            <div class="control-label">Preview Render</div>
                            <div class="html-preview-frame">
                                <iframe id="h2i-iframe" style="width: 100%; height: 100%; border: none;"></iframe>
                            </div>
                            
                            <div class="actions-bar mt-16" id="h2i-download-wrap" style="display: none;">
                                <button id="h2i-download" class="btn btn-success w-full">Download Captured Image</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    defaultCode: `<div class="card">
  <h1>Hello ImageLab</h1>
  <p>This is rendered from HTML/CSS into an image.</p>
</div>

<style>
body { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  margin: 0; 
  height: 100vh;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  font-family: system-ui, sans-serif;
}
.card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  text-align: center;
}
h1 { margin: 0 0 10px; color: #111; }
p { margin: 0; color: #666; font-size: 1.2rem; }
</style>`,

    iframe: null,
    resultCanvas: null,

    async ensureHtml2Canvas() {
        if (typeof window.html2canvas === 'function') return window.html2canvas;
        const cdnUrls = [
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
        ];
        for (const url of cdnUrls) {
            try {
                await loadScript(url);
                if (typeof window.html2canvas === 'function') return window.html2canvas;
            } catch (e) {
                console.warn('Failed to load html2canvas from:', url, e);
            }
        }
        if (typeof window.html2canvas !== 'function') {
            throw new Error('html2canvas library failed to load');
        }
        return window.html2canvas;
    },

    init(config) {
        this.iframe = document.getElementById('h2i-iframe');
        
        // Preload html2canvas asynchronously
        this.ensureHtml2Canvas().catch(() => {});

        const codeInput = document.getElementById('h2i-code');
        
        // Update iframe live
        codeInput.addEventListener('input', () => this.updateIframe());
        
        // Handle file upload
        const fileUpload = document.getElementById('h2i-file-upload');
        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    codeInput.value = ev.target.result;
                    this.updateIframe();
                    Toast.success('HTML file loaded successfully');
                };
                reader.readAsText(file);
            }
            e.target.value = ''; // Reset input
        });

        // Reset button
        document.getElementById('h2i-reset-btn')?.addEventListener('click', () => this.reset());

        // Initial render
        setTimeout(() => this.updateIframe(), 100);

        document.getElementById('h2i-capture').addEventListener('click', () => this.capture());
        document.getElementById('h2i-download').addEventListener('click', () => this.download());
    },

    updateIframe() {
        if (!this.iframe || !this.iframe.contentWindow) return;
        const codeInput = document.getElementById('h2i-code');
        if (!codeInput) return;
        const code = codeInput.value;
        try {
            const doc = this.iframe.contentWindow.document;
            doc.open();
            doc.write(code);
            doc.close();
        } catch (e) {
            console.warn('Failed to update iframe:', e);
        }
    },

    async capture() {
        const btn = document.getElementById('h2i-capture');
        btn.disabled = true;
        btn.textContent = 'Capturing...';

        try {
            const html2canvas = await this.ensureHtml2Canvas();
            const doc = this.iframe.contentWindow.document;
            const w = parseInt(document.getElementById('h2i-width').value) || 800;
            const h = parseInt(document.getElementById('h2i-height').value) || 600;

            // Temporarily resize iframe to match requested capture size
            const oldW = this.iframe.style.width;
            const oldH = this.iframe.style.height;
            this.iframe.style.width = `${w}px`;
            this.iframe.style.height = `${h}px`;
            
            // Wait a tick for reflow
            await new Promise(r => setTimeout(r, 100));

            this.resultCanvas = await html2canvas(doc.body, {
                width: w,
                height: h,
                scale: 1, // 1x scale, you can increase for retina
                useCORS: true,
                backgroundColor: null // transparent
            });

            // Restore iframe size
            this.iframe.style.width = oldW;
            this.iframe.style.height = oldH;

            document.getElementById('h2i-download-wrap').style.display = 'block';
            Toast.success('Capture successful!');

        } catch (e) {
            console.error(e);
            Toast.error('Failed to capture HTML: ' + (e.message || e));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Capture Image';
        }
    },

    reset() {
        const codeInput = document.getElementById('h2i-code');
        if (codeInput) {
            codeInput.value = this.defaultCode;
            this.updateIframe();
        }
        const dlWrap = document.getElementById('h2i-download-wrap');
        if (dlWrap) dlWrap.style.display = 'none';
        this.resultCanvas = null;
        Toast.info('Editor reset to default template');
    },

    download() {
        if (!this.resultCanvas) return;
        const format = document.getElementById('h2i-format').value;
        const ext = format === 'image/jpeg' ? 'jpg' : 'png';
        ImageUtils.downloadCanvas(this.resultCanvas, `html_capture.${ext}`, format);
    },

    destroy() {
        this.resultCanvas = null;
        this.iframe = null;
    }
};
