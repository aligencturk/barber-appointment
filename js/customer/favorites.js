// DOM Elements
const favoriteCountEl = document.getElementById('favoriteCount');
const searchInput = document.querySelector('.search-box input');
const viewButtons = document.querySelectorAll('.view-btn');
const sortSelect = document.getElementById('sortSelect');
const filterButtons = document.querySelectorAll('.filter-btn');
const favoritesGrid = document.getElementById('favoritesGrid');
const favoritesEmpty = document.querySelector('.favorites-empty');
const barberDetailModal = document.getElementById('barberDetailModal');

// State
let currentUser = null;
let currentView = 'grid';
let currentSort = 'rating';
let currentFilter = 'all';
let favorites = [];

// Auth State Observer
window.auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/customer/login.html';
        return;
    }

    // Kullanıcı tipini kontrol et
    try {
        const customerDoc = await window.db.collection('customers').doc(user.uid).get();
        if (!customerDoc.exists) {
            await window.auth.signOut();
            window.location.href = '/customer/login.html';
            return;
        }

        // Kullanıcı bilgilerini sakla
        currentUser = {
            id: user.uid,
            ...customerDoc.data()
        };

        // Favorileri yükle
        await loadFavorites();
        initializeEventListeners();
    } catch (error) {
        console.error('Kullanıcı kontrolü hatası:', error);
        window.location.href = '/customer/login.html';
    }
});

// Global Functions
window.openChat = function(barberId) {
    // Chat fonksiyonu implementasyonu eklenecek
    console.log('Chat opened with barber:', barberId);
};

window.openAppointment = function(barberId) {
    // Randevu alma fonksiyonu implementasyonu eklenecek
    window.location.href = `/customer/new-appointment.html?barberId=${barberId}`;
};

window.removeFavorite = async function(barberId) {
    try {
        const userId = window.auth.currentUser.uid;
        const userRef = window.db.collection('customers').doc(userId);
        
        await userRef.update({
            favorites: firebase.firestore.FieldValue.arrayRemove(barberId)
        });
        
        await loadFavorites();
        showSuccess('Berber favorilerden kaldırıldı.');
        if (barberDetailModal) {
            barberDetailModal.classList.remove('active');
        }
    } catch (error) {
        console.error('Error removing favorite:', error);
        showError('Berber favorilerden kaldırılırken bir hata oluştu.');
    }
};

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

// Initialize Page
async function initializePage() {
    try {
        // Get user data
        const userDoc = await window.db.collection('customers').doc(window.auth.currentUser.uid).get();
        currentUser = {
            id: window.auth.currentUser.uid,
            ...userDoc.data()
        };

        // Load favorites
        await loadFavorites();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Sayfa yüklenirken bir hata oluştu.');
    }
}

// Favorites Functions
async function loadFavorites() {
    try {
        // Kullanıcının favori berberlerini al
        const userDoc = await window.db.collection('customers').doc(currentUser.id).get();
        const favoriteIds = userDoc.data()?.favorites || [];
        
        if (favoriteIds.length === 0) {
            favoriteCountEl.textContent = '0';
            favoritesEmpty.style.display = 'flex';
            favoritesGrid.style.display = 'none';
            return;
        }

        // Favori berberlerin bilgilerini al
        const barbersSnapshot = await window.db.collection('barbers')
            .where(firebase.firestore.FieldPath.documentId(), 'in', favoriteIds)
            .get();

        favorites = barbersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Update UI
        favoriteCountEl.textContent = favorites.length;
        if (favorites.length === 0) {
            favoritesEmpty.style.display = 'flex';
            favoritesGrid.style.display = 'none';
        } else {
            favoritesEmpty.style.display = 'none';
            favoritesGrid.style.display = 'grid';
            renderFavorites();
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        showError('Favoriler yüklenirken bir hata oluştu.');
    }
}

function renderFavorites() {
    favoritesGrid.innerHTML = '';
    let displayFavorites = [...favorites];

    // Apply filters
    if (currentFilter !== 'all') {
        switch (currentFilter) {
            case 'open':
                displayFavorites = displayFavorites.filter(fav => isBarberOpen(fav.barber));
                break;
            case 'rated':
                displayFavorites = displayFavorites.filter(fav => fav.barber.reviewCount >= 10);
                break;
            case 'visited':
                displayFavorites = displayFavorites.filter(fav => fav.visitCount > 0);
                break;
        }
    }

    // Apply distance sorting if selected
    if (currentSort === 'distance' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                displayFavorites.sort((a, b) => 
                    calculateDistance(userLocation, a.barber.location) -
                    calculateDistance(userLocation, b.barber.location)
                );
                renderFavoriteCards(displayFavorites);
            },
            error => {
                console.error('Error getting location:', error);
                showError('Konum bilgisi alınamadı.');
                renderFavoriteCards(displayFavorites);
            }
        );
    } else {
        renderFavoriteCards(displayFavorites);
    }
}

function renderFavoriteCards(favorites) {
    favoritesGrid.className = `favorites-${currentView}`;
    
    favorites.forEach(favorite => {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        
        const isOpen = isBarberOpen(favorite);
        const distance = favorite.distance ? 
            `${favorite.distance.toFixed(1)} km` : 
            'Mesafe hesaplanıyor...';

        card.innerHTML = `
            <div class="card-header">
                <img src="${favorite.avatarUrl || '../assets/default-avatar.png'}" 
                     alt="${favorite.businessName}">
                <div class="status-badge ${isOpen ? 'open' : 'closed'}">
                    ${isOpen ? 'Açık' : 'Kapalı'}
                </div>
            </div>
            <div class="card-body">
                <h3>${favorite.businessName}</h3>
                <p class="address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${favorite.address}
                </p>
                <p class="distance">
                    <i class="fas fa-route"></i>
                    ${distance}
                </p>
                <div class="rating">
                    <div class="stars" style="--rating: ${favorite.rating || 0}"></div>
                    <span>${(favorite.rating || 0).toFixed(1)} (${favorite.reviewCount || 0})</span>
                </div>
                <div class="working-hours">
                    <i class="fas fa-clock"></i>
                    ${getWorkingHoursText(favorite.workingHours)}
                </div>
            </div>
            <div class="card-footer">
                <button class="chat-btn" onclick="openChat('${favorite.id}')">
                    <i class="fas fa-comments"></i>
                    Mesaj
                </button>
                <button class="appointment-btn" onclick="openAppointment('${favorite.id}')">
                    <i class="fas fa-calendar-plus"></i>
                    Randevu
                </button>
                <button class="remove-btn" onclick="removeFavorite('${favorite.id}')">
                    <i class="fas fa-heart-broken"></i>
                </button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openBarberDetail(favorite);
            }
        });

        favoritesGrid.appendChild(card);
    });
}

// Modal Functions
function openBarberDetail(favorite) {
    const barber = favorite.barber;

    // Update modal content
    document.getElementById('detailBarberAvatar').src = 
        barber.avatarUrl || '../assets/default-avatar.png';
    document.getElementById('detailBarberName').textContent = 
        barber.businessName;
    document.getElementById('detailBarberAddress').textContent = 
        barber.address;
    document.getElementById('detailBarberRating').textContent = 
        `${(barber.rating || 0).toFixed(1)} (${barber.reviewCount || 0} değerlendirme)`;
    document.querySelector('.stars').style.setProperty('--rating', barber.rating || 0);

    document.getElementById('detailWorkingHours').textContent = 
        getWorkingHoursText(barber.workingHours);
    document.getElementById('detailOpenStatus').textContent = 
        isBarberOpen(barber) ? 'Açık' : 'Kapalı';
    document.getElementById('detailOpenStatus').className = 
        `status ${isBarberOpen(barber) ? 'open' : 'closed'}`;

    document.getElementById('detailTotalAppointments').textContent = 
        (barber.totalAppointments || 0).toLocaleString('tr-TR');
    document.getElementById('detailTotalCustomers').textContent = 
        (barber.totalCustomers || 0).toLocaleString('tr-TR');
    document.getElementById('detailReviewCount').textContent = 
        (barber.reviewCount || 0).toLocaleString('tr-TR');
    document.getElementById('detailExperience').textContent = 
        barber.experience || 0;

    // Render services
    const servicesGrid = document.getElementById('detailServices');
    servicesGrid.innerHTML = (barber.services || []).map(service => `
        <div class="service-item">
            <div class="service-name">${service.name}</div>
            <div class="service-price">₺${service.price.toLocaleString('tr-TR')}</div>
            <div class="service-duration">${service.duration} dk</div>
        </div>
    `).join('');

    // Render gallery
    const galleryGrid = document.getElementById('detailGallery');
    galleryGrid.innerHTML = (barber.gallery || []).map(image => `
        <div class="gallery-item">
            <img src="${image.url}" alt="${image.description}">
        </div>
    `).join('');

    // Render reviews
    const reviewsList = document.getElementById('detailReviews');
    reviewsList.innerHTML = (barber.reviews || []).slice(0, 3).map(review => `
        <div class="review-item">
            <div class="review-header">
                <img src="${review.userAvatar || '../assets/default-avatar.png'}" 
                     alt="${review.userName}">
                <div>
                    <h5>${review.userName}</h5>
                    <div class="stars" style="--rating: ${review.rating}"></div>
                </div>
                <span class="review-date">
                    ${new Date(review.date).toLocaleDateString('tr-TR')}
                </span>
            </div>
            <p class="review-text">${review.comment}</p>
        </div>
    `).join('');

    // Update action buttons
    document.getElementById('detailChatBtn').onclick = () => 
        openChat(barber.id);
    document.getElementById('detailAppointmentBtn').onclick = () => 
        openAppointment(barber.id);
    document.getElementById('detailRemoveFavoriteBtn').onclick = () => 
        removeFavorite(favorite.id);

    // Show modal
    barberDetailModal.classList.add('active');
}

// Event Listeners
function initializeEventListeners() {
    // View buttons
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderFavorites();
        });
    });

    // Sort select
    sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        loadFavorites();
    });

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderFavorites();
        });
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredFavorites = favorites.filter(fav => 
                fav.barber.businessName.toLowerCase().includes(searchTerm) ||
                fav.barber.address.toLowerCase().includes(searchTerm)
            );
            renderFavoriteCards(filteredFavorites);
        }, 300);
    });

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            barberDetailModal.classList.remove('active');
        });
    });
}

// Helper Functions
function isBarberOpen(barber) {
    if (!barber || !barber.workingHours) return false;

    const now = new Date();
    const day = now.getDay();
    const time = now.getHours() * 60 + now.getMinutes();

    const todayHours = barber.workingHours[day];
    if (!todayHours || !todayHours.isOpen) return false;

    const [openHour, openMinute] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    return time >= openTime && time <= closeTime;
}

function getWorkingHoursText(workingHours) {
    if (!workingHours) return 'Çalışma saatleri belirtilmemiş';

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const today = new Date().getDay();
    const todayHours = workingHours[today];

    return todayHours && todayHours.isOpen ? 
        `${todayHours.open} - ${todayHours.close}` : 
        'Kapalı';
}

function calculateDistance(point1, point2) {
    if (!point1 || !point2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Çıkış yapma fonksiyonu
async function logout() {
    try {
        await window.auth.signOut();
        window.location.href = '/customer/login.html';
    } catch (error) {
        console.error('Çıkış yapma hatası:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
} 