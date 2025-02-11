class AppointmentsService {
    constructor() {
        this.db = firebase.firestore();
    }

    // Randevuları yükle
    async loadAppointments() {
        try {
            const tableBody = document.getElementById('appointmentsTableBody');
            const status = document.getElementById('statusFilter').value;
            const date = document.getElementById('dateFilter').value;
            const searchQuery = document.getElementById('searchInput').value.toLowerCase();

            // Sorguyu oluştur
            let query = this.db.collection('appointments')
                .orderBy('date', 'desc')
                .orderBy('time', 'desc');

            // Durum filtresi
            if (status !== 'all') {
                query = query.where('status', '==', status);
            }

            // Tarih filtresi
            if (date) {
                query = query.where('date', '==', date);
            }

            // Randevuları al
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-cell">
                            <i class="fas fa-info-circle"></i>
                            <span>Randevu bulunamadı</span>
                        </td>
                    </tr>
                `;
                return;
            }

            // Randevuları işle
            const appointments = [];
            for (const doc of snapshot.docs) {
                const appointment = doc.data();
                const customer = await this.getCustomerInfo(appointment.customerId);
                const barber = await this.getBarberInfo(appointment.barberId);
                
                if (searchQuery) {
                    const searchText = `
                        ${customer?.name || ''}
                        ${customer?.phone || ''}
                        ${barber?.businessName || ''}
                        ${barber?.phone || ''}
                    `.toLowerCase();
                    
                    if (!searchText.includes(searchQuery)) continue;
                }
                
                appointments.push({
                    id: doc.id,
                    customer,
                    barber,
                    ...appointment
                });
            }

            // Tabloyu oluştur
            const html = appointments.map(appointment => `
                <tr>
                    <td>
                        <div class="customer-info">
                            <span class="name">${appointment.customer?.name || 'Silinmiş Müşteri'}</span>
                            <span class="phone">${appointment.customer?.phone || '-'}</span>
                        </div>
                    </td>
                    <td>
                        <div class="barber-info">
                            <span class="name">${appointment.barber?.businessName || 'Silinmiş Berber'}</span>
                            <span class="phone">${appointment.barber?.phone || '-'}</span>
                        </div>
                    </td>
                    <td>
                        <div class="datetime-info">
                            <span class="date">${this.formatDate(appointment.date)}</span>
                            <span class="time">${appointment.time}</span>
                        </div>
                    </td>
                    <td>
                        <div class="services-info">
                            ${this.formatServices(appointment.services)}
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${appointment.status}">
                            ${this.getStatusText(appointment.status)}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="action-btn view" onclick="window.appointmentsService.viewAppointment('${appointment.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="window.appointmentsService.editAppointment('${appointment.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="window.appointmentsService.deleteAppointment('${appointment.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            tableBody.innerHTML = html;

        } catch (error) {
            console.error('Randevular yüklenirken hata:', error);
            throw error;
        }
    }

    // Müşteri bilgilerini al
    async getCustomerInfo(customerId) {
        try {
            const doc = await this.db.collection('customers').doc(customerId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Müşteri bilgileri alınırken hata:', error);
            return null;
        }
    }

    // Berber bilgilerini al
    async getBarberInfo(barberId) {
        try {
            const doc = await this.db.collection('barbers').doc(barberId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Berber bilgileri alınırken hata:', error);
            return null;
        }
    }

    // Randevu görüntüle
    async viewAppointment(appointmentId) {
        try {
            const appointmentDoc = await this.db.collection('appointments').doc(appointmentId).get();
            
            if (!appointmentDoc.exists) {
                showToast('Randevu bulunamadı', 'error');
                return;
            }

            const appointmentData = appointmentDoc.data();

            // Müşteri bilgilerini al
            const customerDoc = await this.db.collection('customers').doc(appointmentData.customerId).get();
            const customerData = customerDoc.exists ? customerDoc.data() : null;

            // Berber bilgilerini al
            const barberDoc = await this.db.collection('barbers').doc(appointmentData.barberId).get();
            const barberData = barberDoc.exists ? barberDoc.data() : null;

            // Modal alanlarını doldur
            document.getElementById('viewCustomerName').textContent = customerData?.name || '-';
            document.getElementById('viewCustomerPhone').textContent = customerData?.phone || '-';
            document.getElementById('viewBarberName').textContent = barberData?.businessName || '-';
            document.getElementById('viewBarberPhone').textContent = barberData?.phone || '-';
            document.getElementById('viewBarberAbout').textContent = barberData?.about || '-';
            document.getElementById('viewDateTime').textContent = `${appointmentData.date} ${appointmentData.time}`;
            
            // Hizmetleri listele
            const servicesList = document.getElementById('viewServices');
            if (appointmentData.services && appointmentData.services.length > 0) {
                servicesList.innerHTML = appointmentData.services
                    .map(service => `<div class="service-item">${service.name} - ${service.price}₺</div>`)
                    .join('');
            } else {
                servicesList.innerHTML = '-';
            }

            document.getElementById('viewTotalPrice').textContent = `${appointmentData.totalPrice || 0}₺`;
            document.getElementById('viewStatus').textContent = this.getStatusText(appointmentData.status);
            document.getElementById('viewNote').textContent = appointmentData.note || '-';
            document.getElementById('viewAppointmentNote').textContent = appointmentData.appointmentNote || '-';
            document.getElementById('viewCreatedAt').textContent = this.formatDate(appointmentData.createdAt);

            // Modalı göster
            document.getElementById('viewAppointmentModal').style.display = 'block';
            
        } catch (error) {
            console.error('Randevu görüntülenirken hata:', error);
            showToast('Randevu görüntülenirken bir hata oluştu', 'error');
        }
    }

    // Randevu düzenleme modalını aç
    async editAppointment(appointmentId) {
        try {
            const appointmentDoc = await this.db.collection('appointments').doc(appointmentId).get();
            
            if (!appointmentDoc.exists) {
                showToast('Randevu bulunamadı', 'error');
                return;
            }

            const appointmentData = appointmentDoc.data();

            // Form alanlarını doldur
            document.getElementById('editAppointmentId').value = appointmentId;
            document.getElementById('editStatus').value = appointmentData.status;
            document.getElementById('editDate').value = appointmentData.date;
            document.getElementById('editTime').value = appointmentData.time;
            document.getElementById('editNote').value = appointmentData.note || '';

            // Modalı göster
            document.getElementById('editAppointmentModal').style.display = 'block';
            
        } catch (error) {
            console.error('Randevu düzenlenirken hata:', error);
            showToast('Randevu düzenlenirken bir hata oluştu', 'error');
        }
    }

    // Randevu güncelle
    async updateAppointment(event) {
        event.preventDefault();

        const appointmentId = document.getElementById('editAppointmentId').value;

        try {
            // Form verilerini al
            const updateData = {
                status: document.getElementById('editStatus').value,
                date: document.getElementById('editDate').value,
                time: document.getElementById('editTime').value,
                note: document.getElementById('editNote').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Firestore'u güncelle
            await this.db.collection('appointments').doc(appointmentId).update(updateData);

            // Modalı kapat
            document.getElementById('editAppointmentModal').style.display = 'none';

            // Tabloyu yenile
            await this.loadAppointments();

            showToast('Randevu başarıyla güncellendi', 'success');
            
        } catch (error) {
            console.error('Randevu güncellenirken hata:', error);
            showToast('Randevu güncellenirken bir hata oluştu', 'error');
        }
    }

    // Randevu sil
    async deleteAppointment(appointmentId) {
        if (!confirm('Bu randevuyu silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            await this.db.collection('appointments').doc(appointmentId).delete();
            showToast('Randevu başarıyla silindi', 'success');
            await this.loadAppointments();
        } catch (error) {
            console.error('Randevu silinirken hata:', error);
            showToast('Randevu silinirken bir hata oluştu', 'error');
        }
    }

    // Tarih formatla
    formatDate(timestamp) {
        if (!timestamp) return '-';
        
        try {
            const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
            
            return date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Tarih formatlanırken hata:', error);
            return '-';
        }
    }

    // Hizmetleri formatla
    formatServices(services) {
        if (!services || services.length === 0) return '-';
        
        return services.map(service => `
            <span class="service-item">
                ${service.name}
                <span class="price">${service.price}₺</span>
            </span>
        `).join('');
    }

    // Durum metnini al
    getStatusText(status) {
        const statusMap = {
            'pending': 'Bekliyor',
            'confirmed': 'Onaylandı',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal Edildi'
        };
        return statusMap[status] || status;
    }
}

// Service'i global olarak kullanılabilir yap
window.appointmentsService = new AppointmentsService();

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');

    // Arama ve filtreleme
    searchInput?.addEventListener('input', debounce(() => {
        window.appointmentsService.loadAppointments();
    }, 500));

    statusFilter?.addEventListener('change', () => {
        window.appointmentsService.loadAppointments();
    });

    dateFilter?.addEventListener('change', () => {
        window.appointmentsService.loadAppointments();
    });

    // Form submit işlemi
    const editForm = document.getElementById('editAppointmentForm');
    editForm?.addEventListener('submit', async (e) => {
        await window.appointmentsService.updateAppointment(e);
    });

    // Modal kapatma işlemi
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }
});

// Debounce fonksiyonu
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 