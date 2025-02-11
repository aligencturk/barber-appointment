/**
 * Randevu sınıfı
 */
export class Appointment {
    constructor(data = {}) {
        this.id = data.id || null;
        this.customerId = data.customerId || null;
        this.barberId = data.barberId || null;
        this.date = data.date || new Date();
        this.time = data.time || '';
        this.services = data.services || [];
        this.totalPrice = data.totalPrice || 0;
        this.totalDuration = data.totalDuration || 0;
        this.status = data.status || 'pending';
        this.note = data.note || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.cancelledAt = data.cancelledAt || null;
        this.completedAt = data.completedAt || null;
        this.paymentStatus = data.paymentStatus || 'pending';
        this.paymentMethod = data.paymentMethod || null;
        this.paymentDate = data.paymentDate || null;
        this.refundStatus = data.refundStatus || null;
        this.refundDate = data.refundDate || null;
    }

    toFirestore() {
        return {
            customerId: this.customerId,
            barberId: this.barberId,
            date: this.date,
            time: this.time,
            services: this.services,
            totalPrice: this.totalPrice,
            totalDuration: this.totalDuration,
            status: this.status,
            note: this.note,
            createdAt: this.createdAt,
            updatedAt: new Date(),
            cancelledAt: this.cancelledAt,
            completedAt: this.completedAt,
            paymentStatus: this.paymentStatus,
            paymentMethod: this.paymentMethod,
            paymentDate: this.paymentDate,
            refundStatus: this.refundStatus,
            refundDate: this.refundDate
        };
    }

    static fromFirestore(doc) {
        if (!doc.exists()) return null;
        const data = doc.data();
        return new Appointment({
            id: doc.id,
            ...data
        });
    }

    canCancel() {
        if (this.status === 'cancelled' || this.status === 'completed') {
            return false;
        }
        
        const appointmentDate = new Date(this.date);
        const now = new Date();
        const hoursDifference = (appointmentDate - now) / (1000 * 60 * 60);
        
        return hoursDifference >= 2; // En az 2 saat öncesinden iptal edilebilir
    }

    canReschedule() {
        return this.canCancel(); // Aynı iptal kuralları geçerli
    }

    isPast() {
        const appointmentDate = new Date(this.date);
        return appointmentDate < new Date();
    }

    getStatusText() {
        const statusMap = {
            'pending': 'Onay Bekliyor',
            'confirmed': 'Onaylandı',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal Edildi'
        };
        return statusMap[this.status] || this.status;
    }

    getPaymentStatusText() {
        const paymentStatusMap = {
            'pending': 'Ödeme Bekliyor',
            'completed': 'Ödeme Tamamlandı',
            'failed': 'Ödeme Başarısız'
        };
        return paymentStatusMap[this.paymentStatus] || this.paymentStatus;
    }

    getPaymentMethodText() {
        const paymentMethodMap = {
            'cash': 'Nakit',
            'credit_card': 'Kredi Kartı',
            'online': 'Online Ödeme'
        };
        return paymentMethodMap[this.paymentMethod] || 'Belirlenmedi';
    }

    completePayment(method) {
        this.paymentMethod = method;
        this.paymentStatus = 'completed';
        this.paymentDate = new Date();
    }

    requestRefund() {
        if (this.paymentStatus === 'completed') {
            this.refundStatus = 'requested';
            return true;
        }
        return false;
    }

    approveRefund() {
        if (this.refundStatus === 'requested') {
            this.refundStatus = 'approved';
            return true;
        }
        return false;
    }

    completeRefund() {
        if (this.refundStatus === 'approved') {
            this.refundStatus = 'completed';
            this.refundDate = new Date();
            return true;
        }
        return false;
    }
} 