/* ========================================
   ImageLab — App Router & Home Page
   ======================================== */

const App = {
    currentTool: null,
    tools: {},

    toolsConfig: [
        {
            id: 'compress', name: 'Compress IMAGE', category: 'optimize',
            icon: '📦', color: '#8FBC5D',
            desc: 'Compress JPG, PNG, and WebP while saving space and maintaining quality.'
        },
        {
            id: 'resize', name: 'Resize IMAGE', category: 'edit',
            icon: '📐', color: '#3CB6E2',
            desc: 'Define your dimensions by percent or pixel, and resize your images.'
        },
        {
            id: 'crop', name: 'Crop IMAGE', category: 'edit',
            icon: '✂️', color: '#3CB6E2',
            desc: 'Crop images with ease. Choose pixels or use the visual crop editor.'
        },
        {
            id: 'convert-to-jpg', name: 'Convert to JPG', category: 'convert',
            icon: '🔄', color: '#FFD400',
            desc: 'Turn PNG, WebP, GIF, BMP format images to JPG in bulk with ease.'
        },
        {
            id: 'convert-from-jpg', name: 'Convert from JPG', category: 'convert',
            icon: '🖼️', color: '#FFD400',
            desc: 'Convert JPG images to PNG, WebP, or BMP format.'
        },
        {
            id: 'rotate', name: 'Rotate & Flip', category: 'edit',
            icon: '🔄', color: '#3CB6E2',
            desc: 'Rotate images 90°, 180°, 270° or flip horizontally and vertically.'
        },
        {
            id: 'filters', name: 'Photo Filters', category: 'create',
            icon: '🎨', color: '#AB6993',
            desc: 'Apply brightness, contrast, saturation, grayscale, sepia and more.'
        },
        {
            id: 'watermark', name: 'Watermark IMAGE', category: 'security',
            icon: '💧', color: '#4A7AAB',
            desc: 'Stamp text over your images. Choose typography, transparency and position.'
        },
        {
            id: 'meme', name: 'Meme Generator', category: 'create',
            icon: '😂', color: '#AB6993',
            desc: 'Create memes online with ease. Add top and bottom text to any image.'
        },
        {
            id: 'blur', name: 'Blur Area', category: 'security',
            icon: '🔒', color: '#4A7AAB',
            desc: 'Draw rectangular areas to blur for privacy protection.'
        },
        {
            id: 'html-to-image', name: 'HTML to Image', category: 'convert',
            icon: '🌐', color: '#FFD400',
            desc: 'Convert HTML & CSS code to PNG or JPG images instantly.'
        },
        {
            id: 'jpg-to-pdf', name: 'JPG to PDF', category: 'convert',
            icon: '📄', color: '#FFD400',
            desc: 'Convert multiple JPG or PNG images into a single PDF document.'
        }
    ],

    init() {
        this.setupTheme();
        this.setupNav();
        this.setupRouter();
        window.addEventListener('hashchange', () => this.route());
        this.route();
    },

    setupTheme() {
        const btn = document.getElementById('themeToggleBtn');
        if (!btn) return;

        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (currentTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            btn.textContent = '🌙';
        } else {
            btn.textContent = '☀️';
        }

        btn.addEventListener('click', () => {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            if (isLight) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                btn.textContent = '☀️';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                btn.textContent = '🌙';
            }
        });
    },

    setupNav() {
        const hamburger = document.getElementById('navHamburger');
        const mobileMenu = document.getElementById('mobileMenu');

        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        // Close mobile menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });

        // Close dropdown on link click
        document.querySelectorAll('.nav-dropdown-item').forEach(link => {
            link.addEventListener('click', () => {
                document.getElementById('navDropdown').classList.remove('active');
            });
        });

        // Logo click goes home
        document.getElementById('logo').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#home';
        });
    },

    setupRouter() {
        // Register tool renderers
        this.tools = {
            'compress': CompressTool,
            'resize': ResizeTool,
            'crop': CropTool,
            'convert-to-jpg': ConvertToJpgTool,
            'convert-from-jpg': ConvertFromJpgTool,
            'rotate': RotateTool,
            'filters': FiltersTool,
            'watermark': WatermarkTool,
            'meme': MemeTool,
            'blur': BlurTool,
            'html-to-image': HtmlToImageTool,
            'jpg-to-pdf': JpgToPdfTool
        };
    },

    route() {
        const hash = window.location.hash.slice(1) || 'home';
        const main = document.getElementById('main');

        // Cleanup previous tool
        if (this.currentTool && this.tools[this.currentTool] && this.tools[this.currentTool].destroy) {
            this.tools[this.currentTool].destroy();
        }

        if (hash === 'home' || hash === '') {
            main.innerHTML = this.renderHome();
            this.initHome();
            this.currentTool = null;
        } else if (this.tools[hash]) {
            const toolConfig = this.toolsConfig.find(t => t.id === hash);
            main.innerHTML = this.tools[hash].render(toolConfig);
            this.tools[hash].init(toolConfig);
            this.currentTool = hash;
        } else {
            main.innerHTML = this.renderHome();
            this.initHome();
            this.currentTool = null;
        }

        // Add animation
        main.querySelector(':first-child')?.classList.add('page-enter');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    renderHome() {
        const toolCards = this.toolsConfig.map(tool => `
            <a href="#${tool.id}" class="tool-card" data-category="${tool.category}" style="--card-accent: ${tool.color}">
                ${tool.badge ? `<span class="badge">${tool.badge}</span>` : ''}
                <div class="tool-card-icon" style="--card-accent: ${tool.color}">${tool.icon}</div>
                <h3>${tool.name}</h3>
                <p>${tool.desc}</p>
            </a>
        `).join('');

        return `
            <div class="home-page">
                <div class="home-hero">
                    <h1>Every tool you need to <strong>edit images</strong> online</h1>
                    <p>Your personal image toolkit — free, private, and runs entirely in your browser.</p>
                </div>

                <div class="filter-tabs" id="filterTabs">
                    <button class="filter-tab active" data-filter="all">All</button>
                    <button class="filter-tab" data-filter="optimize">Optimize</button>
                    <button class="filter-tab" data-filter="create">Create</button>
                    <button class="filter-tab" data-filter="edit">Edit</button>
                    <button class="filter-tab" data-filter="convert">Convert</button>
                    <button class="filter-tab" data-filter="security">Security</button>
                </div>

                <div class="tools-grid" id="toolsGrid">
                    ${toolCards}
                </div>
            </div>
        `;
    },

    initHome() {
        const tabs = document.querySelectorAll('.filter-tab');
        const cards = document.querySelectorAll('.tool-card');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const filter = tab.dataset.filter;

                cards.forEach((card, i) => {
                    const show = filter === 'all' || card.dataset.category === filter;
                    card.style.display = show ? '' : 'none';
                    if (show) {
                        card.style.animationDelay = `${i * 0.04}s`;
                        card.classList.remove('page-enter');
                        void card.offsetWidth;
                        card.classList.add('page-enter');
                    }
                });
            });
        });
    },

    /**
     * Register a tool object
     */
    registerTool(id, toolObj) {
        this.tools[id] = toolObj;
    }
};

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
