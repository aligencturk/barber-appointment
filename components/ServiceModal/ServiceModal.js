import './ServiceModal.css';
import { Input } from '../Form/Input/Input.js';
import { Textarea } from '../Form/Textarea/Textarea.js';
import { Switch } from '../Form/Switch/Switch.js';

export class ServiceModal {
    constructor(options = {}) {
        this.service = options.service || {};
        this.onSave = options.onSave || null;
        this.onClose = options.onClose || null;
        this.isLoading = false;
        
        this.element = this.create();
        this.form = this.element.querySelector('.service-form');
        this.setupFormElements();
        this.setupEventListeners();
    }

    create() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-content">
                        <div class="modal-title">
                            <h2 style="color: #ffffff;">${this.service.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</h2>
                            <p style="color: #ffffff;">Müşterilerinize sunacağınız hizmeti tanımlayın</p>
                        </div>
                    </div>
                    <button type="button" class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form class="service-form" novalidate>
                    <div class="modal-body">
                        <!-- Hizmet Adı -->
                        <div class="form-group">
                            <label class="form-label">Hizmet Adı</label>
                            <div class="input-wrapper name-input"></div>
                        </div>

                        <!-- Hizmet Açıklaması -->
                        <div class="form-group">
                            <label class="form-label">Hizmet Açıklaması</label>
                            <div class="input-wrapper description-input"></div>
                        </div>

                        <div class="form-row">
                            <!-- Ücret -->
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fa-solid fa-turkish-lira-sign"></i>
                                    Ücret
                                </label>
                                <div class="input-wrapper price-input"></div>
                            </div>

                            <!-- Süre -->
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-clock"></i>
                                    Süre
                                </label>
                                <div class="input-wrapper duration-input"></div>
                            </div>
                        </div>

                        <!-- Hizmet Görseli -->
                        <div class="form-group">
                            <label class="form-label">
                                Hizmet Görseli
                                <span class="label-badge">Opsiyonel</span>
                            </label>
                            <div class="image-upload" id="imageUpload">
                                <div class="image-upload-text">Görsel yüklemek için tıklayın veya sürükleyin</div>
                                <div class="image-upload-hint">PNG, JPG veya JPEG • Maks. 2MB</div>
                                <input type="file" id="serviceImage" accept="image/png,image/jpeg" style="display: none;">
                            </div>
                            <div id="imagePreview" class="image-preview" style="display: none;">
                                <img src="" alt="Hizmet görseli">
                                <button type="button" class="remove-image">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="form-hint">Hizmetinizi en iyi şekilde tanıtan bir görsel ekleyin</div>
                        </div>

                        <!-- Aktiflik Durumu -->
                        <div class="switch-group">
                            <div class="switch-content">
                                <div class="switch-label">Hizmet Aktif</div>
                                <div class="switch-hint">Müşteriler bu hizmet için randevu alabilir</div>
                            </div>
                            <div class="switch-toggle"></div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="cancel">
                            <i class="fas fa-times"></i>
                            İptal
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-check"></i>
                            ${this.service.id ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        return modal;
    }

    setupFormElements() {
        // Hizmet Adı Input
        this.nameInput = new Input({
            id: 'serviceName',
            name: 'serviceName',
            value: this.service.name || '',
            placeholder: 'Örn: Saç Kesimi, Sakal Tıraşı',
            required: true
        });
        this.element.querySelector('.name-input').appendChild(this.nameInput.render());

        // Hizmet Açıklaması
        this.descriptionInput = new Textarea({
            id: 'serviceDescription',
            name: 'serviceDescription',
            value: this.service.description || '',
            placeholder: 'Hizmetinizi detaylı bir şekilde açıklayın',
            maxLength: 500
        });
        const descriptionElement = this.descriptionInput.render();
        this.element.querySelector('.description-input').appendChild(descriptionElement);
        
        // Textarea otomatik boyutlandırma
        const textarea = descriptionElement.querySelector('textarea');
        if (textarea) {
            const adjustHeight = () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            };
            textarea.addEventListener('input', adjustHeight);
            setTimeout(adjustHeight, 0);
        }

        // Fiyat Input
        this.priceInput = new Input({
            id: 'servicePrice',
            name: 'servicePrice',
            type: 'number',
            value: this.service.price || '',
            placeholder: '0',
            required: true,
            validation: (value) => {
                if (!value) return 'Fiyat zorunludur';
                if (value <= 0) return 'Fiyat 0\'dan büyük olmalıdır';
                if (value > 100000) return 'Fiyat çok yüksek';
                return true;
            }
        });
        this.element.querySelector('.price-input').appendChild(this.priceInput.render());

        // Süre Input
        this.durationInput = new Input({
            id: 'serviceDuration',
            name: 'serviceDuration',
            type: 'number',
            value: this.service.duration || 30,
            placeholder: '30',
            required: true,
            validation: (value) => {
                if (!value) return 'Süre zorunludur';
                if (value < 5) return 'Süre en az 5 dakika olmalıdır';
                if (value > 240) return 'Süre en fazla 4 saat olabilir';
                return true;
            }
        });
        this.element.querySelector('.duration-input').appendChild(this.durationInput.render());

        // Aktif/Pasif Switch
        this.activeSwitch = new Switch({
            id: 'serviceActive',
            name: 'serviceActive',
            checked: this.service.active !== false,
            label: 'Hizmet Aktif'
        });
        this.element.querySelector('.switch-toggle').appendChild(this.activeSwitch.render());

        // Görsel Yükleme
        this.setupImageUpload();
    }

    setupImageUpload() {
        const imageUpload = this.element.querySelector('#imageUpload');
        const imageInput = this.element.querySelector('#serviceImage');
        const imagePreview = this.element.querySelector('#imagePreview');
        const previewImg = imagePreview.querySelector('img');

        // Görsel yükleme işlemleri
        imageUpload.addEventListener('click', () => imageInput.click());
        
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    this.showError('Görsel boyutu 2MB\'dan küçük olmalıdır');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    imagePreview.style.display = 'block';
                    imageUpload.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });

        // Görsel kaldırma
        imagePreview.querySelector('.remove-image').addEventListener('click', () => {
            imageInput.value = '';
            previewImg.src = '';
            imagePreview.style.display = 'none';
            imageUpload.style.display = 'block';
        });

        // Sürükle-bırak desteği
        imageUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUpload.classList.add('dragover');
        });

        imageUpload.addEventListener('dragleave', () => {
            imageUpload.classList.remove('dragover');
        });

        imageUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUpload.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                imageInput.files = e.dataTransfer.files;
                const event = new Event('change');
                imageInput.dispatchEvent(event);
            }
        });
    }

    setupEventListeners() {
        // Modal kapatma
        this.element.querySelector('.modal-close').addEventListener('click', () => this.close());
        this.element.querySelector('[data-action="cancel"]').addEventListener('click', () => this.close());
        
        // Overlay tıklama
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.close();
        });

        // Form submit
        this.element.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));

        // Escape tuşu ile kapatma
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.element.parentNode) this.close();
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        // Form verilerini topla
        const formData = new FormData(e.target);
        const serviceData = {
            name: formData.get('serviceName'),
            description: formData.get('serviceDescription'),
            price: Number(formData.get('servicePrice')),
            duration: Number(formData.get('serviceDuration')),
            active: this.activeSwitch.checked
        };

        // Validasyon
        if (!this.validateForm(serviceData)) return;

        // Görsel varsa ekle
        const imageFile = formData.get('serviceImage');
        if (imageFile && imageFile.size > 0) {
            serviceData.image = await this.processImage(imageFile);
        }

        this.setLoading(true);
        try {
            if (this.service.id) {
                serviceData.id = this.service.id;
            }

            if (this.onSave) {
                await this.onSave(serviceData);
            }
            
            this.close();
        } catch (error) {
            console.error('Form gönderilirken hata:', error);
            this.showError('Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            this.setLoading(false);
        }
    }

    validateForm(data) {
        let isValid = true;

        // Hizmet adı kontrolü
        if (!data.name || data.name.length < 3) {
            this.showError('Hizmet adı en az 3 karakter olmalıdır');
            isValid = false;
        }

        // Fiyat kontrolü
        if (!data.price || data.price <= 0) {
            this.showError('Geçerli bir fiyat giriniz');
            isValid = false;
        }

        // Süre kontrolü
        if (!data.duration || data.duration < 5 || data.duration > 240) {
            this.showError('Süre 5-240 dakika arasında olmalıdır');
            isValid = false;
        }

        return isValid;
    }

    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        const modalBody = this.element.querySelector('.modal-body');
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    setLoading(loading) {
        this.isLoading = loading;
        const submitButton = this.element.querySelector('.btn-primary');
        
        if (loading) {
            submitButton.disabled = true;
            submitButton.classList.add('btn-loading');
        } else {
            submitButton.disabled = false;
            submitButton.classList.remove('btn-loading');
        }
    }

    open() {
        document.body.appendChild(this.element);
        document.body.style.overflow = 'hidden';
    }

    close() {
        if (this.onClose) this.onClose();
        document.body.style.overflow = '';
        this.element.remove();
    }
}

export default ServiceModal; 