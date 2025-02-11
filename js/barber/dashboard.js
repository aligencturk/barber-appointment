// Global değişkenler ve state
let selectedView = 'overview';
let services = [];
let workingHours = {};
let isSyncEnabled = false;

// Firebase referansları
const auth = window.auth;
const db = window.db;
const storage = window.storage;

// İstatistikleri yenileme fonksiyonu
window.refreshStats = async function() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        // Bugünkü randevuları getir
        const today = new Date().toISOString().split('T')[0];
        const appointmentsSnapshot = await db.collection('appointments')
            .where('barberId', '==', user.uid)
            .where('date', '==', today)
            .get();

        const todayAppointments = appointmentsSnapshot.size;
        document.getElementById('todayAppointments').textContent = todayAppointments;

        // Toplam müşteri sayısını getir
        const customersSnapshot = await db.collection('appointments')
            .where('barberId', '==', user.uid)
            .get();

        const uniqueCustomers = new Set();
        customersSnapshot.forEach(doc => {
            uniqueCustomers.add(doc.data().customerId);
        });
        document.getElementById('totalCustomers').textContent = uniqueCustomers.size;

        // Ortalama puanı getir
        const barberDoc = await db.collection('barbers').doc(user.uid).get();
        const barberData = barberDoc.data();
        const rating = barberData.rating || 0;
        const reviewCount = barberData.reviewCount || 0;
        const averageRating = reviewCount > 0 ? (rating / reviewCount).toFixed(1) : '0.0';
        document.getElementById('averageRating').textContent = averageRating;

        // Aylık kazancı getir
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const completedAppointments = await db.collection('appointments')
            .where('barberId', '==', user.uid)
            .where('status', 'in', ['completed', 'confirmed'])
            .where('date', '>=', startOfMonth.toISOString().split('T')[0])
            .get();

        let monthlyIncome = 0;
        completedAppointments.forEach(doc => {
            const data = doc.data();
            if (data.services) {
                data.services.forEach(service => {
                    monthlyIncome += service.price;
                });
            }
        });

        document.getElementById('monthlyIncome').textContent = '₺' + monthlyIncome.toLocaleString('tr-TR');
    } catch (error) {
        console.error('Error refreshing stats:', error);
        showToast('İstatistikler güncellenirken bir hata oluştu', 'error');
    }
};

// Randevuları tarihe göre filtrele
async function filterAppointmentsByDate(date) {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const appointmentsGrid = document.querySelector('#appointments .appointments-grid');
        if (!appointmentsGrid) return;

        appointmentsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Randevular yükleniyor...</p></div>';

        const appointmentsSnapshot = await db.collection('appointments')
            .where('barberId', '==', user.uid)
            .where('date', '==', date)
            .get();

        if (appointmentsSnapshot.empty) {
            appointmentsGrid.innerHTML = '<div class="empty-state">Seçili tarih için randevu bulunmuyor</div>';
            return;
        }

        // Gizli olmayan randevuları filtrele ve zamanına göre sırala
        const appointments = appointmentsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(appointment => !appointment.isHidden)
            .sort((a, b) => a.time.localeCompare(b.time));

        if (appointments.length === 0) {
            appointmentsGrid.innerHTML = '<div class="empty-state">Seçili tarih için randevu bulunmuyor</div>';
            return;
        }

        let html = '';
        for (const appointment of appointments) {
            // Müşteri notlarını kontrol et ve hazırla
            const hasNotes = appointment.notes && appointment.notes.trim().length > 0;
            const notesHtml = hasNotes ? `
                <div class="customer-notes">
                    <i class="fas fa-sticky-note"></i>
                    <p>${appointment.notes}</p>
                </div>
            ` : '';

            // Hizmet detaylarını hazırla
            let servicesHtml = '';
            if (appointment.services && appointment.services.length > 0) {
                for (const service of appointment.services) {
                    // Her hizmet için detay bilgilerini getir
                    const serviceDoc = await db.collection('services').doc(service.id).get();
                    const serviceData = serviceDoc.exists ? serviceDoc.data() : null;

                    servicesHtml += `
                        <div class="service-item">
                            <div class="service-header">
                                <span class="service-name">${service.name}</span>
                                <span class="service-duration">${service.duration} dk</span>
                            </div>
                            ${serviceData?.description ? `
                                <div class="service-description">
                                    <p>${serviceData.description}</p>
                                </div>
                            ` : ''}
                            ${serviceData?.image ? `
                                <div class="service-image">
                                    <img src="${serviceData.image}" alt="${service.name}">
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
            }

            html += `
                <div class="appointment-card ${appointment.status}" data-id="${appointment.id}">
                    <div class="appointment-time">
                        <i class="far fa-clock"></i>
                        ${appointment.time}
                    </div>
                    <div class="appointment-details">
                        <div class="customer-info">
                            <h4>
                                <i class="fas fa-user"></i>
                                ${appointment.customer?.name || 'İsimsiz Müşteri'}
                            </h4>
                            <p>
                                <i class="fas fa-phone"></i>
                                ${appointment.customer?.phone || 'Telefon Yok'}
                            </p>
                        </div>
                        <div class="services-list">
                            <h5>
                                <i class="fas fa-cut"></i>
                                Seçilen Hizmetler
                            </h5>
                            <div class="services">
                                ${servicesHtml || 'Hizmet Seçilmemiş'}
                            </div>
                        </div>
                        ${notesHtml}
                        ${appointment.status === 'cancelled' && appointment.cancellationReason ? `
                            <div class="cancellation-reason">
                                <i class="fas fa-info-circle"></i>
                                <p><strong>İptal Nedeni:</strong> ${appointment.cancellationReason}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="appointment-actions">
                        <button onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')" 
                                class="btn btn-success" ${appointment.status === 'confirmed' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                            <span>Onayla</span>
                        </button>
                        <button onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')" 
                                class="btn btn-danger" ${appointment.status === 'cancelled' ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                            <span>İptal Et</span>
                        </button>
                    </div>
                </div>
            `;
        }

        appointmentsGrid.innerHTML = html;
    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        appointmentsGrid.innerHTML = '<div class="error-state">Randevular yüklenirken bir hata oluştu</div>';
    }
}

// Hizmetleri yükle
async function loadServices() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const servicesGrid = document.querySelector('#services .services-grid');
        if (!servicesGrid) return;

        servicesGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Hizmetler yükleniyor...</p></div>';

        const servicesSnapshot = await db.collection('services')
            .where('barberId', '==', user.uid)
            .get();

        if (servicesSnapshot.empty) {
            servicesGrid.innerHTML = '<div class="empty-state">Henüz hiç hizmet eklenmemiş</div>';
            return;
        }

        let html = '';
        servicesSnapshot.forEach(doc => {
            const service = { id: doc.id, ...doc.data() };
            html += `
                <div class="service-card ${!service.active ? 'inactive' : ''}">
                    <div class="service-header">
                        <h3>${service.name}</h3>
                        <div class="service-actions">
                            <button type="button" onclick="editService('${service.id}')" class="btn-icon edit-btn">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" onclick="deleteService('${service.id}')" class="btn-icon delete-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="service-description">${service.description || 'Açıklama yok'}</p>
                    <div class="service-details">
                        <span class="price">₺${service.price}</span>
                        <span class="duration"><i class="far fa-clock"></i> ${service.duration} dk</span>
                        <span class="status ${service.active ? 'active' : 'inactive'}">
                            ${service.active ? 'Aktif' : 'Pasif'}
                        </span>
                    </div>
                    <div class="service-toggle">
                        <label class="switch">
                            <input type="checkbox" ${service.active ? 'checked' : ''} 
                                   onchange="toggleService('${service.id}', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `;
        });

        servicesGrid.innerHTML = html;
    } catch (error) {
        console.error('Hizmetler yüklenirken hata:', error);
        servicesGrid.innerHTML = '<div class="error-state">Hizmetler yüklenirken bir hata oluştu</div>';
    }
}

// Toast bildirimi göster
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' : 
                          type === 'error' ? 'fa-exclamation-circle' : 
                'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animasyon ekle
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Kullanıcı oturum açmışsa istatistikleri yükle
        await window.refreshStats();
        
        // Diğer yüklemeler...
        await loadServices();
        await loadBarberProfile();
        await loadBarberSettings();
        await loadWorkingHours();
        await loadNotifications();
        
        // Bugünün tarihini ayarla ve randevuları yükle
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('appointmentDateFilter').value = today;
        await filterAppointmentsByDate(today);
    } else {
        window.location.href = '/barber/login.html';
    }
});

// View değiştirme fonksiyonu
const navigateToView = async (viewId) => {
    try {
        // Aktif view'ı bul ve kaldır
        const activeView = document.querySelector('.view.active');
        if (activeView) {
            activeView.classList.remove('active');
        }

        // Aktif nav-item'ı bul ve kaldır
        const activeNavItem = document.querySelector('.nav-item.active');
        if (activeNavItem) {
            activeNavItem.classList.remove('active');
        }

        // Yeni view'ı aktif et
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Yeni nav-item'ı aktif et
        const targetNavItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }

        // View başlığını güncelle
        const viewTitle = document.getElementById('viewTitle');
        if (viewTitle) {
            switch(viewId) {
                case 'overview':
                    viewTitle.textContent = 'Genel Bakış';
                    await refreshStats();
                    break;
                case 'appointments':
                    viewTitle.textContent = 'Randevular';
                    const dateFilter = document.getElementById('appointmentDateFilter');
                    if (dateFilter) {
                        const today = new Date().toISOString().split('T')[0];
                        dateFilter.value = today;
                        await filterAppointmentsByDate(today);
                    }
                    break;
                case 'services':
                    viewTitle.textContent = 'Hizmetler';
                    await loadServices();
                    break;
                case 'profile':
                    viewTitle.textContent = 'Profil';
                    await loadBarberProfile();
                    break;
                case 'settings':
                    viewTitle.textContent = 'Ayarlar';
                    await loadWorkingHours();
                    await loadBarberSettings();
                    break;
            }
        }
    } catch (error) {
        console.error('View değiştirme hatası:', error);
        showToast('Sayfa yüklenirken bir hata oluştu', 'error');
    }
};

// DOM yüklendiğinde çalışacak kodlar
document.addEventListener('DOMContentLoaded', () => {
    // Nav item tıklama olaylarını dinle
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            if (viewId) {
                await navigateToView(viewId);
            }
        });
    });

    // Hakkında textarea'sı için otomatik boyutlandırma
    const descriptionTextarea = document.getElementById('description');
    if (descriptionTextarea) {
        function autoResize() {
            this.style.cssText = 'height: auto; padding: 0';
            this.style.cssText = `height: ${this.scrollHeight}px; padding: 0.75rem`;
        }

        // İlk yüklemede ve her değişiklikte boyutu ayarla
        descriptionTextarea.addEventListener('input', autoResize);
        
        // Sayfa yüklendiğinde mevcut içeriğe göre boyutu ayarla
        if (descriptionTextarea.value) {
            setTimeout(() => autoResize.call(descriptionTextarea), 100);
        }
    }

    // İlk kontrol
    checkAndUpdateAppointmentStatus();
    
    // Her 5 dakikada bir kontrol et
    setInterval(checkAndUpdateAppointmentStatus, 5 * 60 * 1000);

    // Bildirimler için gerekli elementleri seç
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsMenu = document.querySelector('.notifications-menu');
    const markAllAsReadBtn = document.getElementById('markAllAsReadBtn');

    // Bildirimler butonuna tıklama olayı
    if (notificationsBtn && notificationsMenu) {
        notificationsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Menüyü aç/kapat
            notificationsMenu.classList.toggle('show');
            
            // Menü açıldıysa bildirimleri yükle
            if (notificationsMenu.classList.contains('show')) {
                loadNotifications();
            }
        });

        // Sayfa herhangi bir yerine tıklandığında menüyü kapat
        document.addEventListener('click', function(e) {
            if (!notificationsMenu.contains(e.target) && !notificationsBtn.contains(e.target)) {
                notificationsMenu.classList.remove('show');
            }
        });

        // Menünün içine tıklandığında kapanmasını engelle
        notificationsMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Tümünü okundu işaretle butonuna tıklama
    if (markAllAsReadBtn) {
        markAllAsReadBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            await markAllNotificationsAsRead();
            await loadNotifications();
        });
    }
});

// Berber profilini yükle
async function loadBarberProfile() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const profileSection = document.getElementById('profileSection');
        if (!profileSection) return;

        profileSection.innerHTML = '<div class="loading">Profil bilgileri yükleniyor...</div>';

        const barberDoc = await db.collection('barbers').doc(user.uid).get();
        if (!barberDoc.exists) {
            profileSection.innerHTML = '<div class="empty-state">Berber bilgileri bulunamadı</div>';
            return;
        }

        const barberData = barberDoc.data();
        console.log('Berber verileri:', barberData); // Verileri kontrol etmek için konsol çıktısı

        profileSection.innerHTML = `
            <div class="profile-header">
                <img src="${barberData.photoURL || '../assets/default-avatar.png'}" 
                     alt="Profil Fotoğrafı" class="profile-photo">
                <div class="profile-info">
                    <h2>${barberData.businessName || 'İşletme Adı'}</h2>
                    <p class="address"><i class="fas fa-map-marker-alt"></i> 
                        ${barberData.address || 'Adres belirtilmemiş'}</p>
                    <p class="phone"><i class="fas fa-phone"></i> 
                        ${barberData.phone || 'Telefon belirtilmemiş'}</p>
                </div>
            </div>
            <div class="profile-stats">
                <div class="stat-item">
                    <span class="stat-value">
                        ${
                            barberData.rating 
                                ? (barberData.rating / barberData.reviewCount).toFixed(1) 
                                : '0.0'
                        }
                    </span>
                    <span class="stat-label">Puan</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${barberData.reviewCount || '0'}</span>
                    <span class="stat-label">Değerlendirme</span>
                </div>
            </div>
        `;

        // Ayarlar formunu doldur
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.elements.businessName.value = barberData.businessName || '';
            settingsForm.elements.phone.value = barberData.phone || '';
            settingsForm.elements.address.value = barberData.address || '';
            settingsForm.elements.description.value = barberData.description || '';
            settingsForm.elements.email.value = user.email || '';
        }

        // Header'daki kullanıcı bilgilerini güncelle
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = barberData.businessName || 'Berber Adı';
        }

    } catch (error) {
        console.error('Profil yüklenirken hata:', error);
        profileSection.innerHTML = '<div class="error-state">Profil yüklenirken bir hata oluştu</div>';
    }
}

// Berber ayarlarını yükle
async function loadBarberSettings() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const settingsForm = document.getElementById('settingsForm');
        if (!settingsForm) return;

        const barberDoc = await db.collection('barbers').doc(user.uid).get();
        if (!barberDoc.exists) {
            showToast('Berber bilgileri bulunamadı', 'error');
            return;
        }

        const barberData = barberDoc.data();
        settingsForm.elements.businessName.value = barberData.businessName || '';
        settingsForm.elements.phone.value = barberData.phone || '';
        settingsForm.elements.address.value = barberData.address || '';
        settingsForm.elements.description.value = barberData.description || '';
        settingsForm.elements.email.value = user.email || '';

    } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
        showToast('Ayarlar yüklenirken bir hata oluştu', 'error');
    }
}

// Berber ayarlarını güncelle
window.updateBarberSettings = async (event) => {
    event.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const settingsData = {
            businessName: formData.get('businessName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            description: formData.get('description'),
            updatedAt: new Date()
        };

        await db.collection('barbers').doc(user.uid).update(settingsData);
        
        showToast('Ayarlar başarıyla güncellendi', 'success');
        await loadBarberProfile();
    } catch (error) {
        console.error('Ayarlar güncellenirken hata:', error);
        showToast('Ayarlar güncellenirken bir hata oluştu', 'error');
    }
};

// Çalışma saatlerini senkronize et
window.toggleSyncDays = () => {
    const checkbox = document.getElementById('syncDaysCheckbox');
    if (!checkbox) return;

    window.isSyncEnabled = checkbox.checked;

    if (window.isSyncEnabled) {
        // İlk satırın değerlerini al
        const container = document.getElementById('workingHoursContainer');
        const firstRow = container.querySelector('.working-hours-row');
        const isActive = firstRow.querySelector('.day-active').checked;
        const startTime = firstRow.querySelector('.start-time').value;
        const endTime = firstRow.querySelector('.end-time').value;

        // Diğer satırları güncelle
        container.querySelectorAll('.working-hours-row:not(:first-child)').forEach(row => {
            row.querySelector('.day-active').checked = isActive;
            row.querySelector('.start-time').value = startTime;
            row.querySelector('.end-time').value = endTime;
            row.querySelectorAll('select').forEach(select => select.disabled = !isActive);
        });
    }
};

// Çalışma saatlerini yükle
async function loadWorkingHours() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const container = document.getElementById('workingHoursContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading">Çalışma saatleri yükleniyor...</div>';

        const barberDoc = await db.collection('barbers').doc(user.uid).get();
        const workingHours = barberDoc.data()?.workingHours || {};

        const days = [
            { value: 'pazartesi', label: 'Pazartesi' },
            { value: 'sali', label: 'Salı' },
            { value: 'carsamba', label: 'Çarşamba' },
            { value: 'persembe', label: 'Perşembe' },
            { value: 'cuma', label: 'Cuma' },
            { value: 'cumartesi', label: 'Cumartesi' },
            { value: 'pazar', label: 'Pazar' }
        ];

        let html = '';
        days.forEach(day => {
            const dayHours = workingHours[day.value] || { active: false, start: '09:00', end: '18:00' };
            html += `
                <div class="working-hours-row" data-day="${day.value}">
                    <div class="day-label">
                        <label class="switch">
                            <input type="checkbox" class="day-active" 
                                   onchange="handleWorkingHourChange(this)"
                                   ${dayHours.active ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                        <span>${day.label}</span>
                    </div>
                    <div class="hours-select">
                        <select class="time-select start-time" 
                                onchange="handleWorkingHourChange(this)"
                                ${!dayHours.active ? 'disabled' : ''}>
                            ${generateTimeOptions(dayHours.start)}
                        </select>
                        <span>-</span>
                        <select class="time-select end-time" 
                                onchange="handleWorkingHourChange(this)"
                                ${!dayHours.active ? 'disabled' : ''}>
                            ${generateTimeOptions(dayHours.end)}
                        </select>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Event listeners ekle
        container.querySelectorAll('.day-active').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const row = this.closest('.working-hours-row');
                const selects = row.querySelectorAll('select');
                selects.forEach(select => select.disabled = !this.checked);

                if (isSyncEnabled && row === container.querySelector('.working-hours-row')) {
                    handleWorkingHourChange(this);
                }
            });
        });

    } catch (error) {
        console.error('Çalışma saatleri yüklenirken hata:', error);
        container.innerHTML = '<div class="error-state">Çalışma saatleri yüklenirken bir hata oluştu</div>';
        showToast('Çalışma saatleri yüklenirken bir hata oluştu', 'error');
    }
}

// Çalışma saati değişikliklerini yönet
window.handleWorkingHourChange = (element) => {
    const row = element.closest('.working-hours-row');
    const selects = row.querySelectorAll('select');

    // Checkbox değişikliği ise select'leri aktif/pasif yap
    if (element.classList.contains('day-active')) {
        selects.forEach(select => select.disabled = !element.checked);
    }

    // Eğer senkronizasyon aktif değilse işlem yapma
    if (!isSyncEnabled) return;

    // Eğer değişiklik ilk satırda yapıldıysa, diğer satırları güncelle
    const container = document.getElementById('workingHoursContainer');
    const firstRow = container.querySelector('.working-hours-row');
    
    if (row === firstRow) {
        const isActive = firstRow.querySelector('.day-active').checked;
        const startTime = firstRow.querySelector('.start-time').value;
        const endTime = firstRow.querySelector('.end-time').value;

        container.querySelectorAll('.working-hours-row:not(:first-child)').forEach(otherRow => {
            otherRow.querySelector('.day-active').checked = isActive;
            otherRow.querySelector('.start-time').value = startTime;
            otherRow.querySelector('.end-time').value = endTime;
            otherRow.querySelectorAll('select').forEach(select => select.disabled = !isActive);
        });
    }
};

// Saat seçeneklerini oluştur
function generateTimeOptions(selectedTime = '09:00') {
    let options = '';
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            options += `<option value="${time}" ${time === selectedTime ? 'selected' : ''}>${time}</option>`;
        }
    }
    return options;
}

// Çalışma saatlerini kaydet
window.saveWorkingHours = async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const container = document.getElementById('workingHoursContainer');
        if (!container) return;

        const workingHours = {};
        container.querySelectorAll('.working-hours-row').forEach(row => {
            const day = row.dataset.day;
            workingHours[day] = {
                active: row.querySelector('.day-active').checked,
                start: row.querySelector('.start-time').value,
                end: row.querySelector('.end-time').value
            };
        });

        await db.collection('barbers').doc(user.uid).update({
            workingHours: workingHours,
            updatedAt: new Date()
        });

        showToast('Çalışma saatleri başarıyla kaydedildi', 'success');
    } catch (error) {
        console.error('Çalışma saatleri kaydedilirken hata:', error);
        showToast('Çalışma saatleri kaydedilirken bir hata oluştu', 'error');
    }
};

// Tüm günlere uygula
window.applyToAllDays = () => {
    const container = document.getElementById('workingHoursContainer');
    if (!container) return;

    const firstRow = container.querySelector('.working-hours-row');
    if (!firstRow) return;

    const isActive = firstRow.querySelector('.day-active').checked;
    const startTime = firstRow.querySelector('.start-time').value;
    const endTime = firstRow.querySelector('.end-time').value;

    container.querySelectorAll('.working-hours-row').forEach(row => {
        row.querySelector('.day-active').checked = isActive;
        row.querySelector('.start-time').value = startTime;
        row.querySelector('.end-time').value = endTime;
        row.querySelectorAll('select').forEach(select => select.disabled = !isActive);
    });

    showToast('Çalışma saatleri tüm günlere uygulandı', 'success');
};

// Görsel önizleme fonksiyonu
function previewImage(input) {
    const preview = document.querySelector('#imagePreview img');
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

// Hizmet ekleme fonksiyonu
async function addService(event) {
    event.preventDefault();
    showLoading('Hizmet ekleniyor...');

    try {
        const form = event.target;
        const formData = new FormData(form);
        const user = auth.currentUser;

        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        // Görsel yükleme
        const imageFile = formData.get('image');
        let imageUrl = '';
        
        if (imageFile.size > 0) {
            const storageRef = storage.ref();
            const imageRef = storageRef.child(`services/${user.uid}/${Date.now()}_${imageFile.name}`);
            await imageRef.put(imageFile);
            imageUrl = await imageRef.getDownloadURL();
        }

        // Hizmet verilerini hazırla
        const serviceData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseInt(formData.get('price')),
            duration: parseInt(formData.get('duration')),
            image: imageUrl,
            active: formData.get('active') === 'on',
            barberId: user.uid,
            createdAt: new Date().toISOString()
        };

        // Firestore'a kaydet
        await db.collection('services').add(serviceData);

        showToast('Hizmet başarıyla eklendi', 'success');
        closeModal('addServiceModal');
        form.reset();
        document.querySelector('#imagePreview img').src = '../assets/placeholder-image.png';
        
        // Hizmet listesini güncelle
        await loadServices();
    } catch (error) {
        console.error('Hizmet eklenirken hata:', error);
        showToast('Hizmet eklenirken bir hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Modal açma/kapama fonksiyonları
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Modal içindeki formu sıfırla
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const imagePreview = form.querySelector('#imagePreview img');
            if (imagePreview) {
                imagePreview.src = '../assets/placeholder-image.png';
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Hizmet ekleme modalını göster
window.showAddServiceModal = function() {
    showModal('addServiceModal');
}

// Modal dışına tıklandığında kapat
document.addEventListener('DOMContentLoaded', function() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
});

// Sürükle-bırak işlemleri için event listener'lar
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.querySelector('.image-upload-container');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('highlight');
    }

    function unhighlight(e) {
        dropZone.classList.remove('highlight');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length) {
            const input = document.querySelector('#serviceImage');
            input.files = files;
            previewImage(input);
        }
    }
});

// Hizmet düzenleme fonksiyonu
window.editService = async function(serviceId) {
    try {
        // Hizmet verilerini getir
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (!serviceDoc.exists) {
            showToast('Hizmet bulunamadı', 'error');
            return;
        }

        const service = { id: serviceDoc.id, ...serviceDoc.data() };
        
        // Düzenleme modalını göster
        const result = await Swal.fire({
            title: 'Hizmeti Düzenle',
            html: `
                <form id="editServiceForm" class="swal2-form">
                    <div class="form-group">
                        <label for="serviceName">
                            <i class="fas fa-tag"></i>
                            Hizmet Adı
                        </label>
                        <input type="text" id="serviceName" class="swal2-input" value="${service.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="servicePrice">
                            <i class="fas fa-turkish-lira-sign"></i>
                            Fiyat
                        </label>
                        <input type="number" id="servicePrice" class="swal2-input" value="${service.price}" min="0" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="serviceDuration">
                            <i class="fas fa-clock"></i>
                            Süre (Dakika)
                        </label>
                        <input type="number" id="serviceDuration" class="swal2-input" value="${service.duration}" min="5" step="5" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="serviceDescription">
                            <i class="fas fa-align-left"></i>
                            Açıklama
                        </label>
                        <textarea id="serviceDescription" class="swal2-textarea">${service.description || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="switch-wrapper">
                            <input type="checkbox" id="serviceStatus" ${service.active ? 'checked' : ''}>
                            <span class="switch-label">Hizmet Aktif</span>
                        </label>
                    </div>
                </form>
            `,
            showCancelButton: true,
            confirmButtonText: 'Güncelle',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#e74c3c',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const serviceName = document.getElementById('serviceName').value;
                    const servicePrice = parseFloat(document.getElementById('servicePrice').value);
                    const serviceDuration = parseInt(document.getElementById('serviceDuration').value);
                    const serviceDescription = document.getElementById('serviceDescription').value;
                    const serviceStatus = document.getElementById('serviceStatus').checked;

                    if (!serviceName || !servicePrice || !serviceDuration) {
                        Swal.showValidationMessage('Lütfen tüm zorunlu alanları doldurun');
                        return false;
                    }

                    const serviceData = {
                        name: serviceName,
                        price: servicePrice,
                        duration: serviceDuration,
                        description: serviceDescription || '',
                        active: serviceStatus,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Hizmeti Firestore'da güncelle
                    await db.collection('services').doc(serviceId).update(serviceData);
                    
                    // Hizmetleri yeniden yükle
                    await loadServices();
                    
                    return true;
                } catch (error) {
                    console.error('Hizmet güncellenirken hata:', error);
                    Swal.showValidationMessage(`Hizmet güncellenirken bir hata oluştu: ${error.message}`);
                    return false;
                }
            }
        });

        if (result.isConfirmed) {
            showToast('Hizmet başarıyla güncellendi', 'success');
        }
    } catch (error) {
        console.error('Hizmet düzenleme modalı açılırken hata:', error);
        showToast('Hizmet düzenlenirken bir hata oluştu', 'error');
    }
};

// Hizmet silme fonksiyonu
window.deleteService = async function(serviceId) {
    try {
        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: 'Bu hizmet kalıcı olarak silinecek!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#7f8c8d'
        });

        if (result.isConfirmed) {
            await db.collection('services').doc(serviceId).delete();
            await loadServices();
            showToast('Hizmet başarıyla silindi', 'success');
        }
    } catch (error) {
        console.error('Hizmet silinirken hata:', error);
        showToast('Hizmet silinirken bir hata oluştu', 'error');
    }
};

// Hizmet durumunu değiştir
window.toggleService = async (serviceId, active) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        await db.collection('services').doc(serviceId).update({
            active: active,
            updatedAt: new Date()
        });
        
        showToast(`Hizmet ${active ? 'aktifleştirildi' : 'devre dışı bırakıldı'}`, 'success');
    } catch (error) {
        console.error('Hizmet durumu güncellenirken hata:', error);
        showToast('Hizmet durumu güncellenirken bir hata oluştu', 'error');
    }
};

// Çıkış fonksiyonu
window.logout = async () => {
    try {
        await auth.signOut();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Çıkış yapılırken hata:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
};

// Tarih değiştirme fonksiyonu
window.changeDate = function(direction) {
    const dateInput = document.getElementById('appointmentDateFilter');
    if (!dateInput) return;

    const currentDate = new Date(dateInput.value || new Date());
    
    if (direction === 'next') {
        currentDate.setDate(currentDate.getDate() + 1);
    } else if (direction === 'prev') {
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Tarihi YYYY-MM-DD formatına çevir
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    dateInput.value = formattedDate;
    
    // Tarihi Türkçe formatla ve göster
    const turkishDate = new Intl.DateTimeFormat('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(currentDate);
    
    const titleElement = document.querySelector('#appointments .view-title');
    if (titleElement) {
        titleElement.textContent = `Randevular - ${turkishDate}`;
    }
    
    filterAppointmentsByDate(formattedDate);
}

// Randevu durumlarını kontrol et ve güncelle
async function checkAndUpdateAppointmentStatus() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');

        // Onaylanmış randevuları getir
        const appointmentsSnapshot = await db.collection('appointments')
            .where('barberId', '==', user.uid)
            .where('status', '==', 'confirmed')
            .get();

        for (const doc of appointmentsSnapshot.docs) {
            const appointment = doc.data();
            
            // Randevu tarihi bugün veya daha önceyse ve randevu saati geçmişse
            if (appointment.date <= today && appointment.time < currentTime) {
                await doc.ref.update({
                    status: 'completed',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Randevu durumu güncellendi: ${doc.id} - Tamamlandı`);
            }
        }
    } catch (error) {
        console.error('Randevu durumları güncellenirken hata:', error);
    }
}

// Oturum durumunu kontrol et
async function checkAuthStatus() {
    const user = auth.currentUser;
    if (!user) {
        await Swal.fire({
            title: 'Oturum Süresi Doldu',
            text: 'Lütfen yeniden giriş yapın',
            icon: 'warning',
            confirmButtonText: 'Giriş Sayfasına Git',
            confirmButtonColor: '#2e86de'
        });
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Randevu durumunu güncelle
window.updateAppointmentStatus = async function(appointmentId, newStatus) {
    try {
        // Oturum durumunu kontrol et
        if (!await checkAuthStatus()) return;

        // İptal durumunda sebep sor
        let cancellationReason = '';
        if (newStatus === 'cancelled') {
            const { value: reason, isDismissed } = await Swal.fire({
                title: 'İptal Nedeni',
                input: 'textarea',
                inputLabel: 'Lütfen randevuyu iptal etme nedeninizi belirtin',
                inputPlaceholder: 'İptal nedeni...',
                inputAttributes: {
                    'aria-label': 'İptal nedeni',
                    'maxlength': '200'
                },
                showCancelButton: true,
                cancelButtonText: 'Vazgeç',
                confirmButtonText: 'İptal Et',
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                inputValidator: (value) => {
                    if (!value?.trim()) {
                        return 'Lütfen iptal nedenini belirtin';
                    }
                }
            });

            if (isDismissed) return;
            cancellationReason = reason;
        }

        showLoading('Randevu durumu güncelleniyor...');

        // Randevu dokümanını al
        const appointmentRef = db.collection('appointments').doc(appointmentId);
        const appointmentDoc = await appointmentRef.get();

        if (!appointmentDoc.exists) {
            throw new Error('Randevu bulunamadı');
        }

        const appointmentData = appointmentDoc.data();

        // Berber kontrolü
        if (appointmentData.barberId !== auth.currentUser.uid) {
            throw new Error('Bu randevuyu güncelleme yetkiniz yok');
        }

        // Durum güncellemesi
        const updateData = {
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // İptal durumunda nedeni ekle
        if (newStatus === 'cancelled') {
            updateData.cancellationReason = cancellationReason;
        }

        await appointmentRef.update(updateData);

        // Müşteriye bildirim gönder
        await db.collection('notifications').add({
            userId: appointmentData.customerId,
            title: newStatus === 'confirmed' ? 'Randevunuz Onaylandı' : 'Randevunuz İptal Edildi',
            message: newStatus === 'confirmed' 
                ? `${appointmentData.date} tarihli ve ${appointmentData.time} saatli randevunuz onaylanmıştır.`
                : `${appointmentData.date} tarihli ve ${appointmentData.time} saatli randevunuz iptal edilmiştir.\n\nİptal Nedeni: ${cancellationReason}`,
            type: newStatus === 'confirmed' ? 'success' : 'error',
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Başarılı mesajı göster
        hideLoading();
        await Swal.fire({
            title: 'Başarılı!',
            text: newStatus === 'confirmed' ? 'Randevu onaylandı' : 'Randevu iptal edildi',
            icon: 'success',
            confirmButtonColor: '#2e86de',
            timer: 1500,
            showConfirmButton: false
        });

        // Randevuları yeniden yükle
        const dateFilter = document.getElementById('appointmentDateFilter');
        if (dateFilter) {
            await filterAppointmentsByDate(dateFilter.value);
        }

    } catch (error) {
        console.error('Randevu durumu güncellenirken hata:', error);
        hideLoading();
        
        let errorMessage = 'Randevu durumu güncellenirken bir hata oluştu';
        if (error.message.includes('Missing or insufficient permissions')) {
            errorMessage = 'Bu işlem için yetkiniz bulunmuyor. Lütfen yeniden giriş yapın.';
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        }
        
        await Swal.fire({
            title: 'Hata!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#2e86de'
        });
    }
}

// Yükleme göstergesi fonksiyonları
function showLoading(message = 'Yükleniyor...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
}

function hideLoading() {
    Swal.close();
}

// Profil fotoğrafını yükle
async function uploadProfilePhoto(file) {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return null;
        }

        const storageRef = window.storage.ref();
        const profilePhotoRef = storageRef.child(`barber_photos/${user.uid}`);
        
        await profilePhotoRef.put(file);
        const downloadURL = await profilePhotoRef.getDownloadURL();
        
        return downloadURL;
    } catch (error) {
        console.error('Profil fotoğrafı yüklenirken hata:', error);
        showToast('Profil fotoğrafı yüklenemedi', 'error');
        return null;
    }
}

// Profil resmi yükleme işlemleri
const imageInput = document.getElementById('imageInput');
const profileImage = document.getElementById('profileImage');
const removeImageBtn = document.getElementById('removeImageBtn');

// Profil resmini yükle
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        showLoading('Fotoğraf yükleniyor...');

        // Dosya boyutu kontrolü (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Fotoğraf boyutu 5MB\'dan küçük olmalıdır');
        }

        // Dosya tipi kontrolü
        if (!file.type.startsWith('image/')) {
            throw new Error('Lütfen geçerli bir fotoğraf dosyası seçin');
        }

        const userId = auth.currentUser.uid;
        const fileExt = file.name.split('.').pop();
        const fileName = `profile_images/${userId}.${fileExt}`;
        const storageRef = window.storage.ref().child(fileName);

        // Fotoğrafı yükle
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Firestore'da berber dokümanını güncelle
        await db.collection('barbers').doc(userId).update({
            photoURL: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // UI'ı güncelle
        profileImage.src = downloadURL;
        removeImageBtn.style.display = 'inline-flex';

        showToast('Profil fotoğrafı başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Fotoğraf yükleme hatası:', error);
        showToast(error.message || 'Fotoğraf yüklenirken bir hata oluştu', 'error');
    } finally {
        hideLoading();
    }
});

// Profil resmini kaldır
async function removeProfileImage() {
    try {
        const result = await Swal.fire({
            title: 'Profil Fotoğrafını Kaldır',
            text: 'Profil fotoğrafınızı kaldırmak istediğinizden emin misiniz?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Kaldır',
            cancelButtonText: 'Vazgeç',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;

        showLoading('Fotoğraf kaldırılıyor...');

        const userId = auth.currentUser.uid;
        
        // Storage'dan fotoğrafı sil
        const fileRef = window.storage.ref().child(`profile_images/${userId}`);
        await fileRef.delete().catch(() => {});

        // Firestore'da berber dokümanını güncelle
        await db.collection('barbers').doc(userId).update({
            photoURL: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // UI'ı güncelle
        profileImage.src = '../assets/default-avatar.png';
        removeImageBtn.style.display = 'none';

        showToast('Profil fotoğrafı başarıyla kaldırıldı', 'success');
    } catch (error) {
        console.error('Fotoğraf kaldırma hatası:', error);
        showToast('Fotoğraf kaldırılırken bir hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Mevcut profil resmini yükle
async function loadProfileImage() {
    try {
        const userId = auth.currentUser.uid;
        const barberDoc = await db.collection('barbers').doc(userId).get();
        
        if (barberDoc.exists) {
            const photoURL = barberDoc.data().photoURL;
            if (photoURL) {
                profileImage.src = photoURL;
                removeImageBtn.style.display = 'inline-flex';
            }
        }
    } catch (error) {
        console.error('Profil resmi yüklenirken hata:', error);
    }
}

// Sayfa yüklendiğinde profil resmini yükle
document.addEventListener('DOMContentLoaded', loadProfileImage);

// Bildirimleri yükle
async function loadNotifications() {
    const notificationsContent = document.querySelector('.notifications-content');
    const notificationsBadge = document.querySelector('.notifications-badge');
    
    try {
        const userId = window.auth.currentUser.uid;
        
        // İki farklı sorgu oluştur
        const userNotificationsQuery = window.db.collection('notifications')
            .where('userId', '==', userId);
            
        const targetNotificationsQuery = window.db.collection('notifications')
            .where('target', 'in', ['all', 'barbers']);

        // Her iki sorguyu da çalıştır
        const [userSnapshot, targetSnapshot] = await Promise.all([
            userNotificationsQuery.get(),
            targetNotificationsQuery.get()
        ]);

        // Bildirimleri birleştir ve tekrarları önle
        const notifications = new Map();
        
        // Kullanıcıya özel bildirimleri ekle
        userSnapshot.forEach(doc => {
            notifications.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        // Hedef bildirimleri ekle
        targetSnapshot.forEach(doc => {
            if (!notifications.has(doc.id)) {
                notifications.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        if (notifications.size === 0) {
            notificationsContent.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Bildiriminiz bulunmuyor</p>
                </div>
            `;
            notificationsBadge.textContent = '0';
            return;
        }

        // Bildirimleri tarihe göre sırala
        const sortedNotifications = Array.from(notifications.values())
            .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

        let notificationsHtml = '';
        let unreadCount = 0;

        sortedNotifications.forEach(notification => {
            if (!notification.isRead) unreadCount++;

            notificationsHtml += `
                <div class="notification-item ${notification.isRead ? '' : 'unread'}" 
                     data-id="${notification.id}">
                    <div class="notification-icon">
                        <i class="fas ${getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">
                            ${formatNotificationTime(notification.createdAt)}
                        </div>
                    </div>
                </div>
            `;
        });

        notificationsContent.innerHTML = notificationsHtml;
        notificationsBadge.textContent = unreadCount;

        // Bildirime tıklama olayını ekle
        const notificationItems = document.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            item.addEventListener('click', () => markNotificationAsRead(item.dataset.id));
        });

    } catch (error) {
        console.error('Bildirimler yüklenirken hata:', error);
        notificationsContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Bildirimler yüklenirken bir hata oluştu</p>
            </div>
        `;
    }
}

// Bildirimi okundu olarak işaretle
async function markNotificationAsRead(notificationId) {
    try {
        await window.db.collection('notifications').doc(notificationId).update({
            isRead: true,
            readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadNotifications(); // Bildirimleri yeniden yükle
    } catch (error) {
        console.error('Bildirim güncellenirken hata:', error);
        showToast('Bildirim güncellenirken bir hata oluştu', 'error');
    }
}

// Tüm bildirimleri okundu olarak işaretle
async function markAllNotificationsAsRead() {
    try {
        const userId = window.auth.currentUser.uid;
        const batch = window.db.batch();
        
        const unreadNotifications = await window.db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .get();

        unreadNotifications.forEach(doc => {
            batch.update(doc.ref, {
                isRead: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        showToast('Tüm bildirimler okundu olarak işaretlendi', 'success');
    } catch (error) {
        console.error('Bildirimler güncellenirken hata:', error);
        showToast('Bildirimler güncellenirken bir hata oluştu', 'error');
    }
}

// Bildirim ikonunu belirle
function getNotificationIcon(type) {
    switch (type) {
        case 'appointment': return 'fa-calendar-check';
        case 'review': return 'fa-star';
        case 'message': return 'fa-envelope';
        case 'warning': return 'fa-exclamation-triangle';
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-times-circle';
        default: return 'fa-bell';
    }
}

// Bildirim zamanını formatla
function formatNotificationTime(timestamp) {
    if (!timestamp) return '';

    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
}
