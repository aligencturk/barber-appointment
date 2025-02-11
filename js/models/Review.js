/**
 * Değerlendirme sınıfı
 */
export class Review {
    constructor(data = {}) {
        this.id = data.id || null;
        this.barberId = data.barberId || null;
        this.customerId = data.customerId || null;
        this.appointmentId = data.appointmentId || null;
        this.rating = data.rating || 0;
        this.comment = data.comment || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || null;
    }

    static fromFirestore(doc) {
        if (!doc.exists) return null;
        const data = doc.data();
        return new Review({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        });
    }

    toFirestore() {
        return {
            barberId: this.barberId,
            customerId: this.customerId,
            appointmentId: this.appointmentId,
            rating: this.rating,
            comment: this.comment,
            createdAt: this.createdAt,
            updatedAt: new Date()
        };
    }

    isValid() {
        return this.rating >= 1 && this.rating <= 5;
    }

    getTimeAgo() {
        const now = new Date();
        const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
        
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