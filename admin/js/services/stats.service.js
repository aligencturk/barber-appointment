class StatsService {
    constructor() {
        this.db = firebase.firestore();
    }

    // İstatistikleri yükle
    async loadStats() {
        try {
            // Toplam kullanıcı sayısı
            const totalUsers = await this.getTotalUsers();
            document.getElementById('totalUsers').textContent = totalUsers;

            // Toplam berber sayısı
            const totalBarbers = await this.getTotalBarbers();
            document.getElementById('totalBarbers').textContent = totalBarbers;

            // Toplam randevu sayısı
            const totalAppointments = await this.getTotalAppointments();
            document.getElementById('totalAppointments').textContent = totalAppointments;

            // Bekleyen randevu sayısı
            const pendingAppointments = await this.getPendingAppointments();
            document.getElementById('pendingAppointments').textContent = pendingAppointments;

        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
            throw error;
        }
    }

    // Toplam kullanıcı sayısı
    async getTotalUsers() {
        try {
            const customersSnapshot = await this.db.collection('customers').get();
            return customersSnapshot.size;
        } catch (error) {
            console.error('Kullanıcı sayısı alınırken hata:', error);
            return 0;
        }
    }

    // Toplam berber sayısı
    async getTotalBarbers() {
        try {
            const barbersSnapshot = await this.db.collection('barbers').get();
            return barbersSnapshot.size;
        } catch (error) {
            console.error('Berber sayısı alınırken hata:', error);
            return 0;
        }
    }

    // Toplam randevu sayısı
    async getTotalAppointments() {
        try {
            const appointmentsSnapshot = await this.db.collection('appointments').get();
            return appointmentsSnapshot.size;
        } catch (error) {
            console.error('Randevu sayısı alınırken hata:', error);
            return 0;
        }
    }

    // Bekleyen randevu sayısı
    async getPendingAppointments() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const pendingSnapshot = await this.db.collection('appointments')
                .where('status', '==', 'pending')
                .where('date', '>=', today.toISOString().split('T')[0])
                .get();

            return pendingSnapshot.size;
        } catch (error) {
            console.error('Bekleyen randevu sayısı alınırken hata:', error);
            return 0;
        }
    }

    // Son aktiviteleri yükle
    async loadRecentActivity() {
        try {
            const activityList = document.getElementById('activityList');
            
            // Son 10 randevuyu al
            const appointmentsSnapshot = await this.db.collection('appointments')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            if (appointmentsSnapshot.empty) {
                activityList.innerHTML = '<div class="empty-state">Henüz aktivite bulunmuyor</div>';
                return;
            }

            let activitiesHTML = '';
            for (const doc of appointmentsSnapshot.docs) {
                const appointment = doc.data();
                const customer = await this.getCustomerInfo(appointment.customerId);
                const barber = await this.getBarberInfo(appointment.barberId);
                
                activitiesHTML += `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                        <div class="activity-content">
                            <p class="activity-text">
                                <strong>${customer?.name || 'Silinmiş Müşteri'}</strong>
                                <span>${barber?.businessName || 'Silinmiş Berber'}</span>
                                için randevu oluşturdu
                            </p>
                            <span class="activity-time">
                                ${this.formatDate(appointment.createdAt)}
                            </span>
                        </div>
                    </div>
                `;
            }

            activityList.innerHTML = activitiesHTML;

        } catch (error) {
            console.error('Aktiviteler yüklenirken hata:', error);
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '<div class="error-state">Aktiviteler yüklenirken bir hata oluştu</div>';
        }
    }

    // Müşteri bilgilerini al
    async getCustomerInfo(customerId) {
        try {
            const customerDoc = await this.db.collection('customers').doc(customerId).get();
            return customerDoc.exists ? customerDoc.data() : null;
        } catch (error) {
            console.error('Müşteri bilgileri alınırken hata:', error);
            return null;
        }
    }

    // Berber bilgilerini al
    async getBarberInfo(barberId) {
        try {
            const barberDoc = await this.db.collection('barbers').doc(barberId).get();
            return barberDoc.exists ? barberDoc.data() : null;
        } catch (error) {
            console.error('Berber bilgileri alınırken hata:', error);
            return null;
        }
    }

    // Tarih formatla
    formatDate(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now - date;
        
        // 1 saatten az
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} dakika önce`;
        }
        
        // 1 günden az
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} saat önce`;
        }
        
        // 1 haftadan az
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} gün önce`;
        }
        
        // Normal tarih formatı
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

// Service'i global olarak kullanılabilir yap
window.statsService = new StatsService();

// loadStats fonksiyonunu global yap
window.loadStats = async () => {
    await window.statsService.loadStats();
};

// loadRecentActivity fonksiyonunu global yap
window.loadRecentActivity = async () => {
    await window.statsService.loadRecentActivity();
}; 