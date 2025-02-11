class Button {
    constructor(options = {}) {
        this.type = options.type || 'primary';
        this.size = options.size || 'medium';
        this.disabled = options.disabled || false;
        this.text = options.text || '';
        this.icon = options.icon || null;
        this.onClick = options.onClick || null;
        
        this.element = this.create();
    }

    create() {
        const button = document.createElement('button');
        
        // Temel sınıfları ekle
        button.className = `btn btn-${this.type} btn-${this.size}`;
        
        // Disabled durumu
        if (this.disabled) {
            button.disabled = true;
            button.classList.add('btn-disabled');
        }
        
        // İkon varsa ekle
        if (this.icon) {
            const icon = document.createElement('i');
            icon.className = this.icon;
            button.appendChild(icon);
        }
        
        // Metin ekle
        const textNode = document.createTextNode(this.text);
        button.appendChild(textNode);
        
        // Click event listener
        if (this.onClick) {
            button.addEventListener('click', this.onClick);
        }
        
        return button;
    }

    // Metotlar
    setText(text) {
        this.text = text;
        this.element.textContent = text;
        if (this.icon) {
            const icon = document.createElement('i');
            icon.className = this.icon;
            this.element.insertBefore(icon, this.element.firstChild);
        }
    }

    setDisabled(disabled) {
        this.disabled = disabled;
        this.element.disabled = disabled;
        this.element.classList.toggle('btn-disabled', disabled);
    }

    setType(type) {
        this.element.className = this.element.className.replace(/btn-\w+/, `btn-${type}`);
        this.type = type;
    }

    setSize(size) {
        this.element.className = this.element.className.replace(/btn-\w+/, `btn-${size}`);
        this.size = size;
    }

    setIcon(iconClass) {
        const existingIcon = this.element.querySelector('i');
        if (existingIcon) {
            existingIcon.remove();
        }

        if (iconClass) {
            const icon = document.createElement('i');
            icon.className = iconClass;
            this.element.insertBefore(icon, this.element.firstChild);
        }
        
        this.icon = iconClass;
    }

    // Element'i döndür
    render() {
        return this.element;
    }
}

export default Button; 