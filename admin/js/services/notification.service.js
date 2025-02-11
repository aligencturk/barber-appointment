// Bildirim servisi
const notificationService = {
    // Bildirim gönder
    async sendNotification(target, title, message) {
        try {
            // Admin kontrolü
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || currentUser.email !== 'admin@berberotomasyon.com') {
                throw new Error('Bu işlem için yetkiniz yok');
            }

            const notification = {
                title,
                message,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                sender: {
                    id: currentUser.uid,
                    email: currentUser.email,
                    type: 'admin'
                },
                target,
                status: 'unread'
            };

            // Bildirim koleksiyonuna ekle
            const notificationRef = await window.db.collection('notifications').add(notification);

            // Aktivite kaydı ekle
            await window.activityService?.addActivity('notification', `${target === 'all' ? 'Herkese' : target === 'barbers' ? 'Berberlere' : 'Müşterilere'} bildirim gönderildi: ${title}`);

            return notificationRef.id;
        } catch (error) {
            console.error('Bildirim gönderilirken hata:', error);
            throw error;
        }
    },

    // Bildirimleri getir (berber veya müşteri için)
    async getNotifications(userType, userId, limit = 20) {
        try {
            const notifications = await window.db.collection('notifications')
                .where('target', 'in', [userType, 'all'])
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return notifications.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Bildirimler alınırken hata:', error);
            return [];
        }
    },

    // Bildirimi okundu olarak işaretle
    async markAsRead(notificationId) {
        try {
            await window.db.collection('notifications')
                .doc(notificationId)
                .update({
                    status: 'read',
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            return true;
        } catch (error) {
            console.error('Bildirim durumu güncellenirken hata:', error);
            return false;
        }
    },

    // Okunmamış bildirim sayısını getir
    async getUnreadCount(userType) {
        try {
            const notifications = await window.db.collection('notifications')
                .where('target', 'in', [userType, 'all'])
                .where('status', '==', 'unread')
                .get();

            return notifications.size;
        } catch (error) {
            console.error('Okunmamış bildirim sayısı alınırken hata:', error);
            return 0;
        }
    }
};

// Global olarak tanımla
window.notificationService = notificationService; 