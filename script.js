class CurriculumApp {
    constructor() {
        try {
            const globalConfig = window.ITER_CURRICULUM_CONFIG || {};
            
            this.missingFolderConfig = {
                enabled: globalConfig.missingFolder?.enabled ?? true,
                showPopup: globalConfig.missingFolder?.showPopup ?? true,
                popupDuration: globalConfig.missingFolder?.popupDuration ?? 3000,
                popupMessage: globalConfig.missingFolder?.defaultMessage ?? "This curriculum will be added soon! 📚",
                customMessages: globalConfig.missingFolder?.customMessages ?? {
                    missingYear: "Curriculum for batch {year} will be added soon! 📚",
                    missingStream: "{stream} curriculum for batch {year} will be added soon! 📚",
                    missingSemester: "{stream} Semester {semester} for batch {year} will be added soon! 📚"
                },
                supportedYears: globalConfig.missingFolder?.supportedYears ?? ['2024', '2023', '2022', '2021', '2020'],
                supportedStreams: globalConfig.missingFolder?.supportedStreams ?? ['ce', 'me', 'ee', 'eee', 'ece', 'cse', 'cs-it', 'cse-aiml', 'cse-cs', 'cse-ds', 'cse-iot']
            };
            
            this.appConfig = {
                maxCacheSize: globalConfig.app?.maxCacheSize ?? 50,
                loadingTimeout: globalConfig.app?.loadingTimeout ?? 30000,
                retryAttempts: globalConfig.app?.retryAttempts ?? 3
            };
        } catch (error) {
            this.missingFolderConfig = {
                enabled: true,
                showPopup: true,
                popupDuration: 3000,
                popupMessage: "This curriculum will be added soon! 📚",
                customMessages: {
                    missingYear: "Curriculum for batch {year} will be added soon! 📚",
                    missingStream: "{stream} curriculum for batch {year} will be added soon! 📚",
                    missingSemester: "{stream} Semester {semester} for batch {year} will be added soon! 📚"
                },
                supportedYears: ['2024', '2023', '2022', '2021', '2020'],
                supportedStreams: ['ce', 'me', 'ee', 'eee', 'ece', 'cse', 'cs-it', 'cse-aiml', 'cse-cs', 'cse-ds', 'cse-iot']
            };
            
            this.appConfig = {
                maxCacheSize: 50,
                loadingTimeout: 30000,
                retryAttempts: 3
            };
        }

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
        this.previousCurriculumImageSet = [];
        
        this.imageCache = new Map();
        this.preloadQueue = [];
        this.isPreloading = false;
        this.currentLoadProgress = 0;
        this.loadProgressInterval = null;
        this.loadingSteps = [];
        this.currentLoadingStep = 0;
        this.loadingStartTime = null;
        this.lastCacheCheck = 0;
        this.cacheVersion = this.getCacheVersion();
        
        this.isPinching = false;
        this.lastPinchDistance = null;
        this.lastPinchCenter = null;
        
        this.lastTapTime = 0;
        this.lastTapPosition = { x: 0, y: 0 };
        
        this.isFirstLoad = true;
        this.lastViewedImagePath = '';
        this.isLoadingFromState = false;
        this.isPageReload = this.detectPageReload();
        this.isLoadingPopupActive = false;
        this.isInSelectionProcess = false;
        this.cacheCheckInterval = null;
        
        this.init();
    }

    init() {
        try {
            this.registerServiceWorker();
            this.bindEvents();
            this.loadSavedState();
            this.updateUI();
            
            if (this.isLoadingFromState && this.selections.batch && this.selections.stream && this.selections.semester) {
                requestAnimationFrame(() => {
                    this.restoreToViewer();
                });
            }
            
            this.setupCacheChecking();
        } catch (error) {
            try {
                this.showGlobalError('Failed to initialize the application. Please refresh the page.');
            } catch (fallbackError) {
                alert('Failed to initialize the application. Please refresh the page.');
            }
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                if (confirm('A new version is available. Reload to update?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    }
                });
            } catch (error) {
                console.warn('Service worker registration failed:', error);
            }
        }
    }

    bindEvents() {
        try {
            const batchSelect = document.getElementById('batch-select');
            const streamSelect = document.getElementById('stream-select');
            const semesterSelect = document.getElementById('semester-select');
            const resetBtn = document.getElementById('reset-selection-btn');
            if (!batchSelect || !streamSelect || !semesterSelect) {
                throw new Error('Required DOM elements not found');
            }
            batchSelect.addEventListener('change', (e) => this.handleBatchChange(e.target.value));
            streamSelect.addEventListener('change', (e) => this.handleStreamChange(e.target.value));
            semesterSelect.addEventListener('change', (e) => this.handleSemesterChange(e.target.value));
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.resetToInitialSelection());
            }
            const backToBatchBtn = document.getElementById('back-to-batch');
            const backToStreamBtn = document.getElementById('back-to-stream');
            if (backToBatchBtn) {
                backToBatchBtn.addEventListener('click', () => this.goBackToBatch());
            }
            if (backToStreamBtn) {
                backToStreamBtn.addEventListener('click', () => this.goBackToStream());
            }
            this.bindImageEvents();
            
            const popupClose = document.getElementById('popup-close');
            const popup = document.getElementById('popup');
            
            if (popupClose) {
                popupClose.addEventListener('click', () => this.closePopup());
            }
            if (popup) {
                popup.addEventListener('click', (e) => {
                    if (e.target === popup) this.closePopup();
                });
            }
            
            const othersModalClose = document.getElementById('others-modal-close');
            if (othersModalClose) {
                othersModalClose.addEventListener('click', () => this.closeOthersModal());
            }
            
            document.addEventListener('keydown', (e) => {
                try {
                    if (e.key === 'Escape') {
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
                } catch (keyError) {
                }
            });
            
        } catch (error) {
            this.showGlobalError('Failed to initialize user interface. Please refresh the page.');
        }
    }

    bindImageEvents() {
            const imageViewer = document.getElementById('image-viewer');
            const image = document.getElementById('curriculum-image');
            const bindButtonEvent = (id, handler) => {
                    const element = document.getElementById(id);
                    if (element) {
                element.addEventListener('click', handler, { passive: true });
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
            }, { passive: true });
                }
            if (imageViewer) {
            imageViewer.addEventListener('pointerdown', (e) => this.startImageDrag(e), { passive: false });
            imageViewer.addEventListener('pointermove', (e) => this.dragImage(e), { passive: false });
            imageViewer.addEventListener('pointerup', () => this.endImageDrag(), { passive: true });
            imageViewer.addEventListener('pointerleave', () => this.endImageDrag(), { passive: true });
                    imageViewer.addEventListener('wheel', (e) => {
                            e.preventDefault();
                            const factor = e.deltaY > 0 ? 0.9 : 1.1;
                            this.zoomImageAtPoint(factor, e.offsetX, e.offsetY);
            }, { passive: false });
        }
            if (image) {
                    image.addEventListener('load', () => {
                            this.resetImageTransform();
            }, { passive: true });
            image.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
                    image.addEventListener('dblclick', (e) => {
                            e.preventDefault();
                            this.resetImageTransform();
            }, { passive: false });
            image.addEventListener('pointerdown', (e) => this.handlePointerStart(e), { passive: false });
            image.addEventListener('pointermove', (e) => this.handlePointerMove(e), { passive: false });
            image.addEventListener('pointerup', (e) => this.handlePointerEnd(e), { passive: true });
            image.addEventListener('pointercancel', (e) => this.handlePointerEnd(e), { passive: true });
        }
    }

    async handleBatchChange(value) {
        if (!value) {
            this.showGlobalError('Please select a valid batch.');
            return;
        }
        if (!this.missingFolderConfig.supportedYears.includes(value)) {
            this.showGlobalError('Invalid batch selected.');
            return;
        }
        if (this.isOffline()) {
            this.showGlobalError('You are offline. Please connect to the internet to load curriculum.');
            return;
        }
        this.selections.batch = value;
        this.resetFromBatch();
        const streamSelect = document.getElementById('stream-select');
        if (streamSelect) {
            streamSelect.value = '';
            streamSelect.focus();
        }
        this.showSection('stream-section');
    }

    async handleStreamChange(value) {
        if (!value) {
            this.showGlobalError('Please select a valid stream.');
            return;
        }
        if (!this.missingFolderConfig.supportedStreams.includes((value + '').toLowerCase())) {
            this.showGlobalError('Invalid stream selected.');
            return;
        }
        if (this.isOffline()) {
            this.showGlobalError('You are offline. Please connect to the internet to load curriculum.');
            return;
        }

        this.selections.stream = value;
        this.resetFromStream();
        this.showSection('semester-section');
    }

    resetFromStream(saveState = true) {
        this.selections.semester = '';
        try {
            const semesterSelect = document.getElementById('semester-select');
            if (semesterSelect) semesterSelect.value = '';
            if (saveState) {
                this.saveState();
            }
        } catch (error) {}
    }

    goBackToBatch() {
        try {
            this.selections.stream = '';
            this.selections.semester = '';
            this.saveState();
            
            const streamSelect = document.getElementById('stream-select');
            const semesterSelect = document.getElementById('semester-select');
            
            if (streamSelect) streamSelect.value = '';
            if (semesterSelect) semesterSelect.value = '';
            
            this.showSection('batch-section');
        } catch (error) {
            this.showSection('batch-section');
        }
    }

    goBackToStream() {
        try {
            this.selections.semester = '';
            this.saveState();
            
            const semesterSelect = document.getElementById('semester-select');
            if (semesterSelect) semesterSelect.value = '';
            
            this.showSection('stream-section');
        } catch (error) {
            this.showSection('stream-section');
        }
    }

    async handleSemesterChange(value, batchOverride, streamOverride) {
        const batchSelect = document.getElementById('batch-select');
        const streamSelect = document.getElementById('stream-select');
        const batch = batchOverride || (batchSelect ? batchSelect.value : this.selections.batch);
        const stream = streamOverride || (streamSelect ? streamSelect.value : this.selections.stream);
        
        if (!value || isNaN(Number(value)) || Number(value) < 1 || Number(value) > 8) {
            this.showGlobalError('Invalid semester selected.');
            this.hideLoadingPopup();
            return;
        }
        if (!this.isValidSelection(batch, stream, value)) {
            this.showGlobalError('Invalid selection combination.');
            this.hideLoadingPopup();
            return;
        }
        if (this.isOffline()) {
            this.showGlobalError('You are offline. Please connect to the internet to load curriculum.');
            this.hideLoadingPopup();
            return;
        }
        
        this.showLoadingPopup('Preparing curriculum...');
        
        const loadingTimeout = setTimeout(() => {
            this.hideLoadingPopup();
            this.showGlobalError('Loading timeout. Please try again.');
            this.showSection('semester-section');
        }, this.appConfig.loadingTimeout || 30000);
        
        try {
            await new Promise(resolve => {
                setTimeout(() => {
                    const loadingElement = document.getElementById('image-loading');
                    if (loadingElement) {
                        loadingElement.style.display = 'block';
                        loadingElement.style.visibility = 'visible';
                        loadingElement.style.opacity = '1';
                        loadingElement.style.zIndex = '9999';
                    }
                    resolve();
                }, 10);
            });
            
            this.selections.semester = value;
            this.selections.batch = batch;
            this.selections.stream = stream;
            
            this.setupLoadingSteps([
                { name: 'Preparing curriculum...', weight: 25 },
                { name: 'Discovering curriculum images for selected year...', weight: 25 },
                { name: 'Loading additional files...', weight: 25 },
                { name: 'Preloading images for smooth navigation...', weight: 25 }
            ]);
            
            this.updateLoadingStep(0);
            const images = await this.discoverSemesterImages(value);
            
            if (images.length === 0) {
                clearTimeout(loadingTimeout);
                this.selections.semester = '';
                this.isViewingAdditionalFile = false;
                this.updateMainDropdowns();
                this.hideLoadingPopup();
                this.showSection('semester-section');
                return;
            }
            
            this.saveState();
            await this.loadCurriculumImages();
            this.updateNavigationControls();
            this.showSection('viewer-section');
            
            setTimeout(() => {
                this.checkForNewImages();
            }, 5000);
            
        } catch (error) {
            console.error('Error in handleSemesterChange:', error);
            this.hideLoadingPopup();
            this.showGlobalError('Error loading curriculum: ' + (error && error.message ? error.message : 'Unknown error'));
            this.showSection('semester-section');
        } finally {
            clearTimeout(loadingTimeout);
            this.hideLoadingPopup();
        }
    }

    async discoverSemesterImages(semester) {
        try {
            const { stream, batch } = this.selections;
            
            if (!stream || !batch) {
                console.error('Missing stream or batch for image discovery');
                return [];
            }
            
            const images = [];
            let streamFolder = stream.toLowerCase();
            
            const patterns = [
                `${streamFolder}-sem${semester}.webp`,
                `${streamFolder}-sem${semester}-1.webp`,
                `${streamFolder}-sem${semester}-2.webp`,
                `${streamFolder}-sem${semester}-3.webp`,
                `${streamFolder}-sem${semester}.png`,
                `${streamFolder}-sem${semester}-1.png`,
                `${streamFolder}-sem${semester}-2.png`,
                `${streamFolder}-sem${semester}-3.png`,
                `${streamFolder}-semester${semester}.webp`,
                `${streamFolder}-semester${semester}-1.webp`,
                `${streamFolder}-semester${semester}-2.webp`,
                `${streamFolder}-semester${semester}.png`,
                `${streamFolder}-semester${semester}-1.png`,
                `${streamFolder}-semester${semester}-2.png`,
            ];
            
            const checkPromises = patterns.map(async (pattern) => {
                const imagePath = `images/${batch}/${streamFolder}/${pattern}`;
                try {
                    const exists = await this.imageExists(imagePath);
                    if (exists) {
                        return {
                            path: imagePath,
                            name: this.formatImageName(pattern),
                            type: 'semester'
                        };
                    }
                } catch (imageError) {
                    console.warn('Error checking image:', imagePath, imageError);
                }
                return null;
            });
            
            const results = await Promise.all(checkPromises);
            const validImages = results.filter(img => img !== null);
            
            if (validImages.length === 0) {
                const message = this.missingFolderConfig.customMessages.missingSemester
                    .replace('{stream}', this.getStreamDisplayName())
                    .replace('{semester}', semester)
                    .replace('{year}', batch);
                this.showMissingFolderPopup(message);
            }
            
            return validImages;
        } catch (error) {
            console.error('Error in discoverSemesterImages:', error);
            const { stream, batch } = this.selections;
            const message = this.missingFolderConfig.customMessages.missingSemester
                .replace('{stream}', this.getStreamDisplayName())
                .replace('{semester}', semester)
                .replace('{year}', batch);
            this.showMissingFolderPopup(message);
            return [];
        }
    }

    async loadOthersFiles() {
        const { stream, batch } = this.selections;
        if (!stream) {
            this.otherFiles = [];
            return;
        }
        let streamFolder = stream.toLowerCase();
        this.otherFiles = await this.discoverAllOtherFiles(streamFolder);
    }

    async discoverAllOtherFiles(stream) {
        const { batch } = this.selections;
        const files = [];
        const imageExtensions = ['webp', 'png', 'jpg', 'jpeg'];
        const maxFiles = 50;
        
        for (let i = 1; i <= maxFiles; i++) {
            for (const ext of imageExtensions) {
                const fileName = `${i}.${ext}`;
                if (fileName.toLowerCase() === 'desktop.ini') continue;
                const imagePath = `images/${batch}/${stream}/others/${fileName}`;
                try {
                    if (await this.imageExists(imagePath)) {
                        files.push({
                            path: imagePath,
                            name: this.formatFileName(fileName),
                            value: String(i),
                            type: 'other'
                        });
                        break; 
                    }
                } catch (error) {
                    console.warn('Error checking file:', imagePath, error);
                }
            }
        }
        return files;
    }

    formatFileName(fileName) {
        const nameWithoutExtension = fileName.replace(/\.(webp|png|jpg|jpeg)$/i, '');
        
        if (/^\d+$/.test(nameWithoutExtension)) {
            return `File ${nameWithoutExtension}`;
        }
        
        return nameWithoutExtension
            .split(/[-_\s]+/)
            .map(word => {
                if (word === word.toUpperCase() && word.length > 1) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    async imageExists(imagePath) {
        return new Promise((resolve) => {
            try {
                const img = new Image();
                let timedOut = false;
                let resolved = false;
                
                // Increased timeout for better reliability
                const timeout = Math.min(this.appConfig.loadingTimeout || 20000, 10000);
                
                const timer = setTimeout(() => {
                    if (!resolved) {
                        timedOut = true;
                        resolved = true;
                        resolve(false);
                    }
                }, timeout);
                
                const cleanup = () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                    }
                };
                
                img.onload = () => {
                    if (!timedOut && !resolved) {
                        cleanup();
                        resolve(true);
                    }
                };
                
                img.onerror = () => {
                    if (!timedOut && !resolved) {
                        cleanup();
                        resolve(false);
                    }
                };
                
                img.crossOrigin = 'anonymous';
                
                // Use cache buster for better reliability
                const cacheBustedPath = this.addCacheBuster(imagePath);
                
                try {
                    img.src = cacheBustedPath;
                } catch (srcError) {
                    if (!timedOut && !resolved) {
                        cleanup();
                        resolve(false);
                    }
                }
            } catch (error) {
                resolve(false);
            }
        });
    }

    formatImageName(fileName) {
        const match = fileName.match(/([a-z-]+)-sem(\d+)(?:-(\d+))?\.(webp|png)/);
        if (match) {
            let stream = match[1].toLowerCase();
            const sem = match[2];
            const part = match[3];
            
            const streamDisplayNames = {
                'ce': 'CE',
                'me': 'ME',
                'ee': 'EE',
                'eee': 'EEE',
                'ece': 'ECE',
                'cse': 'CSE',
                'cs-it': 'CS-IT',
                'cse-aiml': 'CSE-AIML',
                'cse-cs': 'CSE-CS',
                'cse-ds': 'CSE-DS',
                'cse-iot': 'CSE-IOT'
            };
            
            const displayName = streamDisplayNames[stream] || stream.toUpperCase();
            return part ? `${displayName} Semester ${sem} - Part ${part}` : `${displayName} Semester ${sem}`;
        }
        return fileName;
    }

    async preloadImage(imagePath) {
        if (this.imageCache.has(imagePath)) {
            return this.imageCache.get(imagePath);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.loading = 'eager';
            img.fetchPriority = 'high';
            img.crossOrigin = 'anonymous';
            
            let timedOut = false;
            let resolved = false;
            
            const timer = setTimeout(() => {
                if (!resolved) {
                    timedOut = true;
                    resolved = true;
                    reject(new Error('Image load timeout'));
                }
            }, this.appConfig.loadingTimeout || 10000);
            
            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                }
            };
            
            img.onload = () => {
                if (!timedOut && !resolved) {
                    cleanup();
                    this.imageCache.set(imagePath, img);
                    resolve(img);
                }
            };
            
            img.onerror = () => {
                if (!timedOut && !resolved) {
                    cleanup();
                    reject(new Error('Failed to load image: ' + imagePath));
                }
            };
            
            try {
                img.src = imagePath;
            } catch (srcError) {
                if (!timedOut && !resolved) {
                    cleanup();
                    reject(new Error('Failed to set image source: ' + imagePath));
                }
            }
        });
    }

    async preloadImageSet(imageSet) {
        if (!imageSet || imageSet.length === 0) return;
        
        const maxConcurrency = navigator.hardwareConcurrency ? 
            Math.min(4, Math.max(2, Math.floor(navigator.hardwareConcurrency / 2))) : 3;
        
        const chunkSize = Math.min(maxConcurrency, imageSet.length);
        const chunks = [];
        
        for (let i = 0; i < imageSet.length; i += chunkSize) {
            chunks.push(imageSet.slice(i, i + chunkSize));
        }
        
        for (const chunk of chunks) {
            const promises = chunk.map(imageInfo => 
                this.preloadImage(imageInfo.path).catch(error => {
                    return null;
                })
            );
            
            await Promise.all(promises);
            
            if (chunks.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }

    async loadImageWithCache(imagePath) {
        if (this.imageCache.has(imagePath)) {
            return this.imageCache.get(imagePath);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.loading = 'eager';
            img.fetchPriority = 'high';
            img.crossOrigin = 'anonymous';
            
            let timedOut = false;
            let resolved = false;
            
            const timer = setTimeout(() => {
                if (!resolved) {
                    timedOut = true;
                    resolved = true;
                    reject(new Error('Image load timeout'));
                }
            }, this.appConfig.loadingTimeout || 10000);
            
            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                }
            };
            
            img.onload = () => {
                if (!timedOut && !resolved) {
                    cleanup();
                    this.imageCache.set(imagePath, img);
                    this.clearOldCache();
                    resolve(img);
                }
            };
            
            img.onerror = () => {
                if (!timedOut && !resolved) {
                    cleanup();
                    reject(new Error(`Failed to load image: ${imagePath}`));
                }
            };
            
            try {
                img.src = this.addCacheBuster(imagePath);
            } catch (srcError) {
                if (!timedOut && !resolved) {
                    cleanup();
                    reject(new Error(`Failed to set image source: ${imagePath}`));
                }
            }
        });
    }

    setupLoadingSteps(steps) {
        this.loadingSteps = steps;
        this.currentLoadingStep = 0;
        this.currentLoadProgress = 0;
        this.loadingStartTime = Date.now();
        this.updateLoadingPopupProgress(0);
    }

    updateLoadingStep(stepIndex) {
        if (stepIndex < this.loadingSteps.length) {
            this.currentLoadingStep = stepIndex;
            const step = this.loadingSteps[stepIndex];
            const progressText = document.getElementById('loading-text');
            const progressPercentage = document.getElementById('loading-percentage');
            
            if (progressText) {
                progressText.textContent = step.name;
            }
            
            const stepProgress = (stepIndex / this.loadingSteps.length) * 85; 
            this.updateLoadingPopupProgress(stepProgress);
            
            if (progressPercentage) {
                progressPercentage.textContent = `${Math.round(stepProgress)}%`;
            }
        }
    }

    updateLoadingProgressWithinStep(stepProgress) {
        if (this.loadingSteps.length === 0) return;
        
        const stepWeight = this.loadingSteps[this.currentLoadingStep].weight;
        const totalWeight = this.loadingSteps.reduce((sum, step) => sum + step.weight, 0);
        const previousStepsWeight = this.loadingSteps
            .slice(0, this.currentLoadingStep)
            .reduce((sum, step) => sum + step.weight, 0);
        
        const stepContribution = (stepWeight * stepProgress / 100);
        const totalProgress = ((previousStepsWeight + stepContribution) / totalWeight) * 85; 
        
        this.updateLoadingPopupProgress(totalProgress);
    }

    showImageLoadingWithProgress(message = 'Loading...') {
        this.showLoadingPopup(message);
    }

    updateLoadingProgress(progress) {
        this.updateLoadingPopupProgress(progress);
    }

    hideImageLoading() {
        this.hideLoadingPopup();
    }

    async loadImageWithRetry(imagePath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.loadImageWithCache(imagePath);
            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error('Failed to load image after multiple attempts');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    addCacheBuster(imagePath) {
        try {
            const separator = imagePath.includes('?') ? '&' : '?';
            const timestamp = Math.floor(Date.now() / 60000); 
            return `${imagePath}${separator}v=${timestamp}`;
        } catch (error) {
            return imagePath;
        }
    }

    async loadImageByIndex(index) {
        let targetImageSet = this.isViewingAdditionalFile ? this.otherFiles : this.currentImageSet;
        if (index < 0 || index >= targetImageSet.length) {
            return;
        }
        this.currentImageIndex = index;
        const imageInfo = targetImageSet[index];
        const image = document.getElementById('curriculum-image');
        if (!image) {
            return;
        }
        try {
            image.src = '';
            image.classList.remove('fade-in');
            this.updateLoadingPopupProgress(0);
            await this.loadImageWithRetry(imageInfo.path);
            this.updateLoadingPopupProgress(50);
            image.src = this.addCacheBuster(imageInfo.path);
            image.onload = () => {
                this.updateLoadingPopupProgress(100);
                image.classList.add('fade-in');
            };
            if (this.isViewingAdditionalFile) {
                this.updateViewerHeaderInfo(imageInfo.name, 'Additional Resource');
            } else {
                this.updateViewerHeaderInfo(imageInfo.name, `${this.getStreamDisplayName()} - ${this.selections.batch}`);
            }
            this.resetImageTransform();
            if (!this.isViewingAdditionalFile) {
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => this.preloadAdjacentImages(index));
                } else {
                    setTimeout(() => this.preloadAdjacentImages(index), 100);
                }
            }
            this.lastViewedImagePath = imageInfo.path;
            this.saveState();
            this.updateNavigationControls();
        } catch (error) {
            this.updateLoadingPopupProgress(0);
            this.showGlobalError('Error loading image: ' + (error && error.message ? error.message : 'Unknown error'));
            this.showSection('semester-section');
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
        
        if (currentIndex + 2 < this.currentImageSet.length) {
            imagesToPreload.push(this.currentImageSet[currentIndex + 2]);
        }
        
        if (imagesToPreload.length > 0) {
            if (window.requestIdleCallback) {
                requestIdleCallback(() => {
                    this.preloadImageSet(imagesToPreload);
                }, { timeout: 2000 });
            } else {
                setTimeout(() => {
                    this.preloadImageSet(imagesToPreload);
                }, 500);
            }
        }
    }

    async loadOtherFile(fileInfo) {
        try {
            const fileIndex = this.otherFiles.findIndex(file => file.path === fileInfo.path);
            
            this.previousCurriculumIndex = this.currentImageIndex;
            this.previousCurriculumImageSet = [...this.currentImageSet];
            
            this.currentImageSet = this.otherFiles;
            this.currentImageIndex = fileIndex >= 0 ? fileIndex : 0;
            
            const image = document.getElementById('curriculum-image');
            if (!image) {
                this.hideLoadingPopup();
                return;
            }
            
            try {
                this.setupLoadingSteps([
                    { name: `Loading ${fileInfo.name}...`, weight: 100 }
                ]);
                this.updateLoadingStep(0);
                
                image.src = '';
                
                await this.loadImageWithRetry(fileInfo.path);
                
                image.src = this.addCacheBuster(fileInfo.path);
                
                this.updateViewerHeaderInfo(fileInfo.name, 'Additional Resource');
                
                this.isViewingAdditionalFile = true;
                this.updateNavigationControls();
                
                this.resetImageTransform();
                
                this.lastViewedImagePath = fileInfo.path;
                this.saveState();
                
                this.updateLoadingPopupProgress(100);
                
                this.hideLoadingPopup();
            } catch (error) {
                if (image) image.src = '';
                this.showLoadingPopup('Failed to load file');
                setTimeout(() => {
                    this.hideLoadingPopup();
                }, 1000);
            }
        } catch (error) {
            this.hideLoadingPopup();
        }
    }

    updateNavigationControls() {
        try {
            const prevBtn = document.getElementById('prev-image');
            const nextBtn = document.getElementById('next-image');
            const imageCounter = document.getElementById('image-counter');
            const othersBtn = document.getElementById('others-btn');
            const backToCurriculumBtn = document.getElementById('back-to-curriculum');
            const navigationGroup = document.querySelector('.navigation-group');
            
            if (this.isViewingAdditionalFile) {
                const totalFiles = this.otherFiles.length;
                const currentFileIndex = this.currentImageIndex;
                
                if (prevBtn) {
                    prevBtn.disabled = currentFileIndex <= 0;
                    prevBtn.style.display = totalFiles > 1 ? 'flex' : 'none';
                }
                
                if (nextBtn) {
                    nextBtn.disabled = currentFileIndex >= totalFiles - 1;
                    nextBtn.style.display = totalFiles > 1 ? 'flex' : 'none';
                }
                
                if (imageCounter) {
                    if (totalFiles > 1) {
                        imageCounter.textContent = `${currentFileIndex + 1} / ${totalFiles}`;
                        imageCounter.style.display = 'block';
                    } else {
                        imageCounter.style.display = 'none';
                    }
                }
                
                if (othersBtn) {
                    othersBtn.style.display = 'flex';
                }
                
                if (backToCurriculumBtn) {
                    backToCurriculumBtn.classList.add('show');
                }
                
                if (navigationGroup) {
                    navigationGroup.style.display = totalFiles > 1 ? 'flex' : 'none';
                }
            } else {
                const totalImages = this.currentImageSet.length;
                const currentImageIndex = this.currentImageIndex;
                
                if (prevBtn) {
                    prevBtn.disabled = currentImageIndex <= 0;
                    prevBtn.style.display = totalImages > 1 ? 'flex' : 'none';
                }
                
                if (nextBtn) {
                    nextBtn.disabled = currentImageIndex >= totalImages - 1;
                    nextBtn.style.display = totalImages > 1 ? 'flex' : 'none';
                }
                
                if (othersBtn) {
                    othersBtn.style.display = 'flex';
                }
                
                if (backToCurriculumBtn) {
                    backToCurriculumBtn.classList.remove('show');
                }
                
                if (imageCounter) {
                    if (totalImages > 1) {
                        imageCounter.textContent = `${currentImageIndex + 1} / ${totalImages}`;
                        imageCounter.style.display = 'block';
                    } else {
                        imageCounter.style.display = 'none';
                    }
                }
                
                if (navigationGroup) {
                    navigationGroup.style.display = totalImages > 1 ? 'flex' : 'none';
                }
            }
        } catch (error) {
        }
    }

    previousImage() {
        if (this.isViewingAdditionalFile) {
            if (this.currentImageIndex > 0) {
                this.setupLoadingSteps([
                    { name: 'Loading previous file...', weight: 100 }
                ]);
                this.updateLoadingStep(0);
                this.loadImageByIndex(this.currentImageIndex - 1);
            }
        } else {
            if (this.currentImageIndex > 0) {
                this.setupLoadingSteps([
                    { name: 'Loading previous image...', weight: 100 }
                ]);
                this.updateLoadingStep(0);
                this.loadImageByIndex(this.currentImageIndex - 1);
            }
        }
    }

    nextImage() {
        if (this.isViewingAdditionalFile) {
            if (this.currentImageIndex < this.otherFiles.length - 1) {
                this.setupLoadingSteps([
                    { name: 'Loading next file...', weight: 100 }
                ]);
                this.updateLoadingStep(0);
                this.loadImageByIndex(this.currentImageIndex + 1);
            }
        } else {
            if (this.currentImageIndex < this.currentImageSet.length - 1) {
                this.setupLoadingSteps([
                    { name: 'Loading next image...', weight: 100 }
                ]);
                this.updateLoadingStep(0);
                this.loadImageByIndex(this.currentImageIndex + 1);
            }
        }
    }

    showOthersModal() {
        try {
            const modal = document.getElementById('others-modal');
            const modalContent = document.getElementById('others-list');
            
            if (!modal || !modalContent) {
                return;
            }
            
            modalContent.innerHTML = '';
            
            if (this.otherFiles.length === 0) {
                modalContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1; padding: 2rem;">No additional files found.</p>';
            } else {
                this.otherFiles.forEach((file) => {
                    try {
                        const fileItem = document.createElement('div');
                        fileItem.className = 'other-file-item';
                        fileItem.innerHTML = `
                            <img src="${file.path}" alt="Additional Resource ${file.name}" class="other-file-preview" loading="lazy">
                            <div class="other-file-name">${file.name}</div>
                        `;
                        fileItem.addEventListener('click', () => {
                            this.loadOtherFile(file);
                            this.closeOthersModal();
                        });
                        modalContent.appendChild(fileItem);
                    } catch (error) {
                    }
                });
            }
            
            modal.classList.add('active');
        } catch (error) {
        }
    }

    closeOthersModal() {
        try {
            const modal = document.getElementById('others-modal');
            if (modal) modal.classList.remove('active');
        } catch (error) {
        }
    }

    backToCurriculum() {
        try {
            if (this.isViewingAdditionalFile) {
                this.isViewingAdditionalFile = false;
                this.currentImageSet = this.previousCurriculumImageSet;
                this.currentImageIndex = this.previousCurriculumIndex;
                
                if (this.currentImageSet.length > 0 && this.currentImageIndex < this.currentImageSet.length) {
                    this.loadImageByIndex(this.currentImageIndex);
                } else {
                    this.showSection('semester-section');
                }
            }
        } catch (error) {
            this.showSection('semester-section');
        }
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
        try {
            const image = document.getElementById('curriculum-image');
            if (image) {
                image.style.transform = `scale(${this.imageScale}) translate(${this.imagePosition.x}px, ${this.imagePosition.y}px)`;
            }
        } catch (error) {}
    }

    startImageDrag(e) {
        try {
            if (e.button === 0 || e.button === 2) {
                this.isDragging = true;
                this.lastMousePosition = { x: e.clientX, y: e.clientY };
                const imageViewer = document.getElementById('image-viewer');
                if (imageViewer) imageViewer.classList.add('dragging');
            }
        } catch (error) {}
    }

    dragImage(e) {
        if (!this.isDragging) return;
        try {
            const deltaX = e.clientX - this.lastMousePosition.x;
            const deltaY = e.clientY - this.lastMousePosition.y;
            this.imagePosition.x += deltaX / this.imageScale;
            this.imagePosition.y += deltaY / this.imageScale;
            this.updateImageTransform();
            this.lastMousePosition = { x: e.clientX, y: e.clientY };
        } catch (error) {}
    }

    endImageDrag() {
        try {
            this.isDragging = false;
            const imageViewer = document.getElementById('image-viewer');
            if (imageViewer) imageViewer.classList.remove('dragging');
        } catch (error) {}
    }

    handlePointerStart(e) {
        if (e.pointerType === 'touch') {
            if (e.isPrimary) {
                this.isDragging = true;
                this.lastMousePosition = { x: e.clientX, y: e.clientY };
                const imageViewer = document.getElementById('image-viewer');
                if (imageViewer) imageViewer.classList.add('dragging');
            }
            if (e.pointerType === 'touch' && e.width > 0 && e.height > 0 && e.pressure > 0) {
                this.isPinching = true;
                this.lastPinchDistance = null;
                this.lastPinchCenter = null;
            }
        } else if (e.pointerType === 'mouse') {
            this.isDragging = true;
            this.lastMousePosition = { x: e.clientX, y: e.clientY };
            const imageViewer = document.getElementById('image-viewer');
            if (imageViewer) imageViewer.classList.add('dragging');
        }
    }

    handlePointerMove(e) {
        if (e.pointerType === 'touch' && this.isDragging) {
            this.dragImage({ clientX: e.clientX, clientY: e.clientY });
        } else if (e.pointerType === 'mouse' && this.isDragging) {
            this.dragImage({ clientX: e.clientX, clientY: e.clientY });
        }
    }

    handlePointerEnd(e) {
                this.isDragging = false;
                this.isPinching = false;
                const imageViewer = document.getElementById('image-viewer');
                if (imageViewer) imageViewer.classList.remove('dragging');
    }

    toggleFullscreen() {
        try {
            const image = document.getElementById('curriculum-image');
            if (image) {
                const imageSrc = image.src;
                if (imageSrc && imageSrc !== '') {
                    window.open(imageSrc, '_blank');
                }
            }
        } catch (error) {}
    }

    closePopup() {
        try {
            const popup = document.getElementById('popup');
            if (popup) popup.classList.remove('active');
            localStorage.setItem('iterCurriculumWelcomeDismissed', '1');
            this.updateUI();
        } catch (error) {}
    }

    showPopup() {
        try {
            const popup = document.getElementById('popup');
            if (popup) popup.classList.add('active');
        } catch (error) {}
    }

    detectPageReload() {
        if (performance && performance.navigation) {
            return performance.navigation.type === 1; 
        }
        
        const hasCachedData = localStorage.getItem('iterCurriculumState') !== null;
        
        const sessionKey = 'iter_curriculum_session';
        const currentSession = sessionStorage.getItem(sessionKey);
        const newSession = Date.now().toString();
        
        if (currentSession) {
            sessionStorage.setItem(sessionKey, newSession);
            return true;
        } else {
            sessionStorage.setItem(sessionKey, newSession);
            return false;
        }
    }

    showLoadingPopup(message = 'Loading...') {
        try {
            this.isLoadingPopupActive = true;
            const loadingElement = document.getElementById('image-loading');
            const progressText = document.getElementById('loading-text');
            const progressBar = document.getElementById('loading-progress');
            
            if (loadingElement) {
                try {
                    loadingElement.classList.add('active');
                    loadingElement.style.display = 'block';
                    loadingElement.style.visibility = 'visible';
                    loadingElement.style.opacity = '1';
                    loadingElement.style.zIndex = '9999';
                    loadingElement.style.position = 'fixed';
                    loadingElement.style.top = '50%';
                    loadingElement.style.left = '50%';
                    loadingElement.style.transform = 'translate(-50%, -50%)';
                } catch (styleError) {
                    console.warn('Failed to set loading element styles:', styleError);
                }
            }
            
            if (progressText) {
                try {
                    progressText.textContent = message;
                } catch (textError) {
                    console.warn('Failed to set loading text:', textError);
                }
            }
            
            if (progressBar) {
                try {
                    progressBar.style.transition = 'width 0.3s ease-out';
                    progressBar.style.width = '0%';
                    
                    progressBar.offsetHeight;
                } catch (progressError) {
                    console.warn('Failed to reset progress bar:', progressError);
                }
            }
        } catch (error) {
            console.error('Failed to show loading popup:', error);
        }
    }

    updateLoadingPopupProgress(progress) {
        const progressBar = document.getElementById('loading-progress');
        const progressPercentage = document.getElementById('loading-percentage');
        
        if (progressBar) {
            progressBar.style.transition = 'width 0.15s cubic-bezier(0.4,0,0.2,1)';
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(Math.min(progress, 100))}%`;
        }
        
        const progressText = document.getElementById('loading-text');
        if (progressText && this.loadingSteps.length > 0 && this.currentLoadingStep < this.loadingSteps.length) {
            const currentStep = this.loadingSteps[this.currentLoadingStep];
            const currentText = currentStep ? currentStep.name : 'Loading...';
            if (progressText.textContent !== currentText) {
                progressText.textContent = currentText;
            }
        }
    }

    hideLoadingPopup() {
        try {
            this.isLoadingPopupActive = false;
            const loadingElement = document.getElementById('image-loading');
            const progressBar = document.getElementById('loading-progress');
            const progressText = document.getElementById('loading-text');
            
            if (loadingElement) {
                loadingElement.classList.remove('active');
            }
            if (progressBar) {
                try {
                    progressBar.style.transition = 'width 0.2s ease-out';
                    progressBar.style.width = '100%';
                } catch (progressError) {
                }
            }
            
            setTimeout(() => {
                try {
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                        loadingElement.style.visibility = 'hidden';
                        loadingElement.style.opacity = '0';
                    }
                    if (progressBar) {
                        progressBar.style.width = '0%';
                        progressBar.style.transition = 'none';
                    }
                    if (progressText) {
                        progressText.textContent = 'Loading...';
                    }
                } catch (hideError) {
                }
            }, 200);
        } catch (error) {
        }
    }

    getStreamDisplayName() {
        const streamDisplayNames = {
            'CE': 'Civil Engineering (CE)',
            'ME': 'Mechanical Engineering (ME)',
            'EE': 'Electrical Engineering (EE)',
            'EEE': 'Electrical & Electronics Engineering (EEE)',
            'ECE': 'Electronics & Communication Engineering (ECE)',
            'CSE': 'Computer Science & Engineering (CSE)',
            'CS-IT': 'Computer Science and Information Technology (CS-IT)',
            'CSE-AIML': 'CSE - Artificial Intelligence and Machine Learning (CSE-AIML)',
            'CSE-CS': 'CSE - Cyber Security (CSE-CS)',
            'CSE-DS': 'CSE - Data Science (CSE-DS)',
            'CSE-IOT': 'CSE - Internet of Things (CSE-IOT)'
        };
        
        return streamDisplayNames[this.selections.stream] || this.selections.stream;
    }

    async checkFolderExists(folderPath) {
        try {
            
            const { batch, stream } = this.selections;
            if (!batch || !stream) return false;
            
            const streamFolder = stream.toLowerCase();
            
            const testPatterns = [
                `${streamFolder}-sem1.webp`,
                `${streamFolder}-sem2.webp`,
                `${streamFolder}-sem3.webp`,
                `${streamFolder}-sem4.webp`,
                `${streamFolder}-sem5.webp`,
                `${streamFolder}-sem6.webp`,
                `${streamFolder}-sem7.webp`,
                `${streamFolder}-sem8.webp`
            ];
            
            for (const pattern of testPatterns) {
                const testImagePath = `${folderPath}/${pattern}`;
                if (await this.imageExists(testImagePath)) {
                    return true;
                }
            }
            
           
            const fallbackTestPath = `${folderPath}/.`;
            try {
                const response = await fetch(fallbackTestPath, { method: 'HEAD' });
                return response.status !== 404;
            } catch {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async checkYearFolderExists(year) {
        const yearPath = `images/${year}`;
        return await this.checkFolderExists(yearPath);
    }

    async checkStreamFolderExists(year, stream) {
        const streamPath = `images/${year}/${stream}`;
        return await this.checkFolderExists(streamPath);
    }

    showMissingFolderPopup(message = null) {
        try {
            if (!this.missingFolderConfig.enabled || !this.missingFolderConfig.showPopup) {
                return;
            }

            const popupMessage = message || this.missingFolderConfig.popupMessage;
            
            let missingFolderPopup = document.getElementById('missing-folder-popup');
            if (!missingFolderPopup) {
                missingFolderPopup = document.createElement('div');
                missingFolderPopup.id = 'missing-folder-popup';
                missingFolderPopup.className = 'missing-folder-popup';
                missingFolderPopup.innerHTML = `
                    <div class="missing-folder-content">
                        <div class="missing-folder-icon">📚</div>
                        <h3>Coming Soon!</h3>
                        <p id="missing-folder-message">${popupMessage}</p>
                        <button class="missing-folder-close" onclick="this.parentElement.parentElement.classList.remove('active')">
                            Got it!
                        </button>
                    </div>
                `;
                document.body.appendChild(missingFolderPopup);
            }

            const messageElement = document.getElementById('missing-folder-message');
            if (messageElement) {
                messageElement.textContent = popupMessage;
            }

            missingFolderPopup.classList.add('active');

        } catch (error) {
            console.error('Failed to show missing folder popup:', error);
        }
    }

    showGlobalError(message) {
        try {
            let errorPopup = document.getElementById('global-error-popup');
            if (!errorPopup) {
                errorPopup = document.createElement('div');
                errorPopup.id = 'global-error-popup';
                errorPopup.className = 'popup';
                errorPopup.setAttribute('role', 'alertdialog');
                errorPopup.setAttribute('aria-modal', 'true');
                errorPopup.innerHTML = `
                    <div class="popup-content">
                        <div class="popup-icon">⚠️</div>
                        <h3>Error</h3>
                        <p id="global-error-message"></p>
                        <button class="popup-close" id="global-error-close">Close</button>
                    </div>
                `;
                document.body.appendChild(errorPopup);
                const closeBtn = document.getElementById('global-error-close');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        errorPopup.classList.remove('active');
                    };
                }
            }
            const messageElement = document.getElementById('global-error-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            errorPopup.classList.add('active');
            setTimeout(() => errorPopup.classList.remove('active'), 5000);
        } catch (error) {
            console.error('Failed to show global error:', error);
        }
    }

    trapFocus(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            modal.addEventListener('keydown', (e) => {
                try {
                    if (e.key === 'Tab') {
                        if (e.shiftKey) {
                            if (document.activeElement === first) {
                                e.preventDefault();
                                last.focus();
                            }
                        } else {
                            if (document.activeElement === last) {
                                e.preventDefault();
                                first.focus();
                            }
                        }
                    }
                } catch (keyError) {
                    console.warn('Failed to handle keydown in trap focus:', keyError);
                }
            });
            setTimeout(() => first.focus(), 100);
        } catch (error) {
            console.warn('Failed to trap focus:', error);
        }
    }

    isValidSelection(batch, stream, semester) {
        if (!this.missingFolderConfig.supportedYears.includes(batch)) return false;
        if (!stream || !this.missingFolderConfig.supportedStreams.includes((stream + '').toLowerCase())) return false;
        if (!semester || isNaN(Number(semester)) || Number(semester) < 1 || Number(semester) > 8) return false;
        return true;
    }

    isOffline() {
        return typeof navigator !== 'undefined' && !navigator.onLine;
    }

    async handleOthersChange(value) {
        try {
            if (!value) return;

            const selectedFile = this.otherFiles.find(file => file.value === value);
            if (selectedFile) {
                this.loadOtherFile(selectedFile);
            }
        } catch (error) {
            console.error('Failed to handle others change:', error);
        }
    }

    showSection(sectionId) {
        try {
            const sections = document.querySelectorAll('.section');
            if (!sections || sections.length === 0) {
                return;
            }
            
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            document.body.classList.remove('viewer-mode');

            setTimeout(() => {
                try {
                    const targetSection = document.getElementById(sectionId);
                    if (!targetSection) {
                        return;
                    }
                    targetSection.classList.add('active');
                    this.currentSection = sectionId;
                    
                    const mainTitle = document.getElementById('main-title');
                    const viewerHeaderInfo = document.getElementById('viewer-header-info');
                    const headerOptions = document.getElementById('header-options');
                    const oneTimeIndicator = document.getElementById('one-time-process-indicator');
                    const viewerControls = document.getElementById('viewer-controls');
                    
                    if (sectionId === 'viewer-section') {
                        document.body.classList.add('viewer-mode');
                        if (mainTitle) mainTitle.style.display = 'none';
                        if (viewerHeaderInfo) viewerHeaderInfo.style.display = 'flex';
                        if (headerOptions) headerOptions.style.display = 'flex';
                        if (viewerControls) viewerControls.style.display = 'flex';
                        if (oneTimeIndicator) oneTimeIndicator.classList.add('hidden');
                        
                        setTimeout(() => {
                            this.ensureToolbarVisibility();
                        }, 100);
                        
                        setTimeout(() => {
                            this.bindImageEvents();
                        }, 150);
                        
                        if (this.currentImageSet.length > 0 && this.currentImageIndex < this.currentImageSet.length) {
                            const imageInfo = this.currentImageSet[this.currentImageIndex];
                            this.updateViewerHeaderInfo(imageInfo.name, `${this.getStreamDisplayName()} - ${this.selections.batch}`);
                        }
                        this.setupCacheChecking();
                    } else {
                        if (mainTitle) {
                            mainTitle.style.display = '';
                            mainTitle.textContent = 'ITER Curriculum';
                        }
                        if (viewerHeaderInfo) viewerHeaderInfo.style.display = 'none';
                        if (headerOptions) headerOptions.style.display = 'none';
                        if (viewerControls) viewerControls.style.display = 'none';
                        
                        if (oneTimeIndicator) {
                            if (sectionId === 'batch-section' || sectionId === 'stream-section' || sectionId === 'semester-section') {
                                oneTimeIndicator.classList.remove('hidden');
                            } else {
                                oneTimeIndicator.classList.add('hidden');
                            }
                        }
                        if (this.cacheCheckInterval) {
                            clearInterval(this.cacheCheckInterval);
                            this.cacheCheckInterval = null;
                        }
                    }
                } catch (error) {
                }
            }, 150);
        } catch (error) {
        }
    }

    ensureToolbarVisibility() {
        try {
            const toolbar = document.getElementById('viewer-controls');
            if (!toolbar) {
                return;
            }

            const isMobile = window.innerWidth <= 768;
            
            toolbar.style.display = 'flex';
            toolbar.style.visibility = 'visible';
            toolbar.style.opacity = '1';
            toolbar.style.pointerEvents = 'auto';
            toolbar.style.zIndex = '1001';
            
            const controlGroups = toolbar.querySelectorAll('.control-group');
            controlGroups.forEach(group => {
                group.style.display = 'flex';
                group.style.visibility = 'visible';
                group.style.opacity = '1';
            });
            
            const buttons = toolbar.querySelectorAll('.control-btn');
            buttons.forEach(button => {
                button.style.display = 'flex';
                button.style.visibility = 'visible';
                button.style.opacity = '1';
                button.style.pointerEvents = 'auto';
                
                if (isMobile) {
                    button.style.width = '40px';
                    button.style.height = '40px';
                    button.style.minWidth = '40px';
                    button.style.minHeight = '40px';
                }
            });
            
            setTimeout(() => {
                try {
                    if (toolbar.style.display !== 'flex' || toolbar.style.visibility !== 'visible') {
                        this.ensureToolbarVisibility();
                    }
                } catch (error) {
                }
            }, 100);
        } catch (error) {
        }
    }

    async loadCurriculumImages() {
        this.isAborted = false;
        if (this.loadingSteps.length === 0) {
            this.setupLoadingSteps([
                { name: 'Discovering curriculum images...', weight: 25 },
                { name: 'Loading additional files...', weight: 25 },
                { name: 'Preloading images...', weight: 25 },
                { name: 'Loading current image...', weight: 25 }
            ]);
        }
        
        try {
            const { stream, semester } = this.selections;
            
            this.updateLoadingStep(0);
            this.currentImageSet = await this.discoverSemesterImages(semester);
            this.currentImageIndex = 0;
            
            if (this.isAborted) return;
            
            if (this.currentImageSet.length === 0) {
                this.hideLoadingPopup();
                this.selections.semester = '';
                this.isViewingAdditionalFile = false;
                this.updateMainDropdowns();
                this.showSection('semester-section');
                return;
            }
            
            this.updateLoadingStep(1);
            const othersLoadPromise = this.loadOthersFiles();
            
            this.updateLoadingStep(2);
            const preloadPromise = this.preloadImageSet(this.currentImageSet);
            
            this.updateLoadingStep(3);
            
            try {
                await othersLoadPromise;
                
                if (this.isAborted) return;
                
                let targetIndex = 0;
                
                if (this.isViewingAdditionalFile && this.lastViewedImagePath) {
                    const fileIndex = this.otherFiles.findIndex(file => file.path === this.lastViewedImagePath);
                    if (fileIndex >= 0) {
                        this.currentImageSet = this.otherFiles;
                        this.currentImageIndex = fileIndex;
                        targetIndex = fileIndex;
                    } else {
                        this.isViewingAdditionalFile = false;
                        this.currentImageSet = await this.discoverSemesterImages(semester);
                        targetIndex = this.previousCurriculumIndex < this.currentImageSet.length ? 
                            this.previousCurriculumIndex : 0;
                    }
                } else if (this.lastViewedImagePath) {
                    const imageIndex = this.currentImageSet.findIndex(img => img.path === this.lastViewedImagePath);
                    if (imageIndex !== -1) {
                        targetIndex = imageIndex;
                    } else if (this.currentImageIndex < this.currentImageSet.length) {
                        targetIndex = this.currentImageIndex;
                    }
                } else if (this.currentImageIndex < this.currentImageSet.length) {
                    targetIndex = this.currentImageIndex;
                }
                
                if (!this.isAborted) {
                    await this.loadImageByIndex(targetIndex);
                }
                
                await preloadPromise;
                
                if (!this.isAborted) {
                    this.showSection('viewer-section');
                    this.updateNavigationControls();
                }
                
            } catch (error) {
                this.hideLoadingPopup();
                this.showGlobalError('Error loading image: ' + (error && error.message ? error.message : 'Unknown error'));
                this.showSection('semester-section');
                return;
            }
            
            this.isFirstLoad = false;
            
        } catch (error) {
            this.hideLoadingPopup();
            this.showGlobalError('Error loading curriculum: ' + (error && error.message ? error.message : 'Unknown error'));
            this.loadingSteps = [];
            this.currentLoadingStep = 0;
            this.showSection('semester-section');
            return;
        }
        
        this.hideLoadingPopup();
    }

    async showViewerForCurrentSelection() {
        const batchSelect = document.getElementById('batch-select');
        const streamSelect = document.getElementById('stream-select');
        const semesterSelect = document.getElementById('semester-select');
        
        const batch = batchSelect ? batchSelect.value : this.selections.batch;
        const stream = streamSelect ? streamSelect.value : this.selections.stream;
        const semester = semesterSelect ? semesterSelect.value : this.selections.semester;
        
        if (!batch || !stream || !semester) {
            return;
        }
        
        const loadingTimeout = setTimeout(() => {
            this.hideLoadingPopup();
            this.showGlobalError('Loading timeout. Please try again.');
            this.showSection('semester-section');
        }, this.appConfig.loadingTimeout || 30000);
        
        try {
            this.showLoadingPopup('Loading curriculum...');
            this.setupLoadingSteps([
                { name: 'Discovering curriculum images...', weight: 25 },
                { name: 'Loading additional files...', weight: 25 },
                { name: 'Preloading images...', weight: 25 },
                { name: 'Loading current image...', weight: 25 }
            ]);
            
            this.updateLoadingStep(0);
            this.selections.batch = batch;
            this.selections.stream = stream;
            this.selections.semester = semester;
            
            const images = await this.discoverSemesterImages(semester);
            this.currentImageSet = images;
            this.currentImageIndex = 0;
            
            if (this.currentImageSet.length === 0) {
                this.selections.semester = '';
                this.updateMainDropdowns();
                this.showSection('semester-section');
                return;
            }
            
            this.updateLoadingStep(1);
            const othersLoadPromise = this.loadOthersFiles();
            
            this.updateLoadingStep(2);
            const preloadPromise = this.preloadImageSet(this.currentImageSet);
            
            this.updateLoadingStep(3);
            await othersLoadPromise;
            await this.loadImageByIndex(0);
            await preloadPromise;
            
            this.updateNavigationControls();
            this.showSection('viewer-section');
            
        } catch (error) {
            console.error('Error in showViewerForCurrentSelection:', error);
            this.hideLoadingPopup();
            this.showGlobalError('Error loading curriculum: ' + (error && error.message ? error.message : 'Unknown error'));
            this.showSection('semester-section');
        } finally {
            clearTimeout(loadingTimeout);
            this.hideLoadingPopup();
        }
    }

    resetToInitialSelection() {
        this.selections = { batch: '', stream: '', semester: '' };
        this.currentImageIndex = 0;
        this.currentImageSet = [];
        this.otherFiles = [];
        this.isViewingAdditionalFile = false;
        this.previousCurriculumIndex = 0;
        this.previousCurriculumImageSet = [];
        this.saveState();
        this.updateMainDropdowns();
        this.showSection('batch-section');
        this.updateUI();
        if (this.cacheCheckInterval) {
            clearInterval(this.cacheCheckInterval);
            this.cacheCheckInterval = null;
        }
    }

    resetFromBatch() {
        this.selections.stream = '';
        this.selections.semester = '';
        try {
            const streamSelect = document.getElementById('stream-select');
            const semesterSelect = document.getElementById('semester-select');
            if (streamSelect) streamSelect.value = '';
            if (semesterSelect) semesterSelect.value = '';
            this.saveState();
        } catch (error) {}
    }

    updateMainDropdowns() {
        try {
            const batchSelect = document.getElementById('batch-select');
            const streamSelect = document.getElementById('stream-select');
            const semesterSelect = document.getElementById('semester-select');
            if (batchSelect) batchSelect.value = this.selections.batch || '';
            if (streamSelect) streamSelect.value = this.selections.stream || '';
            if (semesterSelect) semesterSelect.value = this.selections.semester || '';
        } catch (error) {}
    }

    updateUI() {
        if (!localStorage.getItem('iterCurriculumWelcomeDismissed')) {
            this.showPopup();
        }
        if (this.currentSection === 'viewer-section') {
            this.loadOthersFiles();
            setTimeout(() => {
                this.checkForNewImages();
            }, 10000);
        }
        const errorPopup = document.getElementById('global-error-popup');
        if (errorPopup) errorPopup.classList.remove('active');
    }

    saveState() {
        try {
            const state = {
                batch: this.selections.batch,
                stream: this.selections.stream,
                semester: this.selections.semester,
                currentImageIndex: this.currentImageIndex,
                lastViewedImagePath: this.lastViewedImagePath,
                isViewingAdditionalFile: this.isViewingAdditionalFile,
                imageScale: this.imageScale,
                imagePosition: this.imagePosition
            };
            localStorage.setItem('iterCurriculumState', JSON.stringify(state));
        } catch (error) {
        }
    }

    updateViewerHeaderInfo(imageName, subtitle) {
        try {
            const viewerHeaderInfo = document.getElementById('viewer-header-info');
            if (viewerHeaderInfo) {
                const titleElement = viewerHeaderInfo.querySelector('.viewer-title');
                const subtitleElement = viewerHeaderInfo.querySelector('.viewer-subtitle');
                
                if (titleElement) {
                    titleElement.textContent = imageName || 'Curriculum Image';
                }
                if (subtitleElement) {
                    subtitleElement.textContent = subtitle || '';
                }
            }
        } catch (error) {
        }
    }

    clearOldCache() {
        try {
            const maxSize = this.appConfig.maxCacheSize || 50;
            if (this.imageCache.size > maxSize) {
                const entries = Array.from(this.imageCache.entries());
                const toDelete = entries.slice(0, entries.length - maxSize);
                toDelete.forEach(([key, img]) => {
                    if (img && img.src) {
                        img.src = '';
                    }
                    this.imageCache.delete(key);
                });
                
                if (window.gc) {
                    window.gc();
                }
            }
        } catch (error) {
        }
    }

    loadSavedState() {
        try {
            const savedState = localStorage.getItem('iterCurriculumState');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.selections.batch = state.batch || '';
                this.selections.stream = state.stream || '';
                this.selections.semester = state.semester || '';
                this.currentImageIndex = state.currentImageIndex || 0;
                this.lastViewedImagePath = state.lastViewedImagePath || '';
                this.isViewingAdditionalFile = state.isViewingAdditionalFile || false;
                this.imageScale = state.imageScale || 1;
                this.imagePosition = state.imagePosition || { x: 0, y: 0 };
                
                if (this.selections.batch && this.selections.stream && this.selections.semester) {
                    this.updateMainDropdowns();
                    this.isLoadingFromState = true;
                }
            }
        } catch (error) {
        }
    }

    cleanup() {
        try {
            this.imageCache.forEach((img, key) => {
                if (img && img.src) {
                    img.src = '';
                }
            });
            this.imageCache.clear();
            
            if (this.loadProgressInterval) {
                clearInterval(this.loadProgressInterval);
                this.loadProgressInterval = null;
            }
            
            if (this.cacheCheckInterval) {
                clearInterval(this.cacheCheckInterval);
                this.cacheCheckInterval = null;
            }
            
            this.currentImageSet = [];
            this.otherFiles = [];
            this.isViewingAdditionalFile = false;
            
            this.saveState();
        } catch (error) {
        }
    }

    getCacheVersion() {
        try {
            return localStorage.getItem('iterCurriculumCacheVersion') || '1.0.0';
        } catch (error) {
            return '1.0.0';
        }
    }

    updateCacheVersion() {
        try {
            const newVersion = (Date.now() / 1000).toString();
            localStorage.setItem('iterCurriculumCacheVersion', newVersion);
            this.cacheVersion = newVersion;
        } catch (error) {
            console.warn('Failed to update cache version:', error);
        }
    }

    checkForNewImages() {
        try {
            const now = Date.now();
            if (now - this.lastCacheCheck < 60000) return; 
            this.lastCacheCheck = now;
            
            const { batch, stream, semester } = this.selections;
            if (!batch || !stream || !semester) return;
            
            this.checkNewImagesAsync(batch, stream, semester);
        } catch (error) {
            console.warn('Failed to check for new images:', error);
        }
    }

    async checkNewImagesAsync(batch, stream, semester) {
        try {
            const streamFolder = stream.toLowerCase();
            const testPatterns = [
                `${streamFolder}-sem${semester}.webp`,
                `${streamFolder}-sem${semester}-1.webp`,
                `${streamFolder}-sem${semester}.png`
            ];
            
            let hasNewImages = false;
            for (const pattern of testPatterns) {
                const imagePath = `images/${batch}/${streamFolder}/${pattern}`;
                const cacheBustedPath = this.addCacheBuster(imagePath);
                
                try {
                    const response = await fetch(cacheBustedPath, { method: 'HEAD' });
                    if (response.ok) {
                        const lastModified = response.headers.get('last-modified');
                        if (lastModified) {
                            const lastModifiedTime = new Date(lastModified).getTime();
                            const lastCheckTime = parseInt(localStorage.getItem(`lastCheck_${imagePath}`) || '0');
                            
                            if (lastModifiedTime > lastCheckTime) {
                                hasNewImages = true;
                                break;
                            }
                        }
                    }
                } catch (error) {
                }
            }
            
            if (hasNewImages) {
                this.showCacheUpdatePopup();
            }
        } catch (error) {
        }
    }

    showCacheUpdatePopup() {
        try {
            let updatePopup = document.getElementById('cache-update-popup');
            if (!updatePopup) {
                updatePopup = document.createElement('div');
                updatePopup.id = 'cache-update-popup';
                updatePopup.className = 'popup';
                updatePopup.setAttribute('role', 'alertdialog');
                updatePopup.setAttribute('aria-modal', 'true');
                updatePopup.innerHTML = `
                    <div class="popup-content">
                        <div class="popup-icon">🔄</div>
                        <h3>New Images Available</h3>
                        <p>New curriculum images have been detected. Would you like to refresh to see the latest content?</p>
                        <div class="popup-buttons">
                            <button class="popup-btn primary" id="refresh-cache-btn">Refresh Now</button>
                            <button class="popup-btn secondary" id="dismiss-update-btn">Later</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(updatePopup);
                
                const refreshBtn = document.getElementById('refresh-cache-btn');
                const dismissBtn = document.getElementById('dismiss-update-btn');
                
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => {
                        this.refreshCacheAndReload();
                    });
                }
                
                if (dismissBtn) {
                    dismissBtn.addEventListener('click', () => {
                        updatePopup.classList.remove('active');
                    });
                }
            }
            
            updatePopup.classList.add('active');
        } catch (error) {
            console.error('Failed to show cache update popup:', error);
        }
    }

    refreshCacheAndReload() {
        try {
            this.imageCache.clear();
            this.updateCacheVersion();
            
            if ('caches' in window) {
                caches.keys().then(cacheNames => {
                    cacheNames.forEach(cacheName => {
                        caches.delete(cacheName);
                    });
                });
            }
            
            window.location.reload();
        } catch (error) {
            console.error('Failed to refresh cache:', error);
            window.location.reload();
        }
    }

    async restoreToViewer() {
        try {
            if (!this.selections.batch || !this.selections.stream || !this.selections.semester) {
                return;
            }
            
            // Show minimal loading for faster restoration
            this.showLoadingPopup('Restoring session...');
            
            // Reduced timeout for faster failure detection
            const loadingTimeout = setTimeout(() => {
                this.hideLoadingPopup();
                this.showGlobalError('Restoration timeout. Please try again.');
                this.showSection('semester-section');
            }, 15000);
            
            try {
                // Simplified loading steps for faster restoration
                this.setupLoadingSteps([
                    { name: 'Loading curriculum...', weight: 50 },
                    { name: 'Restoring image...', weight: 50 }
                ]);
                
                this.updateLoadingStep(0);
                
                // Run discovery and others loading in parallel for speed
                const [images, othersResult] = await Promise.all([
                    this.discoverSemesterImages(this.selections.semester),
                    this.loadOthersFiles()
                ]);
                
                this.currentImageSet = images;
                
                if (this.currentImageSet.length === 0) {
                    this.selections.semester = '';
                    this.isViewingAdditionalFile = false;
                    this.updateMainDropdowns();
                    this.hideLoadingPopup();
                    this.showSection('semester-section');
                    return;
                }
                
                this.updateLoadingStep(1);
                
                // Determine which image to load
                let targetIndex = 0;
                
                if (this.isViewingAdditionalFile && this.lastViewedImagePath) {
                    const fileIndex = this.otherFiles.findIndex(file => file.path === this.lastViewedImagePath);
                    if (fileIndex >= 0) {
                        this.currentImageSet = this.otherFiles;
                        this.currentImageIndex = fileIndex;
                        targetIndex = fileIndex;
                    } else {
                        this.isViewingAdditionalFile = false;
                        targetIndex = this.previousCurriculumIndex < this.currentImageSet.length ? 
                            this.previousCurriculumIndex : 0;
                    }
                } else if (this.lastViewedImagePath) {
                    const imageIndex = this.currentImageSet.findIndex(img => img.path === this.lastViewedImagePath);
                    if (imageIndex !== -1) {
                        targetIndex = imageIndex;
                    } else {
                        targetIndex = this.previousCurriculumIndex < this.currentImageSet.length ? 
                            this.previousCurriculumIndex : 0;
                    }
                } else {
                    targetIndex = this.previousCurriculumIndex < this.currentImageSet.length ? 
                        this.previousCurriculumIndex : 0;
                }
                
                // Load the target image
                await this.loadImageByIndex(targetIndex);
                
                this.updateNavigationControls();
                this.showSection('viewer-section');
                
                // Check for new images in background
                setTimeout(() => {
                    this.checkForNewImages();
                }, 3000);
                
            } catch (error) {
                console.error('Error in restoreToViewer:', error);
                this.hideLoadingPopup();
                this.showGlobalError('Error restoring session: ' + (error && error.message ? error.message : 'Unknown error'));
                this.showSection('semester-section');
            } finally {
                clearTimeout(loadingTimeout);
                this.hideLoadingPopup();
            }
        } catch (error) {
            console.error('Failed to restore to viewer:', error);
            this.showSection('semester-section');
        }
    }

    setupCacheChecking() {
        try {
            if (this.cacheCheckInterval) {
                clearInterval(this.cacheCheckInterval);
            }
            this.cacheCheckInterval = setInterval(() => {
                if (this.currentSection === 'viewer-section' && 
                    this.selections.batch && 
                    this.selections.stream && 
                    this.selections.semester) {
                    this.checkForNewImages();
                }
            }, 300000); 
        } catch (error) {
            console.warn('Failed to setup cache checking:', error);
        }
    }
}
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new CurriculumApp();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app) {
        if (!app.isInSelectionProcess && app.selections.batch && app.selections.stream && app.selections.semester) {
            app.updateUI();
            setTimeout(() => {
                app.checkForNewImages();
            }, 2000);
        }
    }
});

window.addEventListener('resize', () => {
    if (app && app.currentSection === 'viewer-section') {
        setTimeout(() => {
            app.ensureToolbarVisibility();
        }, 100);
    }
});

window.addEventListener('beforeunload', () => {
    if (app) {
        app.cleanup();
    }
});

window.addEventListener('pagehide', () => {
    if (app) {
        app.cleanup();
    }
});