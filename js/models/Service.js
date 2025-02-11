/**
 * Hizmet sınıfı
 */
export class Service {
    constructor(data = {}) {
        this.id = data.id || null;
        this.barberId = data.barberId || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.price = data.price || 0;
        this.duration = data.duration || 30;
        this.category = data.category || 'general';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    toFirestore() {
        return {
            barberId: this.barberId,
            name: this.name,
            description: this.description,
            price: this.price,
            duration: this.duration,
            category: this.category,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: new Date()
        };
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Service({
            id: doc.id,
            ...data
        });
    }

    getFormattedPrice() {
        return `₺${this.price.toLocaleString('tr-TR')}`;
    }

    getFormattedDuration() {
        return `${this.duration} dk`;
    }

    clone() {
        return new Service({
            ...this,
            id: null,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
} 