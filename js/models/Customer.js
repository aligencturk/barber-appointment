import { User } from './User.js';

/**
 * Müşteri sınıfı
 */
export class Customer extends User {
    constructor(data = {}) {
        super(data);
        this.fullName = data.fullName || '';
        this.phone = data.phone || '';
        this.avatarUrl = data.avatarUrl || null;
        this.favoriteBarbers = data.favoriteBarbers || [];
        this.preferences = data.preferences || {
            notifications: {
                email: true,
                sms: true,
                push: true
            },
            language: 'tr',
            theme: 'light'
        };
        this.lastLoginAt = data.lastLoginAt || null;
    }

    toFirestore() {
        return {
            ...super.toFirestore(),
            fullName: this.fullName,
            phone: this.phone,
            avatarUrl: this.avatarUrl,
            favoriteBarbers: this.favoriteBarbers,
            preferences: this.preferences,
            lastLoginAt: this.lastLoginAt
        };
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Customer({
            id: doc.id,
            ...data
        });
    }

    updateNotificationPreferences(type, value) {
        this.preferences.notifications[type] = value;
    }

    updateLanguage(language) {
        this.preferences.language = language;
    }

    updateTheme(theme) {
        this.preferences.theme = theme;
    }

    updateLastLogin() {
        this.lastLoginAt = new Date();
    }
} 