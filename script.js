// Application State
class CurriculumApp {
    constructor() {
        this.currentStep = 1;
        this.selections = {
            stream: null,
            year: null,
            semester: null
        };
        this.currentImages = [];
        this.currentImageIndex = 0;
        this.zoomLevel = 1;
        this.additionalFiles = [];
        this.cachedPaths = new Set();
        this.preloadedImages = new Map();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkStoredSession();
        this.cacheImagePaths();
    }

    async checkStoredSession() {
        const stored = localStorage.getItem('curriculum_session');
        if (stored) {
            try {
                const session = JSON.parse(stored);
                if (session.stream && session.year && session.semester) {
                    this.selections = session;
                    this.setLoadingText('Restoring session...');
                    this.showLoading();
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    await this.loadCurriculumViewer();
                    return;
                }
            } catch (e) {
                console.warn('Invalid session data:', e);
                localStorage.removeItem('curriculum_session');
            }
        }
        this.showFormWizard();
    }

    saveSession() {
        const sessionData = {
            stream: this.selections.stream,
            year: this.selections.year,
            semester: this.selections.semester,
            mainImageOnly: true
        };
        localStorage.setItem('curriculum_session', JSON.stringify(sessionData));
    }

    clearSession() {
        localStorage.removeItem('curriculum_session');
    }

    async cacheImagePaths() {
        const years = ['2021', '2022', '2023', '2024'];
        const streams = ['ce', 'cse', 'cse-aiml', 'cse-ds', 'cse-iot', 'cse-cs', 'cs-it', 'ece', 'ee', 'eee', 'me'];
        const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
        
        for (const year of years) {
            for (const stream of streams) {
                for (const sem of semesters) {
                    const basePath = `images/${year}/${stream}-sem${sem}`;
                    this.cachedPaths.add(`${basePath}.webp`);
                    
                    for (let part = 1; part <= 5; part++) {
                        this.cachedPaths.add(`${basePath}-${part}.webp`);
                    }
                }
                
                for (let i = 1; i <= 10; i++) {
                    this.cachedPaths.add(`images/${year}/${stream}-${i}.webp`);
                }
            }
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', (e) => this.handleOptionSelect(e));
        });

        document.getElementById('back-to-wizard').addEventListener('click', () => this.showFormWizard());
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-zoom').addEventListener('click', () => this.resetZoom());
        document.getElementById('download-image').addEventListener('click', () => this.downloadImage());
        document.getElementById('prev-image').addEventListener('click', () => this.previousImage());
        document.getElementById('next-image').addEventListener('click', () => this.nextImage());
        document.getElementById('toggle-additional').addEventListener('click', () => this.toggleAdditionalPanel());
        document.getElementById('close-additional').addEventListener('click', () => this.closeAdditionalPanel());

        document.getElementById('error-close').addEventListener('click', () => this.hidePopup('error-popup'));
        document.getElementById('success-close').addEventListener('click', () => this.hidePopup('success-popup'));

        this.setupImagePanning();

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupImagePanning() {
        const image = document.getElementById('curriculum-image');
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;

        image.addEventListener('mousedown', (e) => {
            if (this.zoomLevel > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                image.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && this.zoomLevel > 1) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                image.style.transform = `scale(${this.zoomLevel}) translate(${translateX}px, ${translateY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
        });

        image.addEventListener('touchstart', (e) => {
            if (this.zoomLevel > 1 && e.touches.length === 1) {
                isDragging = true;
                const touch = e.touches[0];
                startX = touch.clientX - translateX;
                startY = touch.clientY - translateY;
                e.preventDefault();
            }
        });

        image.addEventListener('touchmove', (e) => {
            if (isDragging && this.zoomLevel > 1 && e.touches.length === 1) {
                const touch = e.touches[0];
                translateX = touch.clientX - startX;
                translateY = touch.clientY - startY;
                image.style.transform = `scale(${this.zoomLevel}) translate(${translateX}px, ${translateY}px)`;
                e.preventDefault();
            }
        });

        image.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    handleKeyboard(e) {
        if (document.getElementById('curriculum-viewer').classList.contains('hidden')) return;

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousImage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextImage();
                break;
            case '+':
            case '=':
                e.preventDefault();
                this.zoomIn();
                break;
            case '-':
                e.preventDefault();
                this.zoomOut();
                break;
            case '0':
                e.preventDefault();
                this.resetZoom();
                break;
            case 'Escape':
                e.preventDefault();
                this.closeAdditionalPanel();
                break;
        }
    }

    handleOptionSelect(e) {
        const card = e.currentTarget;
        const value = card.dataset.value;
        const step = this.currentStep;

        document.querySelectorAll(`#step-${step} .option-card`).forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        if (step === 1) this.selections.stream = value;
        if (step === 2) this.selections.year = value;
        if (step === 3) this.selections.semester = value;

        setTimeout(() => {
            if (step < 3) {
                this.goToStep(step + 1);
            } else {
                this.saveSession();
                this.loadCurriculumViewer();
            }
        }, 300);
    }

    goToStep(step) {
        if (step < 1 || step > 3) return;

        document.querySelectorAll('.wizard-step').forEach(s => {
            s.classList.remove('active');
        });

        document.getElementById(`step-${step}`).classList.add('active');

        this.currentStep = step;
        document.getElementById('current-step').textContent = step;
        document.getElementById('progress-fill').style.width = `${(step / 3) * 100}%`;
    }

    showFormWizard() {
        document.getElementById('form-wizard').classList.remove('hidden');
        document.getElementById('curriculum-viewer').classList.add('hidden');
        this.clearSession();
        this.goToStep(1);
        
        this.selections = { stream: null, year: null, semester: null };
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    async loadCurriculumViewer() {
        this.setLoadingText('Loading curriculum...');
        this.showLoading();
        
        try {
            await this.loadCurriculumImages();
            
            document.getElementById('form-wizard').classList.add('hidden');
            document.getElementById('curriculum-viewer').classList.remove('hidden');
            
            this.updateViewerHeader();
            this.displayCurrentImage();
            
            this.loadAdditionalFiles();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Curriculum Not Found', `This ${this.selections.stream.toUpperCase()} - ${this.selections.year} - Semester ${this.selections.semester} curriculum will be added soon.`);
        }
    }

    async loadCurriculumImages() {
        const { stream, year, semester } = this.selections;
        const basePath = `images/${year}/${stream}-sem${semester}`;
        
        this.currentImages = [];
        this.currentImageIndex = 0;

        const mainImage = `${basePath}.webp`;
        if (await this.imageExists(mainImage)) {
            this.currentImages.push(mainImage);
        }

        for (let part = 1; part <= 10; part++) {
            const partImage = `${basePath}-${part}.webp`;
            if (await this.imageExists(partImage)) {
                this.currentImages.push(partImage);
            }
        }

        if (this.currentImages.length === 0) {
            throw new Error(`No curriculum found for ${stream.toUpperCase()} - ${year} - Semester ${semester}`);
        }

        await this.cacheCurrentImages();
    }

    async loadAdditionalFiles() {
        const { stream, year } = this.selections;
        this.additionalFiles = [];

        for (let i = 1; i <= 10; i++) {
            const additionalPath = `images/${year}/${stream}-${i}.webp`;
            if (await this.imageExists(additionalPath)) {
                this.additionalFiles.push({
                    path: additionalPath,
                    name: `${stream.toUpperCase()} Resource ${i}`,
                    type: 'Additional Resource'
                });
            }
        }

        this.populateAdditionalPanel();
    }

    async imageExists(path) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = path;
            
            setTimeout(() => resolve(false), 5000);
        });
    }

    async cacheCurrentImages() {
        const promises = this.currentImages.map(path => {
            if (this.preloadedImages.has(path)) {
                return Promise.resolve();
            }
            
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages.set(path, img);
                    
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({
                            type: 'CACHE_CURRENT_IMAGE',
                            path: path
                        });
                    }
                    
                    resolve();
                };
                img.onerror = () => resolve(); 
                img.src = path;
            });
        });

        await Promise.all(promises);
    }

    updateViewerHeader() {
        const { stream, year, semester } = this.selections;
        document.getElementById('current-stream').textContent = stream.toUpperCase();
        document.getElementById('current-year').textContent = year;
        document.getElementById('current-semester').textContent = semester;
    }

    displayCurrentImage() {
        if (this.currentImages.length === 0) return;

        const imagePath = this.currentImages[this.currentImageIndex];
        const imageElement = document.getElementById('curriculum-image');
        
        this.setLoadingText('Loading image...');
        this.showLoading();
        
        imageElement.onload = () => {
            this.hideLoading();
            this.resetZoom();
        };
        
        imageElement.onerror = () => {
            this.hideLoading();
            this.showError('Image Not Found', 'This curriculum image will be added soon. Please try again later.');
        };

        imageElement.src = imagePath;
        this.updateImageControls();
    }

    updateImageControls() {
        const counter = document.getElementById('image-counter');
        const prevBtn = document.getElementById('prev-image');
        const nextBtn = document.getElementById('next-image');

        counter.textContent = `${this.currentImageIndex + 1} / ${this.currentImages.length}`;
        
        prevBtn.disabled = this.currentImageIndex === 0;
        nextBtn.disabled = this.currentImageIndex === this.currentImages.length - 1;

        if (this.currentImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            counter.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            counter.style.display = 'block';
        }
    }

    previousImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            this.displayCurrentImage();
        }
    }

    nextImage() {
        if (this.currentImageIndex < this.currentImages.length - 1) {
            this.currentImageIndex++;
            this.displayCurrentImage();
        }
    }

    zoomIn() {
        if (this.zoomLevel < 3) {
            this.zoomLevel += 0.25;
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > 0.5) {
            this.zoomLevel -= 0.25;
            this.applyZoom();
        }
    }

    resetZoom() {
        this.zoomLevel = 1;
        const image = document.getElementById('curriculum-image');
        image.style.transform = 'scale(1)';
        image.style.cursor = 'default';
    }

    applyZoom() {
        const image = document.getElementById('curriculum-image');
        image.style.transform = `scale(${this.zoomLevel})`;
        image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
    }

    downloadImage() {
        const imagePath = this.currentImages[this.currentImageIndex];
        const { stream, year, semester } = this.selections;
        
        const link = document.createElement('a');
        link.href = imagePath;
        link.download = `${stream}-${year}-sem${semester}-${this.currentImageIndex + 1}.webp`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess('Download Started', 'The curriculum image is being downloaded.');
    }

    populateAdditionalPanel() {
        const grid = document.getElementById('additional-grid');
        grid.innerHTML = '';

        if (this.additionalFiles.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 20px;">No additional resources available for this selection.</p>';
            return;
        }

        this.additionalFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'additional-item';
            item.innerHTML = `
                <img src="${file.path}" alt="${file.name}" loading="lazy">
                <div class="additional-item-info">
                    <h4>${file.name}</h4>
                    <p>${file.type}</p>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.viewAdditionalFile(file.path);
            });
            
            grid.appendChild(item);
        });
    }

    viewAdditionalFile(imagePath) {
        const imageElement = document.getElementById('curriculum-image');
        this.setLoadingText('Loading resource...');
        this.showLoading();
        
        imageElement.onload = () => {
            this.hideLoading();
            this.resetZoom();
            this.closeAdditionalPanel();
        };
        
        imageElement.onerror = () => {
            this.hideLoading();
            this.showError('Image Not Found', 'This additional resource could not be loaded.');
        };

        imageElement.src = imagePath;
        
        document.getElementById('image-counter').textContent = 'Additional Resource';
        document.getElementById('prev-image').style.display = 'none';
        document.getElementById('next-image').style.display = 'none';
    }

    toggleAdditionalPanel() {
        const panel = document.getElementById('additional-panel');
        panel.classList.toggle('show');
    }

    closeAdditionalPanel() {
        const panel = document.getElementById('additional-panel');
        panel.classList.remove('show');
    }

    setLoadingText(text) {
        document.getElementById('loading-text').textContent = text;
    }

    showLoading() {
        document.getElementById('loading-spinner').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-spinner').classList.add('hidden');
    }

    showError(title, message) {
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-popup').classList.remove('hidden');
    }

    showSuccess(title, message) {
        document.getElementById('success-title').textContent = title;
        document.getElementById('success-message').textContent = message;
        document.getElementById('success-popup').classList.remove('hidden');
    }

    hidePopup(popupId) {
        document.getElementById(popupId).classList.add('hidden');
    }
}

function goToStep(step) {
    app.goToStep(step);
}

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new CurriculumApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

window.addEventListener('online', () => {
    if (typeof app !== 'undefined') {
        app.showSuccess('Connection Restored', 'You are back online.');
    }
});

window.addEventListener('offline', () => {
    if (typeof app !== 'undefined') {
        app.showError('Offline Mode', 'You are currently offline. Some features may be limited.');
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CurriculumApp;
}
