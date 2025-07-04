const APP_VERSION = '2.0.0';
const VERSION_KEY = 'iter-curriculum-version';
const FIRST_VISIT_KEY = 'iter-curriculum-first-visit';
const IMAGE_PATHS_CACHE_KEY = 'iter-curriculum-image-paths';

function checkVersionAndClearCache() {
    const savedVersion = localStorage.getItem(VERSION_KEY);
    
    if (savedVersion !== APP_VERSION) {
        console.log(`Version change detected: ${savedVersion} -> ${APP_VERSION}`);
        
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                const deletePromises = cacheNames.map(cacheName => {
                    console.log('Clearing cache:', cacheName);
                    return caches.delete(cacheName);
                });
                
                return Promise.all(deletePromises);
            }).then(() => {
                console.log('All caches cleared for version update');
                const keysToKeep = [VERSION_KEY, FIRST_VISIT_KEY];
                const keysToRemove = [];
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!keysToKeep.includes(key)) {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                localStorage.setItem(VERSION_KEY, APP_VERSION);
                
                console.log('Version updated and caches cleared');
            });
        }
        
        sessionStorage.clear();
        
        localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'CACHE_CLEARED') {
            console.log('Cache cleared by service worker, version:', event.data.version);
        }
    });
}

const imageExists = (url, timeout = 8000) => {
    return new Promise(resolve => {
        const img = new Image();
        
        const timeoutId = setTimeout(() => {
            img.onload = img.onerror = null;
            resolve(false);
        }, timeout);
        
        const cleanup = (result) => {
            clearTimeout(timeoutId);
            img.onload = img.onerror = null;
            resolve(result);
        };
        
        img.onload = () => cleanup(true);
        img.onerror = () => cleanup(false);
        img.src = url;
    });
};

const fetchAdditionalFiles = async (path) => {
    const files = Array.from({ length: 4 }, (_, i) => `${path}${i + 1}.webp`);
    
    try {
        const results = await Promise.all(files.map(file => imageExists(file)));
        return files.filter((_, index) => results[index]);
    } catch (error) {
        console.error('Error fetching additional files:', error);
        return [];
    }
};

function showNoAdditionalFilesPopup() {
    const state = window.appState;
    const stream = CONFIG.streams.find(s => s.shortCode === state.currentStream);
    const streamName = stream ? stream.displayName : state.currentStream;
    
    showPopup({
        icon: 'info',
        title: 'No Additional Files',
        message: `No additional resources are available for ${streamName} (${state.currentYear}) at this time.<br><br>Additional materials may be added in future updates.`,
        buttons: [
            {
                text: 'Got it',
                type: 'primary',
                action: () => {
                    closePopup();
                }
            }
        ],
        autoClose: 5000
    });
}

function showLoadingGlobal(message) {
    const dom = window.domElements;
    if (!dom) return;
    
    dom.loadingContainer.classList.remove('hidden');
    dom.imageTooltip.classList.add('hidden');
    dom.loadingBarInner.style.width = '0%';
    dom.loadingPercentage.textContent = '0%';
    
    dom.loadingContainer.style.opacity = '0';
    void dom.loadingContainer.offsetWidth; 
    dom.loadingContainer.style.animation = 'fadeIn 0.4s ease forwards';
    
    dom.curriculumImage.classList.add('hidden');
}

function hideLoadingGlobal() {
    const dom = window.domElements;
    if (!dom) return;
    
    dom.loadingContainer.style.animation = 'fadeOut 0.3s ease forwards';
    
    setTimeout(() => {
        dom.loadingContainer.classList.add('hidden');
        dom.curriculumImage.classList.remove('hidden');
        
        dom.curriculumImage.style.opacity = '0';
        void dom.curriculumImage.offsetWidth; 
        dom.curriculumImage.style.animation = 'zoomIn 0.5s ease forwards';
        
        setTimeout(() => {
            dom.imageTooltip.classList.remove('hidden');
        }, 800);
    }, 300);
}

function showErrorGlobal(message) {
    hideLoadingGlobal();
    
    if (message.includes('Network error') || message.includes('Failed to load image')) {
        showPopup({
            icon: 'error',
            title: 'Connection Error',
            message: `Unable to load the curriculum image due to a network issue.<br><br>Please check your internet connection and try again.`,
            buttons: [
                {
                    text: 'Retry',
                    type: 'primary',
                    action: () => {
                        closePopup();
                    }
                },
                {
                    text: 'Go Back',
                    type: 'secondary',
                    action: () => {
                        closePopup();
                    }
                }
            ],
            autoClose: 8000
        });
    } else {
        showPopup({
            icon: 'error',
            title: 'Error',
            message: message,
            buttons: [
                {
                    text: 'OK',
                    type: 'primary',
                    action: () => {
                        closePopup();
                    }
                }
            ],
            autoClose: 5000
        });
    }
}


function showNoImagesPopup() {
    const currentState = window.appState;
    const stream = CONFIG.streams.find(s => s.shortCode === currentState.currentStream);
    const streamName = stream ? stream.displayName : currentState.currentStream;
    
    console.log('Showing no images popup for:', {
        year: currentState.currentYear,
        stream: currentState.currentStream,
        semester: currentState.currentSemester,
        streamName: streamName
    });
    
    showPopup({
        icon: 'image-off',
        title: 'No Images Available',
        message: `Sorry, no curriculum images are available for:<br><br><strong>${streamName}</strong><br>Semester ${currentState.currentSemester} (${currentState.currentYear})<br><br>Please try selecting a different combination or check back later.`,
        buttons: [
            {
                text: 'Got it',
                type: 'primary',
                action: () => {
                    closePopup();
                }
            }
        ],
        autoClose: 6000
    });
}

function resetToSelectionInterface() {
    const state = window.appState;
    const dom = window.domElements;
    
    state.currentYear = null;
    state.currentStream = null;
    state.currentSemester = null;
    state.currentPart = 1;
    state.totalParts = 1;
    state.viewingAdditional = false;
    state.additionalFiles = [];
    state.currentAdditionalIndex = 0;
    
    localStorage.removeItem('iterCurriculumLastVisited');
    state.lastVisited = null;
    
    if (dom.yearDropdown) dom.yearDropdown.value = '';
    if (dom.streamDropdown) dom.streamDropdown.value = '';
    if (dom.semesterDropdown) dom.semesterDropdown.value = '';
    if (window.semesterDropdown) window.semesterDropdown.value = '';
    
    if (dom.viewerContainer) dom.viewerContainer.classList.add('hidden');
    if (dom.selectionContainer) dom.selectionContainer.classList.remove('hidden');
    
    if (dom.yearSelection) dom.yearSelection.classList.remove('hidden');
    if (dom.streamSelection) dom.streamSelection.classList.add('hidden');
    if (dom.semesterSelection) dom.semesterSelection.classList.add('hidden');
    
    if (dom.backToMainBtn) dom.backToMainBtn.classList.add('hidden');
    
    if (typeof initializeYearDropdownGlobal === 'function') {
        initializeYearDropdownGlobal();
    } else if (typeof window.initializeYearDropdown === 'function') {
        window.initializeYearDropdown();
    }
}

window.resetToSelectionInterface = resetToSelectionInterface;

function checkImagePartsBeforeStateChange(previousState) {
    const state = window.appState;
    const dom = window.domElements;
    
    state.totalParts = 0;
    state.hasSingleImage = false;
    const checkPartPromises = [];
    let hasMainImage = false;
    let maxPartFound = 0;
    
    const mainImagePath = CONFIG.getImagePath(
        state.currentYear, 
        state.currentStream, 
        state.currentSemester
    );
    
    const mainImagePromise = imageExists(mainImagePath)
        .then(exists => {
            if (exists) {
                hasMainImage = true;
            }
        });
        
    checkPartPromises.push(mainImagePromise);
    
    for (let i = 1; i <= 10; i++) {  
        const imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester, 
            i
        );
        
        const partPromise = imageExists(imagePath)
            .then(exists => {
                if (exists) {
                    maxPartFound = Math.max(maxPartFound, i);
                }
            });
            
        checkPartPromises.push(partPromise);
    }
    
    Promise.all(checkPartPromises).then(() => {
        if (maxPartFound > 0) {
            state.totalParts = maxPartFound;
            state.hasSingleImage = false;
        } else if (hasMainImage) {
            state.totalParts = 1;
            state.hasSingleImage = true;
        }
        
        if (state.totalParts > 0) {
            if (typeof window.loadCurriculumImage === 'function') {
                window.loadCurriculumImage();
            }
            if (typeof window.updateHeader === 'function') {
                window.updateHeader();
            }
            if (typeof window.saveLastVisitedState === 'function') {
                window.saveLastVisitedState();
            }
        } else {
            state.currentYear = previousState.year;
            state.currentStream = previousState.stream;
            state.currentSemester = previousState.semester;
            
            showNoImagesPopup();
        }
    });
}

function showPopup(options) {
    const existingPopup = document.querySelector('.popup-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'popup-notification';
    
    
    const iconSvg = getPopupIcon(options.icon);
    
    popup.innerHTML = `
        <div class="popup-icon">
            ${iconSvg}
        </div>
        <div class="popup-title">${options.title}</div>
        <div class="popup-message">${options.message}</div>
        <div class="popup-actions">
            ${options.buttons.map(button => `
                <button class="popup-button ${button.type || 'primary'}" data-action="${button.action ? 'custom' : 'close'}">
                    ${button.text}
                </button>
            `).join('')}
        </div>
        ${options.autoClose ? `
            <div class="popup-timer">
                Auto-close in <span class="popup-timer-seconds">${Math.ceil(options.autoClose / 1000)}</span> seconds
                <div class="popup-timer-bar">
                    <div class="popup-timer-progress"></div>
                </div>
            </div>
        ` : ''}
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    const buttons = popup.querySelectorAll('.popup-button');
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => {
            if (options.buttons[index].action) {
                options.buttons[index].action();
            } else {
                closePopup();
            }
        });
    });
    
    if (options.autoClose) {
        const timerSeconds = popup.querySelector('.popup-timer-seconds');
        const timerProgress = popup.querySelector('.popup-timer-progress');
        const duration = options.autoClose;
        const startTime = Date.now();
        
        const updateTimer = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const seconds = Math.ceil(remaining / 1000);
            
            if (timerSeconds) {
                timerSeconds.textContent = seconds;
            }
            
            if (timerProgress) {
                const progress = Math.max(0, (duration - remaining) / duration * 100);
                timerProgress.style.width = `${progress}%`;
            }
            
            if (remaining <= 0) {
                closePopup();
            } else {
                requestAnimationFrame(updateTimer);
            }
        };
        
        requestAnimationFrame(updateTimer);
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closePopup();
        }
    });
    
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closePopup();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    
    document.addEventListener('keydown', handleEscape);
}

function closePopup() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.popup-notification');
    
    if (overlay && popup) {
        popup.style.animation = 'popupSlideOut 0.3s ease forwards';
        overlay.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

function getPopupIcon(iconType) {
    const icons = {
        'image-off': `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="2" y1="2" x2="22" y2="22"></line>
                <path d="M10.5 20H5a2 2 0 0 1-2-2V5l.25-.25"></path>
                <path d="M14.5 4H19a2 2 0 0 1 2 2v10.5l-.25.25"></path>
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1"></path>
                <circle cx="9" cy="9" r="2"></circle>
            </svg>
        `,
        'info': `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `,
        'warning': `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        `,
        'error': `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `,
        'heart': `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#ff6b6b" stroke="#ff6b6b"></path>
            </svg>
        `
    };
    
    return icons[iconType] || icons['info'];
}

function openChangeSelectionModal(changeType) {
    const state = window.appState;
    const dom = window.domElements;
    
    let title, content;
    
    switch(changeType) {
        case 'year':
            title = 'Change Year';
            content = `
                <div class="modal-selection">
                    <p>Select a new year:</p>
                    <select id="modal-year-dropdown" style="margin: 1rem auto; display: block;">
                        <option value="">Select Year</option>
                        ${CONFIG.years.map(year => `
                            <option value="${year}" ${year === state.currentYear ? 'selected' : ''}>
                                ${year}
                            </option>
                        `).join('')}
                    </select>
                    <div class="modal-actions" style="margin-top: 1.5rem; text-align: center;">
                        <button class="popup-button secondary" onclick="closeModal()">Cancel</button>
                        <button class="popup-button primary" onclick="applyYearChange()">Apply Changes</button>
                    </div>
                </div>
            `;
            break;
            
        case 'stream':
            title = 'Change Stream';
            content = `
                <div class="modal-selection">
                    <p>Select a new stream:</p>
                    <select id="modal-stream-dropdown" style="margin: 1rem auto; display: block;">
                        <option value="">Select Stream</option>
                        ${CONFIG.streams.map(stream => `
                            <option value="${stream.shortCode}" ${stream.shortCode === state.currentStream ? 'selected' : ''}>
                                ${stream.displayName}
                            </option>
                        `).join('')}
                    </select>
                    <div class="modal-actions" style="margin-top: 1.5rem; text-align: center;">
                        <button class="popup-button secondary" onclick="closeModal()">Cancel</button>
                        <button class="popup-button primary" onclick="applyStreamChange()">Apply Changes</button>
                    </div>
                </div>
            `;
            break;
            
        case 'semester':
            title = 'Change Semester';
            content = `
                <div class="modal-selection">
                    <p>Select a new semester:</p>
                    <select id="modal-semester-dropdown" style="margin: 1rem auto; display: block;">
                        <option value="">Select Semester</option>
                        ${CONFIG.semesters.map(semester => `
                            <option value="${semester}" ${semester == state.currentSemester ? 'selected' : ''}>
                                Semester ${semester}
                            </option>
                        `).join('')}
                    </select>
                    <div class="modal-actions" style="margin-top: 1.5rem; text-align: center;">
                        <button class="popup-button secondary" onclick="closeModal()">Cancel</button>
                        <button class="popup-button primary" onclick="applySemesterChange()">Apply Changes</button>
                    </div>
                </div>
            `;
            break;
    }
    
    dom.modalTitle.textContent = title;
    dom.modalContent.innerHTML = content;
    dom.modalContainer.classList.remove('hidden');
}

function applyYearChange() {
    const state = window.appState;
    const newYear = document.getElementById('modal-year-dropdown').value;
    
    if (newYear && newYear !== state.currentYear) {
        state.currentYear = newYear;
        state.currentPart = 1;
        state.viewingAdditional = false;
        
        closeModal();
        checkImagePartsForRestore();
    } else {
        closeModal();
    }
}

function applyStreamChange() {
    const state = window.appState;
    const newStream = document.getElementById('modal-stream-dropdown').value;
    
    if (newStream && newStream !== state.currentStream) {
        state.currentStream = newStream;
        state.currentPart = 1;
        state.viewingAdditional = false;
        
        closeModal();
        checkImagePartsForRestore();
    } else {
        closeModal();
    }
}

function applySemesterChange() {
    const state = window.appState;
    const newSemester = document.getElementById('modal-semester-dropdown').value;
    
    if (newSemester && newSemester !== state.currentSemester) {
        state.currentSemester = newSemester;
        state.currentPart = 1;
        state.viewingAdditional = false;
        
        closeModal();
        checkImagePartsForRestore();
    } else {
        closeModal();
    }
}

function closeModal() {
    const dom = window.domElements;
    if (dom && dom.modalContainer) {
        dom.modalContainer.classList.add('hidden');
    }
}

function showWelcomePopup() {
    showPopup({
        icon: 'heart',
        title: 'Welcome to ITER Curriculum Viewer! 💚',
        message: `We're excited to have you here!<br><br>This tool helps you access and view your curriculum materials seamlessly. Let's get you started by preparing everything for the best experience.`,
        buttons: [
            {
                text: 'Got it! 🚀',
                type: 'primary',
                action: () => {
                    closePopup();
                    showInitializingPopup();
                }
            }
        ],
        autoClose: false
    });
}

function showInitializingPopup() {
    console.log('Initializing for first time setup - loading image paths');
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay initializing-overlay';
    overlay.innerHTML = `
        <div class="initializing-popup">
            <div class="initializing-spinner"></div>
            <h3>Setting Up</h3>
            <p>Loading curriculum image paths...</p>
            <div class="initializing-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="init-progress-fill"></div>
                </div>
                <div class="progress-text" id="init-progress-text">0%</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    loadAllImagePaths(true).then(() => {
        console.log('Image paths loaded successfully');
        localStorage.setItem(FIRST_VISIT_KEY, 'false');
        
        setTimeout(() => {
            closeInitializingPopup();
            console.log('Setup complete, initializing year dropdown');
            setTimeout(() => {
                if (window.domElements && window.domElements.yearDropdown && typeof CONFIG !== 'undefined' && CONFIG.years) {
                    initializeYearDropdownGlobal();
                } else {
                    console.error('DOM elements or CONFIG not ready, retrying...');
                    setTimeout(() => {
                        initializeYearDropdownGlobal();
                    }, 500);
                }
            }, 300);
        }, 500);
    }).catch(error => {
        console.error('Error loading image paths:', error);
        localStorage.setItem(FIRST_VISIT_KEY, 'false');
        closeInitializingPopup();
        setTimeout(() => {
            initializeYearDropdownGlobal();
        }, 300);
    });
}

function showRefreshingPopup() {
    console.log('Refreshing image paths and checking for updates');
    const state = window.appState;
    
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay initializing-overlay';
    overlay.innerHTML = `
        <div class="initializing-popup">
            <div class="initializing-spinner"></div>
            <h3>Refreshing</h3>
            <p>Checking for new curriculum paths...</p>
            <div class="initializing-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="refresh-progress-fill"></div>
                </div>
                <div class="progress-text" id="refresh-progress-text">0%</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    loadAllImagePaths(false).then(() => {
        console.log('Image paths refreshed successfully');
        closeInitializingPopup();
        
        setTimeout(() => {
            showRestoringSessionPopup();
        }, 300);
    }).catch(error => {
        console.error('Error refreshing image paths:', error);
        closeInitializingPopup();
        setTimeout(() => {
            showRestoringSessionPopup();
        }, 300);
    });
}

function showRestoringSessionPopup() {
    console.log('Showing restoring session popup');
    const state = window.appState;
    
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay initializing-overlay';
    overlay.innerHTML = `
        <div class="initializing-popup">
            <div class="initializing-spinner"></div>
            <h3>Restoring Session</h3>
            <p>Loading your previous curriculum...</p>
            <div class="initializing-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="restore-progress-fill"></div>
                </div>
                <div class="progress-text" id="restore-progress-text">Loading...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const progressFill = document.getElementById('restore-progress-fill');
    const progressText = document.getElementById('restore-progress-text');
    let progress = 0;
    
    const progressInterval = setInterval(() => {
        progress += 20;
        if (progressFill) progressFill.style.width = `${Math.min(progress, 90)}%`;
        if (progressText) progressText.textContent = `${Math.min(progress, 90)}%`;
        
        if (progress >= 90) {
            clearInterval(progressInterval);
        }
    }, 150);
    
    setTimeout(() => {
        clearInterval(progressInterval);
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        
        setTimeout(() => {
            closeInitializingPopup();
            if (state.lastVisited && state.lastVisited.year && state.lastVisited.stream && state.lastVisited.semester) {
                console.log('Starting session restoration');
                restoreSession(state.lastVisited);
            } else {
                console.log('No session to restore, initializing year dropdown');
                initializeYearDropdownGlobal();
            }
        }, 300);
    }, 1000);
}

function closeInitializingPopup() {
    const overlay = document.querySelector('.initializing-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

function loadAllImagePaths(isFirstTime = false) {
    return new Promise((resolve, reject) => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function(event) {
                if (event.data.type === 'CACHED_PATHS_RESPONSE' && event.data.paths) {
                    console.log('📁 Using cached image paths from service worker');
                    resolve(event.data.paths);
                    return;
                }
                loadImagePathsLive(isFirstTime, resolve, reject);
            };
            
            navigator.serviceWorker.controller.postMessage({
                type: 'GET_CACHED_PATHS'
            }, [messageChannel.port2]);
        } else {
            loadImagePathsLive(isFirstTime, resolve, reject);
        }
    });
}

function loadImagePathsLive(isFirstTime, resolve, reject) {
    const progressFill = document.getElementById(isFirstTime ? 'init-progress-fill' : 'refresh-progress-fill');
    const progressText = document.getElementById(isFirstTime ? 'init-progress-text' : 'refresh-progress-text');
    
    console.log('📡 Loading image paths from server...');
    
    const allPaths = [];
    const checkPromises = [];
    let completed = 0;
    
    const totalPaths = CONFIG.years.length * CONFIG.streams.length * CONFIG.semesters.length * 12;
    
    CONFIG.years.forEach(year => {
        CONFIG.streams.forEach(stream => {
            CONFIG.semesters.forEach(semester => {
                const mainPath = CONFIG.getImagePath(year, stream.shortCode, semester);
                checkPromises.push(
                    checkImagePathExists(mainPath).then(exists => {
                        if (exists) allPaths.push(mainPath);
                        completed++;
                        updateProgress(completed, totalPaths, progressFill, progressText);
                    })
                );
                
                for (let part = 1; part <= 10; part++) {
                    const partPath = CONFIG.getImagePath(year, stream.shortCode, semester, part);
                    checkPromises.push(
                        checkImagePathExists(partPath).then(exists => {
                            if (exists) allPaths.push(partPath);
                            completed++;
                            updateProgress(completed, totalPaths, progressFill, progressText);
                        })
                    );
                }
                
                const additionalPath = CONFIG.getAdditionalResourcesPath(year, stream.shortCode);
                checkPromises.push(
                    checkAdditionalResourcesExist(additionalPath).then(files => {
                        if (files.length > 0) {
                            allPaths.push(...files);
                        }
                        completed++;
                        updateProgress(completed, totalPaths, progressFill, progressText);
                    })
                );
            });
        });
    });
    
    Promise.all(checkPromises).then(() => {
        console.log(`📦 Loaded ${allPaths.length} image paths`);
        
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_IMAGE_PATHS',
                paths: allPaths
            });
        }
        
        const pathCache = {
            version: APP_VERSION,
            timestamp: Date.now(),
            paths: allPaths
        };
        
        localStorage.setItem(IMAGE_PATHS_CACHE_KEY, JSON.stringify(pathCache));
        
        setTimeout(() => {
            resolve(allPaths);
        }, 1000);
    }).catch(error => {
        console.error('Error loading image paths:', error);
        reject(error);
    });
}

function updateProgress(completed, total, progressFill, progressText) {
    const percentage = Math.round((completed / total) * 100);
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    if (progressText) {
        progressText.textContent = `${percentage}%`;
    }
}

const checkImagePathExists = (path) => imageExists(path, 5000);

const checkAdditionalResourcesExist = async (path) => {
    const files = Array.from({ length: 4 }, (_, i) => `${path}${i + 1}.webp`);
    
    try {
        const results = await Promise.all(
            files.map(async file => ({ 
                file, 
                exists: await checkImagePathExists(file) 
            }))
        );
        
        return results.filter(result => result.exists).map(result => result.file);
    } catch (error) {
        console.error('Error checking additional resources:', error);
        return [];
    }
};

function getCachedImagePaths() {
    try {
        const cached = localStorage.getItem(IMAGE_PATHS_CACHE_KEY);
        if (cached) {
            const pathCache = JSON.parse(cached);
            if (pathCache.version === APP_VERSION && pathCache.paths) {
                return pathCache.paths;
            }
        }
    } catch (error) {
        console.error('Error reading cached paths:', error);
    }
    return null;
}

function getAvailablePartsFromCache(year, stream, semester, cachedPaths) {
    let totalParts = 0;
    let hasSingleImage = false;
    let maxPartFound = 0;
    
    const mainImagePath = CONFIG.getImagePath(year, stream, semester);
    const hasMainImage = cachedPaths.some(path => path.includes(mainImagePath) || path === mainImagePath);
    
    console.log('Checking cache for main image:', mainImagePath, 'Found:', hasMainImage);
    
    for (let i = 1; i <= 10; i++) {
        const partPath = CONFIG.getImagePath(year, stream, semester, i);
        const hasPartImage = cachedPaths.some(path => path.includes(partPath) || path === partPath);
        
        if (hasPartImage) {
            maxPartFound = i;
            console.log(`Found part ${i} in cache:`, partPath);
        }
    }
    
    if (maxPartFound > 0) {
        totalParts = maxPartFound;
        hasSingleImage = false;
        console.log(`Cache shows ${maxPartFound} parts available`);
    } else if (hasMainImage) {
        totalParts = 1;
        hasSingleImage = true;
        console.log('Cache shows single main image available');
    } else {
        console.log('Cache shows no images available for this combination');
    }
    
    return { totalParts, hasSingleImage };
}

function isFirstVisit() {
    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    return firstVisit === null || firstVisit === 'true';
}

function restoreSession(lastVisited) {
    const state = window.appState;
    const dom = window.domElements;
    
    if (!dom || !state) {
        console.error('DOM elements or state not available for session restoration');
        return;
    }
    
    console.log('🚀 Lightning fast session restoration:', lastVisited);
    
    state.currentYear = lastVisited.year;
    state.currentStream = lastVisited.stream;
    state.currentSemester = lastVisited.semester;
    state.currentPart = 1;
    state.viewingAdditional = false;
    state.eventListenersSetup = false; 
    
    dom.selectionContainer.classList.add('hidden');
    dom.viewerContainer.classList.remove('hidden');
    
    showLoadingGlobal("⚡ Restoring session...");
    
    setupEventListenersForRestore();
    state.eventListenersSetup = true;
    
    attemptInstantCacheLoad();
}

function attemptInstantCacheLoad() {
    const state = window.appState;
    
    console.log('⚡ Attempting instant cache load');
    
    const mainImagePath = CONFIG.getImagePath(
        state.currentYear, 
        state.currentStream, 
        state.currentSemester
    );
    
    state.totalParts = 1;
    state.hasSingleImage = true;
    state.currentPart = 1;
    
    const quickImg = new Image();
    quickImg.crossOrigin = 'anonymous';
    
    const instantTimeout = setTimeout(() => {
        console.log('💨 Instant load failed, falling back to fast check');
        checkImagePartsForRestoreFast();
    }, 400); 
    
    quickImg.onload = function() {
        clearTimeout(instantTimeout);
        console.log('⚡ INSTANT CACHE HIT! Loading in <400ms');
        
        const dom = window.domElements;
        dom.curriculumImage.src = quickImg.src;
        updateImageNavigationButtonsForRestore();
        updateHeaderForRestore();
        saveLastVisitedStateForRestore();
        hideLoadingGlobal();
        
        setTimeout(() => {
            ensureDownloadAndClickEventListeners();
            checkAdditionalPartsInBackground();
            warmCacheForCurrentContext();
        }, 100);
    };
    
    quickImg.onerror = function() {
        clearTimeout(instantTimeout);
        console.log('💨 No instant cache hit, proceeding with fast load');
        checkImagePartsForRestoreFast();
    };
    
    quickImg.src = mainImagePath;
}

function warmCacheForCurrentContext() {
    console.log('🔥 Efficient caching mode: Cache warming not needed');
}

function checkImagePartsForRestoreFast() {
    const state = window.appState;
    const dom = window.domElements;
    
    console.log('Fast image check for restoration - prioritizing cached images');
    
    state.totalParts = 1;
    state.hasSingleImage = true;
    state.currentPart = 1;
    
    const mainImagePath = CONFIG.getImagePath(
        state.currentYear, 
        state.currentStream, 
        state.currentSemester
    );
    
    console.log('Attempting fast load of main image:', mainImagePath);
    
    loadImageForRestoreFast(mainImagePath, () => {
        console.log('Image loaded successfully from cache');
        updateImageNavigationButtonsForRestore();
        updateHeaderForRestore();
        saveLastVisitedStateForRestore();
        hideLoadingGlobal();
        
        setTimeout(() => {
            ensureDownloadAndClickEventListeners();
        }, 100);
        
        checkAdditionalPartsInBackground();
    }, () => {
        console.log('Main image not available, checking parts');
        checkImagePartsForRestore();
    });
}

function loadImageForRestoreFast(src, onSuccess, onError) {
    const dom = window.domElements;
    
    console.log('🚀 Fast loading image for restore:', src);
    
    if (dom.curriculumImage) {
        const cachedImg = new Image();
        cachedImg.crossOrigin = 'anonymous';
        
        const fastLoadTimeout = setTimeout(() => {
            console.log('⚡ Fast load timeout, trying regular load');
            loadImageRegular(src, onSuccess, onError);
        }, 800); 
        
        cachedImg.onload = function() {
            clearTimeout(fastLoadTimeout);
            console.log('⚡ Image loaded from cache in fast mode');
            
            dom.curriculumImage.src = cachedImg.src;
            if (dom.loadingContainer) {
                dom.loadingContainer.classList.add('hidden');
            }
            dom.curriculumImage.classList.remove('hidden');
            
            setTimeout(() => {
                preloadAdjacentImages(src);
            }, 100);
            
            if (onSuccess) onSuccess();
        };
        
        cachedImg.onerror = function() {
            clearTimeout(fastLoadTimeout);
            console.log('❌ Cache miss, loading from network');
            loadImageRegular(src, onSuccess, onError);
        };
        
        cachedImg.src = src;
    }
}

function loadImageRegular(src, onSuccess, onError) {
    const dom = window.domElements;
    
    const timeoutId = setTimeout(() => {
        console.log('📡 Regular image loading timeout');
        if (onError) onError();
    }, 3000);
    
    dom.curriculumImage.onload = function() {
        clearTimeout(timeoutId);
        console.log('📡 Image loaded from network');
        if (dom.loadingContainer) {
            dom.loadingContainer.classList.add('hidden');
        }
        dom.curriculumImage.classList.remove('hidden');
        
        setTimeout(() => {
            preloadAdjacentImages(src);
        }, 500);
        
        if (onSuccess) onSuccess();
    };
    
    dom.curriculumImage.onerror = function() {
        clearTimeout(timeoutId);
        console.log('❌ Error loading image');
        if (onError) onError();
    };
    
    dom.curriculumImage.src = src;
}

function preloadAdjacentImages(currentSrc) {
    console.log('📦 Efficient caching mode: Adjacent preloading not needed');
}

function checkAdditionalPartsInBackground() {
    const state = window.appState;
    
    console.log('Checking for additional parts in background');
    
    const checkPartPromises = [];
    let maxParts = 1;
    
    for (let i = 2; i <= 5; i++) { 
        const imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester, 
            i
        );
        
        const partPromise = imageExistsFast(imagePath)
            .then(exists => {
                if (exists) {
                    maxParts = i;
                    state.hasSingleImage = false;
                }
            });
            
        checkPartPromises.push(partPromise);
    }
    
    Promise.all(checkPartPromises).then(() => {
        if (maxParts > 1) {
            state.totalParts = maxParts;
            updateImageNavigationButtonsForRestore();
            console.log(`Found ${maxParts} parts in background check`);
        }
    }).catch(error => {
        console.log('Background check completed with some errors:', error);
    });
}

// Optimized: reuse imageExists function with fast timeout
const imageExistsFast = (url) => imageExists(url, 500);

function checkImagePartsForRestore() {
    const state = window.appState;
    const dom = window.domElements;
    
    state.totalParts = 0;
    state.hasSingleImage = false;
    const checkPartPromises = [];
    let hasMainImage = false;
    let maxPartFound = 0;
    
    const mainImagePath = CONFIG.getImagePath(
        state.currentYear, 
        state.currentStream, 
        state.currentSemester
    );
    
    const mainImagePromise = imageExists(mainImagePath)
        .then(exists => {
            if (exists) {
                hasMainImage = true;
            }
        });
        
    checkPartPromises.push(mainImagePromise);
    
    for (let i = 1; i <= 10; i++) {  
        const imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester, 
            i
        );
        
        const partPromise = imageExists(imagePath)
            .then(exists => {
                if (exists) {
                    maxPartFound = Math.max(maxPartFound, i);
                }
            });
            
        checkPartPromises.push(partPromise);
    }
    
    Promise.all(checkPartPromises).then(() => {
        if (maxPartFound > 0) {
            state.totalParts = maxPartFound;
            state.hasSingleImage = false;
        } else if (hasMainImage) {
            state.totalParts = 1;
            state.hasSingleImage = true;
        }
        
        console.log('Image check completed for restoration:', {
            totalParts: state.totalParts,
            hasSingleImage: state.hasSingleImage,
            hasMainImage: hasMainImage,
            maxPartFound: maxPartFound
        });
        if (state.totalParts > 0) {
            loadImageWithPartForRestore();
            updateImageNavigationButtonsForRestore();
            updateHeaderForRestore();
            saveLastVisitedStateForRestore();
            
            hideLoadingGlobal();
            
            setTimeout(() => {
                ensureDownloadAndClickEventListeners();
            }, 500);
        } else {
            hideLoadingGlobal();
            console.log('No images found during restoration');
            showNoImagesPopup();
        }
    }).catch(error => {
        console.error('Error during image check for restoration:', error);
        hideLoadingGlobal();
        showNoImagesPopup();
    });
}

function loadImageWithPartForRestoreFast() {
    const state = window.appState;
    const dom = window.domElements;
    
    if (state.currentPart > state.totalParts) {
        state.currentPart = state.totalParts;
    }
    
    if (state.currentPart < 1) {
        state.currentPart = 1;
    }
    
    let imagePath;
    
    if (state.hasSingleImage && state.currentPart === 1) {
        imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester
        );
    } else {
        imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester, 
            state.currentPart
        );
    }
    
    loadImageForRestoreFast(imagePath, () => {
        updateImageCounterForRestore();
        setTimeout(() => {
            preloadAdjacentImages(imagePath);
        }, 200);
    });
}

function loadImageWithPartForRestore() {
    const state = window.appState;
    const dom = window.domElements;
    
    if (state.currentPart > state.totalParts) {
        state.currentPart = state.totalParts;
    }
    
    if (state.currentPart < 1) {
        state.currentPart = 1;
    }
    
    let imagePath;
    
    if (state.hasSingleImage && state.currentPart === 1) {
        imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester
        );
    } else {
        imagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester, 
            state.currentPart
        );
    }
    
    loadImageForRestore(imagePath);
    updateImageCounterForRestore();
}

function loadImageForRestore(src) {
    const dom = window.domElements;
    
    console.log('Loading image for restore:', src);
    
    if (dom.curriculumImage) {
        if (dom.loadingContainer) {
            dom.loadingContainer.classList.remove('hidden');
        }
        
        dom.curriculumImage.onload = function() {
            console.log('Image loaded successfully for restore');
            if (dom.loadingContainer) {
                dom.loadingContainer.classList.add('hidden');
            }
            dom.curriculumImage.classList.remove('hidden');
        };
        
        dom.curriculumImage.onerror = function() {
            console.error('Error loading image for restore:', src);
            if (dom.loadingContainer) {
                dom.loadingContainer.classList.add('hidden');
            }
        };
        
        dom.curriculumImage.src = src;
    }
    if (dom.loadingContainer) {
        dom.loadingContainer.classList.add('hidden');
    }
}

function updateImageCounterForRestore() {
    const state = window.appState;
    const dom = window.domElements;
    
    dom.imageCounter.textContent = `${state.currentPart}/${state.totalParts}`;
}

function updateImageNavigationButtonsForRestore() {
    const state = window.appState;
    const dom = window.domElements;
    
    if (state.viewingAdditional) {
        dom.prevImageBtn.disabled = state.currentAdditionalIndex <= 0;
        dom.nextImageBtn.disabled = state.currentAdditionalIndex >= state.additionalFiles.length - 1;
        dom.imageCounter.textContent = `${state.currentAdditionalIndex + 1}/${state.additionalFiles.length}`;
    } else {
        dom.prevImageBtn.disabled = state.currentPart <= 1;
        dom.nextImageBtn.disabled = state.currentPart >= state.totalParts;
        updateImageCounterForRestore();
    }
}

function updateHeaderForRestore() {
    const state = window.appState;
    const dom = window.domElements;
    
    const stream = CONFIG.streams.find(s => s.shortCode === state.currentStream);
    
    if (state.viewingAdditional) {
        dom.imageInfo.innerHTML = `
            <p><strong>Year:</strong> ${state.currentYear}</p>
            <p><strong>Stream:</strong> ${stream ? stream.name : state.currentStream}</p>
            <p><strong>Additional Resources</strong></p>
            <p><strong>File:</strong> ${state.currentAdditionalIndex + 1} of ${state.additionalFiles.length}</p>
        `;
    } else {
        dom.imageInfo.innerHTML = `
            <p><strong>Year:</strong> ${state.currentYear}</p>
            <p><strong>Stream:</strong> ${stream ? stream.name : state.currentStream}</p>
            <p><strong>Semester:</strong> ${state.currentSemester}</p>
            ${state.totalParts > 1 ? `<p><strong>Part:</strong> ${state.currentPart} of ${state.totalParts}</p>` : ''}
        `;
        
        if (window.seoManager && state.currentYear && state.currentStream && state.currentSemester) {
            window.seoManager.initializePageSEO('viewer', {
                year: state.currentYear,
                stream: stream ? stream.name : state.currentStream,
                semester: state.currentSemester
            });
            
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('year', state.currentYear);
            newUrl.searchParams.set('stream', state.currentStream);
            newUrl.searchParams.set('semester', state.currentSemester);
            window.history.replaceState({}, '', newUrl);
            
            window.seoManager.updateCanonical(newUrl.toString());
            
            window.seoManager.trackPageView({
                stream: state.currentStream,
                semester: state.currentSemester,
                year: state.currentYear
            });
        }
    }
}

function setupEventListenersForRestore() {
    const dom = window.domElements;
    const state = window.appState;
    
    const newPrevBtn = dom.prevImageBtn.cloneNode(true);
    const newNextBtn = dom.nextImageBtn.cloneNode(true);
    const newDownloadBtn = document.getElementById('download-image');
    const newChangeSelectionBtn = dom.changeSelectionBtn;
    const newAdditionalFilesBtn = dom.additionalFilesBtn;
    const newBackToMainBtn = dom.backToMainBtn;
    const newCurriculumImage = dom.curriculumImage;
    
    dom.prevImageBtn.parentNode.replaceChild(newPrevBtn, dom.prevImageBtn);
    dom.nextImageBtn.parentNode.replaceChild(newNextBtn, dom.nextImageBtn);
    
    dom.prevImageBtn = newPrevBtn;
    dom.nextImageBtn = newNextBtn;
    window.domElements.prevImageBtn = newPrevBtn;
    window.domElements.nextImageBtn = newNextBtn;
    
    newPrevBtn.addEventListener('click', () => {
        if (state.viewingAdditional) {
            if (state.currentAdditionalIndex > 0) {
                state.currentAdditionalIndex--;
                dom.curriculumImage.style.animation = 'slideInLeft 0.4s ease forwards';
                setTimeout(() => {
                    loadImageForRestoreFast(state.additionalFiles[state.currentAdditionalIndex], () => {
                        updateImageNavigationButtonsForRestore();
                        updateHeaderForRestore();
                    });
                }, 100);
            }
        } else {
            if (state.currentPart > 1) {
                state.currentPart--;
                dom.curriculumImage.style.animation = 'slideInLeft 0.4s ease forwards';
                setTimeout(() => {
                    loadImageWithPartForRestoreFast();
                    updateImageNavigationButtonsForRestore();
                    updateHeaderForRestore();
                }, 100);
            }
        }
    });
    
    newNextBtn.addEventListener('click', () => {
        if (state.viewingAdditional) {
            if (state.currentAdditionalIndex < state.additionalFiles.length - 1) {
                state.currentAdditionalIndex++;
                dom.curriculumImage.style.animation = 'slideInRight 0.4s ease forwards';
                setTimeout(() => {
                    loadImageForRestoreFast(state.additionalFiles[state.currentAdditionalIndex], () => {
                        updateImageNavigationButtonsForRestore();
                        updateHeaderForRestore();
                    });
                }, 100);
            }
        } else {
            if (state.currentPart < state.totalParts) {
                state.currentPart++;
                dom.curriculumImage.style.animation = 'slideInRight 0.4s ease forwards';
                setTimeout(() => {
                    loadImageWithPartForRestoreFast();
                    updateImageNavigationButtonsForRestore();
                    updateHeaderForRestore();
                }, 100);
            }
        }
    });
    
    if (newDownloadBtn) {
        const newDownloadBtnClone = newDownloadBtn.cloneNode(true);
        newDownloadBtn.parentNode.replaceChild(newDownloadBtnClone, newDownloadBtn);
        
        newDownloadBtnClone.addEventListener('click', () => {
            if (!dom.curriculumImage.src) {
                showErrorGlobal('No image to download');
                return;
            }

            const link = document.createElement('a');
            link.href = dom.curriculumImage.src;
            
            const stream = CONFIG.streams.find(s => s.shortCode === state.currentStream);
            const streamName = stream ? stream.shortCode : state.currentStream;
            
            let filename;
            
            if (state.viewingAdditional) {
                filename = `ITER_${state.currentYear}_${streamName}_Additional_${state.currentAdditionalIndex + 1}`;
            } else {
                filename = `ITER_${state.currentYear}_${streamName}_Sem${state.currentSemester}`;
                if (state.totalParts > 1) {
                    filename += `_Part${state.currentPart}`;
                }
            }
            
            filename += '.webp';
            
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    
    if (newChangeSelectionBtn) {
        const newChangeSelectionBtnClone = newChangeSelectionBtn.cloneNode(true);
        newChangeSelectionBtn.parentNode.replaceChild(newChangeSelectionBtnClone, newChangeSelectionBtn);
        window.domElements.changeSelectionBtn = newChangeSelectionBtnClone;
        
        newChangeSelectionBtnClone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.changeSelectionDropdown.classList.toggle('hidden');
        });
        
        newChangeSelectionBtnClone.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dom.changeSelectionDropdown.classList.toggle('hidden');
        });
        
        document.querySelectorAll('#change-selection-dropdown button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const changeType = btn.dataset.change;
                if (typeof openChangeSelectionModal === 'function') {
                    openChangeSelectionModal(changeType);
                }
                dom.changeSelectionDropdown.classList.add('hidden');
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const changeType = btn.dataset.change;
                if (typeof openChangeSelectionModal === 'function') {
                    openChangeSelectionModal(changeType);
                }
                dom.changeSelectionDropdown.classList.add('hidden');
            });
        });
    }
    
    if (newCurriculumImage) {
        const newCurriculumImageClone = newCurriculumImage.cloneNode(true);
        newCurriculumImage.parentNode.replaceChild(newCurriculumImageClone, newCurriculumImage);
        window.domElements.curriculumImage = newCurriculumImageClone;
        
        newCurriculumImageClone.addEventListener('click', () => {
            if (!newCurriculumImageClone.src) {
                return;
            }
            
            const newWindow = window.open(newCurriculumImageClone.src, '_blank');
            if (!newWindow) {
                const link = document.createElement('a');
                link.href = newCurriculumImageClone.src;
                link.target = '_blank';
                link.click();
            }
        });
    }
    
    if (newAdditionalFilesBtn) {
        const newAdditionalFilesBtnClone = newAdditionalFilesBtn.cloneNode(true);
        newAdditionalFilesBtn.parentNode.replaceChild(newAdditionalFilesBtnClone, newAdditionalFilesBtn);
        window.domElements.additionalFilesBtn = newAdditionalFilesBtnClone;
        
        newAdditionalFilesBtnClone.addEventListener('click', () => {
            const additionalPath = CONFIG.getAdditionalResourcesPath(
                state.currentYear, 
                state.currentStream
            );
            
            showLoadingGlobal("Loading additional resources");
            
            fetchAdditionalFiles(additionalPath)
                .then(files => {
                    if (files.length > 0) {
                        state.additionalFiles = files;
                        state.currentAdditionalIndex = 0;
                        state.viewingAdditional = true;
                        dom.backToMainBtn.classList.remove('hidden');
                        
                        loadImageForRestore(files[0]);
                        updateImageNavigationButtonsForRestore();
                        updateHeaderForRestore();
                    } else {
                        hideLoadingGlobal();
                        showNoAdditionalFilesPopup();
                    }
                })
                .catch(err => {
                    hideLoadingGlobal();
                    showNoAdditionalFilesPopup();
                    console.error(err);
                });
        });
    }
    
    if (newBackToMainBtn) {
        const newBackToMainBtnClone = newBackToMainBtn.cloneNode(true);
        newBackToMainBtn.parentNode.replaceChild(newBackToMainBtnClone, newBackToMainBtn);
        window.domElements.backToMainBtn = newBackToMainBtnClone;
        
        newBackToMainBtnClone.addEventListener('click', () => {
            state.viewingAdditional = false;
            newBackToMainBtnClone.classList.add('hidden');
            loadImageWithPartForRestore();
            updateImageNavigationButtonsForRestore();
            updateHeaderForRestore();
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#change-selection') && !dom.changeSelectionDropdown.classList.contains('hidden')) {
            dom.changeSelectionDropdown.classList.add('hidden');
        }
    });
}

function saveLastVisitedStateForRestore() {
    const state = window.appState;
    
    const stateToSave = {
        year: state.currentYear,
        stream: state.currentStream,
        semester: state.currentSemester
    };
    
    localStorage.setItem('iterCurriculumLastVisited', JSON.stringify(stateToSave));
    state.lastVisited = stateToSave;
}

function ensureDownloadAndClickEventListeners() {
    const downloadBtn = document.getElementById('download-image');
    const curriculumImage = document.getElementById('curriculum-image');
    
    if (downloadBtn) {
        downloadBtn.removeEventListener('click', downloadCurrentImage);
        downloadBtn.addEventListener('click', downloadCurrentImage);
    }
    
    if (curriculumImage) {
        curriculumImage.removeEventListener('click', openImageInNewWindow);
        curriculumImage.addEventListener('click', openImageInNewWindow);
    }
    
    console.log('Event listeners ensured for download and image click');
}

function initializeYearDropdownGlobal() {
    const dom = window.domElements;
    const state = window.appState;
    
    if (!dom || !state) {
        console.error('DOM elements or state not available');
        return;
    }
    
    if (!dom.yearDropdown) {
        console.error('Year dropdown element not found');
        return;
    }
    
    if (typeof CONFIG === 'undefined' || !CONFIG.years) {
        console.error('CONFIG object or years not available');
        return;
    }
    
    console.log('Initializing year dropdown globally');
    
    dom.yearDropdown.innerHTML = '';
    dom.yearDropdown.onchange = null;
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Year';
    dom.yearDropdown.appendChild(defaultOption);
    
    CONFIG.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        dom.yearDropdown.appendChild(option);
    });
    
    console.log(`Year dropdown populated with ${CONFIG.years.length} options`);
    
    dom.yearDropdown.addEventListener('change', () => {
        console.log('Year changed to:', dom.yearDropdown.value);
        if (dom.yearDropdown.value) {
            state.currentYear = dom.yearDropdown.value;
            
            dom.yearSelection.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                dom.yearSelection.classList.add('hidden');
                dom.streamSelection.classList.remove('hidden');
                dom.streamSelection.style.animation = 'fadeIn 0.3s ease forwards';
            }, 300);
            
            initializeStreamDropdownGlobal();
        }
    });
}

function initializeStreamDropdownGlobal() {
    const dom = window.domElements;
    const state = window.appState;
    
    if (!dom || !dom.streamDropdown) {
        console.error('Stream dropdown element not found');
        return;
    }
    
    if (typeof CONFIG === 'undefined' || !CONFIG.streams) {
        console.error('CONFIG streams not available');
        return;
    }
    
    dom.streamDropdown.innerHTML = '';
    dom.streamDropdown.onchange = null;
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Stream';
    dom.streamDropdown.appendChild(defaultOption);
    
    CONFIG.streams.forEach(stream => {
        const option = document.createElement('option');
        option.value = stream.shortCode;
        option.textContent = stream.displayName;
        dom.streamDropdown.appendChild(option);
    });

    dom.streamDropdown.addEventListener('change', () => {
        if (dom.streamDropdown.value) {
            state.currentStream = dom.streamDropdown.value;
            
            dom.streamSelection.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                dom.streamSelection.classList.add('hidden');
                dom.semesterSelection.classList.remove('hidden');
                dom.semesterSelection.style.animation = 'fadeIn 0.3s ease forwards';
            }, 300);
            
            initializeSemesterDropdownGlobal();
        }
    });
}

function initializeSemesterDropdownGlobal() {
    const dom = window.domElements;
    const state = window.appState;
    
    if (!dom || !dom.semesterDropdown) {
        console.error('Semester dropdown element not found');
        return;
    }
    
    if (typeof CONFIG === 'undefined' || !CONFIG.semesters) {
        console.error('CONFIG semesters not available');
        return;
    }
    
    dom.semesterDropdown.innerHTML = '';
    dom.semesterDropdown.onchange = null;
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Semester';
    dom.semesterDropdown.appendChild(defaultOption);
    
    CONFIG.semesters.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester;
        option.textContent = `Semester ${semester}`;
        dom.semesterDropdown.appendChild(option);
    });

    dom.semesterDropdown.addEventListener('change', () => {
        if (dom.semesterDropdown.value) {
            state.currentSemester = dom.semesterDropdown.value;
            state.currentPart = 1;
            state.viewingAdditional = false;
            
            console.log('Global semester selected:', state.currentSemester);
            
            showLoadingGlobal("Loading curriculum image...");
            
            setTimeout(() => {
                dom.selectionContainer.classList.add('hidden');
                dom.viewerContainer.classList.remove('hidden');
                
                checkImageParts();
                
                setTimeout(() => {
                    ensureDownloadAndClickEventListeners();
                }, 1000);
            }, 200);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization');
    console.log('CONFIG object:', CONFIG);
    
    checkVersionAndClearCache();
    
    const state = {
        currentYear: null,
        currentStream: null,
        currentSemester: null,
        currentPart: 1,
        totalParts: 1,
        viewingAdditional: false,
        additionalFiles: [],
        currentAdditionalIndex: 0,
        lastVisited: null,
        eventListenersSetup: false
    };

    window.appState = state;

    const connectionStatus = document.getElementById('connection-status');
    
    const yearDropdown = document.getElementById('year-dropdown');
    const streamDropdown = document.getElementById('stream-dropdown');
    const semesterDropdown = document.getElementById('semester-dropdown');
    const yearSelection = document.getElementById('year-selection');
    const streamSelection = document.getElementById('stream-selection');
    const semesterSelection = document.getElementById('semester-selection');
    const selectionContainer = document.getElementById('selection-container');
    const viewerContainer = document.getElementById('viewer-container');
    const curriculumImage = document.getElementById('curriculum-image');
    const imageTooltip = document.getElementById('image-tooltip');
    const loadingContainer = document.getElementById('loading-container');
    const loadingBarInner = document.getElementById('loading-bar-inner');
    const loadingPercentage = document.getElementById('loading-percentage');
    const imageInfo = document.getElementById('image-info');
    const prevImageBtn = document.getElementById('prev-image');
    const nextImageBtn = document.getElementById('next-image');
    const imageCounter = document.getElementById('image-counter');
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');
    const changeSelectionBtn = document.getElementById('change-selection');
    const changeSelectionDropdown = document.getElementById('change-selection-dropdown');
    const additionalFilesBtn = document.getElementById('additional-files');
    const backToMainBtn = document.getElementById('back-to-main');

    window.domElements = {
        yearDropdown,
        streamDropdown,
        semesterDropdown,
        yearSelection,
        streamSelection,
        semesterSelection,
        selectionContainer,
        viewerContainer,
        curriculumImage,
        imageTooltip,
        loadingContainer,
        loadingBarInner,
        loadingPercentage,
        imageInfo,
        prevImageBtn,
        nextImageBtn,
        imageCounter,
        modalContainer,
        modalTitle,
        modalContent,
        modalClose,
        changeSelectionBtn,
        changeSelectionDropdown,
        additionalFilesBtn,
        backToMainBtn
    };

    window.semesterDropdown = semesterDropdown;
    
    function updateOnlineStatus() {
        if (navigator.onLine) {
            connectionStatus.classList.add('hidden');
        } else {
            connectionStatus.classList.remove('hidden');
        }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    
    loadLastVisitedState();
    
    setupCoreEventListeners();
    
    if (isFirstVisit()) {
        showWelcomePopup();
        return; 
    }
    
    if (state.lastVisited && state.lastVisited.year && state.lastVisited.stream && state.lastVisited.semester) {
        console.log('Restoring session for:', state.lastVisited);
        showRefreshingPopup();
        return;
    }
    
    console.log('First time or no previous session, showing initializing popup');
    setTimeout(() => {
        showInitializingPopup();
    }, 100); 

    function setupCoreEventListeners() {
        document.querySelectorAll('.back-button').forEach(btn => {
            btn.addEventListener('click', handleBackNavigation);
        });

        const downloadBtn = document.getElementById('download-image');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadCurrentImage);
        }

        if (prevImageBtn) {
            prevImageBtn.addEventListener('click', navigateToPreviousImage);
        }
        if (nextImageBtn) {
            nextImageBtn.addEventListener('click', navigateToNextImage);
        }

        if (changeSelectionBtn) {
            changeSelectionBtn.addEventListener('click', handleChangeSelectionClick);
            changeSelectionBtn.addEventListener('touchend', handleChangeSelectionClick);
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#change-selection') && !changeSelectionDropdown.classList.contains('hidden')) {
                changeSelectionDropdown.classList.add('hidden');
            }
        });

        document.querySelectorAll('#change-selection-dropdown button').forEach(btn => {
            btn.addEventListener('click', handleChangeDropdownClick);
            btn.addEventListener('touchend', handleChangeDropdownClick);
        });

        if (additionalFilesBtn) {
            additionalFilesBtn.addEventListener('click', loadAdditionalFiles);
        }
        
        if (backToMainBtn) {
            backToMainBtn.addEventListener('click', () => {
                state.viewingAdditional = false;
                backToMainBtn.classList.add('hidden');
                loadCurriculumImage();
                updateImageNavigationButtons();
            });
        }

        if (curriculumImage) {        curriculumImage.addEventListener('click', openImageInNewWindow);
        
        curriculumImage.addEventListener('load', () => {
            if (!curriculumImage.classList.contains('hidden')) {
                setTimeout(() => {
                    if (imageTooltip) {
                        imageTooltip.classList.remove('hidden');
                    }
                }, 1000);
            }
            // Enhanced preloading with intelligent caching
            preloadNextImagesIntelligent();
        });
        }

        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }
        
        const aboutLink = document.getElementById('about-link');
        if (aboutLink) {
            aboutLink.addEventListener('click', (e) => {
                e.preventDefault();
                showAboutModal();
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                caches.open(`curriculum-images-${APP_VERSION}`).then(cache => {
                    cache.keys().then(keys => {
                        if (keys.length > 5) {  
                            keys.slice(0, -5).forEach(request => {
                                cache.delete(request);
                            });
                        }
                    });
                });
            }
        });
    }

    function showAboutModal() {
        modalTitle.textContent = 'About ITER Curriculum Viewer';
        document.querySelector('.modal-content').innerHTML = `
            <div class="about-content">
                <div class="about-hero">
                    <div class="about-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                        </svg>
                    </div>
                    <h4>ITER Curriculum Viewer</h4>
                    <p class="about-subtitle">Your comprehensive academic companion for accessing ITER curriculum materials</p>
                </div>

                <div class="about-section">
                    <h5>Overview</h5>
                    <p>The ITER Curriculum Viewer is a modern, user-friendly web application designed specifically for ITER students to access and navigate their academic curriculum materials with ease. Built with cutting-edge web technologies, it provides a seamless experience across all devices.</p>
                </div>

                <div class="about-section">
                    <h5>Key Features</h5>
                    <div class="feature-grid">
                        <div class="feature-item">
                            <div class="feature-icon">📚</div>
                            <div class="feature-text">
                                <strong>Comprehensive Coverage</strong>
                                <span>Browse curriculum by year, stream, and semester with complete academic material access</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">🖼️</div>
                            <div class="feature-text">
                                <strong>Multi-Part Documents</strong>
                                <span>View multiple parts of curriculum documents with intelligent pagination</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">📁</div>
                            <div class="feature-text">
                                <strong>Additional Resources</strong>
                                <span>Access supplementary materials and resources for each academic stream</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">📱</div>
                            <div class="feature-text">
                                <strong>Responsive Design</strong>
                                <span>Optimized for desktop, tablet, and mobile devices with modern UI/UX</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">⚡</div>
                            <div class="feature-text">
                                <strong>Fast Loading</strong>
                                <span>Progressive image loading with real-time progress indicators</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">💾</div>
                            <div class="feature-text">
                                <strong>Offline Support</strong>
                                <span>Works offline for previously viewed images with intelligent caching</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="about-section">
                    <h5>Technical Specifications</h5>
                    <div class="tech-grid">
                        <div class="tech-item">
                            <strong>Frontend:</strong> HTML5, CSS3, Vanilla JavaScript
                        </div>
                        <div class="tech-item">
                            <strong>Design:</strong> Modern glass-morphism with sage green theme
                        </div>
                        <div class="tech-item">
                            <strong>Performance:</strong> Service Worker caching, lazy loading
                        </div>
                        <div class="tech-item">
                            <strong>Accessibility:</strong> WCAG compliant, keyboard navigation
                        </div>
                    </div>
                </div>

                <div class="about-section">
                    <h5>Academic Streams Supported</h5>
                    <div class="streams-grid">
                        <span class="stream-tag">Computer Science & Engineering</span>
                        <span class="stream-tag">Electronics & Communication</span>
                        <span class="stream-tag">Electrical & Electronics</span>
                        <span class="stream-tag">Mechanical Engineering</span>
                        <span class="stream-tag">Civil Engineering</span>
                        <span class="stream-tag">CSE - AIML</span>
                        <span class="stream-tag">CSE - Data Science</span>
                        <span class="stream-tag">CSE - IoT</span>
                        <span class="stream-tag">And more...</span>
                    </div>
                </div>

                <div class="about-footer">
                    <div class="version-info">
                        <strong>Version 2.0.0</strong> • Updated July 2025
                    </div>
                    <div class="credits">
                        <p>Designed and developed with ❤️ for ITER students</p>
                    </div>
                </div>
            </div>
        `;
        modalContainer.classList.remove('hidden');
    }

    function initializeYearDropdown() {
        console.log('Initializing year dropdown');
        console.log('Year dropdown element:', yearDropdown);
        console.log('CONFIG.years:', CONFIG.years);
        
        yearDropdown.innerHTML = '<option value="">Select Year</option>';
        CONFIG.years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearDropdown.appendChild(option);
        });
        
        console.log('Year dropdown populated with', yearDropdown.children.length, 'options');

        yearDropdown.addEventListener('change', () => {
            console.log('Year changed to:', yearDropdown.value);
            if (yearDropdown.value) {
                state.currentYear = yearDropdown.value;
                animateHide(yearSelection, () => {
                    yearSelection.classList.add('hidden');
                    streamSelection.classList.remove('hidden');
                    animateShow(streamSelection);
                });
                initializeStreamDropdown();
                
                if (state.lastVisited && state.lastVisited.year === state.currentYear) {
                    autoSelectValue(streamDropdown, state.lastVisited.stream);
                }
            }
        });

        if (state.lastVisited) {
            autoSelectValue(yearDropdown, state.lastVisited.year);
        }
    }

    window.initializeYearDropdown = initializeYearDropdown;

    function initializeStreamDropdown() {
        streamDropdown.innerHTML = '<option value="">Select Stream</option>';
        CONFIG.streams.forEach(stream => {
            const option = document.createElement('option');
            option.value = stream.shortCode;
            option.textContent = stream.displayName;
            streamDropdown.appendChild(option);
        });

        streamDropdown.addEventListener('change', () => {
            if (streamDropdown.value) {
                state.currentStream = streamDropdown.value;
                animateHide(streamSelection, () => {
                    streamSelection.classList.add('hidden');
                    semesterSelection.classList.remove('hidden');
                    animateShow(semesterSelection);
                });
                initializeSemesterDropdown();
                
                if (state.lastVisited && 
                    state.lastVisited.year === state.currentYear && 
                    state.lastVisited.stream === state.currentStream) {
                    autoSelectValue(semesterDropdown, state.lastVisited.semester);
                }
            }
        });
    }

    function initializeSemesterDropdown() {
        semesterDropdown.innerHTML = '<option value="">Select Semester</option>';
        CONFIG.semesters.forEach(semester => {
            const option = document.createElement('option');
            option.value = semester;
            option.textContent = `Semester ${semester}`;
            semesterDropdown.appendChild(option);
        });

        semesterDropdown.addEventListener('change', () => {
            if (semesterDropdown.value) {
                state.currentSemester = semesterDropdown.value;
                state.currentPart = 1;
                state.viewingAdditional = false;
                
                console.log('Semester selected:', state.currentSemester);
                
                // Always show loading and switch to viewer first
                showLoadingGlobal("Loading curriculum image...");
                
                setTimeout(() => {
                    selectionContainer.classList.add('hidden');
                    viewerContainer.classList.remove('hidden');
                    
                    // Then load the curriculum image
                    loadCurriculumImage();
                    
                    setTimeout(() => {
                        ensureDownloadAndClickEventListeners();
                    }, 1000);
                }, 200);
            }
        });
    }

    function loadCurriculumImage() {
        state.currentPart = 1;
        checkImageParts();
    }

    function checkImageParts() {
        console.log('Starting image check with current state:', {
            year: state.currentYear,
            stream: state.currentStream,
            semester: state.currentSemester
        });
        
        // Always show loading first
        showLoadingGlobal("Checking for curriculum images...");
        
        const cachedPaths = getCachedImagePaths();
        if (cachedPaths && cachedPaths.length > 0) {
            console.log('Using cached paths for fast check');
            const availableParts = getAvailablePartsFromCache(
                state.currentYear,
                state.currentStream,
                state.currentSemester,
                cachedPaths
            );
            
            if (availableParts.totalParts > 0) {
                console.log('Found images in cache:', availableParts);
                state.totalParts = availableParts.totalParts;
                state.hasSingleImage = availableParts.hasSingleImage;
                
                loadImageWithPart();
                updateImageNavigationButtons();
                updateHeader();
                saveLastVisitedState();
                setupViewerEventListeners();
                return;
            } else {
                console.log('Cache shows no images, performing live check as fallback');
            }
        }
        
        console.log('Performing live image check...');
        state.totalParts = 0;
        state.hasSingleImage = false;
        
        const checkPartPromises = [];
        let hasMainImage = false;
        let maxPartFound = 0;
        
        const mainImagePath = CONFIG.getImagePath(
            state.currentYear, 
            state.currentStream, 
            state.currentSemester
        );
        
        console.log('Checking main image path:', mainImagePath);
        
        const mainImagePromise = imageExists(mainImagePath)
            .then(exists => {
                console.log('Main image exists:', exists);
                if (exists) {
                    hasMainImage = true;
                }
            });
            
        checkPartPromises.push(mainImagePromise);
        
        for (let i = 1; i <= 10; i++) {  
            const imagePath = CONFIG.getImagePath(
                state.currentYear, 
                state.currentStream, 
                state.currentSemester, 
                i
            );
            
            const partPromise = imageExists(imagePath)
                .then(exists => {
                    if (exists) {
                        console.log(`Part ${i} exists:`, imagePath);
                        maxPartFound = Math.max(maxPartFound, i);
                    }
                });
                
            checkPartPromises.push(partPromise);
        }
        
        Promise.all(checkPartPromises).then(() => {
            if (maxPartFound > 0) {
                state.totalParts = maxPartFound;
                state.hasSingleImage = false;
                console.log(`Found ${maxPartFound} parts`);
            } else if (hasMainImage) {
                state.totalParts = 1;
                state.hasSingleImage = true;
                console.log('Found single main image');
            }
            
            console.log('Image check completed for:', {
                year: state.currentYear,
                stream: state.currentStream,
                semester: state.currentSemester,
                totalParts: state.totalParts,
                hasSingleImage: state.hasSingleImage,
                hasMainImage: hasMainImage,
                maxPartFound: maxPartFound
            });
            
            if (state.totalParts > 0) {
                console.log('Loading images...');
                loadImageWithPart();
                updateImageNavigationButtons();
                updateHeader();
                saveLastVisitedState();
                setupViewerEventListeners();
            } else {
                console.log('No images found, showing no images popup');
                hideLoadingGlobal();
                showNoImagesPopup();
            }
        }).catch(error => {
            console.error('Error during image check:', error);
            hideLoadingGlobal();
            showErrorGlobal('Failed to load curriculum images. Please try again.');
        });
    }

    window.checkImageParts = checkImageParts;
    window.globalCheckImageParts = checkImageParts;
    window.loadImageWithPart = loadImageWithPart;
    window.updateImageNavigationButtons = updateImageNavigationButtons;
    window.updateHeader = updateHeader;
    window.saveLastVisitedState = saveLastVisitedState;
    window.loadImage = loadImage;
    window.loadCurriculumImage = loadCurriculumImage;
    window.animateHide = animateHide;
    window.animateShow = animateShow;

    function setupViewerEventListeners() {
        const downloadBtn = document.getElementById('download-image');
        if (downloadBtn) {
            downloadBtn.removeEventListener('click', downloadCurrentImage);
            downloadBtn.addEventListener('click', downloadCurrentImage);
        }
        
        if (curriculumImage) {
            curriculumImage.removeEventListener('click', openImageInNewWindow);
            curriculumImage.addEventListener('click', openImageInNewWindow);
        }
        
        if (changeSelectionBtn) {
            changeSelectionBtn.removeEventListener('click', handleChangeSelectionClick);
            changeSelectionBtn.addEventListener('click', handleChangeSelectionClick);
            changeSelectionBtn.removeEventListener('touchend', handleChangeSelectionClick);
            changeSelectionBtn.addEventListener('touchend', handleChangeSelectionClick);
        }
        
        document.querySelectorAll('#change-selection-dropdown button').forEach(btn => {
            btn.removeEventListener('click', handleChangeDropdownClick);
            btn.addEventListener('click', handleChangeDropdownClick);
            btn.removeEventListener('touchend', handleChangeDropdownClick);
            btn.addEventListener('touchend', handleChangeDropdownClick);
        });
    }
    
    function handleChangeSelectionClick(e) {
        e.preventDefault();
        e.stopPropagation();
        changeSelectionDropdown.classList.toggle('hidden');
    }
    
    function handleChangeDropdownClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const changeType = e.target.dataset.change;
        openChangeSelectionModal(changeType);
        changeSelectionDropdown.classList.add('hidden');
    }

    function loadImageWithPart() {
        if (state.currentPart > state.totalParts) {
            state.currentPart = state.totalParts;
        }
        
        if (state.currentPart < 1) {
            state.currentPart = 1;
        }
        
        let imagePath;
        
        if (state.hasSingleImage && state.currentPart === 1) {
            imagePath = CONFIG.getImagePath(
                state.currentYear, 
                state.currentStream, 
                state.currentSemester
            );
        } else {
            imagePath = CONFIG.getImagePath(
                state.currentYear, 
                state.currentStream, 
                state.currentSemester, 
                state.currentPart
            );
        }
        
        loadImage(imagePath);
        updateImageCounter();
    }

    function updateImageCounter() {
        imageCounter.textContent = `${state.currentPart}/${state.totalParts}`;
    }

    function updateImageNavigationButtons() {
        if (state.viewingAdditional) {
            prevImageBtn.disabled = state.currentAdditionalIndex <= 0;
            nextImageBtn.disabled = state.currentAdditionalIndex >= state.additionalFiles.length - 1;
            imageCounter.textContent = `${state.currentAdditionalIndex + 1}/${state.additionalFiles.length}`;
        } else {
            prevImageBtn.disabled = state.currentPart <= 1;
            nextImageBtn.disabled = state.currentPart >= state.totalParts;
            updateImageCounter();
        }
    }

    function navigateToPreviousImage() {
        if (state.viewingAdditional) {
            if (state.currentAdditionalIndex > 0) {
                state.currentAdditionalIndex--;
                
                curriculumImage.style.animation = 'slideInLeft 0.4s ease forwards';
                setTimeout(() => {
                    loadImage(state.additionalFiles[state.currentAdditionalIndex]);
                    updateImageNavigationButtons();
                    updateHeader();
                }, 100);
            }
        } else {
            if (state.currentPart > 1) {
                state.currentPart--;
                
                curriculumImage.style.animation = 'slideInLeft 0.4s ease forwards';
                setTimeout(() => {
                    loadImageWithPart();
                    updateImageNavigationButtons();
                    updateHeader();
                }, 100);
            }
        }
    }

    function navigateToNextImage() {
        if (state.viewingAdditional) {
            if (state.currentAdditionalIndex < state.additionalFiles.length - 1) {
                state.currentAdditionalIndex++;
                
                curriculumImage.style.animation = 'slideInRight 0.4s ease forwards';
                setTimeout(() => {
                    loadImage(state.additionalFiles[state.currentAdditionalIndex]);
                    updateImageNavigationButtons();
                    updateHeader();
                }, 100);
            }
        } else {
            if (state.currentPart < state.totalParts) {
                state.currentPart++;
                
                curriculumImage.style.animation = 'slideInRight 0.4s ease forwards';
                setTimeout(() => {
                    loadImageWithPart();
                    updateImageNavigationButtons();
                    updateHeader();
                }, 100);
            }
        }
    }

    function loadAdditionalFiles() {
        const additionalPath = CONFIG.getAdditionalResourcesPath(
            state.currentYear, 
            state.currentStream
        );
        
        showLoading("Loading additional resources");
        
        fetchAdditionalFiles(additionalPath)
            .then(files => {
                if (files.length > 0) {
                    state.additionalFiles = files;
                    state.currentAdditionalIndex = 0;
                    state.viewingAdditional = true;
                    backToMainBtn.classList.remove('hidden');
                    
                    loadImage(files[0]);
                    updateImageNavigationButtons();
                    updateHeader();
                } else {
                    hideLoading();
                    showNoAdditionalFilesPopup();
                }
            })
            .catch(err => {
                hideLoading();
                showNoAdditionalFilesPopup();
                console.error(err);
            });
    }

    const loadImage = async (src) => {
        console.log('📸 Loading image:', src);
        
        const globalLoadingActive = !loadingContainer.classList.contains('hidden');
        
        if (!globalLoadingActive) {
            showLoading();
        }
        
        try {
            const response = await fetch(src);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (globalLoadingActive) {
                hideLoadingGlobal();
            } else {
                hideLoading();
            }
            
            const objectURL = URL.createObjectURL(blob);
            curriculumImage.src = objectURL;
            updateHeader();
            
            curriculumImage.onload = () => {
                URL.revokeObjectURL(objectURL);
                console.log('✅ Image loaded successfully');
            };
            
        } catch (error) {
            if (globalLoadingActive) {
                hideLoadingGlobal();
            } else {
                hideLoading();
            }
            
            console.error('❌ Error loading image:', error);
            showError(`Failed to load image: ${error.message}`);
        }
    };



    function showLoading(message) {
        loadingContainer.classList.remove('hidden');
        imageTooltip.classList.add('hidden');
        loadingBarInner.style.width = '0%';
        loadingPercentage.textContent = '0%';
        
        loadingContainer.style.opacity = '0';
        void loadingContainer.offsetWidth; 
        loadingContainer.style.animation = 'fadeIn 0.4s ease forwards';
        
        curriculumImage.classList.add('hidden');
    }

    function hideLoading() {
        loadingContainer.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            curriculumImage.classList.remove('hidden');
            
            curriculumImage.style.opacity = '0';
            void curriculumImage.offsetWidth; 
            curriculumImage.style.animation = 'zoomIn 0.5s ease forwards';
            
            setTimeout(() => {
                imageTooltip.classList.remove('hidden');
            }, 800);
        }, 300);
    }

    function showError(message) {
        hideLoading();
        
        if (message.includes('Network error') || message.includes('Failed to load image')) {
            showPopup({
                icon: 'error',
                title: 'Connection Error',
                message: `Unable to load the curriculum image due to a network issue.<br><br>Please check your internet connection and try again.`,
                buttons: [
                    {
                        text: 'Retry',
                        type: 'primary',
                        action: () => {
                            closePopup();
                            loadCurriculumImage();
                        }
                    },
                    {
                        text: 'Go Back',
                        type: 'secondary',
                        action: () => {
                            closePopup();
                            viewerContainer.classList.add('hidden');
                            selectionContainer.classList.remove('hidden');
                            animateShow(selectionContainer);
                        }
                    }
                ],
                autoClose: 8000
            });
        } else {
            showPopup({
                icon: 'warning',
                title: 'Error',
                message: message,
                buttons: [
                    {
                        text: 'OK',
                        type: 'primary',
                        action: () => {
                            closePopup();
                        }
                    }
                ],
                autoClose: 5000
            });
        }
    }

    function downloadCurrentImage() {
        if (!curriculumImage.src) {
            showError('No image to download');
            return;
        }

        const link = document.createElement('a');
        link.href = curriculumImage.src;
        
        const stream = CONFIG.streams.find(s => s.shortCode === state.currentStream);
        const streamName = stream ? stream.shortCode : state.currentStream;
        
        let filename = `ITER_${state.currentYear}_${streamName}_Sem${state.currentSemester}`;
        
        if (state.viewingAdditional) {
            const additionalFileName = state.additionalFiles[state.currentAdditionalIndex].split('/').pop().split('.')[0];
            filename += `_Additional_${additionalFileName}`;
        } else if (state.totalParts > 1) {
            filename += `_Part${state.currentPart}`;
        }
        
        filename += '.webp';
        
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openImageInNewWindow() {
        if (!curriculumImage.src) {
            return;
        }
        
        const newWindow = window.open(curriculumImage.src, '_blank');
        if (!newWindow) {
            const link = document.createElement('a');
            link.href = curriculumImage.src;
            link.target = '_blank';
            link.click();
        }
    }

    function updateHeader() {
        const stream = CONFIG.streams.find(s => s.shortCode === state.currentStream);
        
        if (state.viewingAdditional) {
            imageInfo.innerHTML = `
                <p><strong>Additional Resource</strong></p>
                <p><strong>Year:</strong> ${state.currentYear}</p>
                <p><strong>Stream:</strong> ${stream ? stream.name : state.currentStream}</p>
            `;
        } else {
            imageInfo.innerHTML = `
                <p><strong>Year:</strong> ${state.currentYear}</p>
                <p><strong>Stream:</strong> ${stream ? stream.name : state.currentStream}</p>
                <p><strong>Semester:</strong> ${state.currentSemester}</p>
                ${state.totalParts > 1 ? `<p><strong>Part:</strong> ${state.currentPart} of ${state.totalParts}</p>` : ''}
            `;
        }
    }

    function handleBackNavigation(event) {
        const backTo = event.target.dataset.backTo;
        
        if (backTo === 'year') {
            animateHide(streamSelection, () => {
                streamSelection.classList.add('hidden');
                yearSelection.classList.remove('hidden');
                animateShow(yearSelection);
            });
        } else if (backTo === 'stream') {
            animateHide(semesterSelection, () => {
                semesterSelection.classList.add('hidden');
                streamSelection.classList.remove('hidden');
                animateShow(streamSelection);
            });
        }
    }
    
    function animateHide(element, callback) {
        element.style.opacity = '1';
        element.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }
    
    function animateShow(element) {
        element.style.opacity = '0';
        void element.offsetWidth; 
        element.style.animation = 'fadeIn 0.3s ease forwards';
    }
    
    function animateImageTransition(callback) {
        if (curriculumImage.src) {
            curriculumImage.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (callback) callback();
                setTimeout(() => {
                    curriculumImage.style.animation = 'fadeIn 0.3s ease forwards';
                }, 50);
            }, 200);
        } else {
            if (callback) callback();
        }
    }

    function openChangeSelectionModal(type) {
        modalTitle.textContent = `Change ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        
        let content = '';
        if (type === 'year') {
            content = createYearChangeContent();
        } else if (type === 'stream') {
            content = createStreamChangeContent();
        } else if (type === 'semester') {
            content = createSemesterChangeContent();
        }
        
        document.querySelector('.modal-content').innerHTML = content;
        modalContainer.classList.remove('hidden');
        
        const dropdown = document.querySelector('#modal-dropdown');
        if (dropdown) {
            dropdown.addEventListener('change', () => {
                const value = dropdown.value;
                if (value) {
                    const previousState = {
                        year: state.currentYear,
                        stream: state.currentStream,
                        semester: state.currentSemester
                    };
                    
                    if (type === 'year') {
                        state.currentYear = value;
                    } else if (type === 'stream') {
                        state.currentStream = value;
                    } else if (type === 'semester') {
                        state.currentSemester = value;
                    }
                    
                    state.currentPart = 1;
                    state.viewingAdditional = false;
                    backToMainBtn.classList.add('hidden');
                    closeModal();
                    
                    showLoading("Loading new curriculum...");
                    
                    setTimeout(() => {
                        console.log('Checking images with new state:', {
                            year: state.currentYear,
                            stream: state.currentStream,
                            semester: state.currentSemester
                        });
                        checkImageParts();
                    }, 150);
                }
            });
        }
    }

    function createYearChangeContent() {
        let options = '<option value="">Select Year</option>';
        CONFIG.years.forEach(year => {
            const selected = year == state.currentYear ? 'selected' : '';
            options += `<option value="${year}" ${selected}>${year}</option>`;
        });
        
        return `<select id="modal-dropdown">${options}</select>`;
    }

    function createStreamChangeContent() {
        let options = '<option value="">Select Stream</option>';
        CONFIG.streams.forEach(stream => {
            const selected = stream.shortCode === state.currentStream ? 'selected' : '';
            options += `<option value="${stream.shortCode}" ${selected}>${stream.displayName}</option>`;
        });
        
        return `<select id="modal-dropdown">${options}</select>`;
    }

    function createSemesterChangeContent() {
        let options = '<option value="">Select Semester</option>';
        CONFIG.semesters.forEach(semester => {
            const selected = semester == state.currentSemester ? 'selected' : '';
            options += `<option value="${semester}" ${selected}>Semester ${semester}</option>`;
        });
        
        return `<select id="modal-dropdown">${options}</select>`;
    }

    function closeModal() {
        const modalElement = modalContainer.querySelector('.modal');
        modalElement.style.animation = 'zoomOut 0.3s ease forwards';
        modalContainer.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            modalContainer.classList.add('hidden');
            modalElement.style.animation = '';
            modalContainer.style.animation = '';
        }, 300);
    }

    function saveLastVisitedState() {
        const stateToSave = {
            year: state.currentYear,
            stream: state.currentStream,
            semester: state.currentSemester
        };
        
        localStorage.setItem('iterCurriculumLastVisited', JSON.stringify(stateToSave));
        state.lastVisited = stateToSave;
    }

    function loadLastVisitedState() {
        try {
            const savedState = localStorage.getItem('iterCurriculumLastVisited');
            if (savedState) {
                state.lastVisited = JSON.parse(savedState);
            }
        } catch (error) {
            console.error('Failed to load saved state:', error);
        }
    }

    function autoSelectValue(dropdown, value) {
        if (value && dropdown) {
            dropdown.value = value;
            const event = new Event('change');
            dropdown.dispatchEvent(event);
        }
    }

    function preloadNextImagesIntelligent() {
        console.log('� Efficient caching mode: No preloading needed');
    }

    function preloadNextImages() {
        console.log('📝 Efficient caching mode: Current image only');
    }

    curriculumImage.addEventListener('load', preloadNextImages);

});
