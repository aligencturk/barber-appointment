import { User } from './User.js';

/**
 * Berber sınıfı
 */
export class Barber extends User {
    constructor(data = {}) {
        super(data);
        this.businessName = data.businessName || '';
        this.ownerName = data.ownerName || '';
        this.phone = data.phone || '';
        this.address = data.address || '';
        this.avatarUrl = data.avatarUrl || null;
        this.workingHours = data.workingHours || { open: '09:00', close: '19:00' };
        this.services = data.services || [];
        this.rating = data.rating || 0;
        this.reviewCount = data.reviewCount || 0;
        this.status = data.status || 'pending';
        this.location = data.location || null;
        this.gallery = data.gallery || [];
        this.experience = data.experience || 0;
        this.specialties = data.specialties || [];
        this.certificates = data.certificates || [];
    }

    toFirestore() {
        return {
            ...super.toFirestore(),
            businessName: this.businessName,
            ownerName: this.ownerName,
            phone: this.phone,
            address: this.address,
            avatarUrl: this.avatarUrl,
            workingHours: this.workingHours,
            services: this.services,
            rating: this.rating,
            reviewCount: this.reviewCount,
            status: this.status,
            location: this.location,
            gallery: this.gallery,
            experience: this.experience,
            specialties: this.specialties,
            certificates: this.certificates
        };
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Barber({
            id: doc.id,
            ...data
        });
    }

    isOpen() {
        const now = new Date();
        const currentTime = now.getHours() + ':' + now.getMinutes();
        return currentTime >= this.workingHours.open && currentTime < this.workingHours.close;
    }

    calculateTotalDuration(selectedServices) {
        return selectedServices.reduce((total, serviceId) => {
            const service = this.services.find(s => s.id === serviceId);
            return total + (service ? service.duration : 0);
        }, 0);
    }

    calculateTotalPrice(selectedServices) {
        return selectedServices.reduce((total, serviceId) => {
            const service = this.services.find(s => s.id === serviceId);
            return total + (service ? service.price : 0);
        }, 0);
    }
} 