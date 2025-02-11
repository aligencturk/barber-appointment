/**
 * Favori berber sınıfı
 */
export class Favorite {
    constructor(data = {}) {
        this.id = data.id || null;
        this.customerId = data.customerId || null;
        this.barberId = data.barberId || null;
        this.barber = data.barber || null;
        this.addedAt = data.addedAt || new Date();
        this.visitCount = data.visitCount || 0;
        this.lastVisitAt = data.lastVisitAt || null;
    }

    toFirestore() {
        return {
            customerId: this.customerId,
            barberId: this.barberId,
            addedAt: this.addedAt,
            visitCount: this.visitCount,
            lastVisitAt: this.lastVisitAt
        };
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Favorite({
            id: doc.id,
            ...data
        });
    }

    incrementVisitCount() {
        this.visitCount++;
        this.lastVisitAt = new Date();
    }

    getTimeAgo() {
        const now = new Date();
        const diffInSeconds = Math.floor((now - this.addedAt.toDate()) / 1000);
        
        const intervals = {
            yıl: 31536000,
            ay: 2592000,
            hafta: 604800,
            gün: 86400,
            saat: 3600,
            dakika: 60
        };

        for (const [unit, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `${interval} ${unit} önce`;
            }
        }

        return 'Az önce';
    }
} 