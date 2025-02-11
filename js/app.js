// Firestore referansı
const db = firebase.firestore();

// DOM elementleri
const appointmentForm = document.getElementById('appointmentForm');
const barberSelect = document.getElementById('barberSelect');
const appointmentTime = document.getElementById('appointmentTime');
const appointmentsDiv = document.getElementById('appointments');

// Çalışma saatlerini oluştur
function generateTimeSlots() {
    appointmentTime.innerHTML = '<option value="">Saat Seçin</option>';
    const startHour = 9;
    const endHour = 19;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of ['00', '30']) {
            const time = `${hour.toString().padStart(2, '0')}:${minute}`;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            appointmentTime.appendChild(option);
        }
    }
}

// Berberleri listele
async function loadBarbers() {
    const snapshot = await db.collection('users').where('userType', '==', 'barber').get();
    barberSelect.innerHTML = '<option value="">Berber Seçin</option>';
    
    snapshot.forEach(doc => {
        const barber = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = barber.name;
        barberSelect.appendChild(option);
    });
}

// Randevuları listele
async function loadAppointments() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    let query;
    if (userData.userType === 'barber') {
        query = db.collection('appointments').where('barberId', '==', user.uid);
    } else {
        query = db.collection('appointments').where('userId', '==', user.uid);
    }

    const snapshot = await query.get();
    appointmentsDiv.innerHTML = '';

    snapshot.forEach(doc => {
        const appointment = doc.data();
        const card = document.createElement('div');
        card.className = 'appointment-card';
        
        const date = new Date(appointment.date);
        const formattedDate = date.toLocaleDateString('tr-TR');
        
        card.innerHTML = `
            <p><strong>Tarih:</strong> ${formattedDate}</p>
            <p><strong>Saat:</strong> ${appointment.time}</p>
            <p><strong>${userData.userType === 'barber' ? 'Müşteri' : 'Berber'}:</strong> ${appointment.name}</p>
        `;
        
        if (date > new Date()) {
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'İptal Et';
            cancelBtn.onclick = () => cancelAppointment(doc.id);
            card.appendChild(cancelBtn);
        }
        
        appointmentsDiv.appendChild(card);
    });
}

// Randevu iptal
async function cancelAppointment(appointmentId) {
    try {
        await db.collection('appointments').doc(appointmentId).delete();
        loadAppointments();
        alert('Randevu başarıyla iptal edildi.');
    } catch (error) {
        alert('Randevu iptal edilirken bir hata oluştu: ' + error.message);
    }
}

// Randevu oluştur
appointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = firebase.auth().currentUser;
    const barberId = barberSelect.value;
    const date = document.getElementById('appointmentDate').value;
    const time = appointmentTime.value;
    
    if (!user || !barberId || !date || !time) {
        alert('Lütfen tüm alanları doldurun.');
        return;
    }

    try {
        // Seçilen tarih ve saatte randevu var mı kontrol et
        const existingAppointments = await db.collection('appointments')
            .where('barberId', '==', barberId)
            .where('date', '==', date)
            .where('time', '==', time)
            .get();

        if (!existingAppointments.empty) {
            alert('Bu tarih ve saatte randevu dolu.');
            return;
        }

        // Berber bilgilerini al
        const barberDoc = await db.collection('users').doc(barberId).get();
        const barberData = barberDoc.data();

        // Randevu oluştur
        await db.collection('appointments').add({
            userId: user.uid,
            barberId: barberId,
            date: date,
            time: time,
            name: barberData.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Randevu başarıyla oluşturuldu.');
        appointmentForm.reset();
        loadAppointments();
    } catch (error) {
        alert('Randevu oluşturulurken bir hata oluştu: ' + error.message);
    }
});

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    generateTimeSlots();
    loadBarbers();
    
    // Oturum durumu değiştiğinde randevuları güncelle
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadAppointments();
        }
    });
}); 