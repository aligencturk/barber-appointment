// Aktivite servisi
const activityService = {
    // Yeni aktivite ekle
    async addActivity(type, message) {
        try {
            const activity = {
                type,
                message,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: window.auth.currentUser?.uid || null,
                userEmail: window.auth.currentUser?.email || null
            };

            await window.db.collection('activities').add(activity);
            return true;
        } catch (error) {
            console.error('Aktivite eklenirken hata:', error);
            return false;
        }
    },

    // Son aktiviteleri getir
    async getRecentActivities(limit = 10) {
        try {
            const snapshot = await window.db.collection('activities')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Aktiviteler alınırken hata:', error);
            return [];
        }
    },

    // Aktiviteleri temizle (admin için)
    async clearActivities() {
        try {
            const batch = window.db.batch();
            const snapshot = await window.db.collection('activities').get();
            
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error('Aktiviteler temizlenirken hata:', error);
            return false;
        }
    }
};

// Global olarak tanımla
window.activityService = activityService; 