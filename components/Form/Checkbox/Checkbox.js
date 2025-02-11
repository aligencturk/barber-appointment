class Checkbox {
    constructor(options = {}) {
        this.name = options.name || '';
        this.value = options.value || false;
        this.label = options.label || '';
        this.required = options.required || false;
        this.disabled = options.disabled || false;
        this.className = options.className || '';
        this.validation = options.validation || null;
        this.hint = options.hint || '';
        this.error = options.error || '';
        this.indeterminate = options.indeterminate || false;
        this.color = options.color || 'primary';
        
        // Event handlers
        this.onChange = options.onChange || null;
        this.onFocus = options.onFocus || null;
        this.onBlur = options.onBlur || null;
        
        this.element = this.create();
    }

    create() {
        const wrapper = document.createElement('div');
        wrapper.className = `checkbox-group ${this.className}`;

        // Checkbox Container
        const container = document.createElement('label');
        container.className = 'checkbox-container';

        // Hidden Input (for form submission)
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = this.name;
        input.checked = this.value;
        input.disabled = this.disabled;
        input.className = 'checkbox-input';
        input.indeterminate = this.indeterminate;

        // Custom Checkbox
        const checkmark = document.createElement('span');
        checkmark.className = `checkbox-checkmark checkbox-${this.color}`;

        // Label Text
        const labelText = document.createElement('span');
        labelText.className = 'checkbox-label';
        labelText.textContent = this.label;
        if (this.required) {
            const required = document.createElement('span');
            required.className = 'required-mark';
            required.textContent = '*';
            labelText.appendChild(required);
        }

        // Event Listeners
        input.addEventListener('change', (e) => {
            this.value = e.target.checked;
            this.validate();
            if (this.onChange) this.onChange(e);
        });

        input.addEventListener('focus', (e) => {
            container.classList.add('focused');
            if (this.onFocus) this.onFocus(e);
        });

        input.addEventListener('blur', (e) => {
            container.classList.remove('focused');
            if (this.onBlur) this.onBlur(e);
        });

        // Assemble Elements
        container.appendChild(input);
        container.appendChild(checkmark);
        container.appendChild(labelText);
        wrapper.appendChild(container);

        // Hint Text
        if (this.hint) {
            const hintEl = document.createElement('div');
            hintEl.className = 'checkbox-hint';
            hintEl.textContent = this.hint;
            wrapper.appendChild(hintEl);
        }

        // Error Message
        const errorEl = document.createElement('div');
        errorEl.className = 'checkbox-error';
        errorEl.style.display = 'none';
        wrapper.appendChild(errorEl);

        this.inputElement = input;
        this.errorElement = errorEl;
        this.wrapperElement = wrapper;
        this.containerElement = container;

        return wrapper;
    }

    validate() {
        if (!this.validation) return true;

        let isValid = true;
        let errorMessage = '';

        if (this.required && !this.value) {
            isValid = false;
            errorMessage = 'Bu alan zorunludur';
        } else if (this.validation) {
            const result = this.validation(this.value);
            isValid = result === true;
            errorMessage = typeof result === 'string' ? result : '';
        }

        this.setError(isValid ? '' : errorMessage);
        return isValid;
    }

    getValue() {
        return this.inputElement.checked;
    }

    setValue(value) {
        this.value = value;
        this.inputElement.checked = value;
        this.validate();
    }

    setIndeterminate(value) {
        this.indeterminate = value;
        this.inputElement.indeterminate = value;
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

    focus() {
        this.inputElement.focus();
    }

    blur() {
        this.inputElement.blur();
    }

    toggle() {
        this.setValue(!this.value);
    }

    render() {
        return this.element;
    }
}

export default Checkbox; 