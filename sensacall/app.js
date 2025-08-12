// SensaCall Mobile PWA - Main Application
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        API_ENDPOINT: '/api',
        MESSAGE_BATCH_SIZE: 20,
        TYPING_INDICATOR_DELAY: 500,
        PULL_TO_REFRESH_THRESHOLD: 80,
        SWIPE_THRESHOLD: 50,
        VOICE_MAX_DURATION: 300000, // 5 minutes
        HAPTIC_ENABLED: 'vibrate' in navigator,
        LAZY_LOAD_OFFSET: 100,
        VIRTUAL_SCROLL_BUFFER: 5
    };

    // Application State
    const state = {
        currentMode: 'text',
        currentConversation: null,
        conversations: [],
        messages: [],
        isRecording: false,
        isTyping: false,
        isSideMenuOpen: false,
        isQuickActionsOpen: false,
        pullToRefreshActive: false,
        touchStartY: 0,
        touchStartX: 0,
        mediaRecorder: null,
        audioChunks: [],
        virtualScrollIndex: 0,
        messageCache: new Map(),
        intersectionObserver: null,
        resizeObserver: null
    };

    // DOM Elements
    let elements = {};

    // Initialize Application
    function init() {
        cacheDOMElements();
        registerServiceWorker();
        setupEventListeners();
        setupTouchGestures();
        setupIntersectionObserver();
        setupResizeObserver();
        initializeVirtualScroll();
        loadConversations();
        checkInstallPrompt();
        requestNotificationPermission();
        setupKeyboardHandling();
        
        // Initialize with a welcome message
        addMessage('assistant', 'Welcome to SensaCall! How can I help you today?');
    }

    // Cache DOM Elements
    function cacheDOMElements() {
        elements = {
            app: document.getElementById('app'),
            header: document.querySelector('.app-header'),
            menuToggle: document.querySelector('.menu-toggle'),
            installBtn: document.querySelector('.install-btn'),
            modeSelector: document.getElementById('modeSelector'),
            modeBtns: document.querySelectorAll('.mode-btn'),
            mainContent: document.getElementById('mainContent'),
            pullToRefresh: document.getElementById('pullToRefresh'),
            chatContainer: document.getElementById('chatContainer'),
            chatMessages: document.getElementById('chatMessages'),
            virtualScroll: document.getElementById('virtualScroll'),
            voiceInterface: document.getElementById('voiceInterface'),
            voiceTimer: document.getElementById('voiceTimer'),
            voiceCancelBtn: document.getElementById('voiceCancelBtn'),
            audioVisualizer: document.getElementById('audioVisualizer'),
            inputArea: document.getElementById('inputArea'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            voiceBtn: document.getElementById('voiceBtn'),
            attachBtn: document.querySelector('.attach-btn'),
            fab: document.getElementById('fab'),
            quickActions: document.getElementById('quickActions'),
            sideMenu: document.getElementById('sideMenu'),
            closeMenu: document.getElementById('closeMenu'),
            conversationList: document.getElementById('conversationList'),
            newConversationBtn: document.getElementById('newConversationBtn'),
            overlay: document.getElementById('overlay'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            toastContainer: document.getElementById('toastContainer')
        };
    }

    // Register Service Worker
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('New version available! Refresh to update.', 'info');
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // Menu Toggle
        elements.menuToggle.addEventListener('click', toggleSideMenu);
        elements.closeMenu.addEventListener('click', closeSideMenu);
        elements.overlay.addEventListener('click', () => {
            closeSideMenu();
            closeQuickActions();
        });

        // Mode Selection
        elements.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // Input Handling
        elements.messageInput.addEventListener('input', handleInputChange);
        elements.messageInput.addEventListener('keydown', handleKeyPress);
        elements.sendBtn.addEventListener('click', sendMessage);
        elements.voiceBtn.addEventListener('click', toggleVoiceRecording);
        elements.voiceCancelBtn.addEventListener('click', cancelVoiceRecording);
        elements.attachBtn.addEventListener('click', handleAttachment);

        // FAB
        elements.fab.addEventListener('click', toggleQuickActions);

        // Quick Actions
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
        });

        // New Conversation
        elements.newConversationBtn.addEventListener('click', createNewConversation);

        // Install Button
        elements.installBtn.addEventListener('click', installApp);

        // Page Visibility
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Online/Offline
        window.addEventListener('online', () => showToast('Back online!', 'success'));
        window.addEventListener('offline', () => showToast('You are offline', 'warning'));
    }

    // Setup Touch Gestures
    function setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let pullDistance = 0;
        let isSwipeActive = false;

        // Pull to Refresh
        elements.chatContainer.addEventListener('touchstart', (e) => {
            if (elements.chatContainer.scrollTop === 0) {
                touchStartY = e.touches[0].clientY;
                state.pullToRefreshActive = true;
            }
        });

        elements.chatContainer.addEventListener('touchmove', (e) => {
            if (state.pullToRefreshActive && elements.chatContainer.scrollTop === 0) {
                pullDistance = e.touches[0].clientY - touchStartY;
                
                if (pullDistance > 0 && pullDistance < 150) {
                    e.preventDefault();
                    elements.pullToRefresh.style.top = `${Math.min(pullDistance - 60, 20)}px`;
                    
                    if (pullDistance > CONFIG.PULL_TO_REFRESH_THRESHOLD) {
                        elements.pullToRefresh.classList.add('active');
                    }
                }
            }
        });

        elements.chatContainer.addEventListener('touchend', () => {
            if (state.pullToRefreshActive && pullDistance > CONFIG.PULL_TO_REFRESH_THRESHOLD) {
                refreshConversation();
            }
            
            elements.pullToRefresh.style.top = '-60px';
            elements.pullToRefresh.classList.remove('active');
            state.pullToRefreshActive = false;
            pullDistance = 0;
        });

        // Swipe Gestures for Mode Selector
        elements.modeSelector.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            isSwipeActive = true;
        });

        elements.modeSelector.addEventListener('touchmove', (e) => {
            if (!isSwipeActive) return;
            touchEndX = e.touches[0].clientX;
        });

        elements.modeSelector.addEventListener('touchend', () => {
            if (!isSwipeActive) return;
            
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) > CONFIG.SWIPE_THRESHOLD) {
                if (swipeDistance > 0) {
                    switchToPreviousMode();
                } else {
                    switchToNextMode();
                }
            }
            
            isSwipeActive = false;
        });

        // Swipe to Open Menu
        elements.app.addEventListener('touchstart', (e) => {
            if (e.touches[0].clientX < 20) {
                touchStartX = e.touches[0].clientX;
                isSwipeActive = true;
            }
        });

        elements.app.addEventListener('touchmove', (e) => {
            if (!isSwipeActive) return;
            
            const currentX = e.touches[0].clientX;
            const distance = currentX - touchStartX;
            
            if (distance > 0 && distance < 280) {
                elements.sideMenu.style.left = `${distance - 280}px`;
            }
        });

        elements.app.addEventListener('touchend', (e) => {
            if (!isSwipeActive) return;
            
            const distance = e.changedTouches[0].clientX - touchStartX;
            if (distance > 100) {
                openSideMenu();
            } else {
                elements.sideMenu.style.left = '';
            }
            
            isSwipeActive = false;
        });

        // Long Press for Message Options
        let longPressTimer;
        elements.chatMessages.addEventListener('touchstart', (e) => {
            const message = e.target.closest('.message');
            if (message) {
                longPressTimer = setTimeout(() => {
                    hapticFeedback();
                    showMessageOptions(message);
                }, 500);
            }
        });

        elements.chatMessages.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });

        elements.chatMessages.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });
    }

    // Setup Intersection Observer for Lazy Loading
    function setupIntersectionObserver() {
        const options = {
            root: elements.chatContainer,
            rootMargin: `${CONFIG.LAZY_LOAD_OFFSET}px`,
            threshold: 0.1
        };

        state.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    if (element.dataset.src) {
                        element.src = element.dataset.src;
                        delete element.dataset.src;
                        state.intersectionObserver.unobserve(element);
                    }
                }
            });
        }, options);
    }

    // Setup Resize Observer for Keyboard Handling
    function setupResizeObserver() {
        if ('ResizeObserver' in window) {
            state.resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target === document.documentElement) {
                        handleViewportResize();
                    }
                }
            });
            
            state.resizeObserver.observe(document.documentElement);
        }
    }

    // Initialize Virtual Scrolling
    function initializeVirtualScroll() {
        elements.chatContainer.addEventListener('scroll', throttle(() => {
            updateVirtualScroll();
        }, 100));
    }

    // Update Virtual Scroll
    function updateVirtualScroll() {
        const scrollTop = elements.chatContainer.scrollTop;
        const containerHeight = elements.chatContainer.clientHeight;
        const messageHeight = 80; // Average message height
        
        const startIndex = Math.max(0, Math.floor(scrollTop / messageHeight) - CONFIG.VIRTUAL_SCROLL_BUFFER);
        const endIndex = Math.min(
            state.messages.length,
            Math.ceil((scrollTop + containerHeight) / messageHeight) + CONFIG.VIRTUAL_SCROLL_BUFFER
        );
        
        renderVisibleMessages(startIndex, endIndex);
    }

    // Render Visible Messages (Virtual Scrolling)
    function renderVisibleMessages(startIndex, endIndex) {
        const fragment = document.createDocumentFragment();
        
        // Add spacer for messages above
        if (startIndex > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = `${startIndex * 80}px`;
            fragment.appendChild(spacer);
        }
        
        // Render visible messages
        for (let i = startIndex; i < endIndex; i++) {
            const message = state.messages[i];
            if (message) {
                const messageEl = createMessageElement(message);
                fragment.appendChild(messageEl);
            }
        }
        
        // Add spacer for messages below
        if (endIndex < state.messages.length) {
            const spacer = document.createElement('div');
            spacer.style.height = `${(state.messages.length - endIndex) * 80}px`;
            fragment.appendChild(spacer);
        }
        
        elements.virtualScroll.innerHTML = '';
        elements.virtualScroll.appendChild(fragment);
    }

    // Switch Mode
    function switchMode(mode) {
        state.currentMode = mode;
        
        elements.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        hapticFeedback();
        showToast(`Switched to ${mode} mode`, 'success');
        
        // Update UI based on mode
        updateUIForMode(mode);
    }

    // Update UI for Mode
    function updateUIForMode(mode) {
        switch(mode) {
            case 'voice':
                elements.voiceBtn.style.display = 'flex';
                elements.messageInput.placeholder = 'Tap mic to record...';
                break;
            case 'video':
                // Setup video UI
                break;
            case 'avatar':
                // Setup avatar UI
                break;
            default:
                elements.voiceBtn.style.display = 'flex';
                elements.messageInput.placeholder = 'Type a message...';
        }
    }

    // Switch to Previous Mode
    function switchToPreviousMode() {
        const modes = ['text', 'voice', 'video', 'avatar'];
        const currentIndex = modes.indexOf(state.currentMode);
        const previousIndex = (currentIndex - 1 + modes.length) % modes.length;
        switchMode(modes[previousIndex]);
    }

    // Switch to Next Mode
    function switchToNextMode() {
        const modes = ['text', 'voice', 'video', 'avatar'];
        const currentIndex = modes.indexOf(state.currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        switchMode(modes[nextIndex]);
    }

    // Toggle Side Menu
    function toggleSideMenu() {
        state.isSideMenuOpen = !state.isSideMenuOpen;
        elements.sideMenu.classList.toggle('active', state.isSideMenuOpen);
        elements.overlay.classList.toggle('active', state.isSideMenuOpen);
        hapticFeedback();
    }

    // Open Side Menu
    function openSideMenu() {
        state.isSideMenuOpen = true;
        elements.sideMenu.classList.add('active');
        elements.overlay.classList.add('active');
    }

    // Close Side Menu
    function closeSideMenu() {
        state.isSideMenuOpen = false;
        elements.sideMenu.classList.remove('active');
        elements.overlay.classList.remove('active');
    }

    // Toggle Quick Actions
    function toggleQuickActions() {
        state.isQuickActionsOpen = !state.isQuickActionsOpen;
        elements.quickActions.classList.toggle('hidden', !state.isQuickActionsOpen);
        elements.fab.classList.toggle('active', state.isQuickActionsOpen);
        hapticFeedback();
    }

    // Close Quick Actions
    function closeQuickActions() {
        state.isQuickActionsOpen = false;
        elements.quickActions.classList.add('hidden');
        elements.fab.classList.remove('active');
    }

    // Handle Quick Action
    function handleQuickAction(action) {
        closeQuickActions();
        
        switch(action) {
            case 'clear':
                clearChat();
                break;
            case 'export':
                exportChat();
                break;
            case 'settings':
                openSettings();
                break;
        }
        
        hapticFeedback();
    }

    // Send Message
    async function sendMessage() {
        const text = elements.messageInput.value.trim();
        if (!text) return;
        
        // Add user message
        addMessage('user', text);
        
        // Clear input
        elements.messageInput.value = '';
        autoResizeTextarea();
        
        // Haptic feedback
        hapticFeedback();
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Simulate API call
            const response = await simulateAPICall(text);
            hideTypingIndicator();
            addMessage('assistant', response);
        } catch (error) {
            hideTypingIndicator();
            showToast('Failed to send message', 'error');
        }
    }

    // Add Message
    function addMessage(sender, content, metadata = {}) {
        const message = {
            id: Date.now(),
            sender,
            content,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        
        state.messages.push(message);
        
        const messageEl = createMessageElement(message);
        elements.chatMessages.appendChild(messageEl);
        
        // Scroll to bottom
        setTimeout(() => {
            elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
        }, 100);
        
        // Save to cache
        saveMessageToCache(message);
    }

    // Create Message Element
    function createMessageElement(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender}`;
        messageEl.dataset.id = message.id;
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.textContent = message.content;
        
        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        timeEl.textContent = formatTime(message.timestamp);
        
        messageEl.appendChild(contentEl);
        messageEl.appendChild(timeEl);
        
        return messageEl;
    }

    // Voice Recording
    async function toggleVoiceRecording() {
        if (state.isRecording) {
            stopVoiceRecording();
        } else {
            await startVoiceRecording();
        }
    }

    // Start Voice Recording
    async function startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];
            
            state.mediaRecorder.ondataavailable = (event) => {
                state.audioChunks.push(event.data);
            };
            
            state.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                processVoiceMessage(audioBlob);
            };
            
            state.mediaRecorder.start();
            state.isRecording = true;
            
            // Update UI
            elements.voiceInterface.classList.remove('hidden');
            elements.voiceBtn.classList.add('recording');
            
            // Start timer
            startVoiceTimer();
            
            // Setup visualizer
            setupAudioVisualizer(stream);
            
            hapticFeedback('long');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            showToast('Microphone access denied', 'error');
        }
    }

    // Stop Voice Recording
    function stopVoiceRecording() {
        if (state.mediaRecorder && state.isRecording) {
            state.mediaRecorder.stop();
            state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            state.isRecording = false;
            
            // Update UI
            elements.voiceInterface.classList.add('hidden');
            elements.voiceBtn.classList.remove('recording');
            
            // Stop timer
            stopVoiceTimer();
            
            hapticFeedback();
        }
    }

    // Cancel Voice Recording
    function cancelVoiceRecording() {
        if (state.mediaRecorder && state.isRecording) {
            state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            state.isRecording = false;
            state.audioChunks = [];
            
            // Update UI
            elements.voiceInterface.classList.add('hidden');
            elements.voiceBtn.classList.remove('recording');
            
            // Stop timer
            stopVoiceTimer();
            
            hapticFeedback();
            showToast('Recording cancelled', 'info');
        }
    }

    // Process Voice Message
    async function processVoiceMessage(audioBlob) {
        try {
            // Create audio URL
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Add voice message
            addMessage('user', 'Voice message', {
                type: 'voice',
                audioUrl: audioUrl,
                duration: state.recordingDuration
            });
            
            // Simulate transcription
            showTypingIndicator();
            const response = await simulateVoiceTranscription(audioBlob);
            hideTypingIndicator();
            addMessage('assistant', response);
            
        } catch (error) {
            console.error('Failed to process voice message:', error);
            showToast('Failed to process voice message', 'error');
        }
    }

    // Setup Audio Visualizer
    function setupAudioVisualizer(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        source.connect(analyser);
        analyser.fftSize = 256;
        
        const canvas = elements.audioVisualizer;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        function draw() {
            if (!state.isRecording) return;
            
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;
                
                ctx.fillStyle = `hsl(${250 + (i / bufferLength) * 60}, 70%, 50%)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }

    // Voice Timer
    let voiceTimerInterval;
    let recordingStartTime;
    
    function startVoiceTimer() {
        recordingStartTime = Date.now();
        state.recordingDuration = 0;
        
        voiceTimerInterval = setInterval(() => {
            const elapsed = Date.now() - recordingStartTime;
            state.recordingDuration = elapsed;
            
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            elements.voiceTimer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Stop if max duration reached
            if (elapsed >= CONFIG.VOICE_MAX_DURATION) {
                stopVoiceRecording();
                showToast('Maximum recording duration reached', 'warning');
            }
        }, 1000);
    }
    
    function stopVoiceTimer() {
        clearInterval(voiceTimerInterval);
        elements.voiceTimer.textContent = '00:00';
    }

    // Handle Attachment
    function handleAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx';
        input.multiple = true;
        
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                processAttachments(files);
            }
        });
        
        input.click();
        hapticFeedback();
    }

    // Process Attachments
    async function processAttachments(files) {
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showToast(`${file.name} is too large (max 10MB)`, 'error');
                continue;
            }
            
            // Create preview based on file type
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                addMessage('user', `Shared image: ${file.name}`, {
                    type: 'image',
                    imageUrl: url
                });
            } else {
                addMessage('user', `Shared file: ${file.name}`, {
                    type: 'file',
                    fileName: file.name,
                    fileSize: formatFileSize(file.size)
                });
            }
        }
    }

    // Haptic Feedback
    function hapticFeedback(type = 'light') {
        if (!CONFIG.HAPTIC_ENABLED) return;
        
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            long: [100],
            double: [20, 20, 20]
        };
        
        navigator.vibrate(patterns[type] || patterns.light);
    }

    // Show Typing Indicator
    function showTypingIndicator() {
        const indicator = createTypingIndicator();
        elements.chatMessages.appendChild(indicator);
        
        setTimeout(() => {
            elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
        }, 100);
    }

    // Hide Typing Indicator
    function hideTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Create Typing Indicator
    function createTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        return indicator;
    }

    // Show Toast
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Show Message Options
    function showMessageOptions(messageEl) {
        // Create options menu
        const menu = document.createElement('div');
        menu.className = 'message-options-menu';
        menu.innerHTML = `
            <button data-action="copy">Copy</button>
            <button data-action="delete">Delete</button>
            <button data-action="forward">Forward</button>
            <button data-action="reply">Reply</button>
        `;
        
        // Position menu
        const rect = messageEl.getBoundingClientRect();
        menu.style.top = `${rect.top}px`;
        menu.style.left = `${rect.left}px`;
        
        document.body.appendChild(menu);
        
        // Handle actions
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                handleMessageAction(action, messageEl);
                menu.remove();
            }
        });
        
        // Remove on outside click
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 100);
    }

    // Handle Message Action
    function handleMessageAction(action, messageEl) {
        const messageId = messageEl.dataset.id;
        const message = state.messages.find(m => m.id == messageId);
        
        switch(action) {
            case 'copy':
                navigator.clipboard.writeText(message.content);
                showToast('Message copied', 'success');
                break;
            case 'delete':
                messageEl.remove();
                state.messages = state.messages.filter(m => m.id != messageId);
                break;
            case 'forward':
                // Implement forward
                break;
            case 'reply':
                elements.messageInput.value = `Reply to: ${message.content.substring(0, 50)}...\n`;
                elements.messageInput.focus();
                break;
        }
        
        hapticFeedback();
    }

    // Auto-resize Textarea
    function autoResizeTextarea() {
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 120) + 'px';
    }

    // Handle Input Change
    function handleInputChange() {
        autoResizeTextarea();
        
        // Update send button state
        const hasText = elements.messageInput.value.trim().length > 0;
        elements.sendBtn.style.display = hasText ? 'flex' : 'none';
        elements.voiceBtn.style.display = hasText ? 'none' : 'flex';
    }

    // Handle Key Press
    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Setup Keyboard Handling
    function setupKeyboardHandling() {
        // Adjust viewport when keyboard opens
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                const hasKeyboard = window.visualViewport.height < window.innerHeight;
                document.body.classList.toggle('keyboard-open', hasKeyboard);
                
                if (hasKeyboard) {
                    // Scroll to bottom when keyboard opens
                    setTimeout(() => {
                        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
                    }, 300);
                }
            });
        }
    }

    // Handle Viewport Resize
    function handleViewportResize() {
        // Update CSS variables for safe areas
        const root = document.documentElement;
        root.style.setProperty('--viewport-height', `${window.innerHeight}px`);
    }

    // Load Conversations
    async function loadConversations() {
        try {
            // Load from cache or API
            const conversations = await getConversationsFromCache();
            state.conversations = conversations;
            renderConversations();
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    // Render Conversations
    function renderConversations() {
        const fragment = document.createDocumentFragment();
        
        state.conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.id = conv.id;
            
            item.innerHTML = `
                <div class="conversation-title">${conv.title}</div>
                <div class="conversation-preview">${conv.lastMessage}</div>
            `;
            
            item.addEventListener('click', () => selectConversation(conv.id));
            
            fragment.appendChild(item);
        });
        
        elements.conversationList.innerHTML = '';
        elements.conversationList.appendChild(fragment);
    }

    // Select Conversation
    function selectConversation(conversationId) {
        state.currentConversation = conversationId;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id == conversationId);
        });
        
        // Load messages
        loadConversationMessages(conversationId);
        
        // Close menu on mobile
        if (window.innerWidth < 1024) {
            closeSideMenu();
        }
        
        hapticFeedback();
    }

    // Load Conversation Messages
    async function loadConversationMessages(conversationId) {
        try {
            // Show loading
            elements.loadingOverlay.classList.remove('hidden');
            
            // Load messages
            const messages = await getMessagesFromCache(conversationId);
            state.messages = messages;
            
            // Render messages
            renderMessages();
            
            // Hide loading
            elements.loadingOverlay.classList.add('hidden');
            
        } catch (error) {
            console.error('Failed to load messages:', error);
            elements.loadingOverlay.classList.add('hidden');
            showToast('Failed to load messages', 'error');
        }
    }

    // Render Messages
    function renderMessages() {
        const fragment = document.createDocumentFragment();
        
        state.messages.forEach(message => {
            const messageEl = createMessageElement(message);
            fragment.appendChild(messageEl);
        });
        
        elements.chatMessages.innerHTML = '';
        elements.chatMessages.appendChild(fragment);
        
        // Scroll to bottom
        setTimeout(() => {
            elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
        }, 100);
    }

    // Create New Conversation
    function createNewConversation() {
        const conversation = {
            id: Date.now(),
            title: `Conversation ${state.conversations.length + 1}`,
            lastMessage: 'New conversation',
            createdAt: new Date().toISOString()
        };
        
        state.conversations.unshift(conversation);
        renderConversations();
        selectConversation(conversation.id);
        
        hapticFeedback();
        showToast('New conversation created', 'success');
    }

    // Clear Chat
    function clearChat() {
        if (confirm('Are you sure you want to clear this chat?')) {
            state.messages = [];
            elements.chatMessages.innerHTML = '';
            hapticFeedback();
            showToast('Chat cleared', 'success');
        }
    }

    // Export Chat
    function exportChat() {
        const data = {
            conversation: state.currentConversation,
            messages: state.messages,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensacall-chat-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        hapticFeedback();
        showToast('Chat exported', 'success');
    }

    // Open Settings
    function openSettings() {
        // Implement settings UI
        showToast('Settings coming soon', 'info');
    }

    // Refresh Conversation
    async function refreshConversation() {
        try {
            await loadConversationMessages(state.currentConversation);
            hapticFeedback();
            showToast('Refreshed', 'success');
        } catch (error) {
            showToast('Failed to refresh', 'error');
        }
    }

    // Check Install Prompt
    let deferredPrompt;
    
    function checkInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            elements.installBtn.classList.remove('hidden');
        });
        
        window.addEventListener('appinstalled', () => {
            elements.installBtn.classList.add('hidden');
            showToast('App installed successfully!', 'success');
        });
    }

    // Install App
    async function installApp() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                showToast('Installing app...', 'info');
            }
            
            deferredPrompt = null;
            elements.installBtn.classList.add('hidden');
        }
    }

    // Request Notification Permission
    async function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showToast('Notifications enabled', 'success');
            }
        }
    }

    // Handle Visibility Change
    function handleVisibilityChange() {
        if (!document.hidden) {
            // Page is visible again
            // Check for new messages, update UI, etc.
        }
    }

    // Cache Operations
    async function saveMessageToCache(message) {
        try {
            const cache = await caches.open('messages-cache');
            const response = new Response(JSON.stringify(message));
            await cache.put(`/message/${message.id}`, response);
        } catch (error) {
            console.error('Failed to cache message:', error);
        }
    }

    async function getMessagesFromCache(conversationId) {
        try {
            const cache = await caches.open('messages-cache');
            const response = await cache.match(`/conversation/${conversationId}`);
            
            if (response) {
                return await response.json();
            }
            
            // Fallback to empty array
            return [];
        } catch (error) {
            console.error('Failed to get messages from cache:', error);
            return [];
        }
    }

    async function getConversationsFromCache() {
        try {
            const cache = await caches.open('conversations-cache');
            const response = await cache.match('/conversations');
            
            if (response) {
                return await response.json();
            }
            
            // Return default conversations
            return [
                {
                    id: 1,
                    title: 'General Chat',
                    lastMessage: 'Welcome to SensaCall!',
                    createdAt: new Date().toISOString()
                }
            ];
        } catch (error) {
            console.error('Failed to get conversations from cache:', error);
            return [];
        }
    }

    // Simulated API Calls
    async function simulateAPICall(message) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const responses = [
                    "I understand your message. How can I help you further?",
                    "That's interesting! Tell me more about it.",
                    "I'm processing your request. Here's what I found...",
                    "Great question! Let me think about that.",
                    "Thanks for sharing. Is there anything specific you'd like to know?"
                ];
                
                resolve(responses[Math.floor(Math.random() * responses.length)]);
            }, 1000 + Math.random() * 2000);
        });
    }

    async function simulateVoiceTranscription(audioBlob) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("I've received your voice message. Voice transcription will be available soon!");
            }, 2000);
        });
    }

    // Utility Functions
    function throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func(...args);
            }
        };
    }

    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();