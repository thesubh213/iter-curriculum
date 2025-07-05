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
        this.currentCachedImage = null;
        this.isViewingAdditionalResources = false;
        this.originalCurriculumImages = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkStoredSession();
        this.cacheImagePathsInBackground();
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

    async cacheImagePathsInBackground() {
        // Cache only paths, not actual images, in background after session restoration
        setTimeout(() => {
            this.cacheImagePaths();
        }, 100);
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
        document.getElementById('fullscreen-zoom').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('download-image').addEventListener('click', () => this.downloadImage());
        document.getElementById('prev-image').addEventListener('click', () => this.previousImage());
        document.getElementById('next-image').addEventListener('click', () => this.nextImage());
        document.getElementById('toggle-additional').addEventListener('click', () => this.toggleAdditionalPanel());
        document.getElementById('close-additional').addEventListener('click', () => this.closeAdditionalPanel());

        document.getElementById('error-close').addEventListener('click', () => this.hidePopup('error-popup'));
        document.getElementById('success-close').addEventListener('click', () => this.hidePopup('success-popup'));
        
        document.getElementById('about-btn').addEventListener('click', () => this.openAbout());

        this.setupImagePanning();

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupImagePanning() {
        const image = document.getElementById('curriculum-image');
        const container = document.querySelector('.image-container');
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;
        let lastTouchDistance = 0;
        
        const resetTransform = () => {
            translateX = 0;
            translateY = 0;
            this.applyTransform();
        };
        
        const applyTransform = () => {
            const imageRect = image.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            if (this.zoomLevel > 1) {
                const maxTranslateX = Math.max(0, (imageRect.width * this.zoomLevel - containerRect.width) / 2);
                const maxTranslateY = Math.max(0, (imageRect.height * this.zoomLevel - containerRect.height) / 2);
                
                translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
                translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
            } else {
                translateX = 0;
                translateY = 0;
            }
            
            image.style.transform = `scale(${this.zoomLevel}) translate(${translateX / this.zoomLevel}px, ${translateY / this.zoomLevel}px)`;
        };
        
        this.applyTransform = applyTransform;
        this.resetTransform = resetTransform;

        image.addEventListener('mousedown', (e) => {
            if (this.zoomLevel > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                image.style.cursor = 'grabbing';
                image.classList.add('zoomed');
                e.preventDefault(); 
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && this.zoomLevel > 1) {
                e.preventDefault();
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                applyTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
                if (this.zoomLevel <= 1) {
                    image.classList.remove('zoomed');
                }
            }
        });

        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
            }
        });

        image.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1 && this.zoomLevel > 1) {
                isDragging = true;
                const touch = e.touches[0];
                startX = touch.clientX - translateX;
                startY = touch.clientY - translateY;
                e.preventDefault();
            } else if (e.touches.length === 2) {
                isDragging = false;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                e.preventDefault();
            }
        });

        image.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging && this.zoomLevel > 1) {
                const touch = e.touches[0];
                translateX = touch.clientX - startX;
                translateY = touch.clientY - startY;
                applyTransform();
                e.preventDefault();
            } else if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const touchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                if (lastTouchDistance > 0) {
                    const scale = touchDistance / lastTouchDistance;
                    const newZoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel * scale));
                    
                    if (Math.abs(newZoomLevel - this.zoomLevel) > 0.05) {
                        this.zoomLevel = newZoomLevel;
                        applyTransform();
                        
                        image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
                        if (this.zoomLevel > 1) {
                            image.classList.add('zoomed');
                        } else {
                            image.classList.remove('zoomed');
                            resetTransform();
                        }
                    }
                }
                
                lastTouchDistance = touchDistance;
                e.preventDefault();
            }
        });

        image.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isDragging = false;
                lastTouchDistance = 0;
            } else if (e.touches.length === 1) {
                lastTouchDistance = 0;
            }
        });

        image.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        image.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel + delta));
            
            if (newZoomLevel !== this.zoomLevel) {
                this.zoomLevel = newZoomLevel;
                applyTransform();
                
                image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
                if (this.zoomLevel > 1) {
                    image.classList.add('zoomed');
                } else {
                    image.classList.remove('zoomed');
                    resetTransform();
                }
            }
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
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleFullscreen();
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
        
        
        this.isViewingAdditionalResources = false;
        
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
            this.isViewingAdditionalResources = false;
            
            await this.loadCurriculumImages();
            
            document.getElementById('form-wizard').classList.add('hidden');
            document.getElementById('curriculum-viewer').classList.remove('hidden');
            
            
            this.updateViewerHeader();
            this.displayCurrentImage();
            
            this.updateButtonVisibility();
            
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

    async cacheCurrentImage() {
        const currentImagePath = this.currentImages[this.currentImageIndex];
        if (!currentImagePath) return;

        this.currentCachedImage = null;
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.currentCachedImage = img;
                
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'CACHE_CURRENT_IMAGE',
                        path: currentImagePath
                    });
                }
                
                resolve();
            };
            img.onerror = () => resolve(); 
            img.src = currentImagePath;
        });
    }

    updateViewerHeader() {
        const { stream, year, semester } = this.selections;
        
        if (this.isViewingAdditionalResources) {
            document.getElementById('current-stream').textContent = `${stream.toUpperCase()} Additional Resources`;
            document.getElementById('current-year').textContent = year;
            document.getElementById('current-semester').textContent = '';
        } else {
            document.getElementById('current-stream').textContent = stream.toUpperCase();
            document.getElementById('current-year').textContent = year;
            document.getElementById('current-semester').textContent = semester;
        }
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
            this.cacheCurrentImage();
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
        const divider = document.querySelector('.toolbar-divider');

        counter.textContent = `${this.currentImageIndex + 1} / ${this.currentImages.length}`;
        
        prevBtn.disabled = this.currentImageIndex === 0;
        nextBtn.disabled = this.currentImageIndex === this.currentImages.length - 1;

        if (this.currentImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            counter.style.display = 'none';
            if (divider) divider.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            counter.style.display = 'block';
            if (divider) divider.style.display = 'block';
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
        image.style.cursor = 'default';
        image.classList.remove('zoomed');
        
        if (this.resetTransform) {
            this.resetTransform();
        } else {
            image.style.transform = 'scale(1)';
        }
    }

    applyZoom() {
        const image = document.getElementById('curriculum-image');
        
        image.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
        if (this.zoomLevel > 1) {
            image.classList.add('zoomed');
        } else {
            image.classList.remove('zoomed');
        }
        
        if (this.applyTransform) {
            this.applyTransform();
        } else {
            image.style.transform = `scale(${this.zoomLevel})`;
        }
    }

    toggleFullscreen() {
        const imageContainer = document.getElementById('curriculum-image');
        
        if (!document.fullscreenElement) {
            if (imageContainer.requestFullscreen) {
                imageContainer.requestFullscreen();
            } else if (imageContainer.webkitRequestFullscreen) {
                imageContainer.webkitRequestFullscreen();
            } else if (imageContainer.msRequestFullscreen) {
                imageContainer.msRequestFullscreen();
            } else if (imageContainer.mozRequestFullScreen) {
                imageContainer.mozRequestFullScreen();
            }
            
            imageContainer.style.objectFit = 'contain';
            imageContainer.style.width = '100vw';
            imageContainer.style.height = '100vh';
            imageContainer.style.maxWidth = '100vw';
            imageContainer.style.maxHeight = '100vh';
            imageContainer.style.backgroundColor = '#000';
            
            this.showSuccess('Fullscreen Mode', 'Press ESC to exit fullscreen');
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }
        
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                imageContainer.style.objectFit = '';
                imageContainer.style.width = '';
                imageContainer.style.height = '';
                imageContainer.style.maxWidth = '';
                imageContainer.style.maxHeight = '';
                imageContainer.style.backgroundColor = '';
                
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
                document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
                document.removeEventListener('msfullscreenchange', handleFullscreenChange);
                document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    }

    downloadImage() {
        const imagePath = this.currentImages[this.currentImageIndex];
        const { stream, year, semester } = this.selections;
        
        const link = document.createElement('a');
        link.href = imagePath;
        
        if (this.isViewingAdditionalResources) {
            link.download = `${stream}-${year}-resource-${this.currentImageIndex + 1}.webp`;
        } else {
            link.download = `${stream}-${year}-sem${semester}-${this.currentImageIndex + 1}.webp`;
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess('Download Started', 'The image is being downloaded.');
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
                this.viewAdditionalFileByIndex(index);
            });
            
            grid.appendChild(item);
        });
    }

    viewAdditionalFileByIndex(index) {
        if (!this.isViewingAdditionalResources) {
            this.originalCurriculumImages = [...this.currentImages];
        }
        
        this.isViewingAdditionalResources = true;
        this.currentImages = this.additionalFiles.map(file => file.path);
        this.currentImageIndex = index;
        
        this.updateButtonVisibility();
        this.updateViewerHeader();
        
        const imageElement = document.getElementById('curriculum-image');
        this.setLoadingText('Loading resource...');
        this.showLoading();
        
        imageElement.onload = () => {
            this.hideLoading();
            this.resetZoom();
            this.closeAdditionalPanel();
            this.cacheCurrentImage();
        };
        
        imageElement.onerror = () => {
            this.hideLoading();
            this.showError('Image Not Found', 'This additional resource could not be loaded.');
        };

        imageElement.src = this.currentImages[this.currentImageIndex];
        
        this.updateImageControls();
    }

    toggleAdditionalPanel() {
        const panel = document.getElementById('additional-panel');
        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
            panel.classList.add('hidden');
        } else {
            panel.classList.remove('hidden');
            panel.classList.add('show');
        }
    }

    closeAdditionalPanel() {
        const panel = document.getElementById('additional-panel');
        panel.classList.remove('show');
        panel.classList.add('hidden');
    }

    backToSemester() {
        this.isViewingAdditionalResources = false;
        this.currentImages = [...this.originalCurriculumImages];
        this.currentImageIndex = 0;
        this.updateButtonVisibility();
        this.updateViewerHeader(); 
        this.displayCurrentImage();
    }

    updateButtonVisibility() {
        const toggleAdditionalBtn = document.getElementById('toggle-additional');
        const backToSemesterBtn = document.getElementById('back-to-semester');
        
        if (this.isViewingAdditionalResources) {
            toggleAdditionalBtn.style.display = 'none';
            if (!backToSemesterBtn) {
                const headerRight = document.querySelector('.header-right');
                const newBtn = document.createElement('button');
                newBtn.id = 'back-to-semester';
                newBtn.className = 'btn btn-secondary';
                newBtn.innerHTML = '← Back to Semester';
                newBtn.addEventListener('click', () => this.backToSemester());
                headerRight.appendChild(newBtn);
            } else {
                backToSemesterBtn.style.display = 'block';
            }
        } else {
            toggleAdditionalBtn.style.display = 'block';
            if (backToSemesterBtn) {
                backToSemesterBtn.style.display = 'none';
            }
        }
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
    
    openAbout() {
        document.getElementById('about-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    closeAbout() {
        document.getElementById('about-modal').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function closeAbout() {
    if (typeof app !== 'undefined') {
        app.closeAbout();
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
