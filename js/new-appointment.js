// Firebase yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'in yüklendiğini kontrol et
        if (!window.firebase) {
            throw new Error('Firebase yüklenemedi');
        }

        // Oturum durumunu kontrol et
        const user = await window.authService.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        // Kullanıcı tipini kontrol et
        const userType = await window.authService.checkUserType(user.uid);
        if (userType !== 'customer') {
            alert('Bu sayfaya sadece müşteriler erişebilir');
            window.location.href = '/';
            return;
        }

        // Berberleri yükle
        await loadBarbers();

        // Form submit olayını dinle
        const appointmentForm = document.getElementById('appointmentForm');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', handleAppointmentSubmit);
        }

        // Berber seçildiğinde hizmetleri yükle
        const barberSelect = document.getElementById('barberSelect');
        if (barberSelect) {
            barberSelect.addEventListener('change', handleBarberChange);
        }

        // Tarih seçimini bugünden başlat
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            dateInput.value = today;
        }

    } catch (error) {
        console.error('Sayfa yükleme hatası:', error);
        alert('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
});

// Berberleri yükle
async function loadBarbers() {
    try {
        const barbersSnapshot = await firebase.firestore().collection('barbers').get();
        const barberSelect = document.getElementById('barberSelect');
        
        if (!barberSelect) return;

        barberSelect.innerHTML = '<option value="">Berber seçin</option>';
        
        barbersSnapshot.forEach(doc => {
            const barber = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = barber.businessName || barber.name;
            barberSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Berberler yüklenirken hata:', error);
        alert('Berberler yüklenirken bir hata oluştu');
    }
}

// Berber değiştiğinde hizmetleri yükle
async function handleBarberChange(event) {
    const barberId = event.target.value;
    if (!barberId) return;

    try {
        const servicesSnapshot = await firebase.firestore()
            .collection('barbers')
            .doc(barberId)
            .collection('services')
            .get();

        const servicesContainer = document.getElementById('servicesContainer');
        if (!servicesContainer) return;

        servicesContainer.innerHTML = '';
        
        servicesSnapshot.forEach(doc => {
            const service = doc.data();
            const serviceDiv = createServiceElement(doc.id, service);
            servicesContainer.appendChild(serviceDiv);
        });
    } catch (error) {
        console.error('Hizmetler yüklenirken hata:', error);
        alert('Hizmetler yüklenirken bir hata oluştu');
    }
}

// Hizmet elementi oluştur
function createServiceElement(id, service) {
    const div = document.createElement('div');
    div.className = 'service-item';
    div.innerHTML = `
        <input type="checkbox" id="service-${id}" name="services" value="${id}">
        <label for="service-${id}">
            <span class="service-name">${service.name}</span>
            <span class="service-details">
                <span class="service-duration">${service.duration} dk</span>
                <span class="service-price">₺${service.price}</span>
            </span>
        </label>
    `;
    return div;
}

// Randevu formunu gönder
async function handleAppointmentSubmit(event) {
    event.preventDefault();

    try {
        const user = await window.authService.getCurrentUser();
        if (!user) {
            throw new Error('Oturum açmanız gerekiyor');
        }

        const formData = new FormData(event.target);
        const barberId = formData.get('barber');
        const date = formData.get('date');
        const time = formData.get('time');
        const services = Array.from(formData.getAll('services'));
        const notes = formData.get('notes');

        if (!barberId || !date || !time || services.length === 0) {
            alert('Lütfen tüm gerekli alanları doldurun');
            return;
        }

        const appointment = {
            barberId,
            customerId: user.uid,
            date: firebase.firestore.Timestamp.fromDate(new Date(`${date}T${time}`)),
            services,
            notes,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection('appointments').add(appointment);
        
        alert('Randevunuz başarıyla oluşturuldu');
        window.location.href = '/customer/appointments.html';

    } catch (error) {
        console.error('Randevu oluşturma hatası:', error);
        alert('Randevu oluşturulurken bir hata oluştu');
    }
} 