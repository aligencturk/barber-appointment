class UsersService {
    constructor() {
        this.db = firebase.firestore();
        this.initialized = false;
        this.initializeAuth();
    }

    // Firebase Authentication'ı başlat
    async initializeAuth() {
        try {
            // Firebase Auth'un hazır olmasını bekle
            const user = await new Promise((resolve) => {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe(); // Listener'ı kaldır
                    resolve(user);
                });
            });

            if (!user) {
                console.log('Oturum açılmamış');
                window.location.href = '../pages/login.html';
                return;
            }

            if (user.email !== 'admin@berberotomasyon.com') {
                console.log('Admin yetkisi yok');
                window.location.href = '../pages/login.html';
                return;
            }

            // Admin yetkilerini kontrol et
            await this.checkAndSetAdminClaims();
            
            // Kullanıcıları yükle
            await this.loadUsers();

            this.initialized = true;

            // Başlatma tamamlandı event'ini gönder
            window.dispatchEvent(new Event('usersServiceInitialized'));
        } catch (error) {
            console.error('Authentication başlatma hatası:', error);
            // Kritik hata durumunda yönlendir
            if (!this.initialized) {
                window.location.href = '../pages/login.html';
            }
        }
    }

    // Admin claims kontrolü ve ayarlanması
    async checkAndSetAdminClaims() {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.log('Oturum açılmamış');
                return false;
            }

            // Admin email kontrolü
            if (currentUser.email !== 'admin@berberotomasyon.com') {
                console.log('Admin kullanıcısı değil');
                return false;
            }

            // Token'ı yenile
            await currentUser.getIdToken(true);
            return true;
        } catch (error) {
            console.error('Admin claims kontrolü sırasında hata:', error);
            return false;
        }
    }

    // Kullanıcıları yükle
    async loadUsers() {
        try {
            // Sayfa hazır değilse bekle
            if (!document.getElementById('usersTableBody')) {
                console.log('Tablo henüz hazır değil');
                return;
            }

            const tableBody = document.getElementById('usersTableBody');
            const userType = document.getElementById('userTypeFilter')?.value || 'all';
            const searchQuery = document.getElementById('searchInput')?.value?.toLowerCase() || '';

            // Kullanıcı tipine göre koleksiyonları belirle
            let collections = [];
            if (userType === 'all' || userType === 'customers') {
                collections.push('customers');
            }
            if (userType === 'all' || userType === 'barbers') {
                collections.push('barbers');
            }

            // Tüm kullanıcıları al
            let allUsers = [];
            for (const collection of collections) {
                // Cache'i devre dışı bırak ve en güncel verileri al
                const snapshot = await this.db.collection(collection)
                    .get({ source: 'server' });
                
                const users = snapshot.docs.map(doc => ({
                    id: doc.id,
                    type: collection === 'customers' ? 'Müşteri' : 'Berber',
                    ...doc.data()
                }));
                allUsers = [...allUsers, ...users];
            }

            // Arama filtresini uygula
            if (searchQuery) {
                allUsers = allUsers.filter(user => 
                    user.name?.toLowerCase().includes(searchQuery) ||
                    user.email?.toLowerCase().includes(searchQuery) ||
                    user.phone?.toLowerCase().includes(searchQuery)
                );
            }

            // Tarihe göre sırala
            allUsers.sort((a, b) => {
                // createdAt alanı yoksa veya geçersizse en sona koy
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;

                // Timestamp objesi ise toDate() kullan
                const dateA = typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : new Date(b.createdAt);

                return dateB - dateA;
            });

            // Tabloyu oluştur
            let html = '';
            if (allUsers.length === 0) {
                html = `
                    <tr>
                        <td colspan="6" class="empty-cell">
                            <i class="fas fa-info-circle"></i>
                            <span>Kullanıcı bulunamadı</span>
                        </td>
                    </tr>
                `;
            } else {
                html = allUsers.map(user => `
                    <tr>
                        <td>
                            <div class="user-info">
                                <span class="user-name">${user.name || 'İsimsiz'}</span>
                                <span class="user-phone">${user.phone || '-'}</span>
                            </div>
                        </td>
                        <td>${user.email || '-'}</td>
                        <td><span class="badge ${user.type === 'Müşteri' ? 'customer' : 'barber'}">${user.type}</span></td>
                        <td>
                            <span class="badge ${user.status === 'active' ? 'active' : 'inactive'}">
                                ${user.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                        </td>
                        <td>${this.formatDate(user.createdAt)}</td>
                        <td>
                            <div class="actions">
                                <button class="action-btn view" onclick="window.usersService.viewUser('${user.id}', '${user.type}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn edit" onclick="window.usersService.editUser('${user.id}', '${user.type}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="window.usersService.deleteUser('${user.id}', '${user.type}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }

            tableBody.innerHTML = html;

        } catch (error) {
            console.error('Kullanıcılar yüklenirken hata:', error);
            throw error;
        }
    }

    // Kullanıcı görüntüle
    async viewUser(userId, userType) {
        try {
            const collection = userType === 'Müşteri' ? 'customers' : 'barbers';
            const userDoc = await this.db.collection(collection).doc(userId).get();
            
            if (!userDoc.exists) {
                showToast('Kullanıcı bulunamadı', 'error');
                return;
            }

            const userData = userDoc.data();

            // Modal alanlarını doldur
            document.getElementById('viewName').textContent = userData.name || '-';
            document.getElementById('viewEmail').textContent = userData.email || '-';
            document.getElementById('viewPhone').textContent = userData.phone || '-';
            document.getElementById('viewType').textContent = userType;
            document.getElementById('viewStatus').textContent = userData.status === 'active' ? 'Aktif' : 'Pasif';
            document.getElementById('viewCreatedAt').textContent = this.formatDate(userData.createdAt) || '-';

            // Berber detaylarını göster/gizle
            const barberDetails = document.getElementById('barberDetails');
            if (userType === 'Berber') {
                document.getElementById('viewBusinessName').textContent = userData.businessName || '-';
                document.getElementById('viewAddress').textContent = userData.address || '-';
                document.getElementById('viewWorkingHours').textContent = userData.workingHours || '-';
                barberDetails.style.display = 'block';
            } else {
                barberDetails.style.display = 'none';
            }

            // Modalı göster
            document.getElementById('viewUserModal').style.display = 'block';
            
        } catch (error) {
            console.error('Kullanıcı görüntülenirken hata:', error);
            showToast('Kullanıcı görüntülenirken bir hata oluştu', 'error');
        }
    }

    // Kullanıcı düzenleme modalını aç
    async editUser(userId, userType) {
        try {
            const collection = userType === 'Müşteri' ? 'customers' : 'barbers';
            const userDoc = await this.db.collection(collection).doc(userId).get();
            
            if (!userDoc.exists) {
                showToast('Kullanıcı bulunamadı', 'error');
                return;
            }

            const userData = userDoc.data();

            // Form alanlarını doldur
            document.getElementById('editUserId').value = userId;
            document.getElementById('editUserType').value = userType;
            document.getElementById('editName').value = userData.name || '';
            document.getElementById('editEmail').value = userData.email || '';
            document.getElementById('editPhone').value = userData.phone || '';
            document.getElementById('editStatus').value = userData.status || 'active';

            // Berber detaylarını göster/gizle
            const barberDetails = document.getElementById('editBarberDetails');
            if (userType === 'Berber') {
                document.getElementById('editBusinessName').value = userData.businessName || '';
                document.getElementById('editAddress').value = userData.address || '';
                document.getElementById('editWorkingHours').value = userData.workingHours || '';
                barberDetails.style.display = 'block';
            } else {
                barberDetails.style.display = 'none';
            }

            // Modalı göster
            document.getElementById('editUserModal').style.display = 'block';
            
        } catch (error) {
            console.error('Kullanıcı düzenlenirken hata:', error);
            showToast('Kullanıcı düzenlenirken bir hata oluştu', 'error');
        }
    }

    // Kullanıcı güncelle
    async updateUser(event) {
        event.preventDefault();

        const userId = document.getElementById('editUserId').value;
        const userType = document.getElementById('editUserType').value;
        const collection = userType === 'Müşteri' ? 'customers' : 'barbers';

        try {
            // Form verilerini al
            const updateData = {
                name: document.getElementById('editName').value,
                email: document.getElementById('editEmail').value,
                phone: document.getElementById('editPhone').value,
                status: document.getElementById('editStatus').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Berber ise ek alanları ekle
            if (userType === 'Berber') {
                updateData.businessName = document.getElementById('editBusinessName').value;
                updateData.address = document.getElementById('editAddress').value;
                updateData.workingHours = document.getElementById('editWorkingHours').value;
            }

            // Firestore'u güncelle
            await this.db.collection(collection).doc(userId).update(updateData);

            // Modalı kapat
            document.getElementById('editUserModal').style.display = 'none';

            // Tabloyu yenile
            await this.loadUsers();

            showToast('Kullanıcı başarıyla güncellendi', 'success');
            
        } catch (error) {
            console.error('Kullanıcı güncellenirken hata:', error);
            showToast('Kullanıcı güncellenirken bir hata oluştu', 'error');
        }
    }

    // Kullanıcı sil
    async deleteUser(userId, userType) {
        try {
            // Admin kontrolü
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                showToast('Oturum açmanız gerekiyor', 'error');
                return;
            }

            if (currentUser.email !== 'admin@berberotomasyon.com') {
                showToast('Bu işlem için yetkiniz yok', 'error');
                return;
            }

            if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
                return;
            }

            console.log('Silme işlemi başlatıldı:', { userId, userType });

            let targetUserId = userId;
            let actualCollection = null;

            // Email ile arama yapılacaksa
            if (userId.includes('@')) {
                console.log('Email ile arama yapılıyor:', userId);
                
                // Önce customers koleksiyonunda ara
                console.log('Customers koleksiyonunda aranıyor...');
                let emailSnapshot = await this.db.collection('customers')
                    .where('email', '==', userId)
                    .limit(1)
                    .get();

                if (!emailSnapshot.empty) {
                    const doc = emailSnapshot.docs[0];
                    targetUserId = doc.id;
                    actualCollection = 'customers';
                    console.log('Kullanıcı customers koleksiyonunda bulundu:', targetUserId);
                } else {
                    // Customers'da bulunamadıysa barbers'da ara
                    console.log('Barbers koleksiyonunda aranıyor...');
                    emailSnapshot = await this.db.collection('barbers')
                        .where('email', '==', userId)
                        .limit(1)
                        .get();

                    if (!emailSnapshot.empty) {
                        const doc = emailSnapshot.docs[0];
                        targetUserId = doc.id;
                        actualCollection = 'barbers';
                        console.log('Kullanıcı barbers koleksiyonunda bulundu:', targetUserId);
                    } else {
                        console.log('Kullanıcı hiçbir koleksiyonda bulunamadı');
                        showToast('Kullanıcı bulunamadı', 'error');
                        return;
                    }
                }
            } else {
                // ID ile arama
                actualCollection = userType === 'Müşteri' ? 'customers' : 'barbers';
                const userDoc = await this.db.collection(actualCollection).doc(targetUserId).get();
                
                if (!userDoc.exists) {
                    showToast('Kullanıcı bulunamadı', 'error');
                    return;
                }
            }

            // Randevuları sil
            console.log('Randevular aranıyor...');
            const appointmentsSnapshot = await this.db.collection('appointments')
                .where(actualCollection === 'customers' ? 'customerId' : 'barberId', '==', targetUserId)
                .get();

            console.log(`${appointmentsSnapshot.size} adet randevu bulundu`);

            try {
                // Önce doğrudan silmeyi dene
                await this.db.collection(actualCollection).doc(targetUserId).delete();
                
                // Randevuları tek tek sil
                const deletePromises = appointmentsSnapshot.docs.map(doc => 
                    this.db.collection('appointments').doc(doc.id).delete()
                );
                
                await Promise.all(deletePromises);
                
                // Silme işlemini doğrula
                const verifyDoc = await this.db.collection(actualCollection).doc(targetUserId).get();
                if (verifyDoc.exists) {
                    throw new Error('Kullanıcı silinemedi');
                }

                console.log('Silme işlemi başarılı');
                showToast('Kullanıcı başarıyla silindi', 'success');

                // Tabloyu yenile
                await this.loadUsers();
                
                // Sayfayı yenile
                window.location.reload();
            } catch (deleteError) {
                console.error('Silme işlemi sırasında hata:', deleteError);
                
                // Batch işlemi ile tekrar dene
                console.log('Batch işlemi ile tekrar deneniyor...');
                const batch = this.db.batch();

                // Kullanıcı dokümanını batch'e ekle
                batch.delete(this.db.collection(actualCollection).doc(targetUserId));

                // Randevuları batch'e ekle
                appointmentsSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // Batch işlemini gerçekleştir
                await batch.commit();

                // Silme işlemini tekrar doğrula
                const verifyDocAgain = await this.db.collection(actualCollection).doc(targetUserId).get();
                if (verifyDocAgain.exists) {
                    throw new Error('Kullanıcı batch işlemi ile de silinemedi');
                }

                console.log('Batch silme işlemi başarılı');
                showToast('Kullanıcı başarıyla silindi', 'success');

                // Tabloyu yenile
                await this.loadUsers();
                
                // Sayfayı yenile
                window.location.reload();
            }

        } catch (error) {
            console.error('Kullanıcı silinirken hata:', error);
            showToast('Kullanıcı silinirken bir hata oluştu: ' + error.message, 'error');
        }
    }

    // Tarih formatla
    formatDate(timestamp) {
        if (!timestamp) return '-';
        
        try {
            // Timestamp objesi ise toDate() kullan
            const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
            
            return date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Tarih formatlanırken hata:', error);
            return '-';
        }
    }
}

// Service'i global olarak kullanılabilir yap
window.usersService = new UsersService();

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const userTypeFilter = document.getElementById('userTypeFilter');

    // Arama ve filtreleme
    searchInput?.addEventListener('input', debounce(() => {
        window.usersService.loadUsers();
    }, 500));

    userTypeFilter?.addEventListener('change', () => {
        window.usersService.loadUsers();
    });
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