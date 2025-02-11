export class Input {
    constructor(options = {}) {
        this.id = options.id || '';
        this.type = options.type || 'text';
        this.name = options.name || '';
        this.value = options.value || '';
        this.placeholder = options.placeholder || '';
        this.label = options.label || '';
        this.required = options.required || false;
        this.disabled = options.disabled || false;
        this.readonly = options.readonly || false;
        this.className = options.className || '';
        this.validation = options.validation || null;
        this.icon = options.icon || null;
        this.hint = options.hint || '';
        this.error = options.error || '';
        
        // Event handlers
        this.onChange = options.onChange || null;
        this.onFocus = options.onFocus || null;
        this.onBlur = options.onBlur || null;
        
        this.element = this.create();
    }

    create() {
        const wrapper = document.createElement('div');
        wrapper.className = `form-group ${this.className}`;

        // Label
        if (this.label) {
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = this.label;
            if (this.id) {
                label.htmlFor = this.id;
            }
            if (this.required) {
                const required = document.createElement('span');
                required.className = 'required-mark';
                required.textContent = '*';
                label.appendChild(required);
            }
            wrapper.appendChild(label);
        }

        // Input Container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';

        // Icon (if exists)
        if (this.icon) {
            const iconEl = document.createElement('i');
            iconEl.className = `input-icon ${this.icon}`;
            inputContainer.appendChild(iconEl);
        }

        // Input Element
        const input = document.createElement('input');
        if (this.id) {
            input.id = this.id;
        }
        input.type = this.type;
        input.name = this.name;
        input.value = this.value;
        input.placeholder = this.placeholder;
        input.className = 'form-control';
        input.required = this.required;
        input.disabled = this.disabled;
        input.readOnly = this.readonly;

        // Event Listeners
        input.addEventListener('input', (e) => {
            this.value = e.target.value;
            this.validate();
            if (this.onChange) this.onChange(e);
        });

        input.addEventListener('focus', (e) => {
            inputContainer.classList.add('focused');
            if (this.onFocus) this.onFocus(e);
        });

        input.addEventListener('blur', (e) => {
            inputContainer.classList.remove('focused');
            this.validate();
            if (this.onBlur) this.onBlur(e);
        });

        inputContainer.appendChild(input);
        wrapper.appendChild(inputContainer);

        // Hint Text
        if (this.hint) {
            const hintEl = document.createElement('div');
            hintEl.className = 'input-hint';
            hintEl.textContent = this.hint;
            wrapper.appendChild(hintEl);
        }

        // Error Message
        const errorEl = document.createElement('div');
        errorEl.className = 'input-error';
        errorEl.style.display = 'none';
        wrapper.appendChild(errorEl);

        this.inputElement = input;
        this.errorElement = errorEl;
        this.wrapperElement = wrapper;

        return wrapper;
    }

    // Validation
    validate() {
        if (!this.validation) return true;

        const value = this.getValue();
        let isValid = true;
        let errorMessage = '';

        if (this.required && !value) {
            isValid = false;
            errorMessage = 'Bu alan zorunludur';
        } else if (this.validation) {
            if (typeof this.validation === 'function') {
                const result = this.validation(value);
                isValid = result === true;
                errorMessage = typeof result === 'string' ? result : '';
            } else if (this.validation instanceof RegExp) {
                isValid = this.validation.test(value);
                errorMessage = isValid ? '' : 'Geçersiz değer';
            }
        }

        this.setError(isValid ? '' : errorMessage);
        return isValid;
    }

    // Getter/Setter Methods
    getValue() {
        return this.inputElement.value;
    }

    setValue(value) {
        this.value = value;
        this.inputElement.value = value;
        this.validate();
    }

    setError(error) {
        this.error = error;
        if (error) {
            this.wrapperElement.classList.add('has-error');
            this.errorElement.textContent = error;
            this.errorElement.style.display = 'block';
        } else {
            this.wrapperElement.classList.remove('has-error');
            this.errorElement.style.display = 'none';
        }
    }

    setDisabled(disabled) {
        this.disabled = disabled;
        this.inputElement.disabled = disabled;
        this.wrapperElement.classList.toggle('disabled', disabled);
    }

    setReadonly(readonly) {
        this.readonly = readonly;
        this.inputElement.readOnly = readonly;
        this.wrapperElement.classList.toggle('readonly', readonly);
    }

    focus() {
        this.inputElement.focus();
    }

    blur() {
        this.inputElement.blur();
    }

    clear() {
        this.setValue('');
    }

    render() {
        return this.element;
    }
} 