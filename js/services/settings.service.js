// Ayarlar servisi
class SettingsService {
    constructor() {
        this.initialized = false;
        this.offlineSettings = {
            maintenanceMode: false,
            maintenanceMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.'
        };
        this.retryAttempts = 5;
        this.retryDelay = 3000;
        this.settingsRef = 'general'; // Doküman referansını sabitleyelim
        this.initialize();
    }

    async initialize() {
        try {
            await window.checkFirebaseLoaded();
            this.initialized = true;
            console.log('Settings servisi başarıyla başlatıldı');
            
            // Varsayılan ayarları kontrol et
            await this.loadSettingsWithRetry();
        } catch (error) {
            console.error('Settings servisi başlatılamadı:', error);
            return this.offlineSettings;
        }
    }

    async loadSettingsWithRetry(attempt = 1) {
        try {
            if (!window.db) {
                throw new Error('Firebase DB henüz hazır değil');
            }

            const settings = await this.loadSettings();
            if (!settings && attempt === 1) {
                await this.createDefaultSettings();
                return this.loadSettings();
            }
            return settings;
        } catch (error) {
            console.error(`Ayarlar yükleme hatası (${attempt}/${this.retryAttempts}):`, error);
            
            if (attempt < this.retryAttempts) {
                console.log(`Ayarlar yeniden deneniyor (${attempt}/${this.retryAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.loadSettingsWithRetry(attempt + 1);
            } else {
                console.warn('Ayarlar yüklenemedi, offline mod kullanılıyor');
                return this.offlineSettings;
            }
        }
    }

    async loadSettings() {
        try {
            if (!window.db) {
                throw new Error('Firebase DB bağlantısı yok');
            }

            const doc = await window.db.collection('settings').doc(this.settingsRef).get();
            
            if (!doc.exists) {
                console.log('Ayarlar bulunamadı, varsayılan ayarlar kullanılacak');
                return null;
            }

            return doc.data();
        } catch (error) {
            console.error('Ayarlar yükleme hatası:', error);
            throw error;
        }
    }

    async createDefaultSettings() {
        try {
            const defaultSettings = {
                maintenanceMode: false,
                maintenanceMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            await window.db.collection('settings').doc(this.settingsRef).set(defaultSettings);
            console.log('Varsayılan ayarlar oluşturuldu');
            return defaultSettings;
        } catch (error) {
            console.error('Varsayılan ayarlar oluşturulurken hata:', error);
            return this.offlineSettings;
        }
    }

    async updateSettings(settings) {
        try {
            if (!window.db) {
                throw new Error('Firebase DB bağlantısı yok');
            }

            const updatedSettings = {
                ...settings,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            await window.db.collection('settings').doc(this.settingsRef).set(updatedSettings, { merge: true });
            return true;
        } catch (error) {
            console.error('Ayarlar güncellenirken hata:', error);
            throw error;
        }
    }

    async checkMaintenanceMode() {
        try {
            const settings = await this.loadSettingsWithRetry();
            return settings?.maintenanceMode || false;
        } catch (error) {
            console.error('Bakım modu kontrolü sırasında hata:', error);
            return this.offlineSettings.maintenanceMode;
        }
    }

    async toggleMaintenanceMode(enabled, message = '') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            if (!window.db) {
                throw new Error('Firestore servisi henüz yüklenmedi');
            }

            await this.updateSettings({
                maintenanceMode: enabled,
                maintenanceMessage: message || this.offlineSettings.maintenanceMessage
            });

            return true;
        } catch (error) {
            console.error('Bakım modu değiştirilirken hata:', error);
            throw error;
        }
    }
}

// Service'i global olarak kullanılabilir yap
window.settingsService = new SettingsService(); 