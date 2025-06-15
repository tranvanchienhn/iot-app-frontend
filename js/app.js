// js/app.js - Tối ưu và hoàn chỉnh
class SmartHomeApp {
    constructor() {
        this.isInitialized = false;
        this.currentTheme = 'light';
        this.eventHandlers = new Map();
        this.performanceMetrics = {
            startTime: performance.now(),
            loadTime: null,
            interactionCount: 0
        };
        
        this.init();
    }

    async init() {
        try {
            this.showLoadingMessage('Khởi tạo ứng dụng...');
            
            // Initialize core systems
            await this.initializeCore();
            
            this.showLoadingMessage('Kiểm tra xác thực...');
            await this.checkAuthentication();
            
            this.showLoadingMessage('Tải dữ liệu...');
            await this.initializeApp();
            
            this.showLoadingMessage('Hoàn tất...');
            await this.finishInitialization();
            
            this.recordPerformanceMetric('loadTime', performance.now() - this.performanceMetrics.startTime);
            console.log(`App loaded in ${this.performanceMetrics.loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    showLoadingMessage(message) {
        const element = document.getElementById('loading-message');
        if (element) {
            element.textContent = message;
        }
    }

    async initializeCore() {
        // Initialize theme
        this.initializeTheme();
        
        // Setup event listeners
        this.setupGlobalEventListeners();
        
        // Initialize PWA features
        this.initializePWA();
        
        // Setup error handling
        this.setupErrorHandling();
        
        // Initialize accessibility features
        this.initializeAccessibility();
    }

    initializeTheme() {
        const savedTheme = Utils.storage.get('app_theme', 'light');
        this.applyTheme(savedTheme);
        
        // Watch for system theme changes
        if (savedTheme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    this.applySystemTheme(e.matches);
                }
            });
        }
    }

    applyTheme(theme) {
        const body = document.body;
        
        // Add transition class
        body.classList.add('theme-transition');
        
        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto', 'theme-high-contrast');
        
        // Apply new theme
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add(`theme-${theme}`);
        }
        
        this.currentTheme = theme;
        
        // Update meta theme color
        const themeColor = theme === 'dark' ? '#1A1A1A' : '#2196F3';
        document.querySelector('meta[name="theme-color"]').content = themeColor;
        
        // Save preference
        Utils.storage.set('app_theme', theme);
        
        // Remove transition class after animation
        setTimeout(() => {
            body.classList.remove('theme-transition');
        }, 300);
    }

    applySystemTheme(isDark) {
        const body = document.body;
        body.classList.remove('theme-light', 'theme-dark');
        body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    }

    setupGlobalEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Back button handling
        window.addEventListener('popstate', this.handlePopState.bind(this));
        
        // Touch gestures
        this.setupTouchGestures();
        
        // Network status
        window.addEventListener('online', () => {
            ui.showToast('Kết nối internet đã được khôi phục', 'success');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            ui.showToast('Đang hoạt động offline', 'warning');
        });
        
        // Visibility change
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    handleKeyboardShortcuts(event) {
        // Global shortcuts
        if (event.key === 'Escape') {
            if (ui.isModalOpen()) {
                ui.closeModal();
            } else if (ui.isVoiceActive) {
                ui.stopVoiceControl();
            }
            return;
        }
        
        // Navigation shortcuts (Ctrl/Cmd + number)
        if (event.ctrlKey || event.metaKey) {
            const shortcuts = {
                '1': 'home',
                '2': 'devices', 
                '3': 'analytics',
                '4': 'settings'
            };
            
            if (shortcuts[event.key]) {
                event.preventDefault();
                ui.showScreen(shortcuts[event.key]);
            }
        }
        
        // Quick actions (Alt + key)
        if (event.altKey) {
            switch (event.key) {
                case 'h':
                    event.preventDefault();
                    quickHeatWater(45);
                    break;
                case 't':
                    event.preventDefault();
                    quickStartTowelDrying();
                    break;
                case 'r':
                    event.preventDefault();
                    quickStartRoomHeating();
                    break;
                case 'v':
                    event.preventDefault();
                    ui.startVoiceControl();
                    break;
            }
        }
    }

    setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = touchEndTime - touchStartTime;
            
            // Swipe detection (minimum distance and maximum time)
            if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 300) {
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }
        }, { passive: true });
    }

    handleSwipeLeft() {
        const screens = ['home', 'devices', 'analytics', 'settings'];
        const currentIndex = screens.indexOf(ui.currentScreen);
        if (currentIndex < screens.length - 1) {
            ui.showScreen(screens[currentIndex + 1]);
        }
    }

    handleSwipeRight() {
        const screens = ['home', 'devices', 'analytics', 'settings'];
        const currentIndex = screens.indexOf(ui.currentScreen);
        if (currentIndex > 0) {
            ui.showScreen(screens[currentIndex - 1]);
        }
    }

    setupPerformanceMonitoring() {
        // Monitor interaction responsiveness
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
                }
            }
        });
        
        if ('observe' in observer) {
            observer.observe({ entryTypes: ['measure'] });
        }
        
        // Track user interactions
        ['click', 'touchstart', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.performanceMetrics.interactionCount++;
            }, { passive: true });
        });
    }

    recordPerformanceMetric(name, value) {
        this.performanceMetrics[name] = value;
        performance.mark(`smarthome-${name}`);
    }

    initializePWA() {
        // Service worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(registration => {
                   console.log('Service Worker registered:', registration);
                   this.handleServiceWorkerUpdates(registration);
               })
               .catch(error => {
                   console.error('Service Worker registration failed:', error);
               });
       }

       // Install prompt handling
       window.addEventListener('beforeinstallprompt', (e) => {
           e.preventDefault();
           this.installPrompt = e;
           
           // Show install prompt after user interaction
           setTimeout(() => {
               if (!Utils.storage.get('install_dismissed')) {
                   this.showInstallPrompt();
               }
           }, 30000); // Show after 30 seconds
       });

       // App installed event
       window.addEventListener('appinstalled', () => {
           this.hideInstallPrompt();
           ui.showToast('Ứng dụng đã được cài đặt thành công!', 'success');
           Utils.storage.set('app_installed', true);
       });

       // Handle URL shortcuts from manifest
       this.handleURLShortcuts();
   }

   handleServiceWorkerUpdates(registration) {
       registration.addEventListener('updatefound', () => {
           const newWorker = registration.installing;
           
           newWorker.addEventListener('statechange', () => {
               if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                   // Show update available notification
                   this.showUpdateAvailable();
               }
           });
       });
   }

   showUpdateAvailable() {
       const toast = ui.createToast(
           'Phiên bản mới có sẵn. Tải lại để cập nhật?',
           'info'
       );
       
       // Add reload button
       const reloadBtn = document.createElement('button');
       reloadBtn.className = 'btn btn-text btn-sm';
       reloadBtn.textContent = 'Tải lại';
       reloadBtn.onclick = () => window.location.reload();
       
       toast.querySelector('.toast-content').appendChild(reloadBtn);
       document.getElementById('toast-container').appendChild(toast);
   }

   handleURLShortcuts() {
       const urlParams = new URLSearchParams(window.location.search);
       const action = urlParams.get('action');
       
       if (action && dataManager.isLoggedIn()) {
           // Execute action after app loads
           setTimeout(() => {
               switch (action) {
                   case 'water_heater_on':
                       quickHeatWater(45);
                       break;
                   case 'towel_drying':
                       quickStartTowelDrying();
                       break;
                   case 'room_heating':
                       quickStartRoomHeating();
                       break;
               }
           }, 1000);
       }
   }

   setupErrorHandling() {
       // Global error handlers
       window.addEventListener('error', (event) => {
           this.handleError(event.error, 'Global error');
       });

       window.addEventListener('unhandledrejection', (event) => {
           this.handleError(event.reason, 'Unhandled promise rejection');
           event.preventDefault();
       });
   }

   handleError(error, context) {
       console.error(`${context}:`, error);
       
       // Log to analytics service (if available)
       if (window.gtag) {
           gtag('event', 'exception', {
               description: error.message,
               fatal: false
           });
       }
       
       // Show user-friendly error message
       if (!error.message?.includes('Network')) {
           ui.showToast('Đã xảy ra lỗi không mong muốn', 'error');
       }
   }

   initializeAccessibility() {
       // Focus management
       this.setupFocusManagement();
       
       // Keyboard navigation
       this.setupKeyboardNavigation();
       
       // Screen reader announcements
       this.setupScreenReaderAnnouncements();
       
       // Color contrast adjustments
       if (window.matchMedia('(prefers-contrast: high)').matches) {
           document.body.classList.add('high-contrast');
       }
       
       // Reduced motion support
       if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
           document.body.classList.add('reduced-motion');
       }
   }

   setupFocusManagement() {
       // Track focus for keyboard navigation
       document.addEventListener('keydown', (e) => {
           if (e.key === 'Tab') {
               document.body.classList.add('keyboard-navigation');
           }
       });

       document.addEventListener('mousedown', () => {
           document.body.classList.remove('keyboard-navigation');
       });

       // Focus trap for modals
       document.addEventListener('keydown', (e) => {
           if (e.key === 'Tab' && ui.isModalOpen()) {
               this.trapFocusInModal(e);
           }
       });
   }

   trapFocusInModal(event) {
       const modal = document.querySelector('.modal:not([style*="display: none"])');
       if (!modal) return;

       const focusableElements = modal.querySelectorAll(
           'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
       );
       
       const firstElement = focusableElements[0];
       const lastElement = focusableElements[focusableElements.length - 1];

       if (event.shiftKey) {
           if (document.activeElement === firstElement) {
               event.preventDefault();
               lastElement.focus();
           }
       } else {
           if (document.activeElement === lastElement) {
               event.preventDefault();
               firstElement.focus();
           }
       }
   }

   setupKeyboardNavigation() {
       // Arrow key navigation for grids
       document.addEventListener('keydown', (e) => {
           if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
               this.handleArrowKeyNavigation(e);
           }
       });
   }

   handleArrowKeyNavigation(event) {
       const focusedElement = document.activeElement;
       const isInGrid = focusedElement.closest('.device-grid, .quick-actions-grid, .summary-cards');
       
       if (!isInGrid) return;

       const gridItems = Array.from(isInGrid.children);
       const currentIndex = gridItems.indexOf(focusedElement);
       
       if (currentIndex === -1) return;

       let newIndex = currentIndex;
       const columns = this.getGridColumns(isInGrid);

       switch (event.key) {
           case 'ArrowLeft':
               newIndex = Math.max(0, currentIndex - 1);
               break;
           case 'ArrowRight':
               newIndex = Math.min(gridItems.length - 1, currentIndex + 1);
               break;
           case 'ArrowUp':
               newIndex = Math.max(0, currentIndex - columns);
               break;
           case 'ArrowDown':
               newIndex = Math.min(gridItems.length - 1, currentIndex + columns);
               break;
       }

       if (newIndex !== currentIndex) {
           event.preventDefault();
           gridItems[newIndex].focus();
       }
   }

   getGridColumns(gridElement) {
       const style = window.getComputedStyle(gridElement);
       const columns = style.gridTemplateColumns.split(' ').length;
       return columns;
   }

   setupScreenReaderAnnouncements() {
       // Create live region for announcements
       const liveRegion = document.createElement('div');
       liveRegion.setAttribute('aria-live', 'polite');
       liveRegion.setAttribute('aria-atomic', 'true');
       liveRegion.className = 'sr-only';
       liveRegion.id = 'live-region';
       document.body.appendChild(liveRegion);

       // Announce important state changes
       dataManager.subscribe('devices', (devices) => {
           const changedDevices = this.getChangedDevices(devices);
           if (changedDevices.length > 0) {
               this.announceToScreenReader(
                   `${changedDevices.length} thiết bị đã thay đổi trạng thái`
               );
           }
       });
   }

   announceToScreenReader(message) {
       const liveRegion = document.getElementById('live-region');
       if (liveRegion) {
           liveRegion.textContent = message;
           setTimeout(() => {
               liveRegion.textContent = '';
           }, 1000);
       }
   }

   async checkAuthentication() {
       const savedToken = Utils.storage.get('auth_token');
       const savedUser = Utils.storage.get('user_data');
       
       if (savedToken && savedUser) {
           try {
               await this.validateToken(savedToken);
               dataManager.setUser(savedUser);
               this.showMainApp();
           } catch (error) {
               this.showAuthScreens();
           }
       } else {
           this.showAuthScreens();
       }
   }

   async validateToken(token) {
       // Simulate token validation with better error handling
       return new Promise((resolve, reject) => {
           setTimeout(() => {
               const isValid = Math.random() > 0.05; // 95% success rate
               if (isValid) {
                   resolve(true);
               } else {
                   reject(new Error('Token expired'));
               }
           }, 500);
       });
   }

   showAuthScreens() {
       document.getElementById('splash-screen').classList.add('hidden');
       document.getElementById('auth-container').classList.remove('hidden');
       showAuthScreen('login');
   }

   showMainApp() {
       document.getElementById('splash-screen').classList.add('hidden');
       document.getElementById('auth-container').classList.add('hidden');
       document.getElementById('app-container').classList.remove('hidden');
       
       this.initializeMainApp();
   }

   async initializeApp() {
       if (dataManager.isLoggedIn()) {
           await this.loadUserData();
       }
   }

   async loadUserData() {
       try {
           // Initialize data if first time
           if (dataManager.getState('homes').length === 0) {
               dataManager.initializeRealData();
           }
           
           // Setup real-time updates
           this.setupRealTimeUpdates();
           
       } catch (error) {
           console.warn('Failed to load user data:', error);
           // Continue with cached data
       }
   }

   initializeMainApp() {
       // Setup data subscriptions
       this.setupDataSubscriptions();
       
       // Initialize UI
       ui.renderHomeScreen();
       ui.updateNotificationBadge();
       
       // Setup periodic updates
       this.setupPeriodicUpdates();
       
       // Show initial screen
       ui.showScreen('home');
       
       this.isInitialized = true;
   }

   setupDataSubscriptions() {
       // Subscribe to state changes
       dataManager.subscribe('notifications', () => {
           ui.updateNotificationBadge();
       });

       dataManager.subscribe('devices', () => {
           if (['home', 'devices'].includes(ui.currentScreen)) {
               ui.refreshCurrentScreen();
           }
       });

       dataManager.subscribe('user', (user) => {
           ui.updateUserProfile(user);
       });
   }

   setupRealTimeUpdates() {
       // Simulate real-time device updates every 30 seconds
       this.deviceUpdateInterval = setInterval(() => {
           this.updateDeviceStatus();
       }, 30000);

       // Temperature simulation every 10 seconds
       this.temperatureInterval = setInterval(() => {
           this.simulateTemperatureChanges();
       }, 10000);

       // Check for notifications every 2 minutes
       this.notificationInterval = setInterval(() => {
           this.checkForNotifications();
       }, 120000);
   }

   setupPeriodicUpdates() {
       // Periodic data sync every 5 minutes
       this.syncInterval = setInterval(() => {
           this.syncData();
       }, 300000);

       // Performance cleanup every 10 minutes
       this.cleanupInterval = setInterval(() => {
           this.performanceCleanup();
       }, 600000);
   }

   updateDeviceStatus() {
       const devices = dataManager.getState('devices');
       let hasChanges = false;

       devices.forEach(device => {
           // Simulate occasional connection issues (very rare)
           if (Math.random() < 0.002) { // 0.2% chance
               const wasOnline = device.isOnline;
               device.isOnline = !device.isOnline;
               
               if (wasOnline && !device.isOnline) {
                   dataManager.addNotification({
                       type: 'warning',
                       title: `${device.name} mất kết nối`,
                       message: 'Thiết bị đã mất kết nối với mạng',
                       icon: device.icon,
                       deviceId: device.id
                   });
               } else if (!wasOnline && device.isOnline) {
                   dataManager.addNotification({
                       type: 'success',
                       title: `${device.name} đã kết nối lại`,
                       message: 'Thiết bị đã khôi phục kết nối',
                       icon: device.icon,
                       deviceId: device.id
                   });
               }
               
               hasChanges = true;
           }
       });

       if (hasChanges) {
           dataManager.setState('devices', devices);
       }
   }

   simulateTemperatureChanges() {
       const devices = dataManager.getState('devices');
       
       devices.forEach(device => {
           if (!device.isOnline) return;
           
           if (device.type === 'water_heater') {
               this.simulateWaterHeaterTemperature(device);
           } else if (device.type === 'towel_dryer') {
               this.simulateTowelDryerTemperature(device);
           }
       });
   }

   simulateWaterHeaterTemperature(device) {
       const updates = {};
       
       if (device.isOn && device.isHeating) {
           const heatRate = 0.3 + Math.random() * 0.4; // 0.3-0.7°C per 10s
           const newTemp = Math.min(
               device.currentWaterTemp + heatRate,
               device.targetTemperature
           );
           
           updates.currentWaterTemp = parseFloat(newTemp.toFixed(1));
           
           if (newTemp >= device.targetTemperature) {
               updates.isHeating = false;
               
               dataManager.addNotification({
                   type: 'success',
                   title: 'Đun nước hoàn thành',
                   message: `Bình nước nóng đã đạt ${device.targetTemperature}°C`,
                   icon: '✅',
                   deviceId: device.id
               });
           }
       } else {
           // Natural cooling
           const coolRate = 0.05 + Math.random() * 0.05; // 0.05-0.1°C per 10s
           const roomTemp = 22;
           const newTemp = Math.max(
               device.currentWaterTemp - coolRate,
               roomTemp
           );
           
           updates.currentWaterTemp = parseFloat(newTemp.toFixed(1));
       }
       
       if (Object.keys(updates).length > 0) {
           dataManager.updateDevice(device.id, updates);
       }
   }

   simulateTowelDryerTemperature(device) {
       if (!device.isOn) return;
       
       const updates = {};
       
       if (device.mode === 'towel_drying') {
           const targetTemp = device.targetTemperature;
           const currentTemp = device.sensors.towel.temperature;
           
           if (device.relays.towel_heating_relay.isActive) {
               const heatRate = 0.2 + Math.random() * 0.3; // 0.2-0.5°C per 10s
               const newTemp = Math.min(currentTemp + heatRate, targetTemp);
               updates['sensors.towel.temperature'] = parseFloat(newTemp.toFixed(1));
               
               // Update progress
               const progress = newTemp / targetTemp;
               const baseTime = 45; // minutes
               const remaining = Math.max(0, Math.round(baseTime * (1 - progress)));
               updates.estimatedTimeRemaining = remaining;
               
               if (newTemp >= targetTemp) {
                   // Cycle complete
                   updates.isOn = false;
                   updates.cycleComplete = true;
                   updates.estimatedTimeRemaining = 0;
                   updates['relays.towel_heating_relay.isActive'] = false;
                   updates.isHeating = false;
                   updates.totalCycles = device.totalCycles + 1;
                   
                   dataManager.addNotification({
                       type: 'success',
                       title: 'Sấy khăn hoàn thành',
                       message: `Đã đạt ${targetTemp}°C và tự động tắt`,
                       icon: '✅',
                       deviceId: device.id
                   });
               }
           }
       } else if (device.mode === 'room_heating') {
           // Room heating logic with hysteresis
           const targetTemp = device.targetTemperature;
           const currentTemp = device.sensors.room.temperature;
           const isHeating = device.relays.room_heating_relay.isActive;
           
           if (isHeating) {
               const heatRate = 0.1 + Math.random() * 0.2; // 0.1-0.3°C per 10s
               const newTemp = Math.min(currentTemp + heatRate, targetTemp + 1);
               updates['sensors.room.temperature'] = parseFloat(newTemp.toFixed(1));
               
               if (newTemp >= targetTemp + 0.5) {
                   updates['relays.room_heating_relay.isActive'] = false;
                   updates.isHeating = false;
               }
           } else {
               // Natural cooling
               const coolRate = 0.05 + Math.random() * 0.05;
               const newTemp = Math.max(currentTemp - coolRate, 18); // Min 18°C
               updates['sensors.room.temperature'] = parseFloat(newTemp.toFixed(1));
               
               if (newTemp < targetTemp - 0.5) {
                   updates['relays.room_heating_relay.isActive'] = true;
                   updates.isHeating = true;
               }
           }
       }
       
       if (Object.keys(updates).length > 0) {
           dataManager.updateDevice(device.id, updates);
       }
   }

   checkForNotifications() {
       // Check for high energy consumption
       const todayEnergy = dataManager.getTotalEnergyToday();
       const avgEnergy = dataManager.getAverageEnergyConsumption();
       
       if (todayEnergy > avgEnergy * 1.4) { // 40% higher than average
           dataManager.addNotification({
               type: 'warning',
               title: 'Tiêu thụ điện cao bất thường',
               message: `Hôm nay cao hơn 40% so với trung bình (${Utils.formatNumber(todayEnergy, 1)} kWh)`,
               icon: '⚠️'
           });
       }
       
       // Check for device maintenance
       this.checkDeviceMaintenance();
       
       // Check for firmware updates
       this.checkFirmwareUpdates();
   }

   checkDeviceMaintenance() {
       const devices = dataManager.getState('devices');
       
       devices.forEach(device => {
           const daysSinceCreated = Math.floor(
               (Date.now() - new Date(device.createdAt).getTime()) / (1000 * 60 * 60 * 24)
           );
           
           // Suggest maintenance after 30 days for water heater
           if (device.type === 'water_heater' && daysSinceCreated > 30 && daysSinceCreated % 30 === 0) {
               dataManager.addNotification({
                   type: 'info',
                   title: 'Bảo trì thiết bị',
                   message: `${device.name} nên được bảo trì định kỳ`,
                   icon: '🔧',
                   deviceId: device.id
               });
           }
       });
   }

   checkFirmwareUpdates() {
       const devices = dataManager.getState('devices');
       
       devices.forEach(device => {
           if (Math.random() < 0.01) { // 1% chance per check
               dataManager.addNotification({
                   type: 'info',
                   title: 'Cập nhật firmware',
                   message: `Có bản cập nhật mới cho ${device.name}`,
                   icon: '🔄',
                   deviceId: device.id,
                   actions: ['update', 'later']
               });
           }
       });
   }

   async syncData() {
       if (!navigator.onLine) return;
       
       try {
           // Simulate data sync
           console.log('Syncing data with server...');
           
           // Upload offline changes
           await this.uploadOfflineChanges();
           
           // Download server updates
           await this.downloadServerUpdates();
           
       } catch (error) {
           console.warn('Data sync failed:', error);
       }
   }

   async uploadOfflineChanges() {
       const offlineChanges = Utils.storage.get('offline_changes', []);
       
       if (offlineChanges.length > 0) {
           // Simulate upload
           await new Promise(resolve => setTimeout(resolve, 1000));
           
           // Clear offline changes after successful upload
           Utils.storage.remove('offline_changes');
       }
   }

   async downloadServerUpdates() {
       // Simulate checking for server updates
       await new Promise(resolve => setTimeout(resolve, 500));
   }

   performanceCleanup() {
       // Clear old performance entries
       if (performance.clearResourceTimings) {
           performance.clearResourceTimings();
       }
       
       // Clear old notifications (keep last 50)
       const notifications = dataManager.getState('notifications');
       if (notifications.length > 50) {
           const recentNotifications = notifications.slice(0, 50);
           dataManager.setState('notifications', recentNotifications);
       }
       
       // Clear old analytics data (keep last 30 days)
       const analytics = dataManager.getState('analytics');
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       
       Object.keys(analytics).forEach(dateString => {
           const date = new Date(dateString);
           if (date < thirtyDaysAgo) {
               delete analytics[dateString];
           }
       });
       
       dataManager.setState('analytics', analytics);
   }

   handleVisibilityChange() {
       if (document.hidden) {
           // App goes to background
           this.onAppHide();
       } else {
           // App comes to foreground
           this.onAppShow();
       }
   }

   onAppShow() {
       if (this.isInitialized) {
           // Refresh data when app becomes visible
           this.updateDeviceStatus();
           ui.updateNotificationBadge();
           ui.refreshCurrentScreen();
       }
   }

   onAppHide() {
       // Save state when app goes to background
       dataManager.saveToStorage();
       
       // Clear sensitive data if needed
       this.clearSensitiveData();
   }

   clearSensitiveData() {
       // Clear any sensitive data that shouldn't persist in background
       // (currently none in this app)
   }

   handlePopState(event) {
       if (ui.isModalOpen()) {
           ui.closeModal();
       } else {
           // Handle back navigation
           const state = event.state;
           if (state?.screen) {
               ui.showScreen(state.screen);
           }
       }
   }

   async finishInitialization() {
       // Hide splash screen
       await new Promise(resolve => {
           setTimeout(() => {
               document.getElementById('splash-screen').classList.add('hidden');
               resolve();
           }, 500);
       });
   }

   handleInitializationError(error) {
       console.error('App initialization failed:', error);
       
       // Show error screen
       document.body.innerHTML = `
           <div class="error-screen">
               <div class="error-content">
                   <div class="error-icon">
                       <span class="material-icons">error</span>
                   </div>
                   <h2>Khởi động thất bại</h2>
                   <p>Ứng dụng không thể khởi động. Vui lòng thử lại.</p>
                   <button class="btn btn-primary" onclick="window.location.reload()">
                       Thử lại
                   </button>
               </div>
           </div>
       `;
   }

   showInstallPrompt() {
       const prompt = document.getElementById('install-prompt');
       if (prompt && this.installPrompt) {
           prompt.classList.add('show');
       }
   }

   hideInstallPrompt() {
       const prompt = document.getElementById('install-prompt');
       if (prompt) {
           prompt.classList.remove('show');
       }
   }

   async installPWA() {
       if (this.installPrompt) {
           this.installPrompt.prompt();
           const result = await this.installPrompt.userChoice;
           
           if (result.outcome === 'accepted') {
               console.log('PWA was installed');
           }
           
           this.installPrompt = null;
           this.hideInstallPrompt();
       }
   }

   dismissInstall() {
       this.hideInstallPrompt();
       Utils.storage.set('install_dismissed', true);
   }

   // Cleanup on app unload
   destroy() {
       // Clear intervals
       if (this.deviceUpdateInterval) clearInterval(this.deviceUpdateInterval);
       if (this.temperatureInterval) clearInterval(this.temperatureInterval);
       if (this.notificationInterval) clearInterval(this.notificationInterval);
       if (this.syncInterval) clearInterval(this.syncInterval);
       if (this.cleanupInterval) clearInterval(this.cleanupInterval);
       
       // Remove event listeners
       this.eventHandlers.forEach((handler, element) => {
           element.removeEventListener('click', handler);
       });
       
       // Save final state
       dataManager.saveToStorage();
   }
}

// Enhanced Authentication Functions
async function handleLogin(event) {
   event.preventDefault();
   
   const email = document.getElementById('login-email').value.trim();
   const password = document.getElementById('login-password').value;
   const rememberMe = document.getElementById('remember-me').checked;
   
   // Validation
   if (!email || !password) {
       ui.showToast('Vui lòng nhập đầy đủ thông tin', 'error');
       return;
   }
   
   if (!Utils.isValidEmail(email)) {
       ui.showToast('Email không hợp lệ', 'error');
       return;
   }
   
   ui.showLoading('Đang đăng nhập...');
   
   try {
       await simulateLogin(email, password);
       
       const userData = {
           id: Utils.generateId(),
           name: email.split('@')[0], // Use email prefix as name
           email: email,
           phone: '+84901234567',
           avatar: null,
           createdAt: new Date().toISOString()
       };
       
       // Save auth data
       const authToken = 'jwt_token_' + Date.now() + '_' + Math.random().toString(36);
       Utils.storage.set('auth_token', authToken);
       Utils.storage.set('user_data', userData);
       
       if (rememberMe) {
           Utils.storage.set('remember_login', true);
       }
       
       dataManager.setUser(userData);
       
       ui.hideLoading();
       ui.showToast('Đăng nhập thành công!', 'success');
       
       // Smooth transition to main app
       setTimeout(() => {
           app.showMainApp();
       }, 1000);
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Email hoặc mật khẩu không chính xác', 'error');
       
       // Focus back to email field
       document.getElementById('login-email').focus();
   }
}

async function handleSignup(event) {
   event.preventDefault();
   
   const name = document.getElementById('signup-name').value.trim();
   const email = document.getElementById('signup-email').value.trim();
   const phone = document.getElementById('signup-phone').value.trim();
   const password = document.getElementById('signup-password').value;
   const confirmPassword = document.getElementById('signup-confirm').value;
   const agreeTerms = document.getElementById('agree-terms').checked;
   
   // Enhanced validation
   if (!name || !email || !phone || !password || !confirmPassword) {
       ui.showToast('Vui lòng nhập đầy đủ thông tin', 'error');
       return;
   }
   
   if (!Utils.isValidEmail(email)) {
       ui.showToast('Email không hợp lệ', 'error');
       return;
   }
   
   if (!Utils.isValidPhone(phone)) {
       ui.showToast('Số điện thoại không hợp lệ', 'error');
       return;
   }
   
   const passwordValidation = Utils.validatePassword(password);
   if (!passwordValidation.isValid) {
       ui.showToast('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số', 'error');
       return;
   }
   
   if (password !== confirmPassword) {
       ui.showToast('Xác nhận mật khẩu không khớp', 'error');
       return;
   }
   
   if (!agreeTerms) {
       ui.showToast('Vui lòng đồng ý với điều khoản sử dụng', 'error');
       return;
   }
   
   ui.showLoading('Đang tạo tài khoản...');
   
   try {
       await simulateSignup(name, email, phone, password);
       
       ui.hideLoading();
       ui.showToast('Tài khoản đã được tạo thành công!', 'success');
       
       // Auto-fill login form
       showAuthScreen('login');
       document.getElementById('login-email').value = email;
       document.getElementById('login-password').focus();
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Không thể tạo tài khoản. Email có thể đã được sử dụng.', 'error');
   }
}

async function handleForgotPassword(event) {
   event.preventDefault();
   
   const email = document.getElementById('forgot-email').value.trim();
   
   if (!email) {
       ui.showToast('Vui lòng nhập email', 'error');
       return;
   }
   
   if (!Utils.isValidEmail(email)) {
       ui.showToast('Email không hợp lệ', 'error');
       return;
   }
   
   ui.showLoading('Đang gửi mã xác nhận...');
   
   try {
       await simulateForgotPassword(email);
       
       ui.hideLoading();
       ui.showToast('Mã xác nhận đã được gửi!', 'success');
       
       // Store email for OTP verification
       Utils.storage.set('reset_email', email);
       
       // Show OTP screen
       showAuthScreen('otp');
       document.getElementById('otp-email').textContent = email;
       startOTPCountdown();
       
       // Focus first OTP input
       document.querySelector('.otp-input').focus();
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Không thể gửi mã xác nhận. Vui lòng kiểm tra email.', 'error');
   }
}

async function handleOTP(event) {
   event.preventDefault();
   
   const otpInputs = document.querySelectorAll('.otp-input');
   const otp = Array.from(otpInputs).map(input => input.value).join('');
   
   if (otp.length !== 6) {
       ui.showToast('Vui lòng nhập đầy đủ 6 số', 'error');
       return;
   }
   
   if (!/^\d{6}$/.test(otp)) {
       ui.showToast('Mã OTP chỉ chứa số', 'error');
       return;
   }
   
   ui.showLoading('Đang xác nhận...');
   
   try {
       await simulateOTPVerification(otp);
       
       ui.hideLoading();
       ui.showToast('Xác nhận thành công!', 'success');
       
       showAuthScreen('reset-password');
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Mã OTP không chính xác', 'error');
       
       // Clear OTP inputs and focus first one
       otpInputs.forEach(input => input.value = '');
       otpInputs[0].focus();
   }
}

async function handleResetPassword(event) {
   event.preventDefault();
   
   const password = document.getElementById('reset-password').value;
   const confirmPassword = document.getElementById('reset-confirm').value;
   
   if (!password || !confirmPassword) {
       ui.showToast('Vui lòng nhập đầy đủ thông tin', 'error');
       return;
   }
   
   const passwordValidation = Utils.validatePassword(password);
   if (!passwordValidation.isValid) {
       ui.showToast('Mật khẩu không đủ mạnh', 'error');
       return;
   }
   
   if (password !== confirmPassword) {
       ui.showToast('Xác nhận mật khẩu không khớp', 'error');
       return;
   }
   
   ui.showLoading('Đang cập nhật mật khẩu...');
   
   try {
       await simulateResetPassword(password);
       
       ui.hideLoading();
       ui.showToast('Mật khẩu đã được cập nhật!', 'success');
       
       // Clear stored reset email
       Utils.storage.remove('reset_email');
       
       // Return to login
       showAuthScreen('login');
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Không thể cập nhật mật khẩu', 'error');
   }
}

// Enhanced password strength indicator
function updatePasswordStrength(password) {
   const validation = Utils.validatePassword(password);
   const strengthFill = document.getElementById('password-strength-fill');
   const strengthText = document.getElementById('password-strength-text');
   
   if (!strengthFill || !strengthText) return;
   
   let width = 0;
   let text = 'Nhập mật khẩu';
   let className = '';
   
   if (password.length > 0) {
       switch (validation.strength) {
           case 'weak':
               width = 25;
               text = 'Yếu';
               className = 'weak';
               break;
           case 'medium':
               width = 60;
               text = 'Trung bình';
               className = 'medium';
               break;
           case 'strong':
               width = 100;
               text = 'Mạnh';
               className = 'strong';
               break;
       }
   }
   
   strengthFill.style.width = `${width}%`;
   strengthFill.className = `strength-fill ${className}`;
   strengthText.textContent = text;
}

// OTP input handling
function moveToNext(current, index) {
   if (current.value.length === 1 && index < 5) {
       const nextInput = document.querySelectorAll('.otp-input')[index + 1];
       if (nextInput) {
           nextInput.focus();
       }
   } else if (current.value.length === 0 && index > 0) {
       const prevInput = document.querySelectorAll('.otp-input')[index - 1];
       if (prevInput) {
           prevInput.focus();
       }
   }
}

function startOTPCountdown() {
   let timeLeft = 300; // 5 minutes
   const countdownElement = document.getElementById('countdown');
   
   const timer = setInterval(() => {
       const minutes = Math.floor(timeLeft / 60);
       const seconds = timeLeft % 60;
       countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
       
       if (timeLeft === 0) {
           clearInterval(timer);
           countdownElement.textContent = '00:00';
           ui.showToast('Mã OTP đã hết hạn', 'warning');
       }
       
       timeLeft--;
   }, 1000);
}

async function resendOTP() {
   const email = Utils.storage.get('reset_email');
   if (!email) {
       ui.showToast('Không tìm thấy email', 'error');
       return;
   }
   
   ui.showLoading('Đang gửi lại mã...');
   
   try {
       await simulateForgotPassword(email);
       
       ui.hideLoading();
       ui.showToast('Mã OTP mới đã được gửi!', 'success');
       
       // Clear current OTP inputs
       document.querySelectorAll('.otp-input').forEach(input => input.value = '');
       document.querySelector('.otp-input').focus();
       
       startOTPCountdown();
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Không thể gửi lại mã', 'error');
   }
}

// Enhanced simulation functions
async function simulateLogin(email, password) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           // More realistic validation
           if (email && password.length >= 6) {
               // Simulate random failures (5% chance)
               if (Math.random() < 0.05) {
                   reject(new Error('Login failed'));
               } else {
                   resolve({ success: true, user: { email, name: email.split('@')[0] } });
               }
           } else {
               reject(new Error('Invalid credentials'));
           }
       }, 1000 + Math.random() * 1000); // 1-2 second delay
   });
}

async function simulateSignup(name, email, phone, password) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           // Simulate email already exists (10% chance)
           if (Math.random() < 0.1) {
               reject(new Error('Email already exists'));
           } else {
               resolve({ success: true, user: { name, email, phone } });
           }
       }, 1500 + Math.random() * 1000); // 1.5-2.5 second delay
   });
}

async function simulateForgotPassword(email) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           if (Utils.isValidEmail(email)) {
               resolve({ success: true });
           } else {
               reject(new Error('Invalid email'));
           }
       }, 800 + Math.random() * 400); // 0.8-1.2 second delay
   });
}

async function simulateOTPVerification(otp) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           // Accept any 6-digit OTP for demo, but simulate some failures
           if (otp.length === 6 && /^\d+$/.test(otp)) {
               if (Math.random() < 0.1) { // 10% failure rate
                   reject(new Error('Invalid OTP'));
               } else {
                   resolve({ success: true });
               }
           } else {
               reject(new Error('Invalid OTP format'));
           }
       }, 600 + Math.random() * 400); // 0.6-1 second delay
   });
}

async function simulateResetPassword(password) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           if (password.length >= 8) {
               resolve({ success: true });
           } else {
               reject(new Error('Password too weak'));
           }
       }, 1000 + Math.random() * 500); // 1-1.5 second delay
   });
}

// Enhanced utility functions
function togglePassword(inputId) {
   const input = document.getElementById(inputId);
   const button = input.nextElementSibling;
   const icon = button.querySelector('.material-icons');
   
   if (input.type === 'password') {
       input.type = 'text';
       icon.textContent = 'visibility_off';
   } else {
       input.type = 'password';
       icon.textContent = 'visibility';
   }
   
   // Return focus to input
   input.focus();
}

function showAuthScreen(screenName) {
   const screens = document.querySelectorAll('.auth-screen');
   screens.forEach(screen => {
       screen.classList.remove('active');
       // Clear form data when switching screens
       const form = screen.querySelector('form');
       if (form) {
           form.reset();
       }
   });
   
   const targetScreen = document.getElementById(`${screenName}-screen`);
   if (targetScreen) {
       targetScreen.classList.add('active');
       
       // Focus first input
       const firstInput = targetScreen.querySelector('input');
       if (firstInput) {
           setTimeout(() => firstInput.focus(), 100);
       }
   }
}

// Enhanced device control functions
function quickHeatWater(temperature) {
   const waterHeater = dataManager.getState('devices').find(d => d.type === 'water_heater');
   if (waterHeater) {
       dataManager.updateDevice(waterHeater.id, {
           isOn: true,
           targetTemperature: temperature,
           isHeating: true,
           lastAction: new Date().toISOString(),
           dailyUsage: waterHeater.dailyUsage + 1
       });
       
       ui.showToast(`Đang đun nước đến ${temperature}°C`, 'success');
       ui.refreshCurrentScreen();
       
       app.recordPerformanceMetric('quickAction', performance.now());
   } else {
       ui.showToast('Không tìm thấy bình nước nóng', 'error');
   }
}

function quickStartTowelDrying() {
   const towelDryer = dataManager.getState('devices').find(d => d.type === 'towel_dryer');
   if (towelDryer) {
       dataManager.updateDevice(towelDryer.id, {
           isOn: true,
           mode: 'towel_drying',
           targetTemperature: 40,
           estimatedTimeRemaining: 45,
           'relays.towel_heating_relay.isActive': true,
           isHeating: true,
           cycleComplete: false,
           lastAction: new Date().toISOString()
       });
       
       ui.showToast('Đã bắt đầu sấy khăn', 'success');
       ui.refreshCurrentScreen();
       
       app.recordPerformanceMetric('quickAction', performance.now());
   } else {
       ui.showToast('Không tìm thấy máy sấy khăn', 'error');
   }
}

function quickStartRoomHeating() {
   const towelDryer = dataManager.getState('devices').find(d => d.type === 'towel_dryer');
   if (towelDryer) {
       dataManager.updateDevice(towelDryer.id, {
           isOn: true,
           mode: 'room_heating',
           targetTemperature: 28,
           'relays.room_heating_relay.isActive': true,
           isHeating: true,
           lastAction: new Date().toISOString()
       });
       
       ui.showToast('Đã bắt đầu sưởi phòng', 'success');
       ui.refreshCurrentScreen();
       
       app.recordPerformanceMetric('quickAction', performance.now());
   } else {
       ui.showToast('Không tìm thấy máy sấy khăn', 'error');
   }
}

function runPresetScene(sceneType) {
   const scenes = dataManager.getState('scenes');
   let scene = null;
   
   switch (sceneType) {
       case 'bath-ready':
           scene = scenes.find(s => s.name === 'Chuẩn bị tắm');
           break;
       case 'after-bath':
           scene = scenes.find(s => s.name === 'Sau khi tắm');
           break;
       case 'energy-save':
           scene = scenes.find(s => s.name === 'Tiết kiệm điện đêm');
           break;
   }
   
   if (scene) {
       dataManager.runScene(scene.id);
   } else {
       ui.showToast('Không tìm thấy kịch bản', 'error');
   }
}

// Enhanced settings functions
function changeTheme(theme) {
   app.applyTheme(theme);
   ui.showToast(`Đã chuyển sang chế độ ${theme === 'light' ? 'sáng' : theme === 'dark' ? 'tối' : 'tự động'}`, 'success');
}

function refreshDevices() {
   ui.showLoading('Đang làm mới thiết bị...');
   
   setTimeout(() => {
       app.updateDeviceStatus();
       ui.hideLoading();
       ui.showToast('Đã làm mới danh sách thiết bị', 'success');
       ui.refreshCurrentScreen();
   }, 1000);
}

function showTerms() {
   ui.showToast('Điều khoản sử dụng - Tính năng đang phát triển', 'info');
}

function showPrivacy() {
   ui.showToast('Chính sách bảo mật - Tính năng đang phát triển', 'info');
}

function showHelp() {
   ui.showToast('Hướng dẫn sử dụng - Tính năng đang phát triển', 'info');
}

function showAbout() {
   ui.showConfirmation(
       'Về ứng dụng',
       'SmartHome IoT v1.2.3\nỨng dụng điều khiển bình nước nóng và máy sấy khăn thông minh.\n\nPhát triển bởi SmartHome Team',
       null,
       'info'
   );
}

function logout() {
   ui.showConfirmation(
       'Đăng xuất',
       'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?',
       () => {
           // Clear auth data
           Utils.storage.remove('auth_token');
           Utils.storage.remove('user_data');
           Utils.storage.remove('remember_login');
           
           // Clear user data from memory
           dataManager.logout();
           
           // Show success message
           ui.showToast('Đã đăng xuất thành công', 'success');
           
           // Reload app to show login screen
           setTimeout(() => {
               window.location.reload();
           }, 1000);
       }
   );
}

// Modal handling
function closeModalOnOverlayClick(event) {
   if (event.target === event.currentTarget) {
       ui.closeModal();
   }
}

// Enhanced initialization with password strength monitoring
document.addEventListener('DOMContentLoaded', () => {
   // Initialize password strength indicator
   const passwordInput = document.getElementById('signup-password');
   if (passwordInput) {
       passwordInput.addEventListener('input', (e) => {
           updatePasswordStrength(e.target.value);
       });
   }
   
   // Setup OTP input handlers
   document.querySelectorAll('.otp-input').forEach((input, index) => {
       input.addEventListener('input', (e) => {
           moveToNext(e.target, index);
       });
       
       input.addEventListener('keydown', (e) => {
           if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
               document.querySelectorAll('.otp-input')[index - 1].focus();
           }
       });
   });
   
   // Initialize the app
   window.app = new SmartHomeApp();
});

// Handle app cleanup on unload
window.addEventListener('beforeunload', () => {
   if (window.app) {
       window.app.destroy();
   }
});

// Expose functions globally for development
if (process.env.NODE_ENV === 'development') {
   window.dev = {
       app: () => window.app,
       dataManager,
       ui,
       utils: Utils,
       simulateDeviceAction: (deviceId, action) => {
           const device = dataManager.getState('devices').find(d => d.id === deviceId);
           if (device) {
               dataManager.updateDevice(deviceId, { 
                   isOn: action === 'on',
                   lastAction: new Date().toISOString()
               });
               ui.refreshCurrentScreen();
           }
       },
       addTestNotification: (type = 'info') => {
           dataManager.addNotification({
               type,
               title: 'Test Notification',
               message: 'This is a test notification for development',
               icon: '🧪'
           });
       },
       clearAllData: () => {
           if (confirm('Clear all app data? This cannot be undone.')) {
               Utils.storage.clear();
               window.location.reload();
           }
       },
       performanceMetrics: () => window.app.performanceMetrics
   };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
   module.exports = {
       SmartHomeApp,
       handleLogin,
       handleSignup,
       handleForgotPassword,
       handleOTP,
       handleResetPassword
   };
}