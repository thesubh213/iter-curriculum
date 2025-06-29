class CurriculumApp {
    constructor() {
        this.currentSection = 'batch-section';
        this.selections = {
            batch: '',
            stream: '',
            semester: ''
        };
        this.currentImageIndex = 0;
        this.currentImageSet = [];
        this.otherFiles = [];
        this.imageScale = 1;
        this.imagePosition = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastMousePosition = { x: 0, y: 0 };
        this.isViewingAdditionalFile = false;
        this.previousCurriculumIndex = 0;
        
        this.imageCache = new Map();
        this.preloadQueue = [];
        this.isPreloading = false;
        this.currentLoadProgress = 0;
        this.loadProgressInterval = null;
        this.loadingSteps = [];
        this.currentLoadingStep = 0;
        
        this.isPinching = false;
        this.lastPinchDistance = null;
        this.lastPinchCenter = null;
        
        this.lastTapTime = 0;
        this.lastTapPosition = { x: 0, y: 0 };
        
        this.isFirstLoad = true;
        this.lastViewedImagePath = '';
        this.isLoadingFromState = false;
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.bindEvents();
        this.loadSavedState();
        this.updateUI();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New version available');
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    bindEvents() {
        document.getElementById('batch-select').addEventListener('change', (e) => this.handleBatchChange(e.target.value));
        document.getElementById('stream-select').addEventListener('change', (e) => this.handleStreamChange(e.target.value));
        document.getElementById('semester-select').addEventListener('change', (e) => this.handleSemesterChange(e.target.value));

        document.getElementById('back-to-batch').addEventListener('click', () => this.goBackToBatch());
        document.getElementById('back-to-stream').addEventListener('click', () => this.goBackToStream());

        document.getElementById('hamburger').addEventListener('click', () => this.toggleOverlay());
        document.getElementById('overlay').addEventListener('click', (e) => {
            if (e.target === overlay) this.closeOverlay();
        });
        
        document.getElementById('apply-changes').addEventListener('click', () => this.applyOverlayChanges());
        
        document.getElementById('popup-close').addEventListener('click', () => this.closePopup());
        document.getElementById('popup').addEventListener('click', (e) => {
            if (e.target === popup) this.closePopup();
        });

        this.bindOverlayDropdownEvents();
        
        this.bindImageEvents();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeOverlay();
                this.closeOthersModal();
            }
            if (this.currentSection === 'viewer-section') {
                if (e.key === 'ArrowLeft') this.previousImage();
                if (e.key === 'ArrowRight') this.nextImage();
                if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
                if (e.key === '+' || e.key === '=') this.zoomImage(1.2);
                if (e.key === '-') this.zoomImage(0.8);
                if (e.key === '0') this.resetImageTransform();
            }
        });
    }

    bindOverlayDropdownEvents() {
        const overlayBatch = document.getElementById('overlay-batch');
        const overlayStream = document.getElementById('overlay-stream');
        const overlaySemester = document.getElementById('overlay-semester');

        overlayBatch.addEventListener('change', (e) => {
            const newBatch = e.target.value;
            if (newBatch !== this.selections.batch) {
                this.resetFromBatch();
            }
        });

        overlayStream.addEventListener('change', (e) => {
            const newStream = e.target.value;
            if (newStream !== this.selections.stream) {
                this.resetFromStream();
            }
        });
    }

    bindImageEvents() {
        const imageViewer = document.getElementById('image-viewer');
        const image = document.getElementById('curriculum-image');

        const bindButtonEvent = (id, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                console.log(`Bound event to ${id}`);
            } else {
                console.warn(`Button ${id} not found`);
            }
        };

        bindButtonEvent('zoom-in', () => this.zoomImage(1.2));
        bindButtonEvent('zoom-out', () => this.zoomImage(0.8));
        bindButtonEvent('reset-zoom', () => this.resetImageTransform());
        bindButtonEvent('prev-image', () => this.previousImage());
        bindButtonEvent('next-image', () => this.nextImage());
        bindButtonEvent('others-btn', () => this.showOthersModal());
        bindButtonEvent('fullscreen-btn', () => this.toggleFullscreen());
        bindButtonEvent('back-to-curriculum', () => this.backToCurriculum());
        
        bindButtonEvent('others-modal-close', () => this.closeOthersModal());
        
        const othersModal = document.getElementById('others-modal');
        if (othersModal) {
            othersModal.addEventListener('click', (e) => {
                if (e.target === othersModal) this.closeOthersModal();
            });
        }

        if (imageViewer) {
            imageViewer.addEventListener('mousedown', (e) => this.startImageDrag(e));
            imageViewer.addEventListener('mousemove', (e) => this.dragImage(e));
            imageViewer.addEventListener('mouseup', () => this.endImageDrag());
            imageViewer.addEventListener('mouseleave', () => this.endImageDrag());
            imageViewer.addEventListener('contextmenu', (e) => e.preventDefault());

            imageViewer.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = imageViewer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoomImageAtPoint(zoomFactor, e.clientX - centerX, e.clientY - centerY);
            });

            imageViewer.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            imageViewer.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            imageViewer.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
            imageViewer.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
            
            imageViewer.addEventListener('gesturestart', (e) => e.preventDefault());
            imageViewer.addEventListener('gesturechange', (e) => e.preventDefault());
            imageViewer.addEventListener('gestureend', (e) => e.preventDefault());
        }

        if (image) {
            image.addEventListener('load', () => this.hideImageLoading());
            image.addEventListener('error', () => this.hideImageLoading());
        }
    }

    handleBatchChange(value) {
        if (!value) return;

        this.selections.batch = value;
        this.saveState();
        this.showSection('stream-section');
    }

    handleStreamChange(value) {
        if (!value) return;

        this.selections.stream = value;
        this.saveState();
        this.showSection('semester-section');
    }

    goBackToBatch() {
        this.selections.stream = '';
        this.selections.semester = '';
        this.saveState();
        
        document.getElementById('stream-select').value = '';
        document.getElementById('semester-select').value = '';
        
        this.showSection('batch-section');
    }

    goBackToStream() {
        this.selections.semester = '';
        this.saveState();
        
        document.getElementById('semester-select').value = '';
        
        this.showSection('stream-section');
    }

    async handleSemesterChange(value) {
        if (!value) return;

        this.selections.semester = value;
        this.saveState();
        
        this.showImageLoadingWithProgress('Preparing curriculum...');
        
        await this.loadCurriculumImages();
        this.showSection('viewer-section');
    }

    async handleOthersChange(value) {
        if (!value) return;

        const selectedFile = this.otherFiles.find(file => file.value === value);
        if (selectedFile) {
            this.loadOtherFile(selectedFile);
            this.closeOverlay();
        }
    }

    showSection(sectionId) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.remove('active'));

        document.body.classList.remove('viewer-mode');

        setTimeout(() => {
            document.getElementById(sectionId).classList.add('active');
            this.currentSection = sectionId;
            
            const mainTitle = document.getElementById('main-title');
            const viewerHeaderInfo = document.getElementById('viewer-header-info');
            const headerOptions = document.getElementById('header-options');
            const oneTimeIndicator = document.getElementById('one-time-process-indicator');
            
            if (sectionId === 'viewer-section') {
                document.body.classList.add('viewer-mode');
                mainTitle.style.display = 'none';
                viewerHeaderInfo.style.display = 'flex';
                headerOptions.style.display = 'flex';
                oneTimeIndicator.classList.add('hidden');
                
                setTimeout(() => {
                    this.bindImageEvents();
                }, 100);
                
                if (this.currentImageSet.length > 0 && this.currentImageIndex < this.currentImageSet.length) {
                    const imageInfo = this.currentImageSet[this.currentImageIndex];
                    this.updateViewerHeaderInfo(imageInfo.name, `${this.selections.stream} - ${this.selections.batch}`);
                }
            } else {
                mainTitle.style.display = '';
                viewerHeaderInfo.style.display = 'none';
                headerOptions.style.display = 'none';
                mainTitle.textContent = 'ITER Curriculum';
                
                if (sectionId === 'batch-section' || sectionId === 'stream-section' || sectionId === 'semester-section') {
                    oneTimeIndicator.classList.remove('hidden');
                } else {
                    oneTimeIndicator.classList.add('hidden');
                }
            }
        }, 150);
    }

    async loadCurriculumImages() {
        this.setupLoadingSteps([
            { name: 'Discovering curriculum images...', weight: 20 },
            { name: 'Loading additional files...', weight: 30 },
            { name: 'Preloading images for smooth navigation...', weight: 30 },
            { name: 'Loading current image...', weight: 20 }
        ]);
        
        try {
            const { stream, semester } = this.selections;
            
            this.updateLoadingStep(0);
            this.currentImageSet = await this.discoverSemesterImages(semester);
            this.currentImageIndex = 0;
            
            this.updateLoadingStep(1);
            await this.loadOthersFiles();
            
            if (this.currentImageSet.length > 0) {
                this.updateLoadingStep(2);
                await this.preloadImageSet(this.currentImageSet);
                
                this.updateLoadingStep(3);
                await this.loadImageByIndex(0);
            } else {
                this.showImageLoadingWithProgress('No images found for this selection');
                setTimeout(() => {
                    this.hideImageLoading();
                }, 1000);
            }
            
            this.updateImageNavigation();
        } catch (error) {
            console.error('Error loading curriculum images:', error);
            this.showImageLoadingWithProgress('Error loading curriculum');
            setTimeout(() => {
                this.hideImageLoading();
            }, 2000);
        }
    }

    async discoverSemesterImages(semester) {
        const { stream } = this.selections;
        const images = [];
        
        const patterns = [
            `${stream.toLowerCase()}-sem${semester}.webp`,
            `${stream.toLowerCase()}-sem${semester}-1.webp`,
            `${stream.toLowerCase()}-sem${semester}-2.webp`,
            `${stream.toLowerCase()}-sem${semester}-3.webp`,
        ];
        
        for (const pattern of patterns) {
            const imagePath = `images/${stream.toLowerCase()}/${pattern}`;
            if (await this.imageExists(imagePath)) {
                images.push({
                    path: imagePath,
                    name: this.formatImageName(pattern),
                    type: 'semester'
                });
            }
        }
        
        return images;
    }

    async loadOthersFiles() {
        const { stream } = this.selections;
        if (!stream) {
            this.otherFiles = [];
            return;
        }
        
        const imageExtensions = ['webp'];
        const commonFileNames = [
            'elective', 'iks', 'core elective', 'open elective', 'lab', 'theory', 'practical',
            'syllabus', 'schedule', 'timetable', 'curriculum', 'course', 'subject'
        ];
        
        this.otherFiles = [];
        const discoveredFiles = new Set(); 
        
        for (const baseName of commonFileNames) {
            for (const ext of imageExtensions) {
                const fileName = `${baseName}.${ext}`;
                const imagePath = `images/${stream.toLowerCase()}/others/${fileName}`;
                
                if (await this.imageExists(imagePath)) {
                    const displayName = this.formatOtherFileName(fileName);
                    const value = fileName.replace(/\.(webp)$/i, '').toLowerCase();
                    
                    if (!discoveredFiles.has(value)) {
                        discoveredFiles.add(value);
                        this.otherFiles.push({
                            path: imagePath,
                            name: displayName,
                            value: value,
                            type: 'other'
                        });
                    }
                }
            }
        }
        
        const additionalFiles = await this.discoverAdditionalFiles(stream.toLowerCase());
        
        for (const file of additionalFiles) {
            const normalizedValue = file.value.toLowerCase();
            if (!discoveredFiles.has(normalizedValue)) {
                discoveredFiles.add(normalizedValue);
                this.otherFiles.push(file);
            }
        }

        console.log(`Loaded ${this.otherFiles.length} other files for ${stream}:`, this.otherFiles);
    }

    async discoverAdditionalFiles(stream) {
        const files = [];
        const imageExtensions = ['webp'];
        
        const additionalPatterns = [
            'IKS', 'ELECTIVE', 'LAB', 'THEORY', 'PRACTICAL', 'SYLLABUS', 'SCHEDULE'
        ];
        
        for (const pattern of additionalPatterns) {
            for (const ext of imageExtensions) {
                const fileName = `${pattern}.${ext}`;
                const imagePath = `images/${stream}/others/${fileName}`;
                
                if (await this.imageExists(imagePath)) {
                    const displayName = this.formatOtherFileName(fileName);
                    const value = fileName.replace(/\.(webp)$/i, '').toLowerCase();
                    
                    files.push({
                        path: imagePath,
                        name: displayName,
                        value: value,
                        type: 'other'
                    });
                }
            }
        }
        
        return files;
    }

    async imageExists(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = imagePath;
        });
    }

    formatImageName(fileName) {
        const match = fileName.match(/([a-z]+)-sem(\d+)(?:-(\d+))?\.webp/);
        if (match) {
            const stream = match[1].toUpperCase();
            const sem = match[2];
            const part = match[3];
            return part ? `${stream} Semester ${sem} - Part ${part}` : `${stream} Semester ${sem}`;
        }
        return fileName;
    }

    formatOtherFileName(fileName) {
        const nameWithoutExtension = fileName.replace(/\.(webp)$/i, '');
        
        return nameWithoutExtension
            .split(/[-_\s]+/) 
            .map(word => {
                if (word === word.toUpperCase() && word.length > 1) {
                    return word;
                }
                if (word.length === 1) {
                    return word.toUpperCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    async preloadImage(imagePath) {
        if (this.imageCache.has(imagePath)) {
            return this.imageCache.get(imagePath);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.imageCache.set(imagePath, img);
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${imagePath}`));
            };

            img.crossOrigin = 'anonymous';
            img.src = imagePath;
        });
    }

    async preloadImageSet(imageSet) {
        if (this.isPreloading) return;
        
        this.isPreloading = true;
        this.preloadQueue = [...imageSet];
        
        const totalImages = imageSet.length;
        let loadedImages = 0;
        
        for (const imageInfo of imageSet) {
            try {
                await this.preloadImage(imageInfo.path);
                loadedImages++;
                
                const stepProgress = (loadedImages / totalImages) * 100;
                this.updateLoadingProgressWithinStep(stepProgress);
                
                console.log(`Preloaded: ${imageInfo.path}`);
            } catch (error) {
                console.warn(`Failed to preload: ${imageInfo.path}`, error);
                loadedImages++;
                const stepProgress = (loadedImages / totalImages) * 100;
                this.updateLoadingProgressWithinStep(stepProgress);
            }
        }
        
        this.isPreloading = false;
        this.preloadQueue = [];
    }

    setupLoadingSteps(steps) {
        this.loadingSteps = steps;
        this.currentLoadingStep = 0;
        this.currentLoadProgress = 0;
        this.updateLoadingProgress(0);
    }

    updateLoadingStep(stepIndex) {
        if (stepIndex < this.loadingSteps.length) {
            this.currentLoadingStep = stepIndex;
            const step = this.loadingSteps[stepIndex];
            this.showImageLoadingWithProgress(step.name);
        }
    }

    updateLoadingProgressWithinStep(stepProgress) {
        if (this.loadingSteps.length === 0) return;
        
        const stepWeight = this.loadingSteps[this.currentLoadingStep].weight;
        const previousStepsWeight = this.loadingSteps
            .slice(0, this.currentLoadingStep)
            .reduce((sum, step) => sum + step.weight, 0);
        
        const totalProgress = previousStepsWeight + (stepWeight * stepProgress / 100);
        this.updateLoadingProgress(totalProgress);
    }

    showImageLoadingWithProgress(message = 'Loading...') {
        const loadingElement = document.getElementById('image-loading');
        const progressText = document.getElementById('loading-text');
        
        loadingElement.classList.add('active');
        
        if (progressText) {
            progressText.textContent = message;
        }
        
        if (this.loadProgressInterval) {
            clearInterval(this.loadProgressInterval);
            this.loadProgressInterval = null;
        }
    }

    updateLoadingProgress(progress) {
        const progressBar = document.getElementById('loading-progress');
        const progressText = document.getElementById('loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
        
        if (progressText && !progressText.textContent.includes('%')) {
            const currentText = progressText.textContent.replace(/\s+\d+%$/, '');
            progressText.textContent = `${currentText} ${Math.round(progress)}%`;
        }
    }

    hideImageLoading() {
        const loadingElement = document.getElementById('image-loading');
        const progressBar = document.getElementById('loading-progress');
        const progressText = document.getElementById('loading-text');
        
        if (this.loadProgressInterval) {
            clearInterval(this.loadProgressInterval);
            this.loadProgressInterval = null;
        }
        
        this.updateLoadingProgress(100);
        
        setTimeout(() => {
            loadingElement.classList.remove('active');
            if (progressBar) progressBar.style.width = '0%';
            if (progressText) progressText.textContent = 'Loading...';
        }, 300);
    }

    async loadImageWithCache(imagePath) {
        try {
            if (this.imageCache.has(imagePath)) {
                if (this.loadingSteps.length === 0) {
                    this.showImageLoadingWithProgress('Loading from cache...');
                    this.updateLoadingProgress(100);
                    setTimeout(() => {
                        this.hideImageLoading();
                    }, 200);
                }
                return this.imageCache.get(imagePath);
            }

            if (this.loadingSteps.length === 0) {
                this.showImageLoadingWithProgress('Downloading image...');
            }
            
            const img = await this.preloadImage(imagePath);
            
            if (this.loadingSteps.length === 0) {
                this.updateLoadingProgress(100);
                setTimeout(() => {
                    this.hideImageLoading();
                }, 200);
            }
            
            return img;
        } catch (error) {
            console.error('Failed to load image:', error);
            if (this.loadingSteps.length === 0) {
                this.showImageLoadingWithProgress('Failed to load image');
                setTimeout(() => {
                    this.hideImageLoading();
                }, 1000);
            }
            throw error;
        }
    }

    async loadImageWithRetry(imagePath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.loadImageWithCache(imagePath);
            } catch (error) {
                console.warn(`Attempt ${attempt} failed for ${imagePath}:`, error);
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    async loadImageByIndex(index) {
        if (index >= 0 && index < this.currentImageSet.length) {
            this.currentImageIndex = index;
            const imageInfo = this.currentImageSet[index];
            
            const image = document.getElementById('curriculum-image');
            
            try {
                await this.loadImageWithRetry(imageInfo.path);
                image.src = imageInfo.path;
                
                this.updateViewerHeaderInfo(imageInfo.name, `${this.selections.stream} - ${this.selections.batch}`);
                
                this.isViewingAdditionalFile = false;
                this.updateNavigationControls();
                
                this.resetImageTransform();
                this.updateImageNavigation();
                
                this.preloadAdjacentImages(index);
                
                this.lastViewedImagePath = imageInfo.path;
                this.saveState();
                
                if (this.loadingSteps.length === 0) {
                    this.hideImageLoading();
                }
                
            } catch (error) {
                console.error('Failed to load image:', error);
                if (this.loadingSteps.length === 0) {
                    this.hideImageLoading();
                }
            }
        }
    }

    async preloadAdjacentImages(currentIndex) {
        const imagesToPreload = [];
        
        if (currentIndex + 1 < this.currentImageSet.length) {
            imagesToPreload.push(this.currentImageSet[currentIndex + 1]);
        }
        
        if (currentIndex - 1 >= 0) {
            imagesToPreload.push(this.currentImageSet[currentIndex - 1]);
        }
        
        if (imagesToPreload.length > 0) {
            setTimeout(() => {
                this.preloadImageSet(imagesToPreload);
            }, 1000);
        }
    }

    async loadOtherFile(fileInfo) {
        this.previousCurriculumIndex = this.currentImageIndex;
        
        const image = document.getElementById('curriculum-image');
        
        try {
            this.showImageLoadingWithProgress(`Loading ${fileInfo.name}...`);
            await this.loadImageWithRetry(fileInfo.path);
            image.src = fileInfo.path;
            
            this.updateViewerHeaderInfo(fileInfo.name, 'Additional Resource');
            
            this.isViewingAdditionalFile = true;
            this.updateNavigationControls();
            
            this.resetImageTransform();
            
            this.lastViewedImagePath = fileInfo.path;
            this.saveState();
            
            this.hideImageLoading();
        } catch (error) {
            console.error('Failed to load other file:', error);
            this.showImageLoadingWithProgress('Failed to load file');
            setTimeout(() => {
                this.hideImageLoading();
            }, 1000);
        }
    }

    updateNavigationControls() {
        const prevBtn = document.getElementById('prev-image');
        const nextBtn = document.getElementById('next-image');
        const imageCounter = document.getElementById('image-counter');
        const othersBtn = document.getElementById('others-btn');
        const backToCurriculumBtn = document.getElementById('back-to-curriculum');
        const navigationGroup = document.querySelector('.navigation-group');
        
        if (this.isViewingAdditionalFile) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (imageCounter) imageCounter.style.display = 'none';
            if (othersBtn) othersBtn.style.display = 'flex';
            if (backToCurriculumBtn) backToCurriculumBtn.style.display = 'flex';
            if (navigationGroup) navigationGroup.style.display = 'none';
        } else {
            if (prevBtn) {
                prevBtn.disabled = this.currentImageIndex <= 0;
                prevBtn.style.display = this.currentImageSet.length > 1 ? 'flex' : 'none';
            }
            
            if (nextBtn) {
                nextBtn.disabled = this.currentImageIndex >= this.currentImageSet.length - 1;
                nextBtn.style.display = this.currentImageSet.length > 1 ? 'flex' : 'none';
            }
            
            if (othersBtn) {
                othersBtn.style.display = 'flex';
            }
            
            if (backToCurriculumBtn) {
                backToCurriculumBtn.style.display = 'none';
            }
            
            if (imageCounter && this.currentImageSet.length > 1) {
                imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentImageSet.length}`;
                imageCounter.style.display = 'block';
            } else if (imageCounter) {
                imageCounter.style.display = 'none';
            }
            
            if (navigationGroup) {
                navigationGroup.style.display = this.currentImageSet.length > 1 ? 'flex' : 'none';
            }
        }
    }

    previousImage() {
        console.log('Previous image clicked, current index:', this.currentImageIndex);
        if (this.currentImageIndex > 0) {
            this.showImageLoadingWithProgress('Loading previous image...');
            this.loadImageByIndex(this.currentImageIndex - 1);
        }
    }

    nextImage() {
        console.log('Next image clicked, current index:', this.currentImageIndex);
        if (this.currentImageIndex < this.currentImageSet.length - 1) {
            this.showImageLoadingWithProgress('Loading next image...');
            this.loadImageByIndex(this.currentImageIndex + 1);
        }
    }

    updateImageNavigation() {
        const prevBtn = document.getElementById('prev-image');
        const nextBtn = document.getElementById('next-image');
        const imageCounter = document.getElementById('image-counter');
        const othersBtn = document.getElementById('others-btn');
        const navigationGroup = document.querySelector('.navigation-group');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentImageIndex <= 0;
            prevBtn.style.display = this.currentImageSet.length > 1 ? 'flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentImageIndex >= this.currentImageSet.length - 1;
            nextBtn.style.display = this.currentImageSet.length > 1 ? 'flex' : 'none';
        }
        
        if (othersBtn) {
            othersBtn.style.display = 'flex'; 
        }
        
        if (imageCounter && this.currentImageSet.length > 1) {
            imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentImageSet.length}`;
            imageCounter.style.display = 'block';
        } else if (imageCounter) {
            imageCounter.style.display = 'none';
        }
        
        if (navigationGroup) {
            navigationGroup.style.display = this.currentImageSet.length > 1 ? 'flex' : 'none';
        }
    }

    showOthersModal() {
        console.log('Others modal clicked');
        const modal = document.getElementById('others-modal');
        const modalContent = document.getElementById('others-list');
        
        modalContent.innerHTML = '';
        
        if (this.otherFiles.length === 0) {
            modalContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1; padding: 2rem;">No additional files found.</p>';
        } else {
            this.otherFiles.forEach((file) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'other-file-item';
                fileItem.innerHTML = `
                    <img src="${file.path}" alt="${file.name}" class="other-file-preview" loading="lazy">
                    <div class="other-file-name">${file.name}</div>
                `;
                fileItem.addEventListener('click', () => {
                    this.loadOtherFile(file);
                    this.closeOthersModal();
                });
                modalContent.appendChild(fileItem);
            });
        }
        
        modal.classList.add('active');
    }

    closeOthersModal() {
        document.getElementById('others-modal').classList.remove('active');
    }

    zoomImage(factor) {
        console.log('Zoom clicked, factor:', factor);
        this.imageScale *= factor;
        this.imageScale = Math.max(0.25, Math.min(5, this.imageScale));
        this.updateImageTransform();
    }

    zoomImageAtPoint(factor, offsetX, offsetY) {
        const oldScale = this.imageScale;
        this.imageScale *= factor;
        this.imageScale = Math.max(0.25, Math.min(5, this.imageScale));
        
        const scaleDelta = this.imageScale - oldScale;
        this.imagePosition.x -= (offsetX * scaleDelta) / oldScale;
        this.imagePosition.y -= (offsetY * scaleDelta) / oldScale;
        
        this.updateImageTransform();
    }

    resetImageTransform() {
        console.log('Reset zoom clicked');
        this.imageScale = 1;
        this.imagePosition = { x: 0, y: 0 };
        this.updateImageTransform();
    }

    updateImageTransform() {
        const image = document.getElementById('curriculum-image');
        image.style.transform = `scale(${this.imageScale}) translate(${this.imagePosition.x}px, ${this.imagePosition.y}px)`;
    }

    startImageDrag(e) {
        if (e.button === 0 || e.button === 2) {
            this.isDragging = true;
            this.lastMousePosition = { x: e.clientX, y: e.clientY };
            document.getElementById('image-viewer').classList.add('dragging');
        }
    }

    dragImage(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastMousePosition.x;
        const deltaY = e.clientY - this.lastMousePosition.y;

        this.imagePosition.x += deltaX / this.imageScale;
        this.imagePosition.y += deltaY / this.imageScale;

        this.updateImageTransform();
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
    }

    endImageDrag() {
        this.isDragging = false;
        document.getElementById('image-viewer').classList.remove('dragging');
    }

    handleTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Touch start:', e.touches.length, 'touches');
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.isDragging = true;
            this.lastMousePosition = { x: touch.clientX, y: touch.clientY };
            document.getElementById('image-viewer').classList.add('dragging');
            console.log('Started panning');
            
            const currentTime = new Date().getTime();
            const tapLength = currentTime - this.lastTapTime;
            const tapDistance = Math.sqrt(
                Math.pow(touch.clientX - this.lastTapPosition.x, 2) + 
                Math.pow(touch.clientY - this.lastTapPosition.y, 2)
            );
            
            if (tapLength < 300 && tapDistance < 50) {
                console.log('Double tap detected');
                if (this.imageScale > 1) {
                    this.resetImageTransform();
                } else {
                    this.zoomImageAtPoint(2, touch.clientX - window.innerWidth / 2, touch.clientY - window.innerHeight / 2);
                }
                this.isDragging = false;
                document.getElementById('image-viewer').classList.remove('dragging');
            }
            
            this.lastTapTime = currentTime;
            this.lastTapPosition = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2) {
            this.isPinching = true;
            this.lastPinchDistance = this.getPinchDistance(e.touches);
            this.lastPinchCenter = this.getPinchCenter(e.touches);
            console.log('Started pinch zoom');
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.touches.length === 1 && this.isDragging) {
            const touch = e.touches[0];
            this.dragImage({ clientX: touch.clientX, clientY: touch.clientY });
        } else if (e.touches.length === 2 && this.isPinching) {
            this.handlePinchZoom(e.touches);
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Touch end:', e.touches.length, 'touches remaining');
        
        if (e.touches.length === 0) {
            this.isDragging = false;
            this.isPinching = false;
            document.getElementById('image-viewer').classList.remove('dragging');
            console.log('All touches ended');
        } else if (e.touches.length === 1) {
            this.isPinching = false;
            const touch = e.touches[0];
            this.isDragging = true;
            this.lastMousePosition = { x: touch.clientX, y: touch.clientY };
            console.log('Switched to panning');
        }
    }

    getPinchDistance(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getPinchCenter(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    handlePinchZoom(touches) {
        const currentDistance = this.getPinchDistance(touches);
        const currentCenter = this.getPinchCenter(touches);
        
        if (this.lastPinchDistance && this.lastPinchCenter) {
            const scaleFactor = currentDistance / this.lastPinchDistance;
            const centerX = currentCenter.x - window.innerWidth / 2;
            const centerY = currentCenter.y - window.innerHeight / 2;
            
            this.zoomImageAtPoint(scaleFactor, centerX, centerY);
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    }

    toggleFullscreen() {
        console.log('Fullscreen clicked');
        const image = document.getElementById('curriculum-image');
        const imageSrc = image.src;
        
        if (imageSrc && imageSrc !== '') {
            window.open(imageSrc, '_blank');
        }
    }

    showImageLoading() {
        document.getElementById('image-loading').classList.add('active');
    }

    hideImageLoading() {
        document.getElementById('image-loading').classList.remove('active');
    }

    toggleOverlay() {
        const overlay = document.getElementById('overlay');
        const hamburger = document.getElementById('hamburger');
        
        if (overlay.classList.contains('active')) {
            this.closeOverlay();
        } else {
            overlay.classList.add('active');
            hamburger.classList.add('active');
            this.updateOverlaySelections();
        }
    }

    closeOverlay() {
        const overlay = document.getElementById('overlay');
        const hamburger = document.getElementById('hamburger');
        
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    }

    updateOverlaySelections() {
        document.getElementById('overlay-batch').value = this.selections.batch;
        document.getElementById('overlay-stream').value = this.selections.stream;
        document.getElementById('overlay-semester').value = this.selections.semester;
    }

    async applyOverlayChanges() {
        const newBatch = document.getElementById('overlay-batch').value;
        const newStream = document.getElementById('overlay-stream').value;
        const newSemester = document.getElementById('overlay-semester').value;
        
        const batchChanged = newBatch !== this.selections.batch;
        const streamChanged = newStream !== this.selections.stream;
        const semesterChanged = newSemester !== this.selections.semester;
        
        if (batchChanged) {
            this.selections.batch = newBatch;
            this.resetFromBatch();
            this.updateMainDropdowns();
            if (newBatch) {
                this.setupLoadingSteps([
                    { name: 'Applying batch changes...', weight: 50 },
                    { name: 'Loading curriculum...', weight: 50 }
                ]);
                this.updateLoadingStep(0);
                await this.handleBatchChange(newBatch);
                this.updateLoadingStep(1);
                await this.loadCurriculumImages();
            }
        } else if (streamChanged) {
            this.selections.stream = newStream;
            this.resetFromStream();
            this.updateMainDropdowns();
            if (newStream) {
                this.setupLoadingSteps([
                    { name: 'Applying stream changes...', weight: 50 },
                    { name: 'Loading curriculum...', weight: 50 }
                ]);
                this.updateLoadingStep(0);
                await this.handleStreamChange(newStream);
                this.updateLoadingStep(1);
                await this.loadCurriculumImages();
            }
        } else if (semesterChanged && newSemester) {
            this.selections.semester = newSemester;
            this.updateMainDropdowns();
            this.setupLoadingSteps([
                { name: 'Loading new semester...', weight: 100 }
            ]);
            this.updateLoadingStep(0);
            await this.handleSemesterChange(newSemester);
        }
        
        this.closeOverlay();
    }

    updateMainDropdowns() {
        document.getElementById('batch-select').value = this.selections.batch;
        document.getElementById('stream-select').value = this.selections.stream;
        document.getElementById('semester-select').value = this.selections.semester;
    }

    resetFromBatch() {
        this.selections.stream = '';
        this.selections.semester = '';
        document.getElementById('stream-select').value = '';
        document.getElementById('semester-select').value = '';
        document.getElementById('overlay-stream').value = '';
        document.getElementById('overlay-semester').value = '';
    }

    resetFromStream() {
        this.selections.semester = '';
        document.getElementById('semester-select').value = '';
        document.getElementById('overlay-semester').value = '';
    }

    saveState() {
        const state = {
            currentSection: this.currentSection,
            selections: this.selections,
            imageIndex: this.currentImageIndex,
            lastViewedImagePath: this.lastViewedImagePath,
            timestamp: Date.now(),
            cachedImages: Array.from(this.imageCache.keys())
        };
        localStorage.setItem('iterCurriculumState', JSON.stringify(state));
    }

    loadSavedState() {
        const savedState = localStorage.getItem('iterCurriculumState');
        if (!savedState) {
            this.isFirstLoad = true;
            return;
        }

        try {
            const state = JSON.parse(savedState);
            const daysSinceLastVisit = (Date.now() - state.timestamp) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLastVisit > 30) {
                localStorage.removeItem('iterCurriculumState');
                this.isFirstLoad = true;
                return;
            }

            this.selections = state.selections || { batch: '', stream: '', semester: '' };
            this.currentImageIndex = state.imageIndex || 0;
            this.lastViewedImagePath = state.lastViewedImagePath || '';
            this.isLoadingFromState = true;
            
            if (state.cachedImages && Array.isArray(state.cachedImages)) {
                console.log(`Restoring ${state.cachedImages.length} cached images`);
                setTimeout(() => {
                    state.cachedImages.forEach(imagePath => {
                        this.preloadImage(imagePath).catch(() => {
                        });
                    });
                }, 1000);
            }
            
            const oneTimeIndicator = document.getElementById('one-time-process-indicator');
            if (this.selections.batch && this.selections.stream && this.selections.semester) {
                oneTimeIndicator.classList.add('hidden');
            }
            
            if (this.selections.batch && this.selections.stream && this.selections.semester) {
                this.currentSection = 'viewer-section';
            } else if (this.selections.batch && this.selections.stream) {
                this.currentSection = 'semester-section';
            } else if (this.selections.batch) {
                this.currentSection = 'stream-section';
            } else {
                this.currentSection = 'batch-section';
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
            localStorage.removeItem('iterCurriculumState');
            this.isFirstLoad = true;
        }
    }

    async updateUI() {
        document.getElementById('batch-select').value = this.selections.batch;
        document.getElementById('stream-select').value = this.selections.stream;
        document.getElementById('semester-select').value = this.selections.semester;

        if (this.isFirstLoad && !this.selections.batch && !this.selections.stream && !this.selections.semester) {
            setTimeout(() => {
                this.showPopup();
            }, 1000);
        }

        if (this.currentSection === 'viewer-section' && this.selections.batch && this.selections.stream && this.selections.semester) {
            if (!this.isFirstLoad) {
                this.setupLoadingSteps([
                    { name: 'Restoring your previous session...', weight: 30 },
                    { name: 'Loading curriculum images...', weight: 40 },
                    { name: 'Loading your previous image...', weight: 30 }
                ]);
                this.updateLoadingStep(0);
            }
            
            await this.loadCurriculumImages();
            this.showSection('viewer-section');
            
            if (this.lastViewedImagePath && !this.isFirstLoad) {
                const imageIndex = this.currentImageSet.findIndex(img => img.path === this.lastViewedImagePath);
                if (imageIndex !== -1) {
                    this.updateLoadingStep(2);
                    setTimeout(async () => {
                        await this.loadImageByIndex(imageIndex);
                    }, 500);
                } else {
                    if (this.currentImageIndex > 0 && this.currentImageIndex < this.currentImageSet.length) {
                        this.updateLoadingStep(2);
                        setTimeout(async () => {
                            await this.loadImageByIndex(this.currentImageIndex);
                        }, 500);
                    }
                }
            } else if (this.currentImageIndex > 0 && this.currentImageIndex < this.currentImageSet.length && !this.isFirstLoad) {
                this.updateLoadingStep(2);
                setTimeout(async () => {
                    await this.loadImageByIndex(this.currentImageIndex);
                }, 500);
            }
            
            this.isFirstLoad = false;
        } else if (this.currentSection !== 'batch-section') {
            this.showSection(this.currentSection);
        }

        this.updateOverlaySelections();
    }

    updateViewerHeaderInfo(line1, line2) {
        const line1Elem = document.getElementById('viewer-header-line1');
        const line2Elem = document.getElementById('viewer-header-line2');
        if (line1Elem) line1Elem.textContent = line1 || '';
        if (line2Elem) line2Elem.textContent = line2 || '';
    }

    backToCurriculum() {
        this.isViewingAdditionalFile = false;
        if (this.currentImageSet.length > 0 && this.previousCurriculumIndex < this.currentImageSet.length) {
            this.loadImageByIndex(this.previousCurriculumIndex);
        }
    }

    optimizeImageLoading() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                this.preloadQueue = this.preloadQueue.slice(0, 2);
            }
        }
    }

    clearOldCache() {
        const maxCacheSize = 50;
        if (this.imageCache.size > maxCacheSize) {
            const entries = Array.from(this.imageCache.entries());
            const toDelete = entries.slice(0, entries.length - maxCacheSize);
            toDelete.forEach(([key]) => {
                this.imageCache.delete(key);
            });
            console.log(`Cleared ${toDelete.length} old cached images`);
        }
    }

    closePopup() {
        document.getElementById('popup').classList.remove('active');
    }

    showPopup() {
        document.getElementById('popup').classList.add('active');
    }
}
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new CurriculumApp();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app) {
        app.updateUI();
    }
});