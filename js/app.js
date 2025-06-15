// Main Application Entry Point
class SmartHomeApp {
    constructor() {
        this.isInitialized = false;
        this.authToken = null;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        try {
            await this.showSplashScreen();
            await this.checkAuthentication();
            await this.initializeApp();
            
            this.isInitialized = true;
            console.log('SmartHome IoT App initialized successfully');
        } catch (error) {
            Utils.error.handle(error, 'Failed to initialize app');
            this.showErrorScreen(error);
        }
    }

    async showSplashScreen() {
        return new Promise((resolve) => {
            setTimeout(() => {
                document.getElementById('splash-screen').classList.add('hidden');
                resolve();
            }, 2000);
        });
    }

    async checkAuthentication() {
        const savedToken = Utils.storage.get('auth_token');
        const savedUser = Utils.storage.get('user_data');
        
        if (savedToken && savedUser) {
            this.authToken = savedToken;
            this.currentUser = savedUser;
            dataManager.setUser(savedUser);
            
            try {
                await this.validateToken(savedToken);
                this.showMainApp();
            } catch (error) {
                this.showAuthScreens();
            }
        } else {
            this.showAuthScreens();
        }
    }

    async validateToken(token) {
        // Simulate token validation
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // In real app, make API call to validate token
                const isValid = Math.random() > 0.1; // 90% success rate
                if (isValid) {
                    resolve(true);
                } else {
                    reject(new Error('Token expired'));
                }
            }, 500);
        });
    }

    showAuthScreens() {
        document.getElementById('auth-container').classList.remove('hidden');
        this.showAuthScreen('login');
    }

    showAuthScreen(screenName) {
        const screens = document.querySelectorAll('.auth-screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    showMainApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Initialize main app components
        this.initializeMainApp();
    }

    async initializeApp() {
        if (dataManager.isLoggedIn()) {
            await this.loadUserData();
            this.initializeMainApp();
        }
    }

    async loadUserData() {
        try {
            // Simulate loading user data
            await this.simulateDataLoading();
            
            // Initialize sample data if first time user
            if (dataManager.getState('homes').length === 0) {
                dataManager.initializeSampleData();
            }
        } catch (error) {
            Utils.error.log(error, 'loadUserData');
            // Continue with cached data
        }
    }

    async simulateDataLoading() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000);
        });
    }

    initializeMainApp() {
        // Set up data subscriptions
        this.setupDataSubscriptions();
        
        // Initialize UI components
        ui.renderHomeScreen();
        ui.updateNotificationBadge();
        
        // Set up periodic updates
        this.setupPeriodicUpdates();
        
        // Set up service worker
        this.setupServiceWorker();
        
        // Show initial screen
        ui.showScreen('home');
    }

    setupDataSubscriptions() {
        // Subscribe to notification changes
        dataManager.subscribe('notifications', (notifications) => {
            ui.updateNotificationBadge();
        });

        // Subscribe to device changes
        dataManager.subscribe('devices', (devices) => {
            if (ui.currentScreen === 'home' || ui.currentScreen === 'devices') {
                ui.refreshCurrentScreen();
            }
        });

        // Subscribe to scene changes
        dataManager.subscribe('scenes', (scenes) => {
            if (ui.currentScreen === 'home' || ui.currentScreen === 'scenes') {
                ui.refreshCurrentScreen();
            }
        });
    }

    setupPeriodicUpdates() {
        // Update device status every 30 seconds
        setInterval(() => {
            this.updateDeviceStatus();
        }, 30000);

        // Generate analytics data every hour
        setInterval(() => {
            this.generateAnalyticsData();
        }, 3600000);

        // Check for notifications every 5 minutes
        setInterval(() => {
            this.checkForNotifications();
        }, 300000);
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                this.handleServiceWorkerMessage(event.data);
            });
        }
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'PUSH_NOTIFICATION':
                this.handlePushNotification(data.payload);
                break;
            case 'BACKGROUND_SYNC':
                this.handleBackgroundSync(data.payload);
                break;
        }
    }

    handlePushNotification(payload) {
        dataManager.addNotification({
            type: payload.type || 'info',
            title: payload.title,
            message: payload.message,
            icon: payload.icon
        });
    }

    handleBackgroundSync(payload) {
        // Handle background sync events
        console.log('Background sync:', payload);
    }

    updateDeviceStatus() {
        const devices = dataManager.getState('devices');
        let hasChanges = false;

        devices.forEach(device => {
            // Simulate random device status changes
            if (Math.random() < 0.05) { // 5% chance of status change
                const wasOnline = device.isOnline;
                device.isOnline = Math.random() > 0.1; // 90% online rate
                
                if (wasOnline && !device.isOnline) {
                    // Device went offline
                    dataManager.addNotification({
                        type: 'warning',
                        title: `${device.name} mất kết nối`,
                        message: 'Thiết bị đã mất kết nối với mạng WiFi',
                        icon: device.icon
                    });
                } else if (!wasOnline && device.isOnline) {
                    // Device came back online
                    dataManager.addNotification({
                        type: 'success',
                        title: `${device.name} đã kết nối lại`,
                        message: 'Thiết bị đã khôi phục kết nối',
                        icon: device.icon
                    });
                }
                
                hasChanges = true;
            }
        });

        if (hasChanges) {
            dataManager.setState('devices', devices);
        }
    }

    generateAnalyticsData() {
        const devices = dataManager.getState('devices');
        
        devices.forEach(device => {
            if (device.isOnline && device.isOn) {
                const consumption = dataManager.getDeviceBaseConsumption(device.type) * 
                                 (Math.random() * 0.4 + 0.8); // 80-120% of base
                
                dataManager.recordEnergyConsumption(device.id, consumption);
            }
        });
    }

    checkForNotifications() {
        // Check for high energy consumption
        const todayEnergy = dataManager.getTotalEnergyToday();
        const avgEnergy = dataManager.getAverageEnergyConsumption();
        
        if (todayEnergy > avgEnergy * 1.3) {
            dataManager.addNotification({
                type: 'warning',
                title: 'Tiêu thụ điện cao',
                message: `Hôm nay tiêu thụ cao hơn 30% so với trung bình (${Utils.formatNumber(todayEnergy, 1)} kWh)`,
                icon: '⚡'
            });
        }

        // Check for device updates
        this.checkDeviceUpdates();
    }

    checkDeviceUpdates() {
        const devices = dataManager.getState('devices');
        
        devices.forEach(device => {
            if (Math.random() < 0.01) { // 1% chance of update available
                dataManager.addNotification({
                    type: 'info',
                    title: 'Cập nhật có sẵn',
                    message: `Firmware mới cho ${device.name}`,
                    icon: device.icon
                });
            }
        });
    }

    showErrorScreen(error) {
        document.body.innerHTML = `
            <div class="error-screen">
                <div class="error-content">
                    <div class="error-icon">
                        <span class="material-icons">error</span>
                    </div>
                    <h2>Đã xảy ra lỗi</h2>
                    <p>Ứng dụng không thể khởi động. Vui lòng thử lại.</p>
                    <div class="error-details">
                        <strong>Chi tiết lỗi:</strong>
                        <pre>${error.message}</pre>
                    </div>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        Thử lại
                    </button>
                </div>
            </div>
        `;
    }
}

// Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!Utils.isValidEmail(email)) {
        ui.showToast('Email không hợp lệ', 'error');
        return;
    }
    
    ui.showLoading('Đang đăng nhập...');
    
    try {
        await simulateLogin(email, password);
        
        const userData = {
            id: Utils.generateId(),
            name: 'Nguyễn Văn A',
            email: email,
            phone: '+84901234567'
        };
        
        // Save auth data
        Utils.storage.set('auth_token', 'fake_jwt_token_' + Date.now());
        Utils.storage.set('user_data', userData);
        
        dataManager.setUser(userData);
        
        ui.hideLoading();
        ui.showToast('Đăng nhập thành công!', 'success');
        
        setTimeout(() => {
            app.showMainApp();
        }, 1000);
        
    } catch (error) {
        ui.hideLoading();
        ui.showToast('Đăng nhập thất bại. Vui lòng kiểm tra thông tin.', 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
    // Validation
    if (!name.trim()) {
        ui.showToast('Vui lòng nhập họ tên', 'error');
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
        ui.showToast('Mật khẩu không đủ mạnh', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        ui.showToast('Xác nhận mật khẩu không khớp', 'error');
        return;
    }
    
    ui.showLoading('Đang tạo tài khoản...');
    
    try {
        await simulateSignup(email, password);
        
        ui.hideLoading();
        ui.showToast('Tài khoản đã được tạo thành công!', 'success');
        
        // Switch to login screen
        app.showAuthScreen('login');
        document.getElementById('login-email').value = email;
        
    } catch (error) {
        ui.hideLoading();
        ui.showToast('Không thể tạo tài khoản. Vui lòng thử lại.', 'error');
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    
    if (!Utils.isValidEmail(email)) {
        ui.showToast('Email không hợp lệ', 'error');
        return;
    }
    
    ui.showLoading('Đang gửi mã xác nhận...');
    
    try {
        await simulateForgotPassword(email);
        
        ui.hideLoading();
        ui.showToast('Mã xác nhận đã được gửi!', 'success');
        
        document.getElementById('otp-email').textContent = email;
        app.showAuthScreen('otp');
        startOTPCountdown();
        
    } catch (error) {
        ui.hideLoading();
        ui.showToast('Không thể gửi mã xác nhận. Vui lòng thử lại.', 'error');
    }
}

async function handleOTP(event) {
    event.preventDefault();
    
    const otpInputs = document.querySelectorAll('.otp-input');
   const otp = Array.from(otpInputs).map(input => input.value).join('');
   
   if (otp.length !== 6) {
       ui.showToast('Vui lòng nhập đầy đủ mã OTP', 'error');
       return;
   }
   
   ui.showLoading('Đang xác nhận mã OTP...');
   
   try {
       await simulateOTPVerification(otp);
       
       ui.hideLoading();
       ui.showToast('Xác nhận thành công!', 'success');
       
       app.showAuthScreen('reset-password');
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Mã OTP không chính xác. Vui lòng thử lại.', 'error');
   }
}

function moveToNext(current, index) {
   if (current.value.length === 1 && index < 5) {
       const nextInput = document.querySelectorAll('.otp-input')[index + 1];
       if (nextInput) {
           nextInput.focus();
       }
   }
}

function startOTPCountdown() {
   let timeLeft = 45;
   const countdownElement = document.getElementById('countdown');
   
   const timer = setInterval(() => {
       const minutes = Math.floor(timeLeft / 60);
       const seconds = timeLeft % 60;
       countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
       
       if (timeLeft === 0) {
           clearInterval(timer);
           countdownElement.textContent = '00:00';
       }
       
       timeLeft--;
   }, 1000);
}

async function resendOTP() {
   const email = document.getElementById('otp-email').textContent;
   
   ui.showLoading('Đang gửi lại mã...');
   
   try {
       await simulateForgotPassword(email);
       
       ui.hideLoading();
       ui.showToast('Mã OTP mới đã được gửi!', 'success');
       
       startOTPCountdown();
       
   } catch (error) {
       ui.hideLoading();
       ui.showToast('Không thể gửi lại mã. Vui lòng thử lại.', 'error');
   }
}

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
}

async function loginWithGoogle() {
   ui.showToast('Tính năng đăng nhập Google đang phát triển', 'info');
}

function showScreen(screenName) {
   app.showAuthScreen(screenName);
}

function goBack() {
   // Simple back navigation for auth screens
   const currentScreen = document.querySelector('.auth-screen.active');
   const currentId = currentScreen?.id;
   
   switch (currentId) {
       case 'signup-screen':
       case 'forgot-password-screen':
           app.showAuthScreen('login');
           break;
       case 'otp-screen':
           app.showAuthScreen('forgot-password');
           break;
       case 'reset-password-screen':
           app.showAuthScreen('otp');
           break;
       default:
           app.showAuthScreen('login');
   }
}

// Simulation Functions
async function simulateLogin(email, password) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           // Simulate login validation
           if (email && password.length >= 6) {
               resolve({ success: true });
           } else {
               reject(new Error('Invalid credentials'));
           }
       }, 1500);
   });
}

async function simulateSignup(email, password) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           // Simulate signup
           if (email && password) {
               resolve({ success: true });
           } else {
               reject(new Error('Signup failed'));
           }
       }, 2000);
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
       }, 1000);
   });
}

async function simulateOTPVerification(otp) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
           // Accept any 6-digit OTP for demo
           if (otp.length === 6 && /^\d+$/.test(otp)) {
               resolve({ success: true });
           } else {
               reject(new Error('Invalid OTP'));
           }
       }, 1000);
   });
}

// Error Handling
window.addEventListener('error', (event) => {
   Utils.error.log(event.error, 'Global error handler');
   
   // Don't show error toast for network errors in production
   if (!event.error.message.includes('Network')) {
       ui.showToast('Đã xảy ra lỗi không mong muốn', 'error');
   }
});

window.addEventListener('unhandledrejection', (event) => {
   Utils.error.log(event.reason, 'Unhandled promise rejection');
   event.preventDefault();
});

// Performance Monitoring
if ('performance' in window) {
   window.addEventListener('load', () => {
       setTimeout(() => {
           const perfData = performance.getEntriesByType('navigation')[0];
           console.log('App load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
       }, 0);
   });
}

// Network Status Monitoring
window.addEventListener('online', () => {
   console.log('App is online');
   // Sync pending data when back online
   app.syncPendingData?.();
});

window.addEventListener('offline', () => {
   console.log('App is offline');
   ui.showToast('Ứng dụng đang hoạt động offline', 'warning');
});

// App Lifecycle
document.addEventListener('visibilitychange', () => {
   if (document.hidden) {
       // App goes to background
       dataManager.saveToStorage();
   } else {
       // App comes to foreground
       if (app.isInitialized) {
           app.updateDeviceStatus();
           ui.updateNotificationBadge();
       }
   }
});

// Touch/Click Feedback
document.addEventListener('touchstart', (e) => {
   if (e.target.matches('button, .btn, .device-card, .scene-card, .nav-item')) {
       e.target.style.transform = 'scale(0.95)';
   }
});

document.addEventListener('touchend', (e) => {
   if (e.target.matches('button, .btn, .device-card, .scene-card, .nav-item')) {
       setTimeout(() => {
           e.target.style.transform = '';
       }, 150);
   }
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
   // Tab navigation enhancement
   if (e.key === 'Tab') {
       document.body.classList.add('keyboard-navigation');
   }
   
   // Escape key handling
   if (e.key === 'Escape') {
       if (ui.isModalOpen()) {
           ui.closeModal();
       } else if (ui.isVoiceActive) {
           ui.stopVoiceControl();
       }
   }
   
   // Quick navigation shortcuts
   if (e.ctrlKey || e.metaKey) {
       switch (e.key) {
           case '1':
               e.preventDefault();
               ui.showScreen('home');
               break;
           case '2':
               e.preventDefault();
               ui.showScreen('devices');
               break;
           case '3':
               e.preventDefault();
               ui.showScreen('scenes');
               break;
           case '4':
               e.preventDefault();
               ui.showScreen('analytics');
               break;
           case '5':
               e.preventDefault();
               ui.showScreen('settings');
               break;
       }
   }
});

document.addEventListener('mousedown', () => {
   document.body.classList.remove('keyboard-navigation');
});

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
   window.app = new SmartHomeApp();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
   window.addEventListener('load', async () => {
       try {
           const registration = await navigator.serviceWorker.register('/sw.js');
           console.log('SW registered: ', registration);
           
           // Handle SW updates
           registration.addEventListener('updatefound', () => {
               const newWorker = registration.installing;
               newWorker.addEventListener('statechange', () => {
                   if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                       ui.showToast('Phiên bản mới có sẵn. Tải lại để cập nhật?', 'info');
                   }
               });
           });
           
       } catch (error) {
           console.log('SW registration failed: ', error);
       }
   });
}

// Expose global functions for development/debugging
if (process.env.NODE_ENV === 'development') {
   window.dev = {
       dataManager,
       ui,
       app: () => window.app,
       utils: Utils,
       simulateDeviceChange: (deviceId) => {
           const device = dataManager.getState('devices').find(d => d.id === deviceId);
           if (device) {
               dataManager.updateDevice(deviceId, { 
                   isOn: !device.isOn,
                   lastAction: new Date().toISOString()
               });
               ui.refreshCurrentScreen();
           }
       },
       addTestNotification: () => {
           dataManager.addNotification({
               type: 'info',
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
       }
   };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
   module.exports = {
       SmartHomeApp,
       DataManager,
       UI,
       Utils
   };
}