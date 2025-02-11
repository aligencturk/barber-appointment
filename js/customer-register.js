// Form elements
const registerForm = document.getElementById('registerForm');
const fullNameInput = document.getElementById('fullName');
const phoneInput = document.getElementById('phone');
const customerEmailInput = document.getElementById('email');
const customerPasswordInput = document.getElementById('password');
const customerConfirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const loadingSpinner = document.getElementById('loadingSpinner');

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
            customerEmailInput.value,
            customerPasswordInput.value
        );

        // Add customer details to Firestore
        await firebase.firestore().collection('customers').doc(userCredential.user.uid).set({
            fullName: fullNameInput.value,
            email: customerEmailInput.value,
            phone: phoneInput.value.replace(/\s/g, ''),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'customer'
        });

        // Show success message
        showToast('Hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...', 'success');

        // Save user type in session storage
        sessionStorage.setItem('userType', 'customer');
        sessionStorage.setItem('userName', fullNameInput.value);

        // Redirect to customer dashboard after 2 seconds
        setTimeout(() => {
            window.location.href = '/customer/dashboard.html';
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
            // Validate full name
            if (!fullNameInput.value.trim()) {
                showError(fullNameInput, 'Ad Soyad alanı zorunludur');
                isValid = false;
            } else if (fullNameInput.value.trim().length < 3) {
                showError(fullNameInput, 'Ad Soyad en az 3 karakter olmalıdır');
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
            if (!customerEmailInput.value.trim()) {
                showError(customerEmailInput, 'E-posta adresi zorunludur');
                isValid = false;
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(customerEmailInput.value)) {
                    showError(customerEmailInput, 'Geçerli bir e-posta adresi giriniz');
                    isValid = false;
                }
            }
            break;

        case 3:
            // Validate password
            if (!customerPasswordInput.value) {
                showError(customerPasswordInput, 'Şifre zorunludur');
                isValid = false;
            } else if (customerPasswordInput.value.length < 6) {
                showError(customerPasswordInput, 'Şifre en az 6 karakter olmalıdır');
                isValid = false;
            }

            // Validate confirm password
            if (!customerConfirmPasswordInput.value) {
                showError(customerConfirmPasswordInput, 'Şifre tekrarı zorunludur');
                isValid = false;
            } else if (customerPasswordInput.value !== customerConfirmPasswordInput.value) {
                showError(customerConfirmPasswordInput, 'Şifreler eşleşmiyor');
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