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
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const isValid = Math.random() > 0.1;
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
            await this.simulateDataLoading();
            
            if (dataManager.getState('homes').length === 0) {
                dataManager.initializeSampleData();
            }
        } catch (error) {
            Utils.error.log(error, 'loadUserData');
        }
    }

    async simulateDataLoading() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000);
        });
    }

    initializeMainApp() {
        this.setupDataSubscriptions();
        
        ui.renderHomeScreen();
        ui.updateNotificationBadge();
        
        this.setupEnhancedPeriodicUpdates();
        this.setupServiceWorker();
        this.initializeAutomationEngine();
        
        ui.showScreen('home');
    }

    setupDataSubscriptions() {
        dataManager.subscribe('notifications', (notifications) => {
            ui.updateNotificationBadge();
        });

        dataManager.subscribe('devices', (devices) => {
            if (ui.currentScreen === 'home' || ui.currentScreen === 'devices') {
                ui.refreshCurrentScreen();
            }
        });

        dataManager.subscribe('scenes', (scenes) => {
            if (ui.currentScreen === 'home' || ui.currentScreen === 'scenes') {
                ui.refreshCurrentScreen();
            }
        });

        dataManager.subscribe('automationRules', (rules) => {
            if (ui.currentScreen === 'scenes') {
                ui.refreshCurrentScreen();
            }
        });
    }

    setupEnhancedPeriodicUpdates() {
        // Update device status every 10 seconds
        setInterval(() => {
            this.updateDeviceStatus();
        }, 10000);

        // Simulate realistic device behavior every 5 seconds
        setInterval(() => {
            dataManager.simulateRealTimeDeviceStatus();
        }, 5000);

        // Generate analytics data every 30 minutes
        setInterval(() => {
            this.generateAnalyticsData();
        }, 1800000);

        // Check for notifications every 2 minutes
        setInterval(() => {
            this.checkForNotifications();
        }, 120000);

        // Learn usage patterns every hour
        setInterval(() => {
            dataManager.automationEngine.learnUsagePatterns();
        }, 3600000);

        // Generate smart suggestions every 30 minutes
        setInterval(() => {
            this.generateAndShowSmartSuggestions();
        }, 1800000);
    }

    initializeAutomationEngine() {
        const rules = dataManager.getState('automationRules');
        rules.forEach(rule => {
            dataManager.automationEngine.registerRule(rule);
        });

        console.log(`Initialized ${rules.length} automation rules`);
    }

    generateAndShowSmartSuggestions() {
        const suggestions = dataManager.generateSmartSuggestions();
        
        suggestions.forEach(suggestion => {
            if (suggestion.priority === 'high') {
                dataManager.addNotification({
                    type: 'warning',
                    title: suggestion.title,
                    message: suggestion.message,
                    icon: '💡'
                });
            }
        });
    }

    updateDeviceStatus() {
        const devices = dataManager.getState('devices');
        let hasChanges = false;

        devices.forEach(device => {
            if (Math.random() < 0.02) {
                const updates = {};
                
                if (device.isOnline && Math.random() < 0.3) {
                    updates.isOnline = false;
                    updates.lastSeen = new Date().toISOString();
                    
                    dataManager.addNotification({
                        type: 'warning',
                        title: `${device.name} mất kết nối`,
                        message: 'Thiết bị đã mất kết nối với mạng WiFi',
                        icon: device.icon
                    });
                } else if (!device.isOnline && Math.random() < 0.7) {
                    updates.isOnline = true;
                    
                    dataManager.addNotification({
                        type: 'success',
                        title: `${device.name} đã kết nối lại`,
                        message: 'Thiết bị đã khôi phục kết nối',
                        icon: device.icon
                    });
                }

                if (device.type === 'water_heater' && Math.random() < 0.01) {
                    dataManager.addSmartNotification('maintenance_reminder', device.id, {
                        message: 'Khuyến nghị vệ sinh và kiểm tra định kỳ sau 6 tháng sử dụng'
                    });
                }

                if ((device.type === 'water_heater' || device.type === 'towel_dryer') && 
                    device.isOn && Math.random() < 0.005) {
                    dataManager.addSmartNotification('energy_high', device.id);
                }

                if (Object.keys(updates).length > 0) {
                    dataManager.updateDevice(device.id, updates);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            ui.refreshCurrentScreen();
        }
    }

    generateAnalyticsData() {
        const devices = dataManager.getState('devices');
        
        devices.forEach(device => {
            if (device.isOnline && device.isOn) {
                const consumption = dataManager.calculateHourlyConsumption(device) * 
                                 (Math.random() * 0.4 + 0.8);
                
                dataManager.recordEnergyConsumption(device.id, consumption);
            }
        });
    }

    checkForNotifications() {
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

        this.checkDeviceUpdates();
    }

    checkDeviceUpdates() {
        const devices = dataManager.getState('devices');
        
        devices.forEach(device => {
            if (Math.random() < 0.01) {
                dataManager.addNotification({
                    type: 'info',
                    title: 'Cập nhật có sẵn',
                    message: `Firmware mới cho ${device.name}`,
                    icon: device.icon
                });
            }
        });
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
        console.log('Background sync:', payload);
    }

    // Enhanced voice commands for new devices
    processEnhancedVoiceCommand(command) {
        const normalizedCommand = command.toLowerCase().trim();
        
        if (normalizedCommand.includes('bình nóng lạnh') || normalizedCommand.includes('nước nóng')) {
            this.processWaterHeaterVoiceCommand(normalizedCommand);
        } else if (normalizedCommand.includes('máy sấy khăn') || normalizedCommand.includes('sấy khăn')) {
            this.processTowelDryerVoiceCommand(normalizedCommand);
        } else if (normalizedCommand.includes('sưởi phòng') || normalizedCommand.includes('làm ấm')) {
            this.processRoomHeatingVoiceCommand(normalizedCommand);
        } else {
            ui.processVoiceCommand(command);
        }
    }

    processWaterHeaterVoiceCommand(command) {
        const waterHeaters = dataManager.getDevicesByType('water_heater');
        if (waterHeaters.length === 0) {
            ui.showToast('Không tìm thấy bình nóng lạnh', 'warning');
            return;
        }

        const waterHeater = waterHeaters[0];

        if (command.includes('bật') || command.includes('mở')) {
            dataManager.updateDevice(waterHeater.id, { isOn: true });
            ui.showToast('Đã bật bình nóng lạnh', 'success');
       } else if (command.includes('tắt') || command.includes('đóng')) {
           dataManager.updateDevice(waterHeater.id, { isOn: false });
           ui.showToast('Đã tắt bình nóng lạnh', 'success');
       } else if (command.includes('nhiệt độ')) {
           const tempMatch = command.match(/(\d+)/);
           if (tempMatch) {
               const temp = parseInt(tempMatch[1]);
               if (temp >= 30 && temp <= 75) {
                   dataManager.updateDevice(waterHeater.id, { targetTemperature: temp });
                   ui.showToast(`Đã đặt nhiệt độ ${temp}°C`, 'success');
               } else {
                   ui.showToast('Nhiệt độ phải từ 30°C đến 75°C', 'warning');
               }
           }
       } else if (command.includes('eco') || command.includes('tiết kiệm')) {
           dataManager.updateDevice(waterHeater.id, { mode: 'eco' });
           ui.showToast('Đã chuyển sang chế độ tiết kiệm', 'success');
       } else if (command.includes('boost') || command.includes('tăng tốc')) {
           dataManager.updateDevice(waterHeater.id, { mode: 'boost' });
           ui.showToast('Đã chuyển sang chế độ tăng tốc', 'success');
       }
   }

   processTowelDryerVoiceCommand(command) {
       const towelDryers = dataManager.getDevicesByType('towel_dryer');
       if (towelDryers.length === 0) {
           ui.showToast('Không tìm thấy máy sấy khăn', 'warning');
           return;
       }

       const towelDryer = towelDryers[0];

       if (command.includes('bật') || command.includes('mở')) {
           dataManager.updateDevice(towelDryer.id, { 
               isOn: true,
               mode: 'towel_dry'
           });
           ui.showToast('Đã bật máy sấy khăn', 'success');
       } else if (command.includes('tắt') || command.includes('đóng')) {
           dataManager.updateDevice(towelDryer.id, { isOn: false });
           ui.showToast('Đã tắt máy sấy khăn', 'success');
       }
   }

   processRoomHeatingVoiceCommand(command) {
       const towelDryers = dataManager.getDevicesByType('towel_dryer');
       if (towelDryers.length === 0) {
           ui.showToast('Không tìm thấy thiết bị sưởi', 'warning');
           return;
       }

       const towelDryer = towelDryers[0];

       if (command.includes('bật') || command.includes('mở')) {
           dataManager.updateDevice(towelDryer.id, { 
               isOn: true,
               mode: 'room_heating',
               targetRoomTemperature: 24
           });
           ui.showToast('Đã bật sưởi phòng', 'success');
       } else if (command.includes('tắt') || command.includes('đóng')) {
           dataManager.updateDevice(towelDryer.id, { isOn: false });
           ui.showToast('Đã tắt sưởi phòng', 'success');
       }
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

   // Data sync functions
   async syncPendingData() {
       try {
           const pendingData = Utils.storage.get('pending_sync_data') || [];
           
           for (const data of pendingData) {
               await this.syncDataToServer(data);
           }
           
           Utils.storage.remove('pending_sync_data');
           console.log('Synced pending data successfully');
       } catch (error) {
           console.error('Failed to sync pending data:', error);
       }
   }

   async syncDataToServer(data) {
       // Simulate API call to sync data
       return new Promise((resolve) => {
           setTimeout(() => {
               console.log('Synced data:', data);
               resolve();
           }, 1000);
       });
   }

   // Performance monitoring
   measurePerformance(name, fn) {
       return Utils.performance.measure(name, fn);
   }

   // Memory management
   cleanupResources() {
       // Clear unused intervals
       if (this.updateInterval) {
           clearInterval(this.updateInterval);
       }
       
       // Clear automation engine intervals
       if (dataManager.automationEngine) {
           dataManager.automationEngine.intervalChecks.forEach((interval, ruleId) => {
               clearInterval(interval);
           });
       }
       
       // Save state before cleanup
       dataManager.saveToStorage();
   }

   // App state management
   onAppPause() {
       console.log('App paused');
       this.cleanupResources();
       dataManager.saveToStorage();
   }

   onAppResume() {
       console.log('App resumed');
       this.setupEnhancedPeriodicUpdates();
       ui.updateNotificationBadge();
       ui.refreshCurrentScreen();
   }

   // Network connectivity handling
   onNetworkOnline() {
       console.log('Network online');
       this.syncPendingData();
       ui.showToast('Kết nối mạng đã được khôi phục', 'success');
   }

   onNetworkOffline() {
       console.log('Network offline');
       ui.showToast('Đang hoạt động offline', 'warning');
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
           phone: '+84901234567',
           avatar: null,
           preferences: {
               language: 'vi',
               theme: 'auto',
               notifications: true
           },
           createdAt: new Date().toISOString()
       };
       
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
       
       app.showAuthScreen('login');
       
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
       default:
           app.showAuthScreen('login');
   }
}

// Simulation Functions
async function simulateLogin(email, password) {
   return new Promise((resolve, reject) => {
       setTimeout(() => {
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
   if (window.app && window.app.isInitialized) {
       app.onNetworkOnline();
   }
});

window.addEventListener('offline', () => {
   console.log('App is offline');
   if (window.app && window.app.isInitialized) {
       app.onNetworkOffline();
   }
});

// App Lifecycle
document.addEventListener('visibilitychange', () => {
   if (document.hidden) {
       if (window.app && window.app.isInitialized) {
           app.onAppPause();
       }
       dataManager.saveToStorage();
   } else {
       if (window.app && window.app.isInitialized) {
           app.onAppResume();
       }
       if (ui) {
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
   if (e.key === 'Tab') {
       document.body.classList.add('keyboard-navigation');
   }
   
   if (e.key === 'Escape') {
       if (ui.isModalOpen()) {
           ui.closeModal();
       } else if (ui.isVoiceActive) {
           ui.stopVoiceControl();
       }
   }
   
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
           const registration = await navigator.serviceWorker.register('/js/sw.js');
           console.log('SW registered: ', registration);
           
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

// PWA Installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
   e.preventDefault();
   deferredPrompt = e;
   
   if (ui) {
       ui.installPrompt = e;
       ui.showInstallPrompt();
   }
});

window.addEventListener('appinstalled', () => {
   console.log('PWA was installed');
   if (ui) {
       ui.hideInstallPrompt();
       ui.showToast('Ứng dụng đã được cài đặt thành công!', 'success');
   }
});

// Background sync for offline functionality
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
   navigator.serviceWorker.ready.then((registration) => {
       // Register for background sync when data changes
       dataManager.subscribe('devices', () => {
           registration.sync.register('sync-device-data');
       });
       
       dataManager.subscribe('scenes', () => {
           registration.sync.register('sync-scene-data');
       });
   });
}

// Push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
   navigator.serviceWorker.ready.then(async (registration) => {
       try {
           const subscription = await registration.pushManager.subscribe({
               userVisibleOnly: true,
               applicationServerKey: 'your-vapid-public-key-here'
           });
           
           console.log('Push subscription:', subscription);
           // Send subscription to server
       } catch (error) {
           console.log('Failed to subscribe to push notifications:', error);
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
       addTestWaterHeater: () => {
           const rooms = dataManager.getCurrentHome()?.rooms || [];
           const bathroomRoom = rooms.find(r => r.type === 'bathroom') || rooms[0];
           
           const waterHeater = dataManager.addDeviceWithAutomation({
               name: 'Bình nóng lạnh Test',
               type: 'water_heater',
               icon: '🔥',
               roomId: bathroomRoom?.id
           });
           
           ui.refreshCurrentScreen();
           return waterHeater;
       },
       addTestTowelDryer: () => {
           const rooms = dataManager.getCurrentHome()?.rooms || [];
           const bathroomRoom = rooms.find(r => r.type === 'bathroom') || rooms[0];
           
           const towelDryer = dataManager.addDeviceWithAutomation({
               name: 'Máy sấy khăn Test',
               type: 'towel_dryer',
               icon: '🧻',
               roomId: bathroomRoom?.id
           });
           
           ui.refreshCurrentScreen();
           return towelDryer;
       },
       triggerAutomation: (ruleId) => {
           const rule = dataManager.getState('automationRules').find(r => r.id === ruleId);
           if (rule) {
               dataManager.automationEngine.executeRule(rule);
           }
       },
       clearAllData: () => {
           if (confirm('Clear all app data? This cannot be undone.')) {
               Utils.storage.clear();
               window.location.reload();
           }
       },
       generateEnergyData: () => {
           dataManager.generateSampleAnalytics();
           ui.refreshCurrentScreen();
       },
       simulateOfflineMode: () => {
           window.dispatchEvent(new Event('offline'));
       },
       simulateOnlineMode: () => {
           window.dispatchEvent(new Event('online'));
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