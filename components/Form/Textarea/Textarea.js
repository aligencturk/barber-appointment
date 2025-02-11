import './Textarea.css';

export class Textarea {
    constructor(options = {}) {
        this.id = options.id || '';
        this.name = options.name || '';
        this.value = options.value || '';
        this.placeholder = options.placeholder || '';
        this.required = options.required || false;
        this.maxLength = options.maxLength || null;
        this.rows = options.rows || 4;
        this.icon = options.icon || null;
        this.validation = options.validation || null;
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'textarea-wrapper';

        if (this.icon) {
            const iconElement = document.createElement('i');
            iconElement.className = this.icon;
            wrapper.appendChild(iconElement);
        }

        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.id = this.id;
        textarea.name = this.name;
        textarea.value = this.value;
        textarea.placeholder = this.placeholder;
        textarea.required = this.required;
        textarea.style.resize = 'none';
        textarea.style.overflowY = 'hidden';
        textarea.style.minHeight = '80px';

        if (this.maxLength) {
            textarea.maxLength = this.maxLength;
        }

        // Otomatik boyutlandırma
        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        textarea.addEventListener('input', adjustHeight);
        
        // İlk yükleme için
        setTimeout(adjustHeight, 0);

        wrapper.appendChild(textarea);
        return wrapper;
    }
} 