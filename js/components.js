// UI Components and Interactions
class UI {
    constructor() {
        this.currentScreen = 'home';
        this.modals = new Map();
        this.toasts = [];
        this.isVoiceActive = false;
        this.installPrompt = null;
        this.currentConfirmAction = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPWA();
        this.setupTheme();
        this.preloadComponents();
    }

    setupEventListeners() {
        window.addEventListener('popstate', (e) => {
            if (this.isModalOpen()) {
                this.closeModal();
            } else {
                this.handleBackButton();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isModalOpen()) {
                    this.closeModal();
                } else if (this.isVoiceActive) {
                    this.stopVoiceControl();
                }
            }
        });

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
            
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }
        });

        window.addEventListener('online', () => {
            this.showToast('Kết nối internet đã được khôi phục', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showToast('Mất kết nối internet', 'warning');
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHide();
            } else {
                this.onAppShow();
            }
        });
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            this.showInstallPrompt();
        });

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
            
            if (targetNavItem) {
                targetNavItem.classList.add('active');
            }
            
            this.loadScreenData(screenName);
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
        
        if (favoriteDevices.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <span class="material-icons">star_border</span>
                    <p>Chưa có thiết bị yêu thích</p>
                    <button class="btn btn-sm btn-outline" onclick="showScreen('devices')">
                        Thêm thiết bị
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = favoriteDevices.map(device => `
            <div class="device-card ${device.isOnline ? 'online' : 'offline'} ${device.type}" 
                 onclick="showDeviceControl('${device.id}')">
                <div class="device-icon">${device.icon}</div>
                <div class="device-name">${device.name}</div>
                <div class="device-status ${device.isOn ? 'device-status-ready' : 'device-status-offline'}">
                    ${this.getDeviceStatusText(device)}
                </div>
                <button class="device-toggle ${device.isOn ? 'on' : 'off'}" 
                        onclick="event.stopPropagation(); toggleDevice('${device.id}')">
                    ${device.isOn ? 'BẬT' : 'TẮT'}
                </button>
            </div>
        `).join('');
    }

    getDeviceStatusText(device) {
        if (!device.isOnline) return 'Offline';
        
        switch (device.type) {
            case 'water_heater':
                if (device.isOn) {
                    return `${device.currentTemperature}°C → ${device.targetTemperature}°C`;
                }
                return `${device.currentTemperature}°C • ${device.mode}`;
            case 'towel_dryer':
                if (device.isOn) {
                    const modeText = device.mode === 'towel_dry' ? 'Sấy khăn' : 'Sưởi phòng';
                    return `${device.currentTemperature}°C • ${modeText}`;
                }
                return `${device.currentTemperature}°C`;
            default:
                return device.isOn ? 'Đang bật' : 'Đang tắt';
        }
    }

    renderQuickScenes() {
        const container = document.getElementById('quick-scenes');
        const quickScenes = dataManager.getState('scenes').slice(0, 4);
        
        if (quickScenes.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <span class="material-icons">movie</span>
                    <p>Chưa có kịch bản</p>
                    <button class="btn btn-sm btn-outline" onclick="showScreen('scenes')">
                        Tạo kịch bản
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = quickScenes.map(scene => `
            <div class="scene-card" onclick="runScene('${scene.id}')">
                <span class="material-icons">${this.getSceneIcon(scene.icon)}</span>
                <div class="scene-name">${scene.name}</div>
                ${scene.lastRun ? `<div class="scene-last-run">Chạy lần cuối: ${Utils.formatRelativeTime(scene.lastRun)}</div>` : ''}
            </div>
        `).join('');
    }

    updateSummaryCards() {
        const energyData = dataManager.getEnergyData('today');
        const cost = energyData.total * dataManager.getState('settings').energy.costPerKwh;
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

        const devicesByRoom = {};
        currentHome.rooms.forEach(room => {
            devicesByRoom[room.id] = {
                room: room,
                devices: devices.filter(d => d.roomId === room.id)
            };
        });

        container.innerHTML = Object.values(devicesByRoom)
            .filter(({ devices }) => devices.length > 0)
            .map(({ room, devices }) => `
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
            <div class="device-item ${device.isOnline ? 'online' : 'offline'} ${device.type}" 
                 onclick="showDeviceControl('${device.id}')">
                <div class="device-icon">${device.icon}</div>
                <div class="device-item-info">
                   <div class="device-item-name">
                       ${device.name}
                       ${device.isFavorite ? '<span class="favorite-star">⭐</span>' : ''}
                   </div>
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
           case 'water_heater':
               if (device.isOn) {
                   const timeLeft = this.formatTimeRemaining(device.remainingTime);
                   return `${device.currentTemperature}°C → ${device.targetTemperature}°C • ${timeLeft}`;
               }
               return `${device.currentTemperature}°C • ${device.mode}`;

           case 'towel_dryer':
               if (device.isOn) {
                   const modeText = device.mode === 'towel_dry' ? 'Sấy khăn' : 'Sưởi phòng';
                   return `${device.currentTemperature}°C • ${modeText}`;
               }
               return `${device.currentTemperature}°C`;

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
                       <span>🔥 Bình nóng lạnh</span>
                       <span>🧻 Máy sấy khăn</span>
                   </div>
               </div>
           </div>
       `;
   }

   // Scenes Screen Rendering
   renderScenesScreen() {
       this.renderScenesList();
       this.renderAISuggestions();
       this.renderAutomationRules();
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
                       <span class="material-icons">play_arrow</span>
                       Chạy
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="editScene('${scene.id}')">
                       <span class="material-icons">edit</span>
                       Sửa
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="deleteScene('${scene.id}')">
                       <span class="material-icons">delete</span>
                       Xóa
                   </button>
               </div>
           </div>
       `).join('');
   }

   renderAISuggestions() {
       const container = document.getElementById('ai-suggestions');
       const suggestions = dataManager.generateAISuggestions();
       
       if (suggestions.length === 0) {
           container.innerHTML = `
               <div class="empty-state">
                   <div class="empty-icon">
                       <span class="material-icons">lightbulb</span>
                   </div>
                   <h3>Không có gợi ý mới</h3>
                   <p>AI đang học hỏi thói quen của bạn để đưa ra gợi ý thông minh hơn</p>
               </div>
           `;
           return;
       }
       
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

   renderAutomationRules() {
       const container = document.getElementById('automation-rules-list');
       const rules = dataManager.getState('automationRules');

       if (rules.length === 0) {
           container.innerHTML = `
               <div class="empty-state">
                   <div class="empty-icon">
                       <span class="material-icons">smart_toy</span>
                   </div>
                   <h3>Chưa có quy tắc tự động</h3>
                   <p>Các quy tắc tự động giúp thiết bị hoạt động thông minh hơn</p>
                   <button class="btn btn-primary" onclick="addAutomationRule()">
                       <span class="material-icons">add</span>
                       Tạo quy tắc đầu tiên
                   </button>
               </div>
           `;
           return;
       }

       container.innerHTML = rules.map(rule => `
           <div class="automation-rule ${rule.isActive ? 'active' : 'inactive'}">
               <div class="rule-header">
                   <div class="rule-title">
                       <span class="material-icons">smart_toy</span>
                       ${rule.name}
                   </div>
                   <button class="rule-toggle ${rule.isActive ? 'on' : 'off'}" 
                           onclick="toggleAutomationRule('${rule.id}')">
                   </button>
               </div>
               <div class="rule-description">${rule.description}</div>
               <div class="rule-details">
                   <div class="rule-trigger">
                       <strong>Khi:</strong> ${this.formatRuleTrigger(rule.trigger)}
                   </div>
                   <div class="rule-actions">
                       <strong>Thì:</strong> ${this.formatRuleActions(rule.actions)}
                   </div>
               </div>
               <div class="rule-actions-buttons">
                   <button class="btn btn-sm btn-outline" onclick="editAutomationRule('${rule.id}')">
                       <span class="material-icons">edit</span>
                       Sửa
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="deleteAutomationRule('${rule.id}')">
                       <span class="material-icons">delete</span>
                       Xóa
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
           '🌅': 'wb_twilight',
           '🛁': 'bathtub',
           '🧻': 'dry',
           '🔥': 'local_fire_department'
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
           case 'manual':
               return 'Thủ công';
           default:
               return 'Thủ công';
       }
   }

   getSuggestionActionText(action) {
       const actionTexts = {
           'create_energy_scene': 'Tạo kịch bản',
           'create_schedule': 'Tạo lịch trình',
           'check_devices': 'Kiểm tra ngay',
           'optimize_water_heater': 'Tối ưu hóa',
           'reduce_temperature': 'Giảm nhiệt độ',
           'enable_smart_automation': 'Bật tự động',
           'create_night_schedule': 'Tạo lịch đêm'
       };
       return actionTexts[action] || 'Thực hiện';
   }

   formatRuleTrigger(trigger) {
       const devices = dataManager.getState('devices');
       const device = devices.find(d => d.id === trigger.deviceId);
       const deviceName = device ? device.name : 'Thiết bị không xác định';

       switch (trigger.type) {
           case 'device_state_change':
               return `${deviceName} ${trigger.property === 'isOn' ? (trigger.value ? 'bật' : 'tắt') : 'thay đổi'}`;
           case 'device_temperature_reached':
               return `${deviceName} đạt nhiệt độ mục tiêu`;
           case 'device_temperature_check':
               return `Kiểm tra nhiệt độ ${deviceName}`;
           default:
               return 'Không xác định';
       }
   }

   formatRuleActions(actions) {
       const devices = dataManager.getState('devices');
       
       return actions.map(action => {
           switch (action.type) {
               case 'device_control':
                   const device = devices.find(d => d.id === action.deviceId);
                   const deviceName = device ? device.name : 'Thiết bị';
                   if (action.property === 'isOn') {
                       return `${action.value ? 'Bật' : 'Tắt'} ${deviceName}`;
                   }
                   return `Điều chỉnh ${deviceName}`;
               case 'notification':
                   return `Gửi thông báo: ${action.title}`;
               case 'temperature_control':
                   return `Điều khiển nhiệt độ thông minh`;
               default:
                   return 'Hành động không xác định';
           }
       }).join(', ');
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
               <div class="suggested-scenes">
                   <h4>Kịch bản được đề xuất</h4>
                   <div class="scene-suggestions">
                       <button class="btn btn-sm btn-outline" onclick="createSuggestedScene('bathroom_hot_water')">
                           🛁 Tắm nước nóng
                       </button>
                       <button class="btn btn-sm btn-outline" onclick="createSuggestedScene('towel_dry')">
                           🧻 Sấy khăn nhanh
                       </button>
                       <button class="btn btn-sm btn-outline" onclick="createSuggestedScene('room_heating')">
                           🔥 Sưởi phòng tắm
                       </button>
                       <button class="btn btn-sm btn-outline" onclick="createSuggestedScene('good_night')">
                           😴 Đi ngủ
                       </button>
                   </div>
               </div>
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
       const energyData = dataManager.getDetailedEnergyData(period === 'hôm nay' ? 'today' : period);
       const cost = energyData.totalCost;
       
       // Calculate trend
       let trendData = { change: 0, direction: 'stable' };
       if (period === 'today') {
           const yesterday = dataManager.getDetailedEnergyData('yesterday');
           if (yesterday.total > 0) {
               const change = ((energyData.total - yesterday.total) / yesterday.total) * 100;
               trendData = {
                   change: Math.round(change),
                   direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable'
               };
           }
       }
       
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
           <div class="analytics-card trend ${trendData.direction}">
               <div class="analytics-icon">${trendData.direction === 'increasing' ? '📈' : trendData.direction === 'decreasing' ? '📉' : '📊'}</div>
               <div class="analytics-info">
                   <div class="analytics-value">${trendData.change >= 0 ? '+' : ''}${trendData.change}%</div>
                   <div class="analytics-label">So với ${period === 'hôm nay' ? 'hôm qua' : 'kỳ trước'}</div>
               </div>
           </div>
       `;
   }

   renderEnergyChart() {
       const canvas = document.getElementById('energy-chart');
       const ctx = canvas.getContext('2d');
       const energyData = dataManager.getEnergyData('today');
       
       this.drawSimpleChart(ctx, energyData.hourly);
   }

   drawSimpleChart(ctx, data) {
       const canvas = ctx.canvas;
       const width = canvas.width;
       const height = canvas.height;
       
       ctx.clearRect(0, 0, width, height);
       
       const padding = 40;
       const chartWidth = width - 2 * padding;
       const chartHeight = height - 2 * padding;
       
       const maxValue = Math.max(...data.map(d => d.consumption));
       
       // Draw grid lines
       ctx.strokeStyle = '#E0E0E0';
       ctx.lineWidth = 1;
       
       for (let i = 0; i <= 5; i++) {
           const y = padding + (chartHeight / 5) * i;
           ctx.beginPath();
           ctx.moveTo(padding, y);
           ctx.lineTo(width - padding, y);
           ctx.stroke();
       }
       
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
       
       for (let i = 0; i <= 24; i += 6) {
           const x = padding + (chartWidth / 24) * i;
           ctx.fillText(i.toString(), x, height - 10);
       }
       
       ctx.textAlign = 'right';
       for (let i = 0; i <= 5; i++) {
           const y = padding + (chartHeight / 5) * i;
           const value = maxValue * (5 - i) / 5;
           ctx.fillText(value.toFixed(1), padding - 10, y + 4);
       }
   }

   renderTopDevices() {
       const container = document.getElementById('top-devices');
       const energyData = dataManager.getDetailedEnergyData('today');
       
       if (energyData.deviceDetails.length === 0) {
           container.innerHTML = `
               <div class="empty-state-small">
                   <span class="material-icons">assessment</span>
                   <p>Chưa có dữ liệu tiêu thụ</p>
               </div>
           `;
           return;
       }
       
       container.innerHTML = energyData.deviceDetails.slice(0, 5).map((item, index) => {
           return `
               <div class="top-device" onclick="showDeviceAnalytics('${item.device.id}')">
                   <div class="top-device-rank">${index + 1}</div>
                   <div class="top-device-icon">${item.device.icon}</div>
                   <div class="top-device-info">
                       <div class="top-device-name">${item.device.name}</div>
                       <div class="top-device-consumption">
                           ${Utils.formatNumber(item.consumption, 1)} kWh (${Utils.formatNumber(item.percentage, 0)}%) • ${Utils.formatNumber(item.cost, 0)} VNĐ
                       </div>
                   </div>
               </div>
           `;
       }).join('');
   }

   renderRecommendations() {
       const container = document.getElementById('recommendations');
       const smartSuggestions = dataManager.generateSmartSuggestions();
       
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

       // Add smart suggestions to recommendations
       smartSuggestions.forEach(suggestion => {
           if (suggestion.priority === 'high') {
               recommendations.unshift({
                   icon: '🤖',
                   text: suggestion.message
               });
           }
       });
       
       container.innerHTML = recommendations.slice(0, 5).map(rec => `
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
       this.updateNotificationBadge();
   }

   // Modal Management
   showModal(modalId, data = {}) {
       const overlay = document.getElementById('modal-overlay');
       const modal = document.getElementById(modalId);
       
       if (!modal) return;
       
       overlay.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
       
       modal.style.display = 'flex';
       overlay.classList.add('show');
       
       this.modals.set(modalId, data);
       this.initializeModal(modalId, data);
       
       history.pushState({ modal: modalId }, '', '');
   }

   closeModal() {
       const overlay = document.getElementById('modal-overlay');
       overlay.classList.remove('show');
       
       this.modals.clear();
       
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
           case 'automation-rules-modal':
               this.renderAutomationRulesModal();
               break;
           case 'energy-optimization-modal':
               this.renderEnergyOptimizationContent();
               break;
           case 'device-timer-modal':
               this.initializeDeviceTimerModal(data.deviceId);
               break;
           case 'device-schedule-modal':
               this.initializeDeviceScheduleModal(data.deviceId);
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
               <p class="device-status ${device.isOnline ? 'online' : 'offline'}">
                   ${device.isOnline ? 'Đang kết nối' : 'Offline'}
               </p>
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
                   <button class="quick-action" onclick="toggleDeviceFavorite('${deviceId}')">
                       <span class="material-icons">${device.isFavorite ? 'star' : 'star_border'}</span>
                       <span>${device.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}</span>
                   </button>
               </div>
           </div>
       `;
   }

   renderDeviceSpecificControls(device) {
       let controls = '';
       
       // Controls cho bình nóng lạnh
       if (device.type === 'water_heater') {
           controls += `
               <div class="control-section">
                   <div class="control-title">Nhiệt độ nước</div>
                   <div class="temperature-display">
                       <div class="temp-current">
                           <span class="temp-value">${device.currentTemperature}°C</span>
                           <span class="temp-label">Hiện tại</span>
                       </div>
                       <div class="temp-target">
                           <span class="temp-value">${device.targetTemperature}°C</span>
                           <span class="temp-label">Mục tiêu</span>
                       </div>
                   </div>
                   <div class="slider-control">
                       <input type="range" class="slider" min="${device.minTemperature}" max="${device.maxTemperature}" 
                              value="${device.targetTemperature}" 
                              oninput="updateWaterHeaterTemperature('${device.id}', this.value)">
                       <div class="slider-value">${device.targetTemperature}°C</div>
                   </div>
               </div>

               <div class="control-section">
                   <div class="control-title">Chế độ hoạt động</div>
                   <div class="mode-control">
                       ${device.modes.map(mode => `
                           <button class="mode-btn ${device.mode === mode ? 'active' : ''}" 
                                   onclick="updateWaterHeaterMode('${device.id}', '${mode}')">
                               ${this.getWaterHeaterModeText(mode)}
                           </button>
                       `).join('')}
                   </div>
               </div>

               <div class="control-section">
                   <div class="control-title">Thời gian còn lại</div>
                   <div class="timer-display">
                       <span class="timer-value">${this.formatTimeRemaining(device.remainingTime)}</span>
                       <button class="btn btn-sm btn-outline" onclick="showWaterHeaterTimer('${device.id}')">
                           <span class="material-icons">timer</span>
                           Hẹn giờ
						   </button>
                   </div>
               </div>

               <div class="control-section">
                   <div class="control-title">Tiêu thụ năng lượng</div>
                   <div class="energy-info">
                       <div class="energy-power">
                           <span class="energy-value">${device.heatingPower}W</span>
                           <span class="energy-label">Công suất</span>
                       </div>
                       <div class="energy-consumption">
                           <span class="energy-value">${Utils.formatNumber(device.energyConsumption || 0, 1)}kWh</span>
                           <span class="energy-label">Hôm nay</span>
                       </div>
                   </div>
               </div>
           `;
       }

       // Controls cho máy sấy khăn
       if (device.type === 'towel_dryer') {
           controls += `
               <div class="control-section">
                   <div class="control-title">Chế độ hoạt động</div>
                   <div class="mode-control">
                       ${device.modes.map(mode => `
                           <button class="mode-btn ${device.mode === mode.id ? 'active' : ''}" 
                                   onclick="updateTowelDryerMode('${device.id}', '${mode.id}')">
                               <div class="mode-name">${mode.name}</div>
                               <div class="mode-desc">${mode.description}</div>
                           </button>
                       `).join('')}
                   </div>
               </div>

               <div class="control-section">
                   <div class="control-title">Nhiệt độ</div>
                   <div class="temperature-display">
                       <div class="temp-current">
                           <span class="temp-value">${device.currentTemperature}°C</span>
                           <span class="temp-label">Máy sấy</span>
                       </div>
                       ${device.mode === 'room_heating' ? `
                           <div class="temp-room">
                               <span class="temp-value">${device.currentRoomTemperature || 22}°C</span>
                               <span class="temp-label">Phòng</span>
                           </div>
                       ` : ''}
                       <div class="temp-target">
                           <span class="temp-value">${device.targetTemperature}°C</span>
                           <span class="temp-label">Mục tiêu</span>
                       </div>
                   </div>
                   <div class="slider-control">
                       <input type="range" class="slider" min="${device.minTemperature}" max="${device.maxTemperature}" 
                              value="${device.targetTemperature}" 
                              oninput="updateTowelDryerTemperature('${device.id}', this.value)">
                       <div class="slider-value">${device.targetTemperature}°C</div>
                   </div>
               </div>

               ${device.mode === 'room_heating' ? `
                   <div class="control-section">
                       <div class="control-title">Nhiệt độ phòng mục tiêu</div>
                       <div class="slider-control">
                           <input type="range" class="slider" min="20" max="30" 
                                  value="${device.targetRoomTemperature || 24}" 
                                  oninput="updateTowelDryerRoomTemperature('${device.id}', this.value)">
                           <div class="slider-value">${device.targetRoomTemperature || 24}°C</div>
                       </div>
                   </div>
               ` : ''}

               <div class="control-section">
                   <div class="control-title">Thiết bị liên kết</div>
                   <div class="linked-devices">
                       ${this.renderLinkedDevices(device)}
                   </div>
               </div>

               <div class="control-section">
                   <div class="control-title">Automation thông minh</div>
                   <div class="automation-status">
                       <label class="switch">
                           <input type="checkbox" ${device.smartAutomation ? 'checked' : ''} 
                                  onchange="toggleSmartAutomation('${device.id}', this.checked)">
                           <span class="slider-switch"></span>
                       </label>
                       <div class="automation-info">
                           <div class="automation-label">Tự động thông minh</div>
                           <div class="automation-desc">Tự động điều chỉnh dựa trên thiết bị khác</div>
                       </div>
                   </div>
               </div>
           `;
       }

       // Common controls cho tất cả thiết bị có brightness
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

       // Common controls cho AC
       if (device.capabilities.includes('temperature') && device.type === 'ac') {
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

       // Color controls
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

   getWaterHeaterModeText(mode) {
       const modeTexts = {
           'auto': 'Tự động',
           'eco': 'Tiết kiệm',
           'boost': 'Tăng tốc'
       };
       return modeTexts[mode] || mode;
   }

   formatTimeRemaining(minutes) {
       if (!minutes || minutes <= 0) return 'Không có';
       
       const hours = Math.floor(minutes / 60);
       const mins = minutes % 60;
       
       if (hours > 0) {
           return `${hours}h ${mins}m`;
       }
       return `${mins}m`;
   }

   renderLinkedDevices(device) {
       if (!device.linkedDevices || device.linkedDevices.length === 0) {
           return '<p class="no-linked">Không có thiết bị liên kết</p>';
       }

       const devices = dataManager.getState('devices');
       const linkedDevices = device.linkedDevices.map(id => 
           devices.find(d => d.id === id)
       ).filter(d => d);

       return linkedDevices.map(linkedDevice => `
           <div class="linked-device" onclick="showDeviceControl('${linkedDevice.id}')">
               <span class="linked-icon">${linkedDevice.icon}</span>
               <div class="linked-info">
                   <div class="linked-name">${linkedDevice.name}</div>
                   <div class="linked-status ${linkedDevice.isOn ? 'on' : 'off'}">
                       ${linkedDevice.isOn ? 'Đang bật' : 'Đang tắt'}
                   </div>
               </div>
               <span class="material-icons">chevron_right</span>
           </div>
       `).join('');
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

   renderAutomationRulesModal() {
       const container = document.getElementById('automation-rules-modal-list');
       this.renderAutomationRulesInContainer(container);
   }

   renderAutomationRulesInContainer(container) {
       const rules = dataManager.getState('automationRules');

       if (rules.length === 0) {
           container.innerHTML = `
               <div class="empty-state">
                   <div class="empty-icon">
                       <span class="material-icons">smart_toy</span>
                   </div>
                   <h3>Chưa có quy tắc tự động</h3>
                   <p>Tạo quy tắc để thiết bị hoạt động thông minh hơn</p>
                   <button class="btn btn-primary" onclick="addAutomationRule()">
                       <span class="material-icons">add</span>
                       Tạo quy tắc đầu tiên
                   </button>
               </div>
           `;
           return;
       }

       container.innerHTML = rules.map(rule => `
           <div class="automation-rule ${rule.isActive ? 'active' : 'inactive'}">
               <div class="rule-header">
                   <div class="rule-title">
                       <span class="material-icons">smart_toy</span>
                       ${rule.name}
                   </div>
                   <button class="rule-toggle ${rule.isActive ? 'on' : 'off'}" 
                           onclick="toggleAutomationRule('${rule.id}')">
                   </button>
               </div>
               <div class="rule-description">${rule.description}</div>
               <div class="rule-details">
                   <div class="rule-trigger">
                       <strong>Khi:</strong> ${this.formatRuleTrigger(rule.trigger)}
                   </div>
                   <div class="rule-actions">
                       <strong>Thì:</strong> ${this.formatRuleActions(rule.actions)}
                   </div>
               </div>
               <div class="rule-actions-buttons">
                   <button class="btn btn-sm btn-outline" onclick="editAutomationRule('${rule.id}')">
                       <span class="material-icons">edit</span>
                       Sửa
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="deleteAutomationRule('${rule.id}')">
                       <span class="material-icons">delete</span>
                       Xóa
                   </button>
               </div>
           </div>
       `).join('');
   }

   renderEnergyOptimizationContent() {
       const devices = dataManager.getState('devices');
       const energyData = dataManager.getDetailedEnergyData('today');
       
       let potentialSavings = 0;
       const recommendations = [];

       devices.forEach(device => {
           const deviceEnergy = energyData.deviceDetails.find(d => d.device.id === device.id);
           if (!deviceEnergy) return;

           if (device.type === 'water_heater') {
               if (device.targetTemperature > 60) {
                   const savings = deviceEnergy.consumption * 0.15;
                   potentialSavings += savings;
                   recommendations.push({
                       device: device,
                       type: 'temperature',
                       description: `Giảm nhiệt độ xuống 60°C`,
                       savings: savings,
                       action: () => updateWaterHeaterTemperature(device.id, 60)
                   });
               }
               
               if (device.mode !== 'eco') {
                   const savings = deviceEnergy.consumption * 0.20;
                   potentialSavings += savings;
                   recommendations.push({
                       device: device,
                       type: 'mode',
                       description: `Chuyển sang chế độ ECO ban đêm`,
                       savings: savings,
                       action: () => updateWaterHeaterMode(device.id, 'eco')
                   });
               }
           }

           if (device.type === 'towel_dryer') {
               if (!device.smartAutomation) {
                   const savings = deviceEnergy.consumption * 0.10;
                   potentialSavings += savings;
                   recommendations.push({
                       device: device,
                       type: 'automation',
                       description: `Bật tự động thông minh`,
                       savings: savings,
                       action: () => toggleSmartAutomation(device.id, true)
                   });
               }
           }
       });

       const savingsPercent = energyData.total > 0 ? (potentialSavings / energyData.total) * 100 : 0;
       document.getElementById('potential-savings').textContent = `${Math.round(savingsPercent)}%`;

       const container = document.getElementById('optimization-recommendations');
       container.innerHTML = recommendations.map(rec => `
           <div class="optimization-recommendation">
               <div class="rec-header">
                   <span class="rec-icon">${rec.device.icon}</span>
                   <div class="rec-info">
                       <div class="rec-title">${rec.device.name}</div>
                       <div class="rec-desc">${rec.description}</div>
                   </div>
                   <div class="rec-savings">
                       <span class="savings-value">${Utils.formatNumber(rec.savings * dataManager.getState('settings').energy.costPerKwh, 0)} VNĐ</span>
                       <span class="savings-label">tiết kiệm/ngày</span>
                   </div>
               </div>
               <div class="rec-actions">
                   <button class="btn btn-sm btn-primary" onclick="applyOptimization('${rec.device.id}', '${rec.type}')">
                       Áp dụng
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="dismissOptimization(this)">
                       Bỏ qua
                   </button>
               </div>
           </div>
       `).join('');
   }

   initializeDeviceTimerModal(deviceId) {
       this.currentTimerDeviceId = deviceId;
       const device = dataManager.getState('devices').find(d => d.id === deviceId);
       if (device && device.remainingTime > 0) {
           document.getElementById('timer-minutes').value = device.remainingTime;
       }
   }

   initializeDeviceScheduleModal(deviceId) {
       this.currentScheduleDeviceId = deviceId;
       this.renderScheduleRules();
   }

   renderScheduleRules() {
       const container = document.getElementById('schedule-rules');
       container.innerHTML = `
           <div class="schedule-rule">
               <div class="form-group">
                   <label>Thời gian</label>
                   <input type="time" class="schedule-time" value="07:00">
               </div>
               <div class="form-group">
                   <label>Hành động</label>
                   <select class="schedule-action">
                       <option value="turn_on">Bật thiết bị</option>
                       <option value="turn_off">Tắt thiết bị</option>
                   </select>
               </div>
               <div class="form-group">
                   <label>Lặp lại</label>
                   <div class="day-selector">
                       ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => `
                           <label class="day-checkbox">
                               <input type="checkbox" value="${index}" checked>
                               <span>${day}</span>
                           </label>
                       `).join('')}
                   </div>
               </div>
           </div>
       `;
   }

   // Toast Notifications
   showToast(message, type = 'info', duration = 4000) {
       const toast = this.createToast(message, type);
       const container = document.getElementById('toast-container');
       
       container.appendChild(toast);
       
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
       
       // Water heater commands
       if (normalizedCommand.includes('bình nóng lạnh') || normalizedCommand.includes('nước nóng')) {
           this.processWaterHeaterVoiceCommand(normalizedCommand);
       }
       // Towel dryer commands
       else if (normalizedCommand.includes('máy sấy khăn') || normalizedCommand.includes('sấy khăn')) {
           this.processTowelDryerVoiceCommand(normalizedCommand);
       }
       // Room heating commands
       else if (normalizedCommand.includes('sưởi phòng') || normalizedCommand.includes('làm ấm')) {
           this.processRoomHeatingVoiceCommand(normalizedCommand);
       }
       // Device control commands
       else if (normalizedCommand.includes('bật') || normalizedCommand.includes('mở')) {
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

   processWaterHeaterVoiceCommand(command) {
       const waterHeaters = dataManager.getDevicesByType('water_heater');
       if (waterHeaters.length === 0) {
           this.showToast('Không tìm thấy bình nóng lạnh', 'warning');
           return;
       }

       const waterHeater = waterHeaters[0];

       if (command.includes('bật') || command.includes('mở')) {
           dataManager.updateDevice(waterHeater.id, { isOn: true });
           this.showToast('Đã bật bình nóng lạnh', 'success');
       } else if (command.includes('tắt') || command.includes('đóng')) {
           dataManager.updateDevice(waterHeater.id, { isOn: false });
           this.showToast('Đã tắt bình nóng lạnh', 'success');
       } else if (command.includes('nhiệt độ')) {
           const tempMatch = command.match(/(\d+)/);
           if (tempMatch) {
               const temp = parseInt(tempMatch[1]);
               if (temp >= 30 && temp <= 75) {
                   dataManager.updateDevice(waterHeater.id, { targetTemperature: temp });
                   this.showToast(`Đã đặt nhiệt độ ${temp}°C`, 'success');
               } else {
                   this.showToast('Nhiệt độ phải từ 30°C đến 75°C', 'warning');
               }
           }
       } else if (command.includes('eco') || command.includes('tiết kiệm')) {
           dataManager.updateDevice(waterHeater.id, { mode: 'eco' });
           this.showToast('Đã chuyển sang chế độ tiết kiệm', 'success');
       } else if (command.includes('boost') || command.includes('tăng tốc')) {
           dataManager.updateDevice(waterHeater.id, { mode: 'boost' });
           this.showToast('Đã chuyển sang chế độ tăng tốc', 'success');
       }
   }

   processTowelDryerVoiceCommand(command) {
       const towelDryers = dataManager.getDevicesByType('towel_dryer');
       if (towelDryers.length === 0) {
           this.showToast('Không tìm thấy máy sấy khăn', 'warning');
           return;
       }

       const towelDryer = towelDryers[0];

       if (command.includes('bật') || command.includes('mở')) {
           dataManager.updateDevice(towelDryer.id, { 
               isOn: true,
               mode: 'towel_dry'
           });
           this.showToast('Đã bật máy sấy khăn', 'success');
       } else if (command.includes('tắt') || command.includes('đóng')) {
           dataManager.updateDevice(towelDryer.id, { isOn: false });
           this.showToast('Đã tắt máy sấy khăn', 'success');
       }
   }

   processRoomHeatingVoiceCommand(command) {
       const towelDryers = dataManager.getDevicesByType('towel_dryer');
       if (towelDryers.length === 0) {
           this.showToast('Không tìm thấy thiết bị sưởi', 'warning');
           return;
       }

       const towelDryer = towelDryers[0];

       if (command.includes('bật') || command.includes('mở')) {
           dataManager.updateDevice(towelDryer.id, { 
               isOn: true,
               mode: 'room_heating',
               targetRoomTemperature: 24
           });
           this.showToast('Đã bật sưởi phòng', 'success');
       } else if (command.includes('tắt') || command.includes('đóng')) {
           dataManager.updateDevice(towelDryer.id, { isOn: false });
           this.showToast('Đã tắt sưởi phòng', 'success');
       }
   }

   processDeviceCommand(command, turnOn) {
       const devices = dataManager.getState('devices');
       let foundDevice = null;
       
       for (const device of devices) {
           if (command.includes(device.name.toLowerCase()) || 
               command.includes(this.getDeviceTypeKeywords(device.type))) {
               foundDevice = device;
               break;
           }
       }
       
       if (foundDevice) {
           dataManager.updateDevice(foundDevice.id, { isOn: turnOn });
           this.showToast(
               `${turnOn ? 'Đã bật' : 'Đã tắt'} ${foundDevice.name}`, 
               'success'
           );
           this.refreshCurrentScreen();
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
           'lock': 'khóa',
           'water_heater': 'bình nóng lạnh',
           'towel_dryer': 'máy sấy khăn'
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
       const cost = energyData.total * dataManager.getState('settings').energy.costPerKwh;
       
       this.showToast(
           `Hôm nay đã tiêu thụ ${Utils.formatNumber(energyData.total, 1)} kWh, chi phí khoảng ${Utils.formatNumber(cost, 0)} VNĐ`, 
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
       
       body.classList.remove('theme-light', 'theme-dark', 'theme-auto', 'theme-high-contrast');
       body.classList.add(`theme-${theme}`);
       
       const themeColor = theme === 'dark' ? '#121212' : '#2196F3';
       document.querySelector('meta[name="theme-color"]').content = themeColor;
       
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
       
       setTimeout(() => {
           const nearbyDevices = [
               { id: 'nearby1', name: 'Bình nóng lạnh Ariston 2.5kW', distance: '~2m', type: 'water_heater' },
               { id: 'nearby2', name: 'Máy sấy khăn Xiaomi', distance: '~1m', type: 'towel_dryer' },
               { id: 'nearby3', name: 'Smart Switch (Sonoff)', distance: '~3m', type: 'switch' },
               { id: 'nearby4', name: 'Smart Bulb (Philips)', distance: '~5m', type: 'light' },
               { id: 'nearby5', name: 'Smart Plug (TP-Link)', distance: '~4m', type: 'socket' }
           ];
           
           container.innerHTML = nearbyDevices.map(device => `
               <div class="nearby-device">
                   <div class="nearby-device-info">
                       <h5>${device.name}</h5>
                       <p>Khoảng cách: ${device.distance}</p>
                   </div>
                   <button class="btn btn-sm btn-primary" onclick="connectNearbyDevice('${device.id}', '${device.type}')">
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
       
       this.currentConfirmAction = onConfirm;
       
       this.showModal('confirmation-modal');
   }

   confirmAction() {
       if (this.currentConfirmAction) {
           this.currentConfirmAction();
           this.currentConfirmAction = null;
       }
       this.closeModal();
   }

   // App lifecycle
   onAppShow() {
       this.updateNotificationBadge();
       this.refreshCurrentScreen();
   }

   onAppHide() {
       dataManager.saveToStorage();
   }

   refreshCurrentScreen() {
       this.loadScreenData(this.currentScreen);
   }

   renderBottomNavigation() {
       const navItems = document.querySelectorAll('.nav-item');
       navItems.forEach(item => {
           item.addEventListener('click', () => {
               const screen = item.getAttribute('onclick').match(/'([^']+)'/)[1];
               this.showScreen(screen);
           });
       });
   }

   renderHeader() {
       const currentHome = dataManager.getCurrentHome();
       if (currentHome) {
           document.getElementById('current-home-name').textContent = currentHome.name;
       }
       
       this.updateNotificationBadge();
   }

   // Scene Tab Management
   showSceneTab(tabName) {
       // Remove active class from all tabs and tab contents
       document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
       document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
       
       // Add active class to clicked tab and corresponding content
       event.target.classList.add('active');
       document.getElementById(`${tabName}-tab`).classList.add('active');
       
       // Load tab-specific content
       switch (tabName) {
           case 'my-scenes':
               this.renderScenesList();
               break;
           case 'ai-suggestions':
               this.renderAISuggestions();
               break;
           case 'automation-rules':
               this.renderAutomationRules();
               break;
       }
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
   ui.initializeDeviceControlModal(deviceId);
}

function toggleDeviceFavorite(deviceId) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (device) {
       dataManager.updateDevice(deviceId, { isFavorite: !device.isFavorite });
       ui.showToast(device.isFavorite ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích', 'success');
       ui.initializeDeviceControlModal(deviceId);
       ui.refreshCurrentScreen();
   }
}

function updateWaterHeaterTemperature(deviceId, value) {
   dataManager.updateDevice(deviceId, { 
       targetTemperature: parseInt(value),
       lastUpdated: new Date().toISOString()
   });
   document.querySelector(`[oninput*="${deviceId}"] + .slider-value`).textContent = `${value}°C`;
   
   ui.showToast(`Đã đặt nhiệt độ mục tiêu: ${value}°C`, 'success');
}

function updateWaterHeaterMode(deviceId, mode) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return;

   const updates = { 
       mode: mode,
       lastUpdated: new Date().toISOString()
   };

   switch (mode) {
       case 'eco':
           updates.targetTemperature = Math.min(device.targetTemperature, 55);
           break;
       case 'boost':
           updates.targetTemperature = Math.max(device.targetTemperature, 65);
           updates.remainingTime = 30;
           break;
       case 'auto':
           updates.targetTemperature = 60;
           break;
   }

   dataManager.updateDevice(deviceId, updates);
   
   document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
   event.target.classList.add('active');
   
   ui.showToast(`Đã chuyển sang chế độ: ${ui.getWaterHeaterModeText(mode)}`, 'success');
   ui.initializeDeviceControlModal(deviceId);
}

function updateTowelDryerMode(deviceId, mode) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return;

   const modeConfig = device.modes.find(m => m.id === mode);
   if (!modeConfig) return;

   const updates = {
       mode: mode,
       targetTemperature: modeConfig.defaultTemp,
       lastUpdated: new Date().toISOString()
   };

   if (mode === 'room_heating') {
       updates.targetRoomTemperature = 24;
   }

   dataManager.updateDevice(deviceId, updates);
   
   document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
   event.target.classList.add('active');
   
   ui.showToast(`Đã chuyển sang chế độ: ${modeConfig.name}`, 'success');
   ui.initializeDeviceControlModal(deviceId);
}

function updateTowelDryerTemperature(deviceId, value) {
   dataManager.updateDevice(deviceId, { 
       targetTemperature: parseInt(value),
       lastUpdated: new Date().toISOString()
   });
   document.querySelector(`[oninput*="${deviceId}"] + .slider-value`).textContent = `${value}°C`;
   
   ui.showToast(`Đã đặt nhiệt độ: ${value}°C`, 'success');
}

function updateTowelDryerRoomTemperature(deviceId, value) {
   dataManager.updateDevice(deviceId, { 
       targetRoomTemperature: parseInt(value),
       lastUpdated: new Date().toISOString()
   });
   document.querySelector(`[oninput*="RoomTemperature"] + .slider-value`).textContent = `${value}°C`;
   
   ui.showToast(`Đã đặt nhiệt độ phòng: ${value}°C`, 'success');
}

function toggleSmartAutomation(deviceId, enabled) {
   dataManager.updateDevice(deviceId, { 
       smartAutomation: enabled,
       lastUpdated: new Date().toISOString()
   });
   
   const message = enabled ? 'Đã bật automation thông minh' : 'Đã tắt automation thông minh';
   ui.showToast(message, 'success');
   
   if (!enabled) {
       const rules = dataManager.getState('automationRules');
       rules.forEach(rule => {
           if (rule.trigger.deviceId === deviceId || 
               rule.actions.some(action => action.deviceId === deviceId)) {
               dataManager.updateAutomationRule(rule.id, { isActive: false });
           }
       });
   }
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
   
   const colorOptions = document.querySelectorAll('.color-option');
   colorOptions.forEach(option => option.classList.remove('active'));
   document.querySelector(`.color-option.${color.replace('_', '-')}`).classList.add('active');
}

function runScene(sceneId) {
   dataManager.runScene(sceneId);
   ui.refreshCurrentScreen();
}

function toggleScene(sceneId) {
   const scene = dataManager.getState('scenes').find(s => s.id === sceneId);
   if (scene) {
       dataManager.updateScene(sceneId, { isActive: !scene.isActive });
       ui.refreshCurrentScreen();
       ui.showToast(`Đã ${scene.isActive ? 'tắt' : 'bật'} kịch bản`, 'success');
   }
}

function editScene(sceneId) {
   ui.showToast('Chức năng chỉnh sửa kịch bản đang phát triển', 'info');
}

function deleteScene(sceneId) {
   ui.showConfirmation(
       'Xóa kịch bản',
       'Bạn có chắc chắn muốn xóa kịch bản này?',
       () => {
           dataManager.deleteScene(sceneId);
           ui.refreshCurrentScreen();
           ui.showToast('Đã xóa kịch bản', 'success');
       }
   );
}

function createSuggestedScene(sceneType) {
   const devices = dataManager.getState('devices');
   const waterHeater = devices.find(d => d.type === 'water_heater');
   const towelDryer = devices.find(d => d.type === 'towel_dryer');
   
   let sceneData = {};
   
   switch (sceneType) {
       case 'bathroom_hot_water':
           sceneData = {
               name: 'Tắm nước nóng',
               icon: '🛁',
               description: 'Bật bình nóng lạnh và tắt máy sấy khăn',
               actions: []
           };
           if (waterHeater) {
               sceneData.actions.push(
                   { deviceId: waterHeater.id, type: 'toggle', value: true },
                   { deviceId: waterHeater.id, type: 'temperature', value: 65 },
                   { deviceId: waterHeater.id, type: 'mode', value: 'boost' }
               );
           }
           if (towelDryer) {
               sceneData.actions.push(
                   { deviceId: towelDryer.id, type: 'toggle', value: false }
               );
           }
           break;
           
       case 'towel_dry':
           sceneData = {
               name: 'Sấy khăn nhanh',
               icon: '🧻',
               description: 'Bật máy sấy khăn chế độ sấy khăn',
               actions: []
           };
           if (towelDryer) {
               sceneData.actions.push(
                   { deviceId: towelDryer.id, type: 'toggle', value: true },
                   { deviceId: towelDryer.id, type: 'mode', value: 'towel_dry' },
                   { deviceId: towelDryer.id, type: 'temperature', value: 50 }
               );
           }
           break;
           
       case 'room_heating':
           sceneData = {
               name: 'Sưởi phòng tắm',
               icon: '🔥',
               description: 'Bật máy sấy khăn chế độ sưởi phòng',
               actions: []
           };
           if (towelDryer) {
               sceneData.actions.push(
                   { deviceId: towelDryer.id, type: 'toggle', value: true },
                   { deviceId: towelDryer.id, type: 'mode', value: 'room_heating' },
                   { deviceId: towelDryer.id, type: 'temperature', value: 35 }
               );
           }
           break;
           
       case 'good_night':
           sceneData = {
               name: 'Đi ngủ',
               icon: '😴',
               description: 'Tắt tất cả thiết bị không cần thiết',
               actions: devices.filter(d => d.type !== 'security').map(device => ({
                   deviceId: device.id,
                   type: 'toggle',
                   value: false
               }))
           };
           break;
   }
   
   if (sceneData.actions && sceneData.actions.length > 0) {
       dataManager.addScene(sceneData);
       ui.refreshCurrentScreen();
       ui.showToast(`Đã tạo kịch bản "${sceneData.name}"`, 'success');
   } else {
       ui.showToast('Không thể tạo kịch bản - thiếu thiết bị', 'warning');
   }
}

function toggleAutomationRule(ruleId) {
   const rules = dataManager.getState('automationRules');
   const rule = rules.find(r => r.id === ruleId);
   
   if (rule) {
       const newState = !rule.isActive;
       dataManager.updateAutomationRule(ruleId, { isActive: newState });
       
       ui.showToast(
           newState ? 'Đã bật quy tắc tự động' : 'Đã tắt quy tắc tự động', 
           'success'
       );
       
       ui.refreshCurrentScreen();
       
       // Also update modal if open
       const modalContainer = document.getElementById('automation-rules-modal-list');
       if (modalContainer) {
           ui.renderAutomationRulesInContainer(modalContainer);
       }
   }
}

function editAutomationRule(ruleId) {
   ui.showToast('Chức năng chỉnh sửa quy tắc đang phát triển', 'info');
}

function deleteAutomationRule(ruleId) {
   ui.showConfirmation(
       'Xóa quy tắc tự động',
       'Bạn có chắc chắn muốn xóa quy tắc tự động này?',
       () => {
           dataManager.deleteAutomationRule(ruleId);
           ui.refreshCurrentScreen();
           
           // Also update modal if open
           const modalContainer = document.getElementById('automation-rules-modal-list');
           if (modalContainer) {
               ui.renderAutomationRulesInContainer(modalContainer);
           }
           
           ui.showToast('Đã xóa quy tắc tự động', 'success');
       }
   );
}

function showAddDevice() {
   ui.showModal('add-device-modal');
}

function showAddScene() {
   ui.showToast('Chức năng tạo kịch bản đang phát triển', 'info');
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
   console.log('Filtering devices:', query);
}

function filterByRoom(roomId) {
   console.log('Filtering by room:', roomId);
}

function filterByType(type) {
   console.log('Filtering by type:', type);
}

function connectNearbyDevice(deviceId, deviceType) {
   ui.showLoading('Đang kết nối thiết bị...');
   
   setTimeout(() => {
       ui.hideLoading();
       ui.closeModal();
       
       // Add device based on type
       const rooms = dataManager.getCurrentHome()?.rooms || [];
       const bathroomRoom = rooms.find(r => r.type === 'bathroom') || rooms[0];
       
       let deviceData = {
           name: 'Thiết bị mới',
           type: deviceType,
           roomId: bathroomRoom?.id
       };
       
       switch (deviceType) {
           case 'water_heater':
               deviceData = {
                   ...deviceData,
                   name: 'Bình nóng lạnh Ariston',
                   icon: '🔥'
               };
               break;
           case 'towel_dryer':
               deviceData = {
                   ...deviceData,
                   name: 'Máy sấy khăn Xiaomi',
                   icon: '🧻'
               };
               break;
           default:
               deviceData = {
                   ...deviceData,
                   name: 'Thiết bị thông minh',
                   icon: '🔌'
               };
       }
       
       const newDevice = dataManager.addDeviceWithAutomation(deviceData);
       
       ui.showToast('Thiết bị đã được thêm thành công!', 'success');
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
           ui.closeModal();
           ui.showScreen('devices');
           break;
       case 'view_analytics':
           ui.closeModal();
           ui.showScreen('analytics');
           break;
       case 'dismiss':
           dataManager.deleteNotification(notificationId);
           ui.renderNotificationsList();
           break;
       case 'view_details':
           ui.showToast('Xem chi tiết thiết bị', 'info');
           break;
   }
   
   dataManager.markNotificationAsRead(notificationId);
   ui.updateNotificationBadge();
}

function showNotificationDetail(notificationId) {
   const notification = dataManager.getState('notifications').find(n => n.id === notificationId);
   if (!notification) return;

   dataManager.markNotificationAsRead(notificationId);
   ui.updateNotificationBadge();

   if (notification.type === 'warning' && notification.title.includes('mất kết nối')) {
       ui.closeModal();
       ui.showScreen('devices');
   } else if (notification.title.includes('thống kê') || notification.title.includes('điện năng')) {
       ui.closeModal();
       ui.showScreen('analytics');
   } else {
       ui.showToast(notification.message, 'info');
   }
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

// Settings functions
function showAutomationRules() {
   ui.showModal('automation-rules-modal');
}

function showSmartSuggestions() {
   const suggestions = dataManager.generateSmartSuggestions();
   
   if (suggestions.length === 0) {
       ui.showToast('Không có gợi ý thông minh nào hiện tại', 'info');
       return;
   }

   ui.showToast(`Có ${suggestions.length} gợi ý thông minh cho bạn`, 'info');
   ui.showScreen('scenes');
   ui.showSceneTab('ai-suggestions');
}

function showEnergyOptimization() {
   ui.showModal('energy-optimization-modal');
}

function showDeviceSchedules() {
   ui.showToast('Chức năng lịch trình thiết bị đang phát triển', 'info');
}

function showDeviceHealth() {
   const devices = dataManager.getState('devices');
   const onlineDevices = devices.filter(d => d.isOnline).length;
   const totalDevices = devices.length;
   
   ui.showToast(`Tình trạng: ${onlineDevices}/${totalDevices} thiết bị trực tuyến`, 'info');
}

function showMaintenanceSchedule() {
   ui.showToast('Chức năng lịch bảo trì đang phát triển', 'info');
}

function showEnergyReports() {
   ui.showScreen('analytics');
   ui.showToast('Xem báo cáo năng lượng chi tiết', 'info');
}

function applyOptimization(deviceId, type) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return;

   switch (type) {
       case 'temperature':
           if (device.type === 'water_heater') {
               updateWaterHeaterTemperature(deviceId, 60);
           }
           break;
       case 'mode':
           if (device.type === 'water_heater') {
               updateWaterHeaterMode(deviceId, 'eco');
           }
           break;
       case 'automation':
           toggleSmartAutomation(deviceId, true);
           break;
   }

   ui.showToast('Đã áp dụng tối ưu hóa', 'success');
   
   setTimeout(() => {
       ui.renderEnergyOptimizationContent();
   }, 1000);
}

function dismissOptimization(button) {
   button.closest('.optimization-recommendation').style.display = 'none';
   ui.showToast('Đã bỏ qua gợi ý', 'info');
}

function applyAllOptimizations() {
   ui.showConfirmation(
       'Áp dụng tất cả tối ưu hóa',
       'Bạn có chắc chắn muốn áp dụng tất cả các tối ưu hóa được đề xuất?',
       () => {
           const recommendations = document.querySelectorAll('.optimization-recommendation');
           let applied = 0;
           
           recommendations.forEach(rec => {
               const deviceId = rec.querySelector('[onclick*="applyOptimization"]')
                   .getAttribute('onclick').match(/applyOptimization\('([^']+)'/)[1];
               const type = rec.querySelector('[onclick*="applyOptimization"]')
                   .getAttribute('onclick').match(/', '([^']+)'/)[1];
               
               applyOptimization(deviceId, type);
               applied++;
           });
           
           ui.closeModal();
           ui.showToast(`Đã áp dụng ${applied} tối ưu hóa`, 'success');
       }
   );
}

function addAutomationRule() {
   ui.showToast('Chức năng tạo quy tắc tự động đang phát triển', 'info');
}

function applySuggestion(suggestionId) {
   ui.showToast('Đang áp dụng gợi ý thông minh...', 'info');
   
   setTimeout(() => {
       ui.showToast('Đã áp dụng gợi ý thành công!', 'success');
       ui.refreshCurrentScreen();
   }, 2000);
}

function dismissSuggestion(suggestionId) {
   event.target.closest('.ai-suggestion').style.display = 'none';
   ui.showToast('Đã bỏ qua gợi ý', 'info');
}

function refreshNearbyDevices() {
   ui.showLoading('Đang tìm kiếm thiết bị...');
   
   setTimeout(() => {
       ui.hideLoading();
       ui.startNearbyDevicesScan();
       ui.showToast('Đã làm mới danh sách thiết bị', 'success');
   }, 3000);
}

function startQRScan() {
   ui.showToast('Chức năng quét QR đang phát triển', 'info');
}

function filterNotifications(type) {
   const buttons = document.querySelectorAll('.filter-btn');
   buttons.forEach(btn => btn.classList.remove('active'));
   event.target.classList.add('active');
   
   const notifications = document.querySelectorAll('.notification-item');
   notifications.forEach(notification => {
       if (type === 'all') {
           notification.style.display = 'block';
       } else {
           const notificationType = notification.querySelector('.notification-icon').classList.contains(type);
           notification.style.display = notificationType ? 'block' : 'none';
       }
   });
}

function clearAllNotifications() {
   ui.showConfirmation(
       'Xóa tất cả thông báo',
       'Bạn có chắc chắn muốn xóa tất cả thông báo?',
       () => {
           dataManager.setState('notifications', []);
           ui.updateNotificationBadge();
           ui.renderNotificationsList();
           ui.showToast('Đã xóa tất cả thông báo', 'success');
       }
   );
}

function searchNotifications() {
   ui.showToast('Chức năng tìm kiếm thông báo đang phát triển', 'info');
}

// Device Timer and Schedule Functions
function showDeviceTimer(deviceId) {
   ui.showModal('device-timer-modal', { deviceId });
}

function showDeviceSchedule(deviceId) {
   ui.showModal('device-schedule-modal', { deviceId });
}

function showWaterHeaterTimer(deviceId) {
   showDeviceTimer(deviceId);
}

function setDeviceTimerFromModal() {
   const minutes = parseInt(document.getElementById('timer-minutes').value);
   const action = document.getElementById('timer-action').value;
   
   if (!minutes || minutes <= 0) {
       ui.showToast('Vui lòng nhập thời gian hợp lệ', 'error');
       return;
   }
   
   const deviceId = ui.currentTimerDeviceId;
   if (!deviceId) return;
   
   dataManager.updateDevice(deviceId, {
       remainingTime: minutes,
       timerSet: true,
       timerAction: action,
       timerStartTime: new Date().toISOString()
   });
   
   ui.closeModal();
   ui.showToast(`Đã đặt hẹn giờ ${minutes} phút`, 'success');
   ui.refreshCurrentScreen();
}

function cancelDeviceTimerFromModal() {
   const deviceId = ui.currentTimerDeviceId;
   if (!deviceId) return;
   
   dataManager.updateDevice(deviceId, {
       remainingTime: 0,
       timerSet: false,
       timerAction: null,
       timerStartTime: null
   });
   
   ui.closeModal();
   ui.showToast('Đã hủy hẹn giờ', 'success');
   ui.refreshCurrentScreen();
}

function addScheduleRule() {
   const container = document.getElementById('schedule-rules');
   const ruleCount = container.children.length;
   
   const newRule = document.createElement('div');
   newRule.className = 'schedule-rule';
   newRule.innerHTML = `
       <div class="form-group">
           <label>Thời gian</label>
           <input type="time" class="schedule-time" value="07:00">
       </div>
       <div class="form-group">
           <label>Hành động</label>
           <select class="schedule-action">
               <option value="turn_on">Bật thiết bị</option>
               <option value="turn_off">Tắt thiết bị</option>
           </select>
       </div>
       <div class="form-group">
           <label>Lặp lại</label>
           <div class="day-selector">
               ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => `
                   <label class="day-checkbox">
                       <input type="checkbox" value="${index}" checked>
                       <span>${day}</span>
                   </label>
               `).join('')}
           </div>
       </div>
       <button class="btn btn-sm btn-outline" onclick="this.parentElement.remove()">
           <span class="material-icons">delete</span>
           Xóa
       </button>
   `;
   
   container.appendChild(newRule);
}

function saveDeviceSchedule() {
   const scheduleName = document.getElementById('schedule-name').value;
   const deviceId = ui.currentScheduleDeviceId;
   
   if (!scheduleName.trim()) {
       ui.showToast('Vui lòng nhập tên lịch trình', 'error');
       return;
   }
   
   const rules = [];
   document.querySelectorAll('.schedule-rule').forEach(ruleElement => {
       const time = ruleElement.querySelector('.schedule-time').value;
       const action = ruleElement.querySelector('.schedule-action').value;
       const days = Array.from(ruleElement.querySelectorAll('.day-checkbox input:checked'))
           .map(checkbox => parseInt(checkbox.value));
       
       if (time && days.length > 0) {
           rules.push({ time, action, days });
       }
   });
   
   if (rules.length === 0) {
       ui.showToast('Vui lòng thêm ít nhất một quy tắc', 'error');
       return;
   }
   
   const scheduleData = {
       name: scheduleName,
       rules: rules
   };
   
   // Save schedule to device
   dataManager.updateDevice(deviceId, {
       schedule: scheduleData,
       scheduleEnabled: true
   });
   
   ui.closeModal();
   ui.showToast('Đã lưu lịch trình thành công', 'success');
}

function showDeviceAnalytics(deviceId) {
   ui.showScreen('analytics');
   
   setTimeout(() => {
       const device = dataManager.getState('devices').find(d => d.id === deviceId);
       if (device) {
           ui.showToast(`Xem thống kê cho ${device.name}`, 'info');
       }
   }, 500);
}

// Navigation and Settings Functions
function editProfile() {
   ui.showToast('Chức năng chỉnh sửa hồ sơ đang phát triển', 'info');
}

function changePassword() {
   ui.showToast('Chức năng đổi mật khẩu đang phát triển', 'info');
}

function showSecurity() {
   ui.showToast('Chức năng bảo mật 2 lớp đang phát triển', 'info');
}

function showBackup() {
   ui.showToast('Chức năng sao lưu & khôi phục đang phát triển', 'info');
}

function themeSettings() {
   ui.showToast('Chức năng cài đặt giao diện đang phát triển', 'info');
}

function languageSettings() {
   ui.showToast('Chức năng cài đặt ngôn ngữ đang phát triển', 'info');
}

function notificationSettings() {
   ui.showToast('Chức năng cài đặt thông báo đang phát triển', 'info');
}

function voiceSettings() {
   ui.showToast('Chức năng cài đặt điều khiển giọng nói đang phát triển', 'info');
}

function otaSettings() {
   ui.showToast('Chức năng cài đặt cập nhật OTA đang phát triển', 'info');
}

function manageHomes() {
   ui.showToast('Chức năng quản lý nhà & phòng đang phát triển', 'info');
}

function showDeviceSearch() {
   const searchBar = document.getElementById('device-search');
   if (searchBar.style.display === 'none') {
       searchBar.style.display = 'block';
       searchBar.querySelector('input').focus();
   } else {
       searchBar.style.display = 'none';
   }
}

function showSceneSearch() {
   const searchBar = document.getElementById('scene-search');
   if (searchBar.style.display === 'none') {
       searchBar.style.display = 'block';
       searchBar.querySelector('input').focus();
   } else {
       searchBar.style.display = 'none';
   }
}

function showDeviceSettings() {
   ui.showToast('Chức năng cài đặt thiết bị đang phát triển', 'info');
}

function showAnalyticsChart() {
   ui.showToast('Chức năng biểu đồ chi tiết đang phát triển', 'info');
}

function showAnalyticsSettings() {
   ui.showToast('Chức năng cài đặt thống kê đang phát triển', 'info');
}

// Tab Management
function showSceneTab(tabName) {
   ui.showSceneTab(tabName);
}

// Room Control Functions
function controlRoomDevices(roomId, action) {
   const devices = dataManager.getDevicesByRoom(roomId);
   
   devices.forEach(device => {
       switch (action) {
           case 'turn_all_off':
               if (device.isOn) {
                   dataManager.updateDevice(device.id, { isOn: false });
               }
               break;
           case 'turn_all_on':
               if (!device.isOn && device.isOnline) {
                   dataManager.updateDevice(device.id, { isOn: true });
               }
               break;
           case 'optimize_energy':
               optimizeDeviceEnergy(device.id);
               break;
       }
   });

   const actionNames = {
       'turn_all_off': 'Đã tắt tất cả thiết bị',
       'turn_all_on': 'Đã bật tất cả thiết bị',
       'optimize_energy': 'Đã tối ưu hóa năng lượng'
   };

   ui.showToast(actionNames[action] || 'Đã thực hiện', 'success');
   ui.refreshCurrentScreen();
}

function optimizeDeviceEnergy(deviceId) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return;

   const optimizations = {};

   if (device.type === 'water_heater') {
       optimizations.mode = 'eco';
       optimizations.targetTemperature = Math.min(device.targetTemperature, 55);
   } else if (device.type === 'towel_dryer') {
       optimizations.targetTemperature = Math.min(device.targetTemperature, 40);
   } else if (device.type === 'ac') {
       optimizations.temperature = device.isOn ? 
           Math.max(device.temperature, 26) : device.temperature;
   }

   if (Object.keys(optimizations).length > 0) {
       dataManager.updateDevice(deviceId, optimizations);
       ui.showToast('Đã tối ưu hóa tiết kiệm năng lượng', 'success');
   }
}

// Energy Report Functions
function getDeviceEnergyReport(deviceId, period = 'week') {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return null;

   const energyData = dataManager.getDetailedEnergyData(period);
   const deviceData = energyData.deviceDetails.find(d => d.device.id === deviceId);

   if (!deviceData) return null;

   return {
       device: device,
       consumption: deviceData.consumption,
       cost: deviceData.cost,
       percentage: deviceData.percentage,
       recommendations: getEnergyRecommendations(device, deviceData)
   };
}

function getEnergyRecommendations(device, energyData) {
   const recommendations = [];

   if (energyData.percentage > 40) {
       recommendations.push({
           type: 'high_consumption',
           message: 'Thiết bị này tiêu thụ nhiều năng lượng nhất. Xem xét tối ưu hóa cài đặt.'
       });
   }

   if (device.type === 'water_heater') {
       if (device.targetTemperature > 65) {
           recommendations.push({
               type: 'temperature_optimization',
               message: 'Giảm nhiệt độ xuống 60°C có thể tiết kiệm 15% năng lượng.'
           });
       }

       if (device.mode !== 'eco') {
           recommendations.push({
               type: 'mode_optimization',
               message: 'Sử dụng chế độ ECO vào ban đêm để tiết kiệm điện.'
           });
       }
   }

   if (device.type === 'towel_dryer') {
       if (!device.smartAutomation) {
           recommendations.push({
               type: 'automation',
               message: 'Bật tự động thông minh để tối ưu hóa với bình nóng lạnh.'
           });
       }
   }

   return recommendations;
}

// Advanced Scene Creation
function createSmartScene(sceneName, devices, conditions = {}) {
   const actions = devices.map(device => {
       const baseAction = {
           deviceId: device.id,
           type: 'toggle',
           value: device.targetState
       };

       if (device.type === 'water_heater' && device.targetState) {
           return [
               baseAction,
               { deviceId: device.id, type: 'mode', value: 'auto' },
               { deviceId: device.id, type: 'temperature', value: 60 }
           ];
       } else if (device.type === 'towel_dryer' && device.targetState) {
           return [
               baseAction,
               { deviceId: device.id, type: 'mode', value: device.mode || 'towel_dry' },
               { deviceId: device.id, type: 'temperature', value: device.temperature || 45 }
           ];
       }

       return [baseAction];
   }).flat();

   const scene = {
       name: sceneName,
       icon: conditions.icon || '🏠',
       description: conditions.description || `Kịch bản tự động cho ${sceneName}`,
       trigger: conditions.trigger || { type: 'manual' },
       actions: actions,
       conditions: conditions.conditions || [],
       isActive: true
   };

   return dataManager.addScene(scene);
}

// Device Scheduling Functions
function createDeviceSchedule(deviceId, scheduleData) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return;

   const schedule = {
       id: Utils.generateId(),
       deviceId: deviceId,
       name: scheduleData.name || `Lịch trình ${device.name}`,
       enabled: true,
       rules: scheduleData.rules || [],
       createdAt: new Date().toISOString()
   };

   dataManager.updateDevice(deviceId, {
       schedule: schedule,
       scheduleEnabled: true
   });

   ui.showToast('Đã tạo lịch trình thành công', 'success');
   return schedule;
}

function enableDeviceSchedule(deviceId, enabled) {
   dataManager.updateDevice(deviceId, { scheduleEnabled: enabled });
   const message = enabled ? 'Đã bật lịch trình tự động' : 'Đã tắt lịch trình tự động';
   ui.showToast(message, 'success');
}

function setDeviceTimer(deviceId, minutes) {
   const device = dataManager.getState('devices').find(d => d.id === deviceId);
   if (!device) return;

   dataManager.updateDevice(deviceId, {
       remainingTime: minutes,
       timerSet: true,
       timerStartTime: new Date().toISOString()
   });

   ui.showToast(`Đã hẹn giờ ${minutes} phút`, 'success');
}

function cancelDeviceTimer(deviceId) {
   dataManager.updateDevice(deviceId, {
       remainingTime: 0,
       timerSet: false,
       timerStartTime: null
   });

   ui.showToast('Đã hủy hẹn giờ', 'success');
}

// Create global UI instance
window.ui = new UI();

// Export for testing and debugging
if (typeof window !== 'undefined') {
   window.smartHome = {
       // Device control
       updateWaterHeaterTemperature,
       updateWaterHeaterMode,
       updateTowelDryerMode,
       updateTowelDryerTemperature,
       updateTowelDryerRoomTemperature,
       toggleSmartAutomation,
       
       // Automation
       toggleAutomationRule,
       editAutomationRule,
       deleteAutomationRule,
       
       // Energy management
       optimizeDeviceEnergy,
       getDeviceEnergyReport,
       
       // Room control
       controlRoomDevices,
       
       // Scene management
       createSmartScene,
       createSuggestedScene,
       
       // Timer and scheduling
       setDeviceTimer,
       cancelDeviceTimer,
       createDeviceSchedule,
       enableDeviceSchedule,
       
       // Notifications
       clearAllNotifications,
       searchNotifications,
       showNotificationDetail,
       
       // Utility
       applySuggestion,
       dismissSuggestion,
       refreshNearbyDevices,
       
       // Voice commands
       startVoiceControl,
       stopVoiceControl,
       
       // Modal management
       showModal: (modalId, data) => ui.showModal(modalId, data),
       closeModal: () => ui.closeModal(),
       
       // Screen management
       showScreen: (screenName) => ui.showScreen(screenName),
       refreshCurrentScreen: () => ui.refreshCurrentScreen()
   };
}