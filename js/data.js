// Data Management and State
class DataManager {
    constructor() {
        this.state = {
            user: null,
            homes: [],
            currentHome: null,
            devices: [],
            scenes: [],
            notifications: [],
            analytics: {},
            settings: this.getDefaultSettings()
        };
        
        this.listeners = new Map();
        this.loadFromStorage();
    }

    // Default settings
    getDefaultSettings() {
        return {
            theme: 'auto',
            language: 'vi',
            notifications: {
                enabled: true,
                sound: true,
                vibration: true,
                types: {
                    warnings: true,
                    scenes: true,
                    updates: true,
                    analytics: false,
                    activities: true,
                    suggestions: true
                },
                quietHours: {
                    enabled: true,
                    start: '22:00',
                    end: '07:00',
                    emergencyOnly: false
                }
            },
            voice: {
                enabled: true,
                sensitivity: 'medium',
                language: 'vi-VN',
                responseVoice: 'female',
                timeout: 5000,
                muteResponse: false
            },
            autoUpdate: {
                app: true,
                devices: true,
                wifiOnly: true,
                whileCharging: false
            }
        };
    }

    // State management
    setState(key, value) {
        this.state[key] = value;
        this.saveToStorage();
        this.notifyListeners(key, value);
    }

    getState(key) {
        return this.state[key];
    }

    updateState(key, updates) {
        if (typeof this.state[key] === 'object' && this.state[key] !== null) {
            this.state[key] = { ...this.state[key], ...updates };
        } else {
            this.state[key] = updates;
        }
        this.saveToStorage();
        this.notifyListeners(key, this.state[key]);
    }

    // Event listeners
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    notifyListeners(key, value) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(callback => callback(value));
        }
    }

    // Storage management
    saveToStorage() {
        Utils.storage.set('smarthome_state', this.state);
    }

    loadFromStorage() {
        const savedState = Utils.storage.get('smarthome_state');
        if (savedState) {
            this.state = { ...this.state, ...savedState };
        }
    }

    // User management
    setUser(userData) {
        this.setState('user', userData);
    }

    getUser() {
        return this.getState('user');
    }

    isLoggedIn() {
        return !!this.getUser();
    }

    logout() {
        this.setState('user', null);
        Utils.storage.remove('auth_token');
    }

    // Home management
    addHome(homeData) {
        const homes = [...this.getState('homes')];
        const newHome = {
            id: Utils.generateId(),
            ...homeData,
            createdAt: new Date().toISOString(),
            rooms: homeData.rooms || []
        };
        homes.push(newHome);
        this.setState('homes', homes);
        
        // Set as current home if it's the first one
        if (homes.length === 1) {
            this.setCurrentHome(newHome.id);
        }
        
        return newHome;
    }

    updateHome(homeId, updates) {
        const homes = this.getState('homes').map(home => 
            home.id === homeId ? { ...home, ...updates, updatedAt: new Date().toISOString() } : home
        );
        this.setState('homes', homes);
    }

    deleteHome(homeId) {
        const homes = this.getState('homes').filter(home => home.id !== homeId);
        this.setState('homes', homes);
        
        // If deleted home was current, switch to first available
        if (this.getCurrentHome()?.id === homeId && homes.length > 0) {
            this.setCurrentHome(homes[0].id);
        }
    }

    setCurrentHome(homeId) {
        const home = this.getState('homes').find(h => h.id === homeId);
        if (home) {
            this.setState('currentHome', home);
            this.loadDevicesForHome(homeId);
        }
    }

    getCurrentHome() {
        return this.getState('currentHome');
    }

    // Room management
    addRoom(homeId, roomData) {
        const newRoom = {
            id: Utils.generateId(),
            ...roomData,
            createdAt: new Date().toISOString(),
            devices: []
        };
        
        this.updateHome(homeId, {
            rooms: [...(this.getCurrentHome()?.rooms || []), newRoom]
        });
        
        return newRoom;
    }

    updateRoom(homeId, roomId, updates) {
        const home = this.getState('homes').find(h => h.id === homeId);
        if (home) {
            const rooms = home.rooms.map(room =>
                room.id === roomId ? { ...room, ...updates, updatedAt: new Date().toISOString() } : room
            );
            this.updateHome(homeId, { rooms });
        }
    }

    deleteRoom(homeId, roomId) {
        const home = this.getState('homes').find(h => h.id === homeId);
        if (home) {
            const rooms = home.rooms.filter(room => room.id !== roomId);
            this.updateHome(homeId, { rooms });
            
            // Also remove devices in this room
            const devices = this.getState('devices').filter(device => device.roomId !== roomId);
            this.setState('devices', devices);
        }
    }

    // Device management
    async loadDevicesForHome(homeId) {
        // Simulate API call
        const devices = this.generateSampleDevices(homeId);
        this.setState('devices', devices);
    }

    addDevice(deviceData) {
        const devices = [...this.getState('devices')];
        const newDevice = {
            id: Utils.generateId(),
            ...deviceData,
            homeId: this.getCurrentHome()?.id,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            isOnline: true,
            isFavorite: false
        };
        devices.push(newDevice);
        this.setState('devices', devices);
        return newDevice;
    }

    updateDevice(deviceId, updates) {
        const devices = this.getState('devices').map(device =>
            device.id === deviceId 
                ? { ...device, ...updates, lastUpdated: new Date().toISOString() }
                : device
        );
        this.setState('devices', devices);
    }

    deleteDevice(deviceId) {
        const devices = this.getState('devices').filter(device => device.id !== deviceId);
        this.setState('devices', devices);
        
        // Remove from scenes
        const scenes = this.getState('scenes').map(scene => ({
            ...scene,
            actions: scene.actions.filter(action => action.deviceId !== deviceId)
        }));
        this.setState('scenes', scenes);
    }

    toggleDevice(deviceId) {
        const device = this.getState('devices').find(d => d.id === deviceId);
        if (device) {
            this.updateDevice(deviceId, { 
                isOn: !device.isOn,
                lastAction: new Date().toISOString()
            });
            
            // Add to analytics
            this.recordDeviceAction(deviceId, device.isOn ? 'off' : 'on');
        }
    }

    getDevicesByRoom(roomId) {
        return this.getState('devices').filter(device => device.roomId === roomId);
    }

    getFavoriteDevices() {
        return this.getState('devices').filter(device => device.isFavorite);
    }

    // Scene management
    addScene(sceneData) {
        const scenes = [...this.getState('scenes')];
        const newScene = {
            id: Utils.generateId(),
            ...sceneData,
            homeId: this.getCurrentHome()?.id,
            createdAt: new Date().toISOString(),
            isActive: sceneData.isActive || true,
            lastRun: null
        };
        scenes.push(newScene);
        this.setState('scenes', scenes);
        return newScene;
    }

    updateScene(sceneId, updates) {
       const scenes = this.getState('scenes').map(scene =>
           scene.id === sceneId 
               ? { ...scene, ...updates, updatedAt: new Date().toISOString() }
               : scene
       );
       this.setState('scenes', scenes);
   }

   deleteScene(sceneId) {
       const scenes = this.getState('scenes').filter(scene => scene.id !== sceneId);
       this.setState('scenes', scenes);
   }

   async runScene(sceneId) {
       const scene = this.getState('scenes').find(s => s.id === sceneId);
       if (!scene || !scene.isActive) return;

       try {
           // Execute scene actions
           for (const action of scene.actions) {
               await this.executeSceneAction(action);
           }

           // Update last run time
           this.updateScene(sceneId, { lastRun: new Date().toISOString() });
           
           // Add notification
           this.addNotification({
               type: 'success',
               title: 'Kịch bản hoàn thành',
               message: `Kịch bản "${scene.name}" đã được thực hiện thành công`,
               icon: scene.icon || '🏠'
           });

       } catch (error) {
           Utils.error.handle(error, 'Không thể thực hiện kịch bản');
       }
   }

   async executeSceneAction(action) {
       const device = this.getState('devices').find(d => d.id === action.deviceId);
       if (!device) return;

       // Simulate device control delay
       await new Promise(resolve => setTimeout(resolve, 200));

       const updates = { lastAction: new Date().toISOString() };

       switch (action.type) {
           case 'toggle':
               updates.isOn = action.value;
               break;
           case 'brightness':
               updates.brightness = action.value;
               break;
           case 'temperature':
               updates.temperature = action.value;
               break;
           case 'color':
               updates.color = action.value;
               break;
           case 'mode':
               updates.mode = action.value;
               break;
       }

       this.updateDevice(action.deviceId, updates);
       this.recordDeviceAction(action.deviceId, action.type, action.value);
   }

   // Notification management
   addNotification(notificationData) {
       const notifications = [...this.getState('notifications')];
       const newNotification = {
           id: Utils.generateId(),
           ...notificationData,
           timestamp: new Date().toISOString(),
           isRead: false
       };
       notifications.unshift(newNotification); // Add to beginning
       
       // Keep only last 100 notifications
       if (notifications.length > 100) {
           notifications.splice(100);
       }
       
       this.setState('notifications', notifications);
       
       // Show system notification if permitted
       this.showSystemNotification(newNotification);
       
       return newNotification;
   }

   markNotificationAsRead(notificationId) {
       const notifications = this.getState('notifications').map(notification =>
           notification.id === notificationId 
               ? { ...notification, isRead: true }
               : notification
       );
       this.setState('notifications', notifications);
   }

   markAllNotificationsAsRead() {
       const notifications = this.getState('notifications').map(notification => ({
           ...notification,
           isRead: true
       }));
       this.setState('notifications', notifications);
   }

   deleteNotification(notificationId) {
       const notifications = this.getState('notifications').filter(
           notification => notification.id !== notificationId
       );
       this.setState('notifications', notifications);
   }

   getUnreadNotificationCount() {
       return this.getState('notifications').filter(n => !n.isRead).length;
   }

   async showSystemNotification(notification) {
       if (!('Notification' in window)) return;
       
       const permission = await Notification.requestPermission();
       if (permission === 'granted') {
           new Notification(notification.title, {
               body: notification.message,
               icon: '/assets/icons/icon-192x192.png',
               badge: '/assets/icons/badge-72x72.png',
               tag: notification.id
           });
       }
   }

   // Analytics management
   recordDeviceAction(deviceId, action, value = null) {
       const analytics = this.getState('analytics');
       const today = new Date().toDateString();
       
       if (!analytics[today]) {
           analytics[today] = {
               deviceActions: {},
               energyConsumption: {},
               sceneRuns: {}
           };
       }
       
       if (!analytics[today].deviceActions[deviceId]) {
           analytics[today].deviceActions[deviceId] = [];
       }
       
       analytics[today].deviceActions[deviceId].push({
           action,
           value,
           timestamp: new Date().toISOString()
       });
       
       this.updateState('analytics', analytics);
   }

   recordEnergyConsumption(deviceId, consumption) {
       const analytics = this.getState('analytics');
       const today = new Date().toDateString();
       
       if (!analytics[today]) {
           analytics[today] = {
               deviceActions: {},
               energyConsumption: {},
               sceneRuns: {}
           };
       }
       
       if (!analytics[today].energyConsumption[deviceId]) {
           analytics[today].energyConsumption[deviceId] = 0;
       }
       
       analytics[today].energyConsumption[deviceId] += consumption;
       this.updateState('analytics', analytics);
   }

   getEnergyData(period = 'today') {
       const analytics = this.getState('analytics');
       const today = new Date();
       
       switch (period) {
           case 'today':
               return this.calculateDayEnergy(today.toDateString());
           case 'week':
               return this.calculateWeekEnergy(today);
           case 'month':
               return this.calculateMonthEnergy(today);
           default:
               return { total: 0, devices: {}, hourly: [] };
       }
   }

   calculateDayEnergy(dateString) {
       const analytics = this.getState('analytics');
       const dayData = analytics[dateString] || { energyConsumption: {} };
       
       let total = 0;
       const devices = {};
       
       Object.entries(dayData.energyConsumption).forEach(([deviceId, consumption]) => {
           total += consumption;
           devices[deviceId] = consumption;
       });
       
       return { total, devices, hourly: this.generateHourlyData(dateString) };
   }

   calculateWeekEnergy(endDate) {
       let total = 0;
       const devices = {};
       const daily = [];
       
       for (let i = 6; i >= 0; i--) {
           const date = new Date(endDate);
           date.setDate(date.getDate() - i);
           const dayData = this.calculateDayEnergy(date.toDateString());
           
           total += dayData.total;
           daily.push({ date: date.toDateString(), total: dayData.total });
           
           Object.entries(dayData.devices).forEach(([deviceId, consumption]) => {
               devices[deviceId] = (devices[deviceId] || 0) + consumption;
           });
       }
       
       return { total, devices, daily };
   }

   calculateMonthEnergy(endDate) {
       let total = 0;
       const devices = {};
       const daily = [];
       
       const startDate = new Date(endDate);
       startDate.setDate(1);
       
       const currentDate = new Date(startDate);
       while (currentDate <= endDate) {
           const dayData = this.calculateDayEnergy(currentDate.toDateString());
           total += dayData.total;
           daily.push({ date: currentDate.toDateString(), total: dayData.total });
           
           Object.entries(dayData.devices).forEach(([deviceId, consumption]) => {
               devices[deviceId] = (devices[deviceId] || 0) + consumption;
           });
           
           currentDate.setDate(currentDate.getDate() + 1);
       }
       
       return { total, devices, daily };
   }

   generateHourlyData(dateString) {
       // Generate sample hourly energy data
       const hourlyData = [];
       for (let hour = 0; hour < 24; hour++) {
           let consumption = 0;
           
           // Simulate realistic energy consumption patterns
           if (hour >= 6 && hour <= 8) consumption = Math.random() * 3 + 2; // Morning peak
           else if (hour >= 18 && hour <= 22) consumption = Math.random() * 4 + 3; // Evening peak
           else if (hour >= 9 && hour <= 17) consumption = Math.random() * 2 + 1; // Day usage
           else consumption = Math.random() * 1 + 0.5; // Night usage
           
           hourlyData.push({ hour, consumption: parseFloat(consumption.toFixed(2)) });
       }
       
       return hourlyData;
   }

   // AI Suggestions
   generateAISuggestions() {
       const devices = this.getState('devices');
       const analytics = this.getState('analytics');
       const suggestions = [];

       // Energy saving suggestions
       if (this.getTotalEnergyToday() > this.getAverageEnergyConsumption() * 1.2) {
           suggestions.push({
               id: Utils.generateId(),
               type: 'energy',
               title: 'Tiết kiệm điện năng',
               description: 'Mức tiêu thụ hôm nay cao hơn 20% so với trung bình. Tạo kịch bản tối ưu?',
               action: 'create_energy_scene',
               priority: 'high'
           });
       }

       // Device automation suggestions
       const frequentDevices = this.getFrequentlyUsedDevices();
       if (frequentDevices.length > 0) {
           suggestions.push({
               id: Utils.generateId(),
               type: 'automation',
               title: 'Tự động hóa thông minh',
               description: `Bạn thường bật ${frequentDevices[0].name} vào lúc này. Tạo lịch trình tự động?`,
               action: 'create_schedule',
               deviceId: frequentDevices[0].id,
               priority: 'medium'
           });
       }

       // Security suggestions
       const offlineDevices = devices.filter(d => !d.isOnline);
       if (offlineDevices.length > 0) {
           suggestions.push({
               id: Utils.generateId(),
               type: 'security',
               title: 'Kiểm tra thiết bị',
               description: `${offlineDevices.length} thiết bị đang offline. Kiểm tra kết nối?`,
               action: 'check_devices',
               priority: 'high'
           });
       }

       return suggestions;
   }

   getTotalEnergyToday() {
       return this.getEnergyData('today').total;
   }

   getAverageEnergyConsumption() {
       const analytics = this.getState('analytics');
       const days = Object.keys(analytics);
       if (days.length === 0) return 0;
       
       const total = days.reduce((sum, day) => {
           return sum + Object.values(analytics[day].energyConsumption || {})
               .reduce((daySum, consumption) => daySum + consumption, 0);
       }, 0);
       
       return total / days.length;
   }

   getFrequentlyUsedDevices() {
       const devices = this.getState('devices');
       const analytics = this.getState('analytics');
       const deviceUsage = {};
       
       Object.values(analytics).forEach(dayData => {
           Object.entries(dayData.deviceActions || {}).forEach(([deviceId, actions]) => {
               deviceUsage[deviceId] = (deviceUsage[deviceId] || 0) + actions.length;
           });
       });
       
       return devices
           .filter(device => deviceUsage[device.id] > 5)
           .sort((a, b) => (deviceUsage[b.id] || 0) - (deviceUsage[a.id] || 0));
   }

   // Sample data generation
   generateSampleDevices(homeId) {
       const rooms = this.getCurrentHome()?.rooms || [];
       const deviceTypes = [
           { type: 'light', icon: '💡', name: 'Đèn', capabilities: ['toggle', 'brightness', 'color'] },
           { type: 'ac', icon: '❄️', name: 'Điều hòa', capabilities: ['toggle', 'temperature', 'mode'] },
           { type: 'tv', icon: '📺', name: 'Smart TV', capabilities: ['toggle', 'volume', 'channel'] },
           { type: 'socket', icon: '🔌', name: 'Ổ cắm thông minh', capabilities: ['toggle', 'power_monitoring'] },
           { type: 'speaker', icon: '🔊', name: 'Loa thông minh', capabilities: ['toggle', 'volume', 'source'] },
           { type: 'camera', icon: '📷', name: 'Camera an ninh', capabilities: ['toggle', 'recording', 'motion'] },
           { type: 'lock', icon: '🔒', name: 'Khóa thông minh', capabilities: ['toggle', 'auto_lock'] },
           { type: 'sensor', icon: '🌡️', name: 'Cảm biến', capabilities: ['monitoring'] }
       ];

       const devices = [];
       
       rooms.forEach(room => {
           const deviceCount = Math.floor(Math.random() * 4) + 2; // 2-5 devices per room
           
           for (let i = 0; i < deviceCount; i++) {
               const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
               const device = {
                   id: Utils.generateId(),
                   homeId,
                   roomId: room.id,
                   type: deviceType.type,
                   name: `${deviceType.name} ${room.name}`,
                   icon: deviceType.icon,
                   capabilities: deviceType.capabilities,
                   isOn: Math.random() > 0.5,
                   isOnline: Math.random() > 0.1, // 90% online rate
                   isFavorite: Math.random() > 0.8, // 20% favorite rate
                   brightness: Math.floor(Math.random() * 100) + 1,
                   temperature: Math.floor(Math.random() * 10) + 20,
                   mode: ['auto', 'cool', 'heat', 'fan'][Math.floor(Math.random() * 4)],
                   color: ['warm_white', 'cool_white', 'red', 'green', 'blue'][Math.floor(Math.random() * 5)],
                   powerConsumption: parseFloat((Math.random() * 2).toFixed(2)),
                   firmwareVersion: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 9)}`,
                   lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                   createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
               };
               
               devices.push(device);
           }
       });

       return devices;
   }

   generateSampleNotifications() {
       const notifications = [
           {
               id: Utils.generateId(),
               type: 'warning',
               title: 'Smart TV mất kết nối',
               message: 'Thiết bị offline 10 phút. Kiểm tra kết nối WiFi.',
               timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
               isRead: false,
               actions: ['check_device', 'dismiss']
           },
           {
               id: Utils.generateId(),
               type: 'success',
               title: 'Cập nhật thành công',
               message: 'Đèn trần đã cập nhật firmware v2.1',
               timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
               isRead: false,
               actions: ['view_details']
           },
           {
               id: Utils.generateId(),
               type: 'info',
               title: 'Tiêu thụ điện bất thường',
               message: 'Điều hòa: +45% so với hôm qua cùng giờ',
               timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
               isRead: true,
               actions: ['view_analytics']
           },
           {
               id: Utils.generateId(),
               type: 'success',
               title: 'Kịch bản "Đi ngủ" hoàn thành',
               message: '6 thiết bị đã được điều khiển thành công',
               timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
               isRead: true
           }
       ];

       this.setState('notifications', notifications);
   }

   // Initialize sample data
   initializeSampleData() {
       // Sample user
       this.setUser({
           id: '1',
           name: 'Nguyễn Văn A',
           email: 'user@example.com',
           phone: '+84901234567',
           avatar: null,
           createdAt: new Date().toISOString()
       });

       // Sample home
       const sampleHome = this.addHome({
           name: 'Nhà của Anh',
           address: '123 Đường ABC, Quận 1, TP.HCM',
           description: 'Nhà ở chính của gia đình',
           rooms: [
               { id: Utils.generateId(), name: 'Phòng khách', type: 'living_room', icon: '🛋️' },
               { id: Utils.generateId(), name: 'Phòng ngủ chính', type: 'bedroom', icon: '🛏️' },
               { id: Utils.generateId(), name: 'Nhà bếp', type: 'kitchen', icon: '🍳' },
               { id: Utils.generateId(), name: 'Phòng tắm', type: 'bathroom', icon: '🚿' },
               { id: Utils.generateId(), name: 'Phòng làm việc', type: 'office', icon: '💼' }
           ]
       });

       // Sample scenes
       this.addScene({
           name: 'Về nhà',
           icon: '🏠',
           description: 'Bật đèn và điều hòa khi về nhà',
           trigger: { type: 'time', value: '18:00-20:00' },
           actions: [
               { deviceId: 'sample1', type: 'toggle', value: true },
               { deviceId: 'sample2', type: 'temperature', value: 26 }
           ]
       });

       this.addScene({
           name: 'Đi ngủ',
           icon: '😴',
           description: 'Tắt tất cả thiết bị không cần thiết',
           trigger: { type: 'time', value: '22:30' },
           actions: [
               { deviceId: 'sample1', type: 'toggle', value: false },
               { deviceId: 'sample3', type: 'toggle', value: false }
           ]
       });

       // Sample notifications
       this.generateSampleNotifications();

       // Generate sample analytics data
       this.generateSampleAnalytics();
   }

   generateSampleAnalytics() {
       const analytics = {};
       const today = new Date();
       
       // Generate data for last 30 days
       for (let i = 29; i >= 0; i--) {
           const date = new Date(today);
           date.setDate(date.getDate() - i);
           const dateString = date.toDateString();
           
           analytics[dateString] = {
               deviceActions: {},
               energyConsumption: {},
               sceneRuns: {}
           };
           
           // Generate random energy consumption
           this.getState('devices').forEach(device => {
               const baseConsumption = this.getDeviceBaseConsumption(device.type);
               const variation = Math.random() * 0.5 + 0.75; // 75% - 125% of base
               analytics[dateString].energyConsumption[device.id] = 
                   parseFloat((baseConsumption * variation).toFixed(2));
           });
       }
       
       this.setState('analytics', analytics);
   }

   getDeviceBaseConsumption(deviceType) {
       const baseConsumption = {
           'light': 0.1,
           'ac': 2.5,
           'tv': 0.3,
           'socket': 0.5,
           'speaker': 0.1,
           'camera': 0.05,
           'lock': 0.01,
           'sensor': 0.005
       };
       
       return baseConsumption[deviceType] || 0.1;
   }
}

// Create global instance
window.dataManager = new DataManager();