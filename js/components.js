// UI Components and Interactions
class UI {
    constructor() {
        this.currentScreen = 'home';
        this.modals = new Map();
        this.toasts = [];
        this.isVoiceActive = false;
        this.installPrompt = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPWA();
        this.setupTheme();
        this.preloadComponents();
    }

    setupEventListeners() {
        // Back button handling
        window.addEventListener('popstate', (e) => {
            if (this.isModalOpen()) {
                this.closeModal();
            } else {
                this.handleBackButton();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isModalOpen()) {
                    this.closeModal();
                } else if (this.isVoiceActive) {
                    this.stopVoiceControl();
                }
            }
        });

        // Touch gestures
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Swipe detection
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }
        });

        // Network status
        window.addEventListener('online', () => {
            this.showToast('Kết nối internet đã được khôi phục', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showToast('Mất kết nối internet', 'warning');
        });

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHide();
            } else {
                this.onAppShow();
            }
        });
    }

    setupPWA() {
        // Service worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }

        // Install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            this.showInstallPrompt();
        });

        // App installed
        window.addEventListener('appinstalled', () => {
            this.hideInstallPrompt();
            this.showToast('Ứng dụng đã được cài đặt thành công!', 'success');
        });
    }

    setupTheme() {
        const savedTheme = dataManager.getState('settings').theme;
        this.applyTheme(savedTheme);
    }

    preloadComponents() {
        // Preload critical components
        this.renderBottomNavigation();
        this.renderHeader();
    }

    // Screen Management
    showScreen(screenName) {
        const screens = document.querySelectorAll('.screen');
        const navItems = document.querySelectorAll('.nav-item');
        
        screens.forEach(screen => screen.classList.remove('active'));
        navItems.forEach(item => item.classList.remove('active'));
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        const targetNavItem = document.querySelector(`[onclick="showScreen('${screenName}')"]`);
        
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // Update navigation
            if (targetNavItem) {
                targetNavItem.classList.add('active');
            }
            
            // Load screen data
            this.loadScreenData(screenName);
            
            // Update URL without page reload
            history.pushState({ screen: screenName }, '', `#${screenName}`);
        }
    }

    loadScreenData(screenName) {
        switch (screenName) {
            case 'home':
                this.renderHomeScreen();
                break;
            case 'devices':
                this.renderDevicesScreen();
                break;
            case 'scenes':
                this.renderScenesScreen();
                break;
            case 'analytics':
                this.renderAnalyticsScreen();
                break;
            case 'settings':
                this.renderSettingsScreen();
                break;
        }
    }

    handleBackButton() {
        if (this.currentScreen !== 'home') {
            this.showScreen('home');
        }
    }

    handleSwipeLeft() {
        const screens = ['home', 'devices', 'scenes', 'analytics', 'settings'];
        const currentIndex = screens.indexOf(this.currentScreen);
        if (currentIndex < screens.length - 1) {
            this.showScreen(screens[currentIndex + 1]);
        }
    }

    handleSwipeRight() {
        const screens = ['home', 'devices', 'scenes', 'analytics', 'settings'];
        const currentIndex = screens.indexOf(this.currentScreen);
        if (currentIndex > 0) {
            this.showScreen(screens[currentIndex - 1]);
        }
    }

    // Home Screen Rendering
    renderHomeScreen() {
        this.renderFavoriteDevices();
        this.renderQuickScenes();
        this.updateSummaryCards();
        this.updateWeatherWidget();
    }

    renderFavoriteDevices() {
        const container = document.getElementById('favorite-devices');
        const favoriteDevices = dataManager.getFavoriteDevices().slice(0, 6);
        
        container.innerHTML = favoriteDevices.map(device => `
            <div class="device-card ${device.isOnline ? 'online' : 'offline'}" 
                 onclick="showDeviceControl('${device.id}')">
                <div class="device-icon">${device.icon}</div>
                <div class="device-name">${device.name}</div>
                <div class="device-status">
                    ${device.isOnline ? (device.isOn ? 'Đang bật' : 'Đang tắt') : 'Offline'}
                </div>
                <button class="device-toggle ${device.isOn ? 'on' : 'off'}" 
                        onclick="event.stopPropagation(); toggleDevice('${device.id}')">
                    ${device.isOn ? 'BẬT' : 'TẮT'}
                </button>
            </div>
        `).join('');
    }

    renderQuickScenes() {
        const container = document.getElementById('quick-scenes');
        const quickScenes = dataManager.getState('scenes').slice(0, 4);
        
        container.innerHTML = quickScenes.map(scene => `
            <div class="scene-card" onclick="runScene('${scene.id}')">
                <span class="material-icons">${this.getSceneIcon(scene.icon)}</span>
                <div class="scene-name">${scene.name}</div>
            </div>
        `).join('');
    }

    updateSummaryCards() {
        const energyData = dataManager.getEnergyData('today');
        const cost = energyData.total * 3000; // 3000 VND per kWh
        const yesterday = dataManager.getEnergyData('yesterday');
        const change = yesterday.total > 0 ? 
            ((energyData.total - yesterday.total) / yesterday.total * 100) : 0;
        
        document.querySelector('.summary-cards').innerHTML = `
            <div class="summary-card">
                <span class="material-icons">bolt</span>
                <div class="summary-info">
                    <div class="summary-label">Điện năng</div>
                    <div class="summary-value">${Utils.formatNumber(energyData.total, 1)} kWh</div>
                </div>
            </div>
            <div class="summary-card">
                <span class="material-icons">attach_money</span>
                <div class="summary-info">
                    <div class="summary-label">Chi phí</div>
                    <div class="summary-value">~${Utils.formatNumber(cost, 0)} VNĐ</div>
                </div>
            </div>
            <div class="summary-card ${change >= 0 ? 'trend-up' : 'trend-down'}">
                <span class="material-icons">${change >= 0 ? 'trending_up' : 'trending_down'}</span>
                <div class="summary-info">
                    <div class="summary-label">So với hôm qua</div>
                    <div class="summary-value">${change >= 0 ? '+' : ''}${Utils.formatNumber(change, 1)}%</div>
                </div>
            </div>
        `;
    }

    updateWeatherWidget() {
        // Simulate weather data
        const weather = {
            temperature: 28,
            location: 'Hà Nội, Hôm nay',
           condition: 'Nắng, gió nhẹ',
           icon: '☀️'
       };

       document.querySelector('.weather-widget .weather-info').innerHTML = `
           <span class="weather-icon">${weather.icon}</span>
           <div class="weather-details">
               <div class="temperature">${weather.temperature}°C</div>
               <div class="location">${weather.location}</div>
               <div class="description">${weather.condition}</div>
           </div>
       `;
   }

   // Devices Screen Rendering
   renderDevicesScreen() {
       this.renderDeviceList();
       this.updateNotificationBadge();
   }

   renderDeviceList() {
       const container = document.getElementById('device-list');
       const devices = dataManager.getState('devices');
       const currentHome = dataManager.getCurrentHome();
       
       if (!currentHome || devices.length === 0) {
           container.innerHTML = this.renderEmptyDeviceState();
           return;
       }

       // Group devices by room
       const devicesByRoom = {};
       currentHome.rooms.forEach(room => {
           devicesByRoom[room.id] = {
               room: room,
               devices: devices.filter(d => d.roomId === room.id)
           };
       });

       container.innerHTML = Object.values(devicesByRoom).map(({ room, devices }) => `
           <div class="room-group" id="room-${room.id}">
               <div class="room-header" onclick="toggleRoomGroup('${room.id}')">
                   <div class="room-title">
                       ${room.icon} ${room.name.toUpperCase()}
                       <span class="room-count">(${devices.length})</span>
                   </div>
                   <span class="material-icons room-toggle">expand_more</span>
               </div>
               <div class="room-devices">
                   ${devices.map(device => this.renderDeviceItem(device)).join('')}
               </div>
           </div>
       `).join('');
   }

   renderDeviceItem(device) {
       const statusText = device.isOnline ? 
           (device.isOn ? 'Đang hoạt động' : 'Sẵn sàng') : 
           `Offline ${Utils.formatRelativeTime(device.lastUpdated)}`;
       
       const detailText = this.getDeviceDetails(device);

       return `
           <div class="device-item ${device.isOnline ? 'online' : 'offline'}" 
                onclick="showDeviceControl('${device.id}')">
               <div class="device-icon">${device.icon}</div>
               <div class="device-item-info">
                   <div class="device-item-name">${device.name}</div>
                   <div class="device-item-details">
                       ${statusText}${detailText ? ' • ' + detailText : ''}
                   </div>
               </div>
               <div class="device-item-toggle">
                   <button class="device-toggle ${device.isOn ? 'on' : 'off'}" 
                           onclick="event.stopPropagation(); toggleDevice('${device.id}')">
                       ${device.isOn ? 'BẬT' : 'TẮT'}
                   </button>
               </div>
           </div>
       `;
   }

   getDeviceDetails(device) {
       switch (device.type) {
           case 'light':
               return device.isOn ? `${device.brightness}% • ${this.getColorName(device.color)}` : '';
           case 'ac':
               return device.isOn ? `${device.temperature}°C • ${device.mode}` : '';
           case 'socket':
               return device.isOn ? `${device.powerConsumption}W` : '';
           default:
               return '';
       }
   }

   getColorName(color) {
       const colorNames = {
           'warm_white': 'Trắng ấm',
           'cool_white': 'Trắng lạnh',
           'red': 'Đỏ',
           'green': 'Xanh lục',
           'blue': 'Xanh dương',
           'purple': 'Tím'
       };
       return colorNames[color] || 'Trắng';
   }

   renderEmptyDeviceState() {
       return `
           <div class="empty-state">
               <div class="empty-icon">
                   <span class="material-icons">devices</span>
               </div>
               <h3>Chưa có thiết bị nào</h3>
               <p>Bắt đầu xây dựng ngôi nhà thông minh của bạn bằng cách thêm thiết bị đầu tiên!</p>
               <button class="btn btn-primary" onclick="showAddDevice()">
                   <span class="material-icons">add</span>
                   Thêm thiết bị
               </button>
               <div class="compatible-devices">
                   <h4>Thiết bị tương thích</h4>
                   <div class="device-types">
                       <span>💡 Đèn thông minh</span>
                       <span>🔌 Ổ cắm thông minh</span>
                       <span>❄️ Điều hòa thông minh</span>
                       <span>📺 Smart TV</span>
                       <span>🔒 Khóa thông minh</span>
                       <span>📷 Camera an ninh</span>
                   </div>
               </div>
           </div>
       `;
   }

   // Scenes Screen Rendering
   renderScenesScreen() {
       this.renderScenesList();
       this.renderAISuggestions();
   }

   renderScenesList() {
       const container = document.getElementById('scene-list');
       const scenes = dataManager.getState('scenes');
       
       if (scenes.length === 0) {
           container.innerHTML = this.renderEmptySceneState();
           return;
       }

       container.innerHTML = scenes.map(scene => `
           <div class="scene-item">
               <div class="scene-header">
                   <div class="scene-title">
                       <span class="material-icons">${this.getSceneIcon(scene.icon)}</span>
                       ${scene.name}
                   </div>
                   <button class="scene-toggle ${scene.isActive ? 'on' : 'off'}" 
                           onclick="toggleScene('${scene.id}')">
                   </button>
               </div>
               <div class="scene-details">
                   ${scene.actions?.length || 0} thiết bị • ${this.getSceneTriggerText(scene.trigger)}
                   ${scene.lastRun ? `• Chạy lần cuối: ${Utils.formatRelativeTime(scene.lastRun)}` : ''}
               </div>
               <div class="scene-actions">
                   <button class="btn btn-sm btn-primary" onclick="runScene('${scene.id}')">
                       Chạy
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="editScene('${scene.id}')">
                       <span class="material-icons">edit</span>
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="deleteScene('${scene.id}')">
                       <span class="material-icons">delete</span>
                   </button>
               </div>
           </div>
       `).join('');
   }

   renderAISuggestions() {
       const container = document.getElementById('ai-suggestions');
       const suggestions = dataManager.generateAISuggestions();
       
       container.innerHTML = suggestions.map(suggestion => `
           <div class="ai-suggestion">
               <h4>${suggestion.title}</h4>
               <p>${suggestion.description}</p>
               <div class="suggestion-actions">
                   <button class="btn btn-sm btn-primary" onclick="applySuggestion('${suggestion.id}')">
                       ${this.getSuggestionActionText(suggestion.action)}
                   </button>
                   <button class="btn btn-sm btn-text" onclick="dismissSuggestion('${suggestion.id}')">
                       Bỏ qua
                   </button>
               </div>
           </div>
       `).join('');
   }

   getSceneIcon(icon) {
       const iconMap = {
           '🏠': 'home',
           '😴': 'bedtime',
           '🌙': 'nightlight',
           '⚡': 'flash_on',
           '☀️': 'wb_sunny',
           '🌅': 'wb_twilight'
       };
       return iconMap[icon] || 'play_circle';
   }

   getSceneTriggerText(trigger) {
       if (!trigger) return 'Thủ công';
       
       switch (trigger.type) {
           case 'time':
               return `Tự động ${trigger.value}`;
           case 'sensor':
               return 'Dựa trên cảm biến';
           case 'device':
               return 'Khi thiết bị thay đổi';
           default:
               return 'Thủ công';
       }
   }

   getSuggestionActionText(action) {
       const actionTexts = {
           'create_energy_scene': 'Tạo kịch bản',
           'create_schedule': 'Tạo lịch trình',
           'check_devices': 'Kiểm tra ngay'
       };
       return actionTexts[action] || 'Thực hiện';
   }

   renderEmptySceneState() {
       return `
           <div class="empty-state">
               <div class="empty-icon">
                   <span class="material-icons">movie</span>
               </div>
               <h3>Chưa có kịch bản nào</h3>
               <p>Tạo kịch bản để tự động hóa nhiều thiết bị cùng lúc!</p>
               <button class="btn btn-primary" onclick="showAddScene()">
                   <span class="material-icons">add</span>
                   Tạo kịch bản đầu tiên
               </button>
           </div>
       `;
   }

   // Analytics Screen Rendering
   renderAnalyticsScreen() {
       this.updateAnalyticsOverview();
       this.renderEnergyChart();
       this.renderTopDevices();
       this.renderRecommendations();
   }

   updateAnalyticsOverview() {
       const period = document.querySelector('.period-btn.active')?.textContent.toLowerCase() || 'hôm nay';
       const energyData = dataManager.getEnergyData(period === 'hôm nay' ? 'today' : period);
       const cost = energyData.total * 3000;
       
       document.querySelector('.analytics-overview').innerHTML = `
           <div class="analytics-card">
               <div class="analytics-icon">⚡</div>
               <div class="analytics-info">
                   <div class="analytics-value">${Utils.formatNumber(energyData.total, 1)} kWh</div>
                   <div class="analytics-label">Tổng tiêu thụ</div>
               </div>
           </div>
           <div class="analytics-card">
               <div class="analytics-icon">💰</div>
               <div class="analytics-info">
                   <div class="analytics-value">${Utils.formatNumber(cost, 0)} VNĐ</div>
                   <div class="analytics-label">Chi phí</div>
               </div>
           </div>
           <div class="analytics-card trend">
               <div class="analytics-icon">📈</div>
               <div class="analytics-info">
                   <div class="analytics-value">+12%</div>
                   <div class="analytics-label">So với ${period === 'hôm nay' ? 'hôm qua' : 'kỳ trước'}</div>
               </div>
           </div>
       `;
   }

   renderEnergyChart() {
       const canvas = document.getElementById('energy-chart');
       const ctx = canvas.getContext('2d');
       const energyData = dataManager.getEnergyData('today');
       
       // Simple chart implementation
       this.drawSimpleChart(ctx, energyData.hourly);
   }

   drawSimpleChart(ctx, data) {
       const canvas = ctx.canvas;
       const width = canvas.width;
       const height = canvas.height;
       
       // Clear canvas
       ctx.clearRect(0, 0, width, height);
       
       // Chart settings
       const padding = 40;
       const chartWidth = width - 2 * padding;
       const chartHeight = height - 2 * padding;
       
       // Find max value
       const maxValue = Math.max(...data.map(d => d.consumption));
       
       // Draw grid lines
       ctx.strokeStyle = '#E0E0E0';
       ctx.lineWidth = 1;
       
       // Horizontal grid lines
       for (let i = 0; i <= 5; i++) {
           const y = padding + (chartHeight / 5) * i;
           ctx.beginPath();
           ctx.moveTo(padding, y);
           ctx.lineTo(width - padding, y);
           ctx.stroke();
       }
       
       // Vertical grid lines
       for (let i = 0; i <= 24; i += 4) {
           const x = padding + (chartWidth / 24) * i;
           ctx.beginPath();
           ctx.moveTo(x, padding);
           ctx.lineTo(x, height - padding);
           ctx.stroke();
       }
       
       // Draw data line
       ctx.strokeStyle = '#2196F3';
       ctx.lineWidth = 3;
       ctx.beginPath();
       
       data.forEach((point, index) => {
           const x = padding + (chartWidth / 24) * point.hour;
           const y = height - padding - (chartHeight * point.consumption / maxValue);
           
           if (index === 0) {
               ctx.moveTo(x, y);
           } else {
               ctx.lineTo(x, y);
           }
       });
       
       ctx.stroke();
       
       // Draw data points
       ctx.fillStyle = '#2196F3';
       data.forEach(point => {
           const x = padding + (chartWidth / 24) * point.hour;
           const y = height - padding - (chartHeight * point.consumption / maxValue);
           
           ctx.beginPath();
           ctx.arc(x, y, 4, 0, 2 * Math.PI);
           ctx.fill();
       });
       
       // Draw labels
       ctx.fillStyle = '#757575';
       ctx.font = '12px Inter';
       ctx.textAlign = 'center';
       
       // X-axis labels (hours)
       for (let i = 0; i <= 24; i += 6) {
           const x = padding + (chartWidth / 24) * i;
           ctx.fillText(i.toString(), x, height - 10);
       }
       
       // Y-axis labels (kWh)
       ctx.textAlign = 'right';
       for (let i = 0; i <= 5; i++) {
           const y = padding + (chartHeight / 5) * i;
           const value = maxValue * (5 - i) / 5;
           ctx.fillText(value.toFixed(1), padding - 10, y + 4);
       }
   }

   renderTopDevices() {
       const container = document.getElementById('top-devices');
       const energyData = dataManager.getEnergyData('today');
       const devices = dataManager.getState('devices');
       
       // Sort devices by energy consumption
       const deviceConsumption = Object.entries(energyData.devices).map(([deviceId, consumption]) => {
           const device = devices.find(d => d.id === deviceId);
           return { device, consumption };
       }).filter(item => item.device).sort((a, b) => b.consumption - a.consumption);
       
       container.innerHTML = deviceConsumption.slice(0, 5).map((item, index) => {
           const cost = item.consumption * 3000;
           const percentage = (item.consumption / energyData.total * 100);
           
           return `
               <div class="top-device" onclick="showDeviceAnalytics('${item.device.id}')">
                   <div class="top-device-rank">${index + 1}</div>
                   <div class="top-device-icon">${item.device.icon}</div>
                   <div class="top-device-info">
                       <div class="top-device-name">${item.device.name}</div>
                       <div class="top-device-consumption">
                           ${Utils.formatNumber(item.consumption, 1)} kWh (${Utils.formatNumber(percentage, 0)}%) • ${Utils.formatNumber(cost, 0)} VNĐ
                       </div>
                   </div>
               </div>
           `;
       }).join('');
   }

   renderRecommendations() {
       const container = document.getElementById('recommendations');
       const recommendations = [
           {
               icon: '💡',
               text: 'Điều chỉnh điều hòa lên 1°C có thể tiết kiệm ~15% điện năng'
           },
           {
               icon: '⏰',
               text: 'Tắt thiết bị chờ từ 23:00 có thể tiết kiệm ~8% điện năng'
           },
           {
               icon: '🔄',
               text: 'Sử dụng kịch bản "Tiết kiệm điện" vào ban đêm'
           }
       ];
       
       container.innerHTML = recommendations.map(rec => `
           <div class="recommendation">
               <span class="recommendation-icon">${rec.icon}</span>
               <div class="recommendation-text">${rec.text}</div>
           </div>
       `).join('');
   }

   // Settings Screen Rendering
   renderSettingsScreen() {
       this.updateProfileSection();
       this.renderSettingsGroups();
   }

   updateProfileSection() {
       const user = dataManager.getUser();
       if (!user) return;
       
       document.querySelector('.profile-name').textContent = user.name;
       document.querySelector('.profile-email').textContent = user.email;
   }

   renderSettingsGroups() {
       // Settings groups are already in HTML, just update dynamic content
       this.updateNotificationBadge();
   }

   // Modal Management
   showModal(modalId, data = {}) {
       const overlay = document.getElementById('modal-overlay');
       const modal = document.getElementById(modalId);
       
       if (!modal) return;
       
       // Hide other modals
       overlay.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
       
       // Show target modal
       modal.style.display = 'flex';
       overlay.classList.add('show');
       
       // Store modal data
       this.modals.set(modalId, data);
       
       // Initialize modal content
       this.initializeModal(modalId, data);
       
       // Add to history
       history.pushState({ modal: modalId }, '', '');
   }

   closeModal() {
       const overlay = document.getElementById('modal-overlay');
       overlay.classList.remove('show');
       
       // Clear modal data
       this.modals.clear();
       
       // Go back in history
       if (history.state?.modal) {
           history.back();
       }
   }

   isModalOpen() {
       return document.getElementById('modal-overlay').classList.contains('show');
   }

   initializeModal(modalId, data) {
       switch (modalId) {
           case 'device-control-modal':
               this.initializeDeviceControlModal(data.deviceId);
               break;
           case 'add-device-modal':
               this.initializeAddDeviceModal();
               break;
           case 'notifications-modal':
               this.initializeNotificationsModal();
               break;
       }
   }

   initializeDeviceControlModal(deviceId) {
       const device = dataManager.getState('devices').find(d => d.id === deviceId);
       if (!device) return;
       
       document.getElementById('device-control-title').textContent = device.name;
       
       const content = document.getElementById('device-control-content');
       content.innerHTML = `
           <div class="device-control-info">
               <div class="device-icon">${device.icon}</div>
               <h3>${device.name}</h3>
               <p>${device.isOnline ? 'Đang kết nối' : 'Offline'}</p>
           </div>
           
           <div class="control-section">
               <div class="control-title">Điều khiển chính</div>
               <div class="power-control">
                   <button class="power-toggle ${device.isOn ? 'on' : 'off'}" 
                           onclick="toggleDeviceInModal('${deviceId}')">
                   </button>
               </div>
               <div class="power-labels">
                   <span>TẮT</span>
                   <span>BẬT</span>
               </div>
           </div>
           
           ${this.renderDeviceSpecificControls(device)}
           
           <div class="control-section">
               <div class="control-title">Thao tác nhanh</div>
               <div class="quick-actions">
                   <button class="quick-action" onclick="showDeviceTimer('${deviceId}')">
                       <span class="material-icons">schedule</span>
                       <span>Hẹn giờ</span>
                   </button>
                   <button class="quick-action" onclick="showDeviceSchedule('${deviceId}')">
                       <span class="material-icons">event</span>
                       <span>Lịch trình</span>
                   </button>
                   <button class="quick-action" onclick="showDeviceAnalytics('${deviceId}')">
                       <span class="material-icons">analytics</span>
                       <span>Thống kê</span>
                   </button>
                   <button class="quick-action" onclick="showDeviceShare('${deviceId}')">
                       <span class="material-icons">share</span>
                       <span>Chia sẻ</span>
                   </button>
               </div>
           </div>
       `;
   }

   renderDeviceSpecificControls(device) {
       let controls = '';
       
       if (device.capabilities.includes('brightness')) {
           controls += `
               <div class="control-section">
                   <div class="control-title">Độ sáng</div>
                   <div class="slider-control">
                       <input type="range" class="slider" min="1" max="100" 
                              value="${device.brightness}" 
                              oninput="updateDeviceBrightness('${device.id}', this.value)">
                       <div class="slider-value">${device.brightness}%</div>
                   </div>
               </div>
           `;
       }
       
       if (device.capabilities.includes('temperature')) {
           controls += `
               <div class="control-section">
                   <div class="control-title">Nhiệt độ</div>
                   <div class="slider-control">
                       <input type="range" class="slider" min="16" max="30" 
                              value="${device.temperature}" 
                              oninput="updateDeviceTemperature('${device.id}', this.value)">
                       <div class="slider-value">${device.temperature}°C</div>
                   </div>
               </div>
           `;
       }
       
       if (device.capabilities.includes('color')) {
           controls += `
               <div class="control-section">
                   <div class="control-title">Màu sắc</div>
                   <div class="color-control">
                       <div class="color-option warm-white ${device.color === 'warm_white' ? 'active' : ''}" 
                            onclick="updateDeviceColor('${device.id}', 'warm_white')"></div>
                       <div class="color-option cool-white ${device.color === 'cool_white' ? 'active' : ''}" 
                            onclick="updateDeviceColor('${device.id}', 'cool_white')"></div>
                       <div class="color-option red ${device.color === 'red' ? 'active' : ''}" 
                            onclick="updateDeviceColor('${device.id}', 'red')"></div>
                       <div class="color-option green ${device.color === 'green' ? 'active' : ''}" 
                            onclick="updateDeviceColor('${device.id}', 'green')"></div>
                       <div class="color-option blue ${device.color === 'blue' ? 'active' : ''}" 
                            onclick="updateDeviceColor('${device.id}', 'blue')"></div>
                       <div class="color-option purple ${device.color === 'purple' ? 'active' : ''}" 
                            onclick="updateDeviceColor('${device.id}', 'purple')"></div>
                   </div>
               </div>
           `;
       }
       
       return controls;
   }

   initializeAddDeviceModal() {
       this.startNearbyDevicesScan();
   }

   initializeNotificationsModal() {
       this.renderNotificationsList();
   }

   renderNotificationsList() {
       const container = document.getElementById('notifications-list');
       const notifications = dataManager.getState('notifications');
       
       if (notifications.length === 0) {
           container.innerHTML = `
               <div class="empty-state">
                   <div class="empty-icon">
                       <span class="material-icons">notifications_none</span>
                   </div>
                   <h3>Không có thông báo</h3>
                   <p>Bạn sẽ nhận được thông báo về hoạt động của thiết bị tại đây</p>
               </div>
           `;
           return;
       }

       // Group notifications by date
       const groupedNotifications = this.groupNotificationsByDate(notifications);
       
       container.innerHTML = Object.entries(groupedNotifications).map(([date, notifs]) => `
           <div class="notification-group">
               <h4>${this.formatNotificationDate(date)}</h4>
               ${notifs.map(notification => this.renderNotificationItem(notification)).join('')}
           </div>
       `).join('');
   }

   groupNotificationsByDate(notifications) {
       const grouped = {};
       
       notifications.forEach(notification => {
           const date = new Date(notification.timestamp).toDateString();
           if (!grouped[date]) {
               grouped[date] = [];
           }
           grouped[date].push(notification);
       });
       
       return grouped;
   }

   formatNotificationDate(dateString) {
       const date = new Date(dateString);
       const today = new Date().toDateString();
       const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
       
       if (dateString === today) return 'HÔM NAY';
       if (dateString === yesterday) return 'HÔM QUA';
       
       return Utils.formatDateTime(date, { 
           weekday: 'long', 
           month: 'long', 
           day: 'numeric' 
       }).toUpperCase();
   }

   renderNotificationItem(notification) {
       return `
           <div class="notification-item ${notification.isRead ? '' : 'unread'}" 
                onclick="showNotificationDetail('${notification.id}')">
               <div class="notification-header">
                   <div class="notification-icon ${notification.type}">
                       ${this.getNotificationIcon(notification.type)}
                   </div>
                   <div class="notification-title">${notification.title}</div>
                   <div class="notification-time">
                       ${Utils.formatDateTime(notification.timestamp, { hour: '2-digit', minute: '2-digit' })}
                   </div>
               </div>
               <div class="notification-content">${notification.message}</div>
               ${notification.actions ? this.renderNotificationActions(notification) : ''}
           </div>
       `;
   }

   getNotificationIcon(type) {
       const icons = {
           'warning': '⚠️',
           'success': '✅',
           'info': 'ℹ️',
           'error': '❌'
       };
       return icons[type] || 'ℹ️';
   }

   renderNotificationActions(notification) {
       if (!notification.actions || notification.actions.length === 0) return '';
       
       return `
           <div class="notification-actions">
               ${notification.actions.map(action => `
                   <button class="btn btn-sm btn-outline" 
                           onclick="event.stopPropagation(); handleNotificationAction('${notification.id}', '${action}')">
                       ${this.getActionText(action)}
                   </button>
               `).join('')}
           </div>
       `;
   }

   getActionText(action) {
       const actionTexts = {
           'check_device': 'Kiểm tra',
           'dismiss': 'Bỏ qua',
           'view_details': 'Xem chi tiết',
           'view_analytics': 'Xem thống kê'
       };
       return actionTexts[action] || action;
   }

   // Toast Notifications
   showToast(message, type = 'info', duration = 4000) {
       const toast = this.createToast(message, type);
       const container = document.getElementById('toast-container');
       
       container.appendChild(toast);
       
       // Auto remove
       setTimeout(() => {
           this.removeToast(toast);
       }, duration);
       
       return toast;
   }

   createToast(message, type) {
       const toast = document.createElement('div');
       toast.className = `toast ${type}`;
       toast.innerHTML = `
           <div class="toast-icon">
               ${this.getNotificationIcon(type)}
           </div>
           <div class="toast-content">
               <div class="toast-message">${message}</div>
           </div>
           <button class="toast-close" onclick="ui.removeToast(this.parentElement)">
               <span class="material-icons">close</span>
           </button>
       `;
       
       return toast;
   }

   removeToast(toast) {
       if (toast && toast.parentElement) {
           toast.style.animation = 'slideUp 0.3s ease forwards';
           setTimeout(() => {
               toast.remove();
           }, 300);
       }
   }

   // Voice Control
   startVoiceControl() {
       if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
           this.showToast('Trình duyệt không hỗ trợ nhận dạng giọng nói', 'error');
           return;
       }

       this.isVoiceActive = true;
       document.getElementById('voice-overlay').classList.add('show');
       
       const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
       const recognition = new SpeechRecognition();
       
       recognition.lang = 'vi-VN';
       recognition.continuous = false;
       recognition.interimResults = true;
       
       recognition.onresult = (event) => {
           const transcript = event.results[0][0].transcript;
           document.getElementById('voice-transcript').textContent = transcript;
           
           if (event.results[0].isFinal) {
               this.processVoiceCommand(transcript);
           }
       };
       
       recognition.onerror = (event) => {
           console.error('Speech recognition error:', event.error);
           this.stopVoiceControl();
           this.showToast('Không thể nhận dạng giọng nói. Vui lòng thử lại.', 'error');
       };
       
       recognition.onend = () => {
           this.stopVoiceControl();
       };
       
       recognition.start();
       this.currentRecognition = recognition;
   }

   stopVoiceControl() {
       this.isVoiceActive = false;
       document.getElementById('voice-overlay').classList.remove('show');
       
       if (this.currentRecognition) {
           this.currentRecognition.stop();
           this.currentRecognition = null;
       }
   }

   processVoiceCommand(command) {
       const normalizedCommand = command.toLowerCase().trim();
       
       // Device control commands
       if (normalizedCommand.includes('bật') || normalizedCommand.includes('mở')) {
           this.processDeviceCommand(normalizedCommand, true);
       } else if (normalizedCommand.includes('tắt') || normalizedCommand.includes('đóng')) {
           this.processDeviceCommand(normalizedCommand, false);
       } 
       // Scene commands
       else if (normalizedCommand.includes('kịch bản') || normalizedCommand.includes('về nhà') || normalizedCommand.includes('đi ngủ')) {
           this.processSceneCommand(normalizedCommand);
       }
       // Information commands
       else if (normalizedCommand.includes('điện năng') || normalizedCommand.includes('tiêu thụ')) {
           this.processInfoCommand(normalizedCommand);
       }
       // Navigation commands
       else if (normalizedCommand.includes('đi đến') || normalizedCommand.includes('mở')) {
           this.processNavigationCommand(normalizedCommand);
       }
       else {
           this.showToast('Không hiểu lệnh. Vui lòng thử lại.', 'warning');
       }
   }

   processDeviceCommand(command, turnOn) {
       const devices = dataManager.getState('devices');
       let foundDevice = null;
       
       // Try to match device by name or type
       for (const device of devices) {
           if (command.includes(device.name.toLowerCase()) || 
               command.includes(this.getDeviceTypeKeywords(device.type))) {
               foundDevice = device;
               break;
           }
       }
       
       if (foundDevice) {
           dataManager.toggleDevice(foundDevice.id);
           this.showToast(
               `${turnOn ? 'Đã bật' : 'Đã tắt'} ${foundDevice.name}`, 
               'success'
           );
       } else {
           this.showToast('Không tìm thấy thiết bị phù hợp', 'warning');
       }
   }

   getDeviceTypeKeywords(type) {
       const keywords = {
           'light': 'đèn',
           'ac': 'điều hòa',
           'tv': 'ti vi',
           'socket': 'ổ cắm',
           'speaker': 'loa',
           'camera': 'camera',
           'lock': 'khóa'
       };
       return keywords[type] || '';
   }

   processSceneCommand(command) {
       const scenes = dataManager.getState('scenes');
       let foundScene = null;
       
       for (const scene of scenes) {
           if (command.includes(scene.name.toLowerCase())) {
               foundScene = scene;
               break;
           }
       }
       
       if (foundScene) {
           dataManager.runScene(foundScene.id);
           this.showToast(`Đang thực hiện kịch bản "${foundScene.name}"`, 'success');
       } else {
           this.showToast('Không tìm thấy kịch bản phù hợp', 'warning');
       }
   }

   processInfoCommand(command) {
       const energyData = dataManager.getEnergyData('today');
       const cost = energyData.total * 3000;
       
       this.showToast(
           `Hôm nay đã tiêu thụ ${Utils.formatNumber(energyData.total, 1)} kWh, 
            chi phí khoảng ${Utils.formatNumber(cost, 0)} VNĐ`, 
           'info'
       );
   }

   processNavigationCommand(command) {
       if (command.includes('thiết bị')) {
           this.showScreen('devices');
       } else if (command.includes('kịch bản')) {
           this.showScreen('scenes');
       } else if (command.includes('thống kê')) {
           this.showScreen('analytics');
       } else if (command.includes('cài đặt')) {
           this.showScreen('settings');
       } else {
           this.showScreen('home');
       }
   }

   // Theme Management
   applyTheme(theme) {
       const body = document.body;
       
       // Remove existing theme classes
       body.classList.remove('theme-light', 'theme-dark', 'theme-auto', 'theme-high-contrast');
       
       // Apply new theme
       body.classList.add(`theme-${theme}`);
       
       // Update theme color meta tag
       const themeColor = theme === 'dark' ? '#121212' : '#2196F3';
       document.querySelector('meta[name="theme-color"]').content = themeColor;
       
       // Save to settings
       dataManager.updateState('settings', { theme });
   }

   // PWA Install
   showInstallPrompt() {
       const prompt = document.getElementById('install-prompt');
       if (prompt) {
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
               this.hideInstallPrompt();
           }
           
           this.installPrompt = null;
       }
   }

   dismissInstall() {
       this.hideInstallPrompt();
       Utils.storage.set('install_dismissed', true);
   }

   // Utility Methods
   updateNotificationBadge() {
       const badge = document.getElementById('notification-badge');
       const count = dataManager.getUnreadNotificationCount();
       
       if (count > 0) {
           badge.textContent = count > 99 ? '99+' : count.toString();
           badge.style.display = 'block';
       } else {
           badge.style.display = 'none';
       }
   }

   startNearbyDevicesScan() {
       const container = document.getElementById('nearby-devices-list');
       
       // Simulate device discovery
       setTimeout(() => {
           const nearbyDevices = [
               { id: 'nearby1', name: 'Smart Switch (Sonoff)', distance: '~2m', type: 'switch' },
               { id: 'nearby2', name: 'Smart Bulb (Philips)', distance: '~5m', type: 'light' },
               { id: 'nearby3', name: 'Smart Plug (TP-Link)', distance: '~3m', type: 'socket' }
           ];
           
           container.innerHTML = nearbyDevices.map(device => `
               <div class="nearby-device">
                   <div class="nearby-device-info">
                       <h5>${device.name}</h5>
                       <p>Khoảng cách: ${device.distance}</p>
                   </div>
                   <button class="btn btn-sm btn-primary" onclick="connectNearbyDevice('${device.id}')">
                       Kết nối
                   </button>
               </div>
           `).join('');
       }, 2000);
   }

   showLoading(text = 'Đang xử lý...') {
       document.getElementById('loading-text').textContent = text;
       document.getElementById('loading-modal').style.display = 'flex';
       document.getElementById('modal-overlay').classList.add('show');
   }

   hideLoading() {
       document.getElementById('loading-modal').style.display = 'none';
       if (!this.isModalOpen()) {
           document.getElementById('modal-overlay').classList.remove('show');
       }
   }

   showConfirmation(title, message, onConfirm, type = 'warning') {
       document.getElementById('confirmation-title').textContent = title;
       document.getElementById('confirmation-message').textContent = message;
       document.getElementById('confirmation-icon').textContent = 
           type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info';
       
       const confirmBtn = document.getElementById('confirmation-confirm');
       confirmBtn.onclick = () => {
           this.closeModal();
           if (onConfirm) onConfirm();
       };
       
       this.showModal('confirmation-modal');
   }

   // App lifecycle
   onAppShow() {
       // Refresh data when app becomes visible
       this.updateNotificationBadge();
       this.refreshCurrentScreen();
   }

   onAppHide() {
       // Save state when app goes to background
       dataManager.saveToStorage();
   }

   refreshCurrentScreen() {
       this.loadScreenData(this.currentScreen);
   }

   renderBottomNavigation() {
       // Navigation is already in HTML, just update active state
       const navItems = document.querySelectorAll('.nav-item');
       navItems.forEach(item => {
           item.addEventListener('click', () => {
               const screen = item.getAttribute('onclick').match(/'([^']+)'/)[1];
               this.showScreen(screen);
           });
       });
   }

   renderHeader() {
       // Update home selector
       const currentHome = dataManager.getCurrentHome();
       if (currentHome) {
           document.getElementById('current-home-name').textContent = currentHome.name;
       }
       
       // Update notification badge
       this.updateNotificationBadge();
   }
}

// Global Functions for HTML onclick handlers
function showScreen(screenName) {
   ui.showScreen(screenName);
}

function toggleDevice(deviceId) {
   dataManager.toggleDevice(deviceId);
   ui.refreshCurrentScreen();
   ui.showToast('Đã thay đổi trạng thái thiết bị', 'success');
}

function showDeviceControl(deviceId) {
   ui.showModal('device-control-modal', { deviceId });
}

function toggleDeviceInModal(deviceId) {
   toggleDevice(deviceId);
   // Update modal content
   ui.initializeDeviceControlModal(deviceId);
}

function updateDeviceBrightness(deviceId, value) {
   dataManager.updateDevice(deviceId, { brightness: parseInt(value) });
   document.querySelector(`[oninput*="${deviceId}"] + .slider-value`).textContent = `${value}%`;
}

function updateDeviceTemperature(deviceId, value) {
   dataManager.updateDevice(deviceId, { temperature: parseInt(value) });
   document.querySelector(`[oninput*="${deviceId}"] + .slider-value`).textContent = `${value}°C`;
}

function updateDeviceColor(deviceId, color) {
   dataManager.updateDevice(deviceId, { color });
   
   // Update UI
   const colorOptions = document.querySelectorAll('.color-option');
   colorOptions.forEach(option => option.classList.remove('active'));
   document.querySelector(`.color-option.${color.replace('_', '-')}`).classList.add('active');
}

function runScene(sceneId) {
   dataManager.runScene(sceneId);
}

function toggleScene(sceneId) {
   const scene = dataManager.getState('scenes').find(s => s.id === sceneId);
   if (scene) {
       dataManager.updateScene(sceneId, { isActive: !scene.isActive });
       ui.refreshCurrentScreen();
   }
}

function showAddDevice() {
   ui.showModal('add-device-modal');
}

function showNotifications() {
   ui.showModal('notifications-modal');
}

function closeModal() {
   ui.closeModal();
}

function startVoiceControl() {
   ui.startVoiceControl();
}

function stopVoiceControl() {
   ui.stopVoiceControl();
}

function showHomeSelector() {
   // Implementation for home selector
   ui.showToast('Chức năng đang phát triển', 'info');
}

function setPeriod(period) {
   const buttons = document.querySelectorAll('.period-btn');
   buttons.forEach(btn => btn.classList.remove('active'));
   event.target.classList.add('active');
   
   ui.updateAnalyticsOverview();
   ui.renderEnergyChart();
}

function toggleRoomGroup(roomId) {
   const roomGroup = document.getElementById(`room-${roomId}`);
   roomGroup.classList.toggle('collapsed');
}

function filterDevices(query) {
   // Implementation for device filtering
   console.log('Filtering devices:', query);
}

function filterByRoom(roomId) {
   // Implementation for room filtering
   console.log('Filtering by room:', roomId);
}

function filterByType(type) {
   // Implementation for type filtering
   console.log('Filtering by type:', type);
}

function connectNearbyDevice(deviceId) {
   ui.showLoading('Đang kết nối thiết bị...');
   
   setTimeout(() => {
       ui.hideLoading();
       ui.closeModal();
       ui.showToast('Thiết bị đã được thêm thành công!', 'success');
       
       // Add to device list
       dataManager.addDevice({
           name: 'Thiết bị mới',
           type: 'switch',
           icon: '🔌',
           roomId: dataManager.getCurrentHome()?.rooms[0]?.id
       });
       
       ui.refreshCurrentScreen();
   }, 2000);
}

function installPWA() {
   ui.installPWA();
}

function dismissInstall() {
   ui.dismissInstall();
}

function handleNotificationAction(notificationId, action) {
   console.log('Notification action:', action, 'for notification:', notificationId);
   
   switch (action) {
       case 'check_device':
           ui.showScreen('devices');
           break;
       case 'view_analytics':
           ui.showScreen('analytics');
           break;
       case 'dismiss':
           dataManager.deleteNotification(notificationId);
           ui.refreshCurrentScreen();
           break;
   }
   
   dataManager.markNotificationAsRead(notificationId);
   ui.updateNotificationBadge();
}

function logout() {
   ui.showConfirmation(
       'Đăng xuất',
       'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?',
       () => {
           dataManager.logout();
           window.location.reload();
       }
   );
}

// Navigation functions
function editProfile() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function changePassword() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function themeSettings() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function languageSettings() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function notificationSettings() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function voiceSettings() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function otaSettings() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

function manageHomes() {
   ui.showToast('Chức năng đang phát triển', 'info');
}

// Create global UI instance
window.ui = new UI();