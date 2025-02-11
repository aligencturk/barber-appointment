class SettingsService {
    constructor() {
        this.db = window.db;
        this.auth = window.auth;
        this.loadSettings();
    }

    // Ayarları yükle
    async loadSettings() {
        try {
            const settingsDoc = await this.db.collection('settings').doc('general').get();
            if (!settingsDoc.exists) {
                // Varsayılan ayarları oluştur
                await this.db.collection('settings').doc('general').set({
                    maintenanceMode: false,
                    maintenanceMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
                    allowedEmails: ['admin@berberotomasyon.com']
                });
            }
        } catch (error) {
            console.error('Ayarlar yüklenirken hata:', error);
        }
    }

    // Bakım modunu değiştir
    async toggleMaintenanceMode(enabled, message = null) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser || currentUser.email !== 'admin@berberotomasyon.com') {
                throw new Error('Bu işlem için yetkiniz yok');
            }

            await this.db.collection('settings').doc('general').update({
                maintenanceMode: enabled,
                maintenanceMessage: message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error('Bakım modu değiştirilirken hata:', error);
            throw error;
        }
    }

    // Bakım modu durumunu kontrol et
    async checkMaintenanceMode() {
        try {
            const settingsDoc = await this.db.collection('settings').doc('general').get();
            if (!settingsDoc.exists) return false;

            const settings = settingsDoc.data();
            const currentUser = this.auth.currentUser;

            // Admin her zaman girebilir
            if (currentUser && currentUser.email === 'admin@berberotomasyon.com') {
                return false;
            }

            return {
                enabled: settings.maintenanceMode,
                message: settings.maintenanceMessage
            };
        } catch (error) {
            console.error('Bakım modu kontrolü sırasında hata:', error);
            return false;
        }
    }

    // Ayarları getir
    async getSettings() {
        try {
            const settingsDoc = await this.db.collection('settings').doc('general').get();
            if (!settingsDoc.exists) return null;
            return settingsDoc.data();
        } catch (error) {
            console.error('Ayarlar alınırken hata:', error);
            throw error;
        }
    }
}

// Service'i global olarak kullanılabilir yap
window.settingsService = new SettingsService(); 