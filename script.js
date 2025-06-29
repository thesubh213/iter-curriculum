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

        document.getElementById('zoom-in').addEventListener('click', () => this.zoomImage(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomImage(0.8));
        document.getElementById('reset-zoom').addEventListener('click', () => this.resetImageTransform());
        
        document.getElementById('prev-image').addEventListener('click', () => this.previousImage());
        document.getElementById('next-image').addEventListener('click', () => this.nextImage());
        document.getElementById('others-btn').addEventListener('click', () => this.showOthersModal());
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('back-to-curriculum').addEventListener('click', () => this.backToCurriculum());
        
        document.getElementById('others-modal-close').addEventListener('click', () => this.closeOthersModal());
        document.getElementById('others-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('others-modal')) this.closeOthersModal();
        });

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

        imageViewer.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        imageViewer.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        imageViewer.addEventListener('touchend', () => this.endImageDrag());

        image.addEventListener('load', () => this.hideImageLoading());
        image.addEventListener('error', () => this.hideImageLoading());
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

    async handleSemesterChange(value) {
        if (!value) return;

        this.selections.semester = value;
        this.saveState();
        
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
                if (this.currentImageSet.length > 0 && this.currentImageIndex < this.currentImageSet.length) {
                    const imageInfo = this.currentImageSet[this.currentImageIndex];
                    this.updateViewerHeaderInfo(imageInfo.name, `Civil Engineering - ${this.selections.batch}`);
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
        this.showImageLoadingWithProgress();
        
        const { stream, semester } = this.selections;
        this.currentImageSet = await this.discoverSemesterImages(semester);
        this.currentImageIndex = 0;
        
        await this.loadOthersFiles();
        
        if (this.currentImageSet.length > 0) {
            this.preloadImageSet(this.currentImageSet);
            
            await this.loadImageByIndex(0);
        } else {
            this.hideImageLoading();
        }
        
        this.updateImageNavigation();
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
        
        for (const imageInfo of imageSet) {
            try {
                await this.preloadImage(imageInfo.path);
                console.log(`Preloaded: ${imageInfo.path}`);
            } catch (error) {
                console.warn(`Failed to preload: ${imageInfo.path}`, error);
            }
        }
        
        this.isPreloading = false;
        this.preloadQueue = [];
    }

    showImageLoadingWithProgress() {
        const loadingElement = document.getElementById('image-loading');
        const progressBar = document.getElementById('loading-progress');
        const progressText = document.getElementById('loading-text');
        
        loadingElement.classList.add('active');
        this.currentLoadProgress = 0;
        
        this.loadProgressInterval = setInterval(() => {
            if (this.currentLoadProgress < 90) {
                this.currentLoadProgress += Math.random() * 15;
                this.updateLoadingProgress(this.currentLoadProgress);
            }
        }, 100);
    }

    updateLoadingProgress(progress) {
        const progressBar = document.getElementById('loading-progress');
        const progressText = document.getElementById('loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Loading... ${Math.round(progress)}%`;
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
                return this.imageCache.get(imagePath);
            }

            this.showImageLoadingWithProgress();
            
            const img = await this.preloadImage(imagePath);
            
            this.currentLoadProgress = 100;
            this.updateLoadingProgress(100);
            
            setTimeout(() => {
                this.hideImageLoading();
            }, 200);
            
            return img;
        } catch (error) {
            this.hideImageLoading();
            throw error;
        }
    }

    async loadImageByIndex(index) {
        if (index >= 0 && index < this.currentImageSet.length) {
            this.currentImageIndex = index;
            const imageInfo = this.currentImageSet[index];
            
            const image = document.getElementById('curriculum-image');
            
            try {
                await this.loadImageWithCache(imageInfo.path);
                image.src = imageInfo.path;
                
                this.updateViewerHeaderInfo(imageInfo.name, `${this.selections.stream} - ${this.selections.batch}`);
                
                this.isViewingAdditionalFile = false;
                this.updateNavigationControls();
                
                this.resetImageTransform();
                this.updateImageNavigation();
                
                this.preloadAdjacentImages(index);
                
            } catch (error) {
                console.error('Failed to load image:', error);
                this.hideImageLoading();
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
            await this.loadImageWithCache(fileInfo.path);
            image.src = fileInfo.path;
            
            this.updateViewerHeaderInfo(fileInfo.name, 'Additional Resource');
            
            this.isViewingAdditionalFile = true;
            this.updateNavigationControls();
            
            this.resetImageTransform();
        } catch (error) {
            console.error('Failed to load other file:', error);
            this.hideImageLoading();
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
        if (this.currentImageIndex > 0) {
            this.loadImageByIndex(this.currentImageIndex - 1);
        }
    }

    nextImage() {
        if (this.currentImageIndex < this.currentImageSet.length - 1) {
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
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.startImageDrag({ button: 0, clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.dragImage({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    toggleFullscreen() {
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

    applyOverlayChanges() {
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
            if (newBatch) this.handleBatchChange(newBatch);
        } else if (streamChanged) {
            this.selections.stream = newStream;
            this.resetFromStream();
            this.updateMainDropdowns();
            if (newStream) this.handleStreamChange(newStream);
        } else if (semesterChanged && newSemester) {
            this.selections.semester = newSemester;
            this.updateMainDropdowns();
            this.handleSemesterChange(newSemester);
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
            timestamp: Date.now(),
            cachedImages: Array.from(this.imageCache.keys())
        };
        localStorage.setItem('iterCurriculumState', JSON.stringify(state));
    }

    loadSavedState() {
        const savedState = localStorage.getItem('iterCurriculumState');
        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);
            const daysSinceLastVisit = (Date.now() - state.timestamp) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLastVisit > 30) {
                localStorage.removeItem('iterCurriculumState');
                return;
            }

            this.selections = state.selections || { batch: '', stream: '', semester: '' };
            this.currentImageIndex = state.imageIndex || 0;
            
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
        }
    }

    async updateUI() {
        document.getElementById('batch-select').value = this.selections.batch;
        document.getElementById('stream-select').value = this.selections.stream;
        document.getElementById('semester-select').value = this.selections.semester;

        if (this.currentSection === 'viewer-section' && this.selections.batch && this.selections.stream && this.selections.semester) {
            await this.loadCurriculumImages();
            this.showSection('viewer-section');
            
            setTimeout(() => {
                if (this.currentImageIndex > 0 && this.currentImageIndex < this.currentImageSet.length) {
                    this.loadImageByIndex(this.currentImageIndex);
                }
            }, 1000);
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