// Form elements
const registerForm = document.getElementById('registerForm');
const shopNameInput = document.getElementById('shopName');
const ownerNameInput = document.getElementById('ownerName');
const phoneInput = document.getElementById('phone');
const barberEmailInput = document.getElementById('email');
const addressInput = document.getElementById('address');
const barberPasswordInput = document.getElementById('password');
const barberConfirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const loadingSpinner = document.getElementById('loadingSpinner');

// Step navigation functions
function nextStep(currentStep) {
    if (validateStep(currentStep)) {
        document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.form-step[data-step="${currentStep + 1}"]`).classList.add('active');
        
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep + 1}"]`).classList.add('active');
    }
}

function prevStep(currentStep) {
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.form-step[data-step="${currentStep - 1}"]`).classList.add('active');
    
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep - 1}"]`).classList.add('active');
}

// Password visibility toggle functions
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('#password + button i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function toggleConfirmPasswordVisibility() {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const icon = document.querySelector('#confirmPassword + button i');
    
    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        confirmPasswordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Handle form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate current step
    if (!validateStep(3)) {
        return;
    }

    try {
        loadingSpinner.style.display = 'flex';

        // Create user with email and password
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            barberEmailInput.value,
            barberPasswordInput.value
        );

        // Add barber details to Firestore
        await firebase.firestore().collection('barbers').doc(userCredential.user.uid).set({
            shopName: shopNameInput.value,
            ownerName: ownerNameInput.value,
            email: barberEmailInput.value,
            phone: phoneInput.value.replace(/\s/g, ''),
            address: addressInput.value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            type: 'barber'
        });

        // Show success message
        showToast('Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.', 'success');

        // Save user type in session storage
        sessionStorage.setItem('userType', 'barber');
        sessionStorage.setItem('userName', shopNameInput.value);

        // Redirect to home page after 2 seconds
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);

    } catch (error) {
        console.error('Error during registration:', error);
        
        let errorMessage = 'Kayıt sırasında bir hata oluştu.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Bu e-posta adresi zaten kullanımda.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Geçersiz e-posta adresi.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'E-posta/şifre girişi etkin değil.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Şifre çok zayıf.';
                break;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// Step validation
function validateStep(step) {
    resetErrors();
    let isValid = true;

    switch (step) {
        case 1:
            // Validate shop name
            if (!shopNameInput.value.trim()) {
                showError(shopNameInput, 'İşletme adı zorunludur');
                isValid = false;
            } else if (shopNameInput.value.trim().length < 3) {
                showError(shopNameInput, 'İşletme adı en az 3 karakter olmalıdır');
                isValid = false;
            }

            // Validate owner name
            if (!ownerNameInput.value.trim()) {
                showError(ownerNameInput, 'İşletme sahibinin adı zorunludur');
                isValid = false;
            } else if (ownerNameInput.value.trim().length < 3) {
                showError(ownerNameInput, 'İşletme sahibinin adı en az 3 karakter olmalıdır');
                isValid = false;
            }
            break;

        case 2:
            // Validate phone
            if (!phoneInput.value.trim()) {
                showError(phoneInput, 'Telefon numarası zorunludur');
                isValid = false;
            } else {
                const phoneRegex = /^05[0-9]{9}$/;
                if (!phoneRegex.test(phoneInput.value.replace(/\s/g, ''))) {
                    showError(phoneInput, 'Geçerli bir telefon numarası giriniz (05XX XXX XX XX)');
                    isValid = false;
                }
            }

            // Validate email
            if (!barberEmailInput.value.trim()) {
                showError(barberEmailInput, 'E-posta adresi zorunludur');
                isValid = false;
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(barberEmailInput.value)) {
                    showError(barberEmailInput, 'Geçerli bir e-posta adresi giriniz');
                    isValid = false;
                }
            }

            // Validate address
            if (!addressInput.value.trim()) {
                showError(addressInput, 'Adres zorunludur');
                isValid = false;
            } else if (addressInput.value.trim().length < 10) {
                showError(addressInput, 'Lütfen geçerli bir adres giriniz');
                isValid = false;
            }
            break;

        case 3:
            // Validate password
            if (!barberPasswordInput.value) {
                showError(barberPasswordInput, 'Şifre zorunludur');
                isValid = false;
            } else if (barberPasswordInput.value.length < 6) {
                showError(barberPasswordInput, 'Şifre en az 6 karakter olmalıdır');
                isValid = false;
            }

            // Validate confirm password
            if (!barberConfirmPasswordInput.value) {
                showError(barberConfirmPasswordInput, 'Şifre tekrarı zorunludur');
                isValid = false;
            } else if (barberPasswordInput.value !== barberConfirmPasswordInput.value) {
                showError(barberConfirmPasswordInput, 'Şifreler eşleşmiyor');
                isValid = false;
            }

            // Validate terms
            if (!termsCheckbox.checked) {
                showError(termsCheckbox, 'Kullanım koşullarını kabul etmelisiniz');
                isValid = false;
            }
            break;
    }

    return isValid;
}

// Show error message
function showError(input, message) {
    const formGroup = input.closest('.form-group');
    let errorDiv = formGroup.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        formGroup.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    formGroup.classList.add('error');
}

// Reset errors
function resetErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.form-group.error').forEach(group => group.classList.remove('error'));
}

// Format phone number as user types
phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0) {
        if (value.length <= 3) {
            value = value;
        } else if (value.length <= 6) {
            value = value.slice(0, 3) + ' ' + value.slice(3);
        } else if (value.length <= 8) {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        } else {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 8) + ' ' + value.slice(8, 10);
        }
    }
    e.target.value = value;
}); 