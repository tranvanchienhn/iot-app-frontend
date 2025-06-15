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
            automationRules: [],
            deviceInteractions: [],
            settings: this.getDefaultSettings()
        };
        
        this.listeners = new Map();
        this.automationEngine = new AutomationEngine(this);
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
            },
            energy: {
                costPerKwh: 3000, // VND per kWh
                currency: 'VND',
                alertThreshold: 150, // % of average
                savingsGoal: 20 // % reduction target
            },
            automation: {
                enabled: true,
                learningMode: true,
                aggressiveOptimization: false,
                maintenanceReminders: true
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
            
            const devices = this.getState('devices').filter(device => device.roomId !== roomId);
            this.setState('devices', devices);
        }
    }

    // Device management
    async loadDevicesForHome(homeId) {
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

    addDeviceWithAutomation(deviceData) {
        const newDevice = this.addDevice(deviceData);
        this.setupDeviceAutomation(newDevice);
        return newDevice;
    }

    updateDevice(deviceId, updates) {
        const device = this.getState('devices').find(d => d.id === deviceId);
        const oldState = { ...device };
        
        const devices = this.getState('devices').map(device =>
            device.id === deviceId 
                ? { ...device, ...updates, lastUpdated: new Date().toISOString() }
                : device
        );
        this.setState('devices', devices);
        
        // Trigger automation rules
        this.automationEngine.processDeviceStateChange(deviceId, oldState, updates);
        
        // Simulate device interaction
        if (updates.isOn !== undefined) {
            this.simulateDeviceInteraction(deviceId, updates.isOn ? 'turn_on' : 'turn_off');
        }
    }

    deleteDevice(deviceId) {
        const devices = this.getState('devices').filter(device => device.id !== deviceId);
        this.setState('devices', devices);
        
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
            
            this.recordDeviceAction(deviceId, device.isOn ? 'off' : 'on');
        }
    }

    getDevicesByRoom(roomId) {
        return this.getState('devices').filter(device => device.roomId === roomId);
    }

    getDevicesByType(type) {
        return this.getState('devices').filter(device => device.type === type);
    }

    getFavoriteDevices() {
        return this.getState('devices').filter(device => device.isFavorite);
    }

    getLinkedDevices(deviceId) {
        const device = this.getState('devices').find(d => d.id === deviceId);
        if (!device || !device.linkedDevices) return [];
        
        return device.linkedDevices.map(id => 
            this.getState('devices').find(d => d.id === id)
        ).filter(d => d);
    }

    linkDevices(device1Id, device2Id) {
        const device1 = this.getState('devices').find(d => d.id === device1Id);
        const device2 = this.getState('devices').find(d => d.id === device2Id);
        
        if (!device1 || !device2) return;

        const linkedDevices1 = device1.linkedDevices || [];
        if (!linkedDevices1.includes(device2Id)) {
            linkedDevices1.push(device2Id);
            this.updateDevice(device1Id, { linkedDevices: linkedDevices1 });
        }

        const linkedDevices2 = device2.linkedDevices || [];
        if (!linkedDevices2.includes(device1Id)) {
            linkedDevices2.push(device1Id);
            this.updateDevice(device2Id, { linkedDevices: linkedDevices2 });
        }
    }

    unlinkDevices(device1Id, device2Id) {
        const device1 = this.getState('devices').find(d => d.id === device1Id);
        const device2 = this.getState('devices').find(d => d.id === device2Id);
        
        if (!device1 || !device2) return;

        const linkedDevices1 = (device1.linkedDevices || []).filter(id => id !== device2Id);
        this.updateDevice(device1Id, { linkedDevices: linkedDevices1 });

        const linkedDevices2 = (device2.linkedDevices || []).filter(id => id !== device1Id);
        this.updateDevice(device2Id, { linkedDevices: linkedDevices2 });
    }

    // Scene management
    addScene(sceneData) {
        const scenes = [...this.getState('scenes')];
        const newScene = {
            id: Utils.generateId(),
            ...sceneData,
            homeId: this.getCurrentHome()?.id,
            createdAt: new Date().toISOString(),
            isActive: sceneData.isActive !== undefined ? sceneData.isActive : true,
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
            for (const action of scene.actions) {
                await this.executeSceneAction(action);
            }

            this.updateScene(sceneId, { lastRun: new Date().toISOString() });
            
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
                updates.targetTemperature = action.value;
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

    // Automation Rules
    setupDeviceAutomation(device) {
        switch (device.type) {
            case 'water_heater':
                this.setupWaterHeaterAutomation(device);
                break;
            case 'towel_dryer':
                this.setupTowelDryerAutomation(device);
                break;
        }
    }

    setupWaterHeaterAutomation(waterHeater) {
        const towelDryer = this.getState('devices').find(d => 
            d.type === 'towel_dryer' && d.roomId === waterHeater.roomId
        );

        if (towelDryer) {
            this.addAutomationRule({
                id: Utils.generateId(),
                name: 'Bình nóng lạnh - Máy sấy khăn tự động',
                description: 'Khi bình nóng lạnh tắt, máy sấy khăn sẽ bật chế độ sấy khăn',
                trigger: {
                    type: 'device_state_change',
                    deviceId: waterHeater.id,
                    property: 'isOn',
                    value: false
                },
                conditions: [
                    {
                        deviceId: towelDryer.id,
                        property: 'isOnline',
                        operator: 'equals',
                        value: true
                    }
                ],
                actions: [
                    {
                        type: 'device_control',
                        deviceId: towelDryer.id,
                        property: 'isOn',
                        value: true
                    },
                    {
                        type: 'device_control',
                        deviceId: towelDryer.id,
                        property: 'mode',
                        value: 'towel_dry'
                    },
                    {
                        type: 'device_control',
                        deviceId: towelDryer.id,
                        property: 'targetTemperature',
                        value: 45
                    }
                ],
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }
    }

    setupTowelDryerAutomation(towelDryer) {
        // Rule 1: Auto turn off when target temperature reached (towel dry mode)
        this.addAutomationRule({
            id: Utils.generateId(),
            name: 'Máy sấy khăn - Tự động tắt khi sấy xong',
            description: 'Tắt máy sấy khăn khi đạt nhiệt độ mục tiêu trong chế độ sấy khăn',
            trigger: {
                type: 'device_temperature_reached',
                deviceId: towelDryer.id,
                property: 'currentTemperature',
                targetProperty: 'targetTemperature'
            },
            conditions: [
                {
                    deviceId: towelDryer.id,
                    property: 'mode',
                    operator: 'equals',
                    value: 'towel_dry'
                },
                {
                    deviceId: towelDryer.id,
                    property: 'isOn',
                    operator: 'equals',
                    value: true
                }
            ],
            actions: [
                {
                    type: 'device_control',
                    deviceId: towelDryer.id,
                    property: 'isOn',
                    value: false
                },
                {
                    type: 'notification',
                    title: 'Sấy khăn hoàn thành',
                    message: 'Máy sấy khăn đã đạt nhiệt độ mục tiêu và tự động tắt',
                    icon: '🔥'
                }
            ],
            isActive: true,
            createdAt: new Date().toISOString()
        });

        // Rule 2: Room heating continuous operation
        this.addAutomationRule({
            id: Utils.generateId(),
            name: 'Máy sấy khăn - Duy trì nhiệt độ phòng',
            description: 'Duy trì nhiệt độ phòng ở chế độ sưởi phòng',
            trigger: {
                type: 'device_temperature_check',
                deviceId: towelDryer.id,
                interval: 30000
            },
            conditions: [
                {
                    deviceId: towelDryer.id,
                    property: 'mode',
                    operator: 'equals',
                    value: 'room_heating'
                }
            ],
            actions: [
                {
                    type: 'temperature_control',
                    deviceId: towelDryer.id,
                    logic: 'maintain_temperature'
                }
            ],
            isActive: true,
            createdAt: new Date().toISOString()
        });
    }

    addAutomationRule(rule) {
        const rules = [...this.getState('automationRules')];
        rules.push(rule);
        this.setState('automationRules', rules);
        
        this.automationEngine.registerRule(rule);
    }

    updateAutomationRule(ruleId, updates) {
       const rules = this.getState('automationRules').map(rule =>
           rule.id === ruleId 
               ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
               : rule
       );
       this.setState('automationRules', rules);
   }

   deleteAutomationRule(ruleId) {
       const rules = this.getState('automationRules').filter(rule => rule.id !== ruleId);
       this.setState('automationRules', rules);
       
       this.automationEngine.unregisterRule(ruleId);
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
       notifications.unshift(newNotification);
       
       if (notifications.length > 100) {
           notifications.splice(100);
       }
       
       this.setState('notifications', notifications);
       this.showSystemNotification(newNotification);
       
       return newNotification;
   }

   addSmartNotification(type, deviceId, data = {}) {
       const device = this.getState('devices').find(d => d.id === deviceId);
       if (!device) return;

       let notification = {
           type: 'info',
           icon: device.icon,
           ...data
       };

       switch (type) {
           case 'temperature_reached':
               notification = {
                   ...notification,
                   type: 'success',
                   title: `${device.name} đạt nhiệt độ mục tiêu`,
                   message: `Nhiệt độ hiện tại: ${device.currentTemperature}°C`
               };
               break;

           case 'energy_high':
               notification = {
                   ...notification,
                   type: 'warning',
                   title: 'Tiêu thụ điện cao',
                   message: `${device.name} đang tiêu thụ nhiều điện năng hơn bình thường`
               };
               break;

           case 'maintenance_reminder':
               notification = {
                   ...notification,
                   type: 'info',
                   title: 'Nhắc nhở bảo trì',
                   message: `${device.name} cần được kiểm tra bảo trì định kỳ`
               };
               break;

           case 'automation_executed':
               notification = {
                   ...notification,
                   type: 'success',
                   title: 'Tự động thực hiện',
                   message: `${device.name} đã được điều khiển tự động`
               };
               break;
       }

       this.addNotification(notification);
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
           case 'yesterday':
               const yesterday = new Date(today);
               yesterday.setDate(yesterday.getDate() - 1);
               return this.calculateDayEnergy(yesterday.toDateString());
           case 'week':
               return this.calculateWeekEnergy(today);
           case 'month':
               return this.calculateMonthEnergy(today);
           default:
               return { total: 0, devices: {}, hourly: [] };
       }
   }

   getDetailedEnergyData(period = 'today') {
       const energyData = this.getEnergyData(period);
       const devices = this.getState('devices');
       
       const deviceDetails = Object.entries(energyData.devices).map(([deviceId, consumption]) => {
           const device = devices.find(d => d.id === deviceId);
           if (!device) return null;
           
           const cost = consumption * this.getState('settings').energy.costPerKwh;
           const percentage = (consumption / energyData.total) * 100;
           
           return {
               device,
               consumption,
               cost,
               percentage: Math.round(percentage * 10) / 10
           };
       }).filter(item => item !== null)
         .sort((a, b) => b.consumption - a.consumption);

       return {
           ...energyData,
           deviceDetails,
           totalCost: energyData.total * this.getState('settings').energy.costPerKwh,
           averageHourly: energyData.total / 24
       };
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
       const hourlyData = [];
       for (let hour = 0; hour < 24; hour++) {
           let consumption = 0;
           
           if (hour >= 6 && hour <= 8) consumption = Math.random() * 3 + 2;
           else if (hour >= 18 && hour <= 22) consumption = Math.random() * 4 + 3;
           else if (hour >= 9 && hour <= 17) consumption = Math.random() * 2 + 1;
           else consumption = Math.random() * 1 + 0.5;
           
           hourlyData.push({ hour, consumption: parseFloat(consumption.toFixed(2)) });
       }
       
       return hourlyData;
   }

   calculateHourlyConsumption(device) {
       const basePower = {
           'water_heater': 2.5,
           'towel_dryer': 0.8,
           'ac': 1.5,
           'light': 0.01,
           'tv': 0.15,
           'socket': 0.1
       };

       let power = basePower[device.type] || 0.1;

       if (device.type === 'water_heater') {
           switch (device.mode) {
               case 'eco':
                   power *= 0.7;
                   break;
               case 'boost':
                   power *= 1.3;
                   break;
           }
       }

       if (device.type === 'towel_dryer') {
           if (device.mode === 'room_heating') {
               power *= 1.2;
           }
       }

       return power;
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

   // AI Suggestions
   generateAISuggestions() {
       const devices = this.getState('devices');
       const analytics = this.getState('analytics');
       const suggestions = [];

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

   generateSmartSuggestions() {
       const suggestions = [];
       const devices = this.getState('devices');
       const energyData = this.getDetailedEnergyData('today');
       
       const waterHeaters = devices.filter(d => d.type === 'water_heater');
       waterHeaters.forEach(device => {
           const deviceEnergy = energyData.deviceDetails.find(d => d.device.id === device.id);
           
           if (deviceEnergy && deviceEnergy.percentage > 30) {
               suggestions.push({
                   type: 'energy_saving',
                   title: 'Tiết kiệm điện bình nóng lạnh',
                   message: `${device.name} đang tiêu thụ ${deviceEnergy.percentage}% tổng điện năng. Khuyến nghị sử dụng chế độ ECO hoặc giảm nhiệt độ mục tiêu.`,
                   action: 'optimize_water_heater',
                   deviceId: device.id,
                   priority: 'high'
               });
           }

           if (device.targetTemperature > 65) {
               suggestions.push({
                   type: 'temperature_optimization',
                   title: 'Tối ưu nhiệt độ nước',
                   message: `Nhiệt độ ${device.targetTemperature}°C có thể quá cao. Giảm xuống 60°C có thể tiết kiệm 15% điện năng.`,
                   action: 'reduce_temperature',
                   deviceId: device.id,
                   priority: 'medium'
               });
           }
       });

       const towelDryers = devices.filter(d => d.type === 'towel_dryer');
       towelDryers.forEach(device => {
           if (!device.smartAutomation) {
               suggestions.push({
                   type: 'automation',
                   title: 'Bật tự động thông minh',
                   message: `Bật tính năng tự động cho ${device.name} để tối ưu hóa hoạt động với bình nóng lạnh.`,
                   action: 'enable_smart_automation',
                   deviceId: device.id,
                   priority: 'medium'
               });
           }
       });

       const currentHour = new Date().getHours();
       if (currentHour >= 22 || currentHour <= 6) {
           const activeDevices = devices.filter(d => d.isOn && d.type !== 'security');
           if (activeDevices.length > 0) {
               suggestions.push({
                   type: 'schedule',
                   title: 'Chế độ đêm',
                   message: `Phát hiện ${activeDevices.length} thiết bị đang hoạt động vào ban đêm. Tạo lịch trình tự động tắt?`,
                   action: 'create_night_schedule',
                   priority: 'low'
               });
           }
       }

       return suggestions;
   }

   // Device interaction simulation
   simulateDeviceInteraction(triggerDeviceId, action) {
       const device = this.getState('devices').find(d => d.id === triggerDeviceId);
       if (!device) return;

       if (device.type === 'water_heater' && action === 'turn_off') {
           const linkedTowelDryer = this.getLinkedDevices(triggerDeviceId)
               .find(d => d.type === 'towel_dryer');
           
           if (linkedTowelDryer && linkedTowelDryer.smartAutomation) {
               setTimeout(() => {
                   this.updateDevice(linkedTowelDryer.id, {
                       isOn: true,
                       mode: 'towel_dry',
                       targetTemperature: 45
                   });
                   
                   this.addNotification({
                       type: 'info',
                       title: 'Tự động bật máy sấy khăn',
                       message: `${linkedTowelDryer.name} đã tự động bật ở chế độ sấy khăn`,
                       icon: '🧻'
                   });
               }, 2000);
           }
       }
   }

   simulateRealTimeDeviceStatus() {
       const devices = this.getState('devices');
       let hasChanges = false;

       devices.forEach(device => {
           const updates = {};

           if (device.isOn && device.isOnline) {
               const hourlyConsumption = this.calculateHourlyConsumption(device);
               const currentConsumption = device.energyConsumption || 0;
               updates.energyConsumption = currentConsumption + (hourlyConsumption / 3600);
           }

           if (device.remainingTime > 0) {
               updates.remainingTime = Math.max(0, device.remainingTime - 1);
               
               if (updates.remainingTime === 0) {
                   updates.isOn = false;
                   
                   this.addNotification({
                       type: 'success',
                       title: 'Hẹn giờ hoàn thành',
                       message: `${device.name} đã tự động tắt theo hẹn giờ`,
                       icon: device.icon
                   });
               }
           }

           if (device.type === 'towel_dryer' && 
               device.isOn && 
               device.mode === 'towel_dry' &&
               device.currentTemperature >= device.targetTemperature) {
               
               updates.isOn = false;
               this.addNotification({
                   type: 'success',
                   title: 'Sấy khăn hoàn thành',
                   message: `${device.name} đã đạt nhiệt độ mục tiêu và tự động tắt`,
                   icon: '🧻'
               });
           }

           if (Object.keys(updates).length > 0) {
               this.updateDevice(device.id, updates);
               hasChanges = true;
           }
       });

       return hasChanges;
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
           'sensor': 0.005,
           'water_heater': 2.5,
           'towel_dryer': 0.8
       };
       
       return baseConsumption[deviceType] || 0.1;
   }

   // Sample data generation
   generateBathroomDevices(homeId, bathroomRoomId) {
       const waterHeater = {
           id: Utils.generateId(),
           homeId,
           roomId: bathroomRoomId,
           type: 'water_heater',
           name: 'Bình nóng lạnh Ariston',
           icon: '🔥',
           capabilities: ['toggle', 'temperature', 'timer', 'energy_monitoring'],
           isOn: false,
           isOnline: true,
           isFavorite: true,
           currentTemperature: 25,
           targetTemperature: 60,
           maxTemperature: 75,
           minTemperature: 30,
           heatingPower: 2500,
           remainingTime: 0,
           energyConsumption: 0,
           mode: 'auto',
           modes: ['auto', 'eco', 'boost'],
           firmwareVersion: 'v2.1.0',
           lastUpdated: new Date().toISOString(),
           createdAt: new Date().toISOString(),
           autoShutoff: true,
           scheduleEnabled: false,
           schedule: {
               morning: { enabled: true, time: '06:00', temperature: 60 },
               evening: { enabled: true, time: '18:00', temperature: 65 }
           }
       };

       const towelDryer = {
           id: Utils.generateId(),
           homeId,
           roomId: bathroomRoomId,
           type: 'towel_dryer',
           name: 'Máy sấy khăn Xiaomi',
           icon: '🧻',
           capabilities: ['toggle', 'temperature', 'mode', 'timer'],
           isOn: false,
           isOnline: true,
           isFavorite: true,
           currentTemperature: 22,
           targetTemperature: 45,
           maxTemperature: 60,
           minTemperature: 25,
           heatingPower: 800,
           mode: 'towel_dry',
           modes: [
               { 
                   id: 'towel_dry', 
                   name: 'Sấy khăn', 
                   description: 'Sấy khăn và tự động tắt khi đạt nhiệt độ',
                   defaultTemp: 45,
                   autoPowerOff: true
               },
               { 
                   id: 'room_heating', 
                   name: 'Sưởi phòng', 
                   description: 'Sưởi phòng liên tục dựa trên nhiệt độ cài đặt',
                   defaultTemp: 35,
                   autoPowerOff: false
               }
           ],
           remainingTime: 0,
           energyConsumption: 0,
           firmwareVersion: 'v1.5.2',
           lastUpdated: new Date().toISOString(),
           createdAt: new Date().toISOString(),
           roomTemperatureSensor: true,
           currentRoomTemperature: 22,
           targetRoomTemperature: 24,
           smartAutomation: true,
           linkedDevices: [waterHeater.id]
       };

       // Link devices
       waterHeater.linkedDevices = [towelDryer.id];

       return [waterHeater, towelDryer];
   }

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
           // Add special bathroom devices
           if (room.type === 'bathroom') {
               const bathroomDevices = this.generateBathroomDevices(homeId, room.id);
               devices.push(...bathroomDevices);
           }
           
           // Add regular devices
           const deviceCount = Math.floor(Math.random() * 3) + 1;
           
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
                   isOnline: Math.random() > 0.1,
                   isFavorite: Math.random() > 0.8,
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

   initializeSampleData() {
       this.setUser({
           id: '1',
           name: 'Nguyễn Văn A',
           email: 'user@example.com',
           phone: '+84901234567',
           avatar: null,
           createdAt: new Date().toISOString()
       });

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

       this.addScene({
           name: 'Tắm nước nóng',
           icon: '🛁',
           description: 'Bật bình nóng lạnh và tắt máy sấy khăn',
           trigger: { type: 'manual' },
           actions: []
       });

       this.addScene({
           name: 'Sấy khăn nhanh',
           icon: '🧻',
           description: 'Bật máy sấy khăn chế độ sấy khăn',
           trigger: { type: 'manual' },
           actions: []
       });

       this.addScene({
           name: 'Sưởi phòng tắm',
           icon: '🔥',
           description: 'Bật máy sấy khăn chế độ sưởi phòng',
           trigger: { type: 'time', value: '06:00' },
           actions: []
       });

       this.addScene({
           name: 'Về nhà',
           icon: '🏠',
           description: 'Bật đèn và điều hòa khi về nhà',
           trigger: { type: 'time', value: '18:00-20:00' },
           actions: []
       });

       this.addScene({
           name: 'Đi ngủ',
           icon: '😴',
           description: 'Tắt tất cả thiết bị không cần thiết',
           trigger: { type: 'time', value: '22:30' },
           actions: []
       });

       this.generateSampleNotifications();
       this.generateSampleAnalytics();
   }

   generateSampleAnalytics() {
       const analytics = {};
       const today = new Date();
       
       for (let i = 29; i >= 0; i--) {
           const date = new Date(today);
           date.setDate(date.getDate() - i);
           const dateString = date.toDateString();
           
           analytics[dateString] = {
               deviceActions: {},
               energyConsumption: {},
               sceneRuns: {}
           };
           
           this.getState('devices').forEach(device => {
               const baseConsumption = this.getDeviceBaseConsumption(device.type);
               const variation = Math.random() * 0.5 + 0.75;
               analytics[dateString].energyConsumption[device.id] = 
                   parseFloat((baseConsumption * variation).toFixed(2));
           });
       }
       
       this.setState('analytics', analytics);
   }
}

// Automation Engine
class AutomationEngine {
   constructor(dataManager) {
       this.dataManager = dataManager;
       this.registeredRules = new Map();
       this.intervalChecks = new Map();
       this.init();
   }

   init() {
       this.startPeriodicChecks();
   }

   registerRule(rule) {
       this.registeredRules.set(rule.id, rule);
       
       if (rule.trigger.type === 'device_temperature_check') {
           this.setupPeriodicCheck(rule);
       }
   }

   unregisterRule(ruleId) {
       this.registeredRules.delete(ruleId);
       
       if (this.intervalChecks.has(ruleId)) {
           clearInterval(this.intervalChecks.get(ruleId));
           this.intervalChecks.delete(ruleId);
       }
   }

   setupPeriodicCheck(rule) {
       if (this.intervalChecks.has(rule.id)) {
           clearInterval(this.intervalChecks.get(rule.id));
       }

       const interval = setInterval(() => {
           this.processTemperatureCheck(rule);
       }, rule.trigger.interval || 30000);

       this.intervalChecks.set(rule.id, interval);
   }

   processDeviceStateChange(deviceId, oldState, newState) {
       this.registeredRules.forEach(rule => {
           if (rule.trigger.type === 'device_state_change' && 
               rule.trigger.deviceId === deviceId &&
               rule.isActive) {
               
               const triggerProperty = rule.trigger.property;
               const triggerValue = rule.trigger.value;
               
               if (newState[triggerProperty] === triggerValue) {
                   this.executeRule(rule);
               }
           }
       });
   }

   processTemperatureCheck(rule) {
       if (!rule.isActive) return;

       const device = this.dataManager.getState('devices').find(d => d.id === rule.trigger.deviceId);
       if (!device) return;

       if (this.checkConditions(rule.conditions)) {
           if (rule.trigger.type === 'device_temperature_reached') {
               if (device.currentTemperature >= device.targetTemperature) {
                   this.executeRule(rule);
               }
           } else if (rule.trigger.type === 'device_temperature_check') {
               this.executeRule(rule);
           }
       }
   }

   checkConditions(conditions) {
       return conditions.every(condition => {
           const device = this.dataManager.getState('devices').find(d => d.id === condition.deviceId);
           if (!device) return false;

           const actualValue = device[condition.property];
           const expectedValue = condition.value;

           switch (condition.operator) {
               case 'equals':
                   return actualValue === expectedValue;
               case 'not_equals':
                   return actualValue !== expectedValue;
               case 'greater_than':
                   return actualValue > expectedValue;
               case 'less_than':
                   return actualValue < expectedValue;
               default:
                   return actualValue === expectedValue;
           }
       });
   }

   executeRule(rule) {
       console.log(`Executing automation rule: ${rule.name}`);

       rule.actions.forEach(action => {
           this.executeAction(action);
       });

       this.dataManager.addNotification({
           type: 'info',
           title: 'Automation thực hiện',
           message: `${rule.name} đã được thực hiện tự động`,
           icon: '🤖'
       });
   }

   executeAction(action) {
       switch (action.type) {
           case 'device_control':
               this.dataManager.updateDevice(action.deviceId, {
                   [action.property]: action.value
               });
               break;

           case 'temperature_control':
               this.executeTemperatureControl(action);
               break;

           case 'notification':
               this.dataManager.addNotification({
                   type: 'info',
                   title: action.title,
                   message: action.message,
                   icon: action.icon || '🔔'
               });
               break;
       }
   }

   executeTemperatureControl(action) {
       const device = this.dataManager.getState('devices').find(d => d.id === action.deviceId);
       if (!device) return;

       if (action.logic === 'maintain_temperature') {
           const currentTemp = device.currentRoomTemperature || device.currentTemperature;
           const targetTemp = device.targetRoomTemperature || device.targetTemperature;
           const tolerance = 1;

           if (currentTemp < (targetTemp - tolerance)) {
               if (!device.isOn) {
                   this.dataManager.updateDevice(action.deviceId, { isOn: true });
               }
           } else if (currentTemp > (targetTemp + tolerance)) {
               if (device.isOn) {
                   this.dataManager.updateDevice(action.deviceId, { isOn: false });
               }
           }
       }
   }

   startPeriodicChecks() {
       setInterval(() => {
           this.updateDeviceTemperatures();
       }, 5000);

       setInterval(() => {
           this.checkAllRules();
       }, 10000);
   }

   updateDeviceTemperatures() {
       const devices = this.dataManager.getState('devices');
       
       devices.forEach(device => {
           if (device.type === 'water_heater' || device.type === 'towel_dryer') {
               this.simulateTemperatureChange(device);
           }
       });
   }

   simulateTemperatureChange(device) {
       let newTemp = device.currentTemperature;
       let roomTemp = device.currentRoomTemperature || 22;
       
       if (device.isOn && device.isOnline) {
           const heatingRate = device.type === 'water_heater' ? 2 : 1.5;
           const targetTemp = device.targetTemperature;
           
           if (newTemp < targetTemp) {
               newTemp = Math.min(newTemp + (heatingRate / 12), targetTemp);
           }

           if (device.type === 'towel_dryer' && device.mode === 'room_heating') {
               const targetRoomTemp = device.targetRoomTemperature || 24;
               if (roomTemp < targetRoomTemp) {
                   roomTemp = Math.min(roomTemp + 0.2, targetRoomTemp);
               }
           }
       } else {
           const coolingRate = 0.5;
           const ambientTemp = 22;
           
           if (newTemp > ambientTemp) {
               newTemp = Math.max(newTemp - (coolingRate / 12), ambientTemp);
           }

           if (device.type === 'towel_dryer') {
               if (roomTemp > 22) {
                   roomTemp = Math.max(roomTemp - 0.1, 22);
               }
           }
       }

       const updates = {
           currentTemperature: Math.round(newTemp * 10) / 10,
           lastUpdated: new Date().toISOString()
       };

       if (device.type === 'towel_dryer') {
           updates.currentRoomTemperature = Math.round(roomTemp * 10) / 10;
       }

       this.dataManager.updateDevice(device.id, updates);
   }

   checkAllRules() {
       this.registeredRules.forEach(rule => {
           if (rule.trigger.type === 'device_temperature_reached') {
               this.processTemperatureCheck(rule);
           }
       });
   }

   learnUsagePatterns() {
       const devices = this.dataManager.getState('devices');
       const analytics = this.dataManager.getState('analytics');
       
       devices.forEach(device => {
           if (device.type === 'water_heater' || device.type === 'towel_dryer') {
               const usagePattern = this.analyzeDeviceUsagePattern(device.id, analytics);
               
               if (usagePattern.confidence > 0.7) {
                   this.suggestOptimizations(device, usagePattern);
               }
           }
       });
   }

   analyzeDeviceUsagePattern(deviceId, analytics) {
       const last7Days = Object.keys(analytics).slice(-7);
       const hourlyUsage = Array(24).fill(0);
       let totalUsage = 0;
       
       last7Days.forEach(day => {
           const dayData = analytics[day];
           if (dayData.deviceActions[deviceId]) {
               dayData.deviceActions[deviceId].forEach(action => {
                   const hour = new Date(action.timestamp).getHours();
                   hourlyUsage[hour]++;
                   totalUsage++;
               });
           }
       });
       
       const peakHours = hourlyUsage
           .map((usage, hour) => ({ hour, usage }))
           .filter(item => item.usage > 0)
           .sort((a, b) => b.usage - a.usage)
           .slice(0, 3);
       
       return {
           peakHours: peakHours.map(item => item.hour),
           totalUsage,
           confidence: totalUsage > 10 ? Math.min(totalUsage / 50, 1) : 0,
           averageDaily: totalUsage / 7
       };
   }

   suggestOptimizations(device, pattern) {
       const suggestions = [];
       
       if (pattern.peakHours.length > 0) {
           suggestions.push({
               type: 'schedule_optimization',
               title: `Tối ưu lịch trình cho ${device.name}`,
               message: `Phát hiện bạn thường sử dụng vào ${pattern.peakHours.join(', ')}h. Tạo lịch trình tự động?`,
               action: 'create_smart_schedule',
               deviceId: device.id,
               data: { peakHours: pattern.peakHours }
           });
       }
       
       if (pattern.averageDaily > 5) {
           suggestions.push({
               type: 'energy_optimization',
               title: `Tiết kiệm năng lượng ${device.name}`,
               message: `Thiết bị được sử dụng ${pattern.averageDaily.toFixed(1)} lần/ngày. Khuyến nghị các cài đặt tiết kiệm năng lượng.`,
               action: 'optimize_energy_settings',
               deviceId: device.id
           });
       }
       
       suggestions.forEach(suggestion => {
           this.dataManager.addNotification({
               type: 'info',
               title: suggestion.title,
               message: suggestion.message,
               icon: '💡'
           });
       });
   }

   executeAdvancedTemperatureControl(action) {
       const device = this.dataManager.getState('devices').find(d => d.id === action.deviceId);
       if (!device) return;

       switch (device.type) {
           case 'towel_dryer':
               this.executeTowelDryerLogic(device, action);
               break;
           case 'water_heater':
               this.executeWaterHeaterLogic(device, action);
               break;
       }
   }

   executeTowelDryerLogic(device, action) {
       const currentTemp = device.currentRoomTemperature || device.currentTemperature;
       const targetTemp = device.targetRoomTemperature || device.targetTemperature;
       
       if (device.mode === 'room_heating') {
           const tolerance = 0.5;
           
           if (currentTemp < (targetTemp - tolerance)) {
               if (!device.isOn) {
                   this.dataManager.updateDevice(device.id, { 
                       isOn: true,
                       lastAutoAction: 'auto_turn_on_heating'
                   });
                   
                   this.dataManager.addSmartNotification('automation_executed', device.id, {
                       message: `Tự động bật sưởi phòng (${currentTemp}°C < ${targetTemp}°C)`
                   });
               }
           } else if (currentTemp > (targetTemp + tolerance)) {
               if (device.isOn) {
                   this.dataManager.updateDevice(device.id, { 
                       isOn: false,
                       lastAutoAction: 'auto_turn_off_heating'
                   });
                   
                   this.dataManager.addSmartNotification('automation_executed', device.id, {
                       message: `Tự động tắt sưởi phòng (${currentTemp}°C > ${targetTemp}°C)`
                   });
               }
           }
       } else if (device.mode === 'towel_dry') {
           if (device.isOn && device.currentTemperature >= device.targetTemperature) {
               this.dataManager.updateDevice(device.id, { 
                   isOn: false,
                   lastAutoAction: 'auto_turn_off_dry_complete'
               });
               
               this.dataManager.addSmartNotification('temperature_reached', device.id);
           }
       }
   }

   executeWaterHeaterLogic(device, action) {
       const currentHour = new Date().getHours();
       
       if (currentHour >= 22 || currentHour <= 6) {
           if (device.mode !== 'eco' && device.isOn) {
               this.dataManager.updateDevice(device.id, { 
                   mode: 'eco',
                   targetTemperature: Math.min(device.targetTemperature, 55),
                   lastAutoAction: 'auto_eco_mode_night'
               });
               
               this.dataManager.addSmartNotification('automation_executed', device.id, {
                   message: 'Tự động chuyển sang chế độ tiết kiệm điện ban đêm'
               });
           }
       } else if (currentHour >= 6 && currentHour <= 8) {
           if (device.mode === 'eco') {
               this.dataManager.updateDevice(device.id, { 
                   mode: 'auto',
                   targetTemperature: Math.max(device.targetTemperature, 60),
                   lastAutoAction: 'auto_morning_boost'
               });
               
               this.dataManager.addSmartNotification('automation_executed', device.id, {
                   message: 'Tự động chuẩn bị nước nóng buổi sáng'
               });
           }
       }
   }
}

// Create global instance
window.dataManager = new DataManager();