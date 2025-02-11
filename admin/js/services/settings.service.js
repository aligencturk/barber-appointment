class SettingsService {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
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
            const currentUser = firebase.auth().currentUser;
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
            const currentUser = firebase.auth().currentUser;

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

    // Şifreyi güncelle
    async updatePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validasyon
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Lütfen tüm alanları doldurun', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Yeni şifreler eşleşmiyor', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Yeni şifre en az 6 karakter olmalıdır', 'error');
            return;
        }

        try {
            // Mevcut kullanıcıyı al
            const user = this.auth.currentUser;
            if (!user) {
                showToast('Oturum süresi dolmuş', 'error');
                window.location.href = 'login.html';
                return;
            }

            // Kullanıcı kimlik bilgilerini yeniden doğrula
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            // Yeniden kimlik doğrulama
            await user.reauthenticateWithCredential(credential);

            // Şifreyi güncelle
            await user.updatePassword(newPassword);

            // Formu temizle
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            showToast('Şifre başarıyla güncellendi', 'success');

        } catch (error) {
            console.error('Şifre güncellenirken hata:', error);
            
            let errorMessage = 'Şifre güncellenirken bir hata oluştu';
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Mevcut şifre yanlış';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin';
                    break;
            }
            
            showToast(errorMessage, 'error');
        }
    }

    // Sistem ayarlarını güncelle
    async updateSystemSettings() {
        const maintenanceMode = document.getElementById('maintenanceMode').checked;
        const maxAppointmentsPerDay = parseInt(document.getElementById('maxAppointmentsPerDay').value);
        const appointmentDuration = parseInt(document.getElementById('appointmentDuration').value);

        // Validasyon
        if (!maxAppointmentsPerDay || !appointmentDuration) {
            showToast('Lütfen tüm alanları doldurun', 'error');
            return;
        }

        if (maxAppointmentsPerDay < 1 || maxAppointmentsPerDay > 100) {
            showToast('Günlük maksimum randevu sayısı 1-100 arasında olmalıdır', 'error');
            return;
        }

        if (appointmentDuration < 15 || appointmentDuration > 180) {
            showToast('Randevu süresi 15-180 dakika arasında olmalıdır', 'error');
            return;
        }

        try {
            await this.db.collection('settings').doc('system').set({
                maintenanceMode,
                maxAppointmentsPerDay,
                appointmentDuration,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Ayarlar başarıyla güncellendi', 'success');

        } catch (error) {
            console.error('Ayarlar güncellenirken hata:', error);
            showToast('Ayarlar güncellenirken bir hata oluştu', 'error');
        }
    }
}

// Service'i global olarak kullanılabilir yap
window.settingsService = new SettingsService(); 