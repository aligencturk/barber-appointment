/**
 * Temel kullanıcı sınıfı
 */
export class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.email = data.email || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    toFirestore() {
        return {
            email: this.email,
            createdAt: this.createdAt,
            updatedAt: new Date()
        };
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new User({
            id: doc.id,
            ...data
        });
    }
} 