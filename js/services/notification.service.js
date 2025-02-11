// Bildirim servisi
const notificationService = {
    // Kullanıcı tipini belirle
    async getUserType(userId) {
        try {
            // Önce berberler koleksiyonunda kontrol et
            const barberDoc = await window.db.collection('barbers').doc(userId).get();
            if (barberDoc.exists) return 'barbers';

            // Sonra müşteriler koleksiyonunda kontrol et
            const customerDoc = await window.db.collection('customers').doc(userId).get();
            if (customerDoc.exists) return 'customers';

            // Admin kontrolü
            if (firebase.auth().currentUser?.email === 'admin@berberotomasyon.com') {
                return 'admin';
            }

            return null;
        } catch (error) {
            console.error('Kullanıcı tipi belirlenirken hata:', error);
            return null;
        }
    },

    // Bildirim gönder
    async sendNotification(target, title, message) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            const userType = await this.getUserType(currentUser.uid);
            if (userType !== 'admin') {
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

            const notificationRef = await window.db.collection('notifications').add(notification);
            console.log('Bildirim başarıyla gönderildi:', notificationRef.id);

            return notificationRef.id;
        } catch (error) {
            console.error('Bildirim gönderilirken hata:', error);
            throw error;
        }
    },

    // Bildirimleri getir
    async getNotifications(userType, userId, limit = 20) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            const actualUserType = await this.getUserType(currentUser.uid);
            if (!actualUserType) {
                throw new Error('Kullanıcı tipi belirlenemedi');
            }

            console.log('Bildirimler getiriliyor...', {
                requestedType: userType,
                actualType: actualUserType,
                userId: currentUser.uid
            });

            const query = window.db.collection('notifications')
                .where('target', 'in', [actualUserType, 'all'])
                .orderBy('createdAt', 'desc')
                .limit(limit);

            const notifications = await query.get();
            console.log('Bildirimler başarıyla getirildi:', notifications.size);

            return notifications.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Bildirimler alınırken hata:', error);
            throw error;
        }
    },

    // Bildirimi okundu olarak işaretle
    async markAsRead(notificationId) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            const userType = await this.getUserType(currentUser.uid);
            if (!userType) {
                throw new Error('Kullanıcı tipi belirlenemedi');
            }

            await window.db.collection('notifications')
                .doc(notificationId)
                .update({
                    status: 'read',
                    readAt: firebase.firestore.FieldValue.serverTimestamp(),
                    readBy: currentUser.uid
                });

            return true;
        } catch (error) {
            console.error('Bildirim durumu güncellenirken hata:', error);
            throw error;
        }
    },

    // Okunmamış bildirim sayısını getir
    async getUnreadCount(userType) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('Oturum açmanız gerekiyor');
            }

            const actualUserType = await this.getUserType(currentUser.uid);
            if (!actualUserType) {
                throw new Error('Kullanıcı tipi belirlenemedi');
            }

            const query = window.db.collection('notifications')
                .where('target', 'in', [actualUserType, 'all'])
                .where('status', '==', 'unread');

            const notifications = await query.get();
            return notifications.size;
        } catch (error) {
            console.error('Okunmamış bildirim sayısı alınırken hata:', error);
            throw error;
        }
    }
};

// Global olarak tanımla
window.notificationService = notificationService; 