export class Select {
    constructor(options = {}) {
        this.id = options.id || '';
        this.name = options.name || '';
        this.value = options.value || '';
        this.label = options.label || '';
        this.placeholder = options.placeholder || 'Seçiniz';
        this.options = options.options || [];
        this.multiple = options.multiple || false;
        this.searchable = options.searchable || false;
        this.required = options.required || false;
        this.disabled = options.disabled || false;
        this.className = options.className || '';
        this.validation = options.validation || null;
        this.icon = options.icon || null;
        this.hint = options.hint || '';
        this.error = options.error || '';
        
        // Event handlers
        this.onChange = options.onChange || null;
        this.onFocus = options.onFocus || null;
        this.onBlur = options.onBlur || null;
        this.onSearch = options.onSearch || null;
        
        this.isOpen = false;
        this.selectedOptions = new Set(Array.isArray(this.value) ? this.value : [this.value]);
        this.searchQuery = '';
        
        this.element = this.create();
    }

    create() {
        const wrapper = document.createElement('div');
        wrapper.className = `form-group select-group ${this.className}`;

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

        // Select Container
        const selectContainer = document.createElement('div');
        selectContainer.className = 'select-container';

        // Icon
        if (this.icon) {
            const iconEl = document.createElement('i');
            iconEl.className = `select-icon ${this.icon}`;
            selectContainer.appendChild(iconEl);
        }

        // Select Element
        const select = document.createElement('select');
        if (this.id) {
            select.id = this.id;
        }
        select.name = this.name;
        select.className = 'form-control';
        select.required = this.required;
        select.disabled = this.disabled;
        select.multiple = this.multiple;

        // Search Input (if searchable)
        if (this.searchable) {
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'select-search';
            searchInput.placeholder = this.placeholder;
            
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.filterOptions();
                if (this.onSearch) this.onSearch(e);
            });
            
            selectContainer.appendChild(searchInput);
            this.searchInput = searchInput;
        } else {
            select.addEventListener('change', () => this.selectOption(this.options[select.selectedIndex]));
        }

        // Dropdown Arrow
        const arrow = document.createElement('i');
        arrow.className = 'select-arrow fas fa-chevron-down';
        selectContainer.appendChild(arrow);

        selectContainer.appendChild(select);

        // Dropdown Menu
        const dropdown = document.createElement('div');
        dropdown.className = 'select-dropdown';
        this.renderOptions(dropdown);
        selectContainer.appendChild(dropdown);

        // Event Listeners
        select.addEventListener('click', (e) => {
            if (!this.disabled) {
                this.toggleDropdown();
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                this.closeDropdown();
            }
        });

        wrapper.appendChild(selectContainer);

        // Hint Text
        if (this.hint) {
            const hintEl = document.createElement('div');
            hintEl.className = 'select-hint';
            hintEl.textContent = this.hint;
            wrapper.appendChild(hintEl);
        }

        // Error Message
        const errorEl = document.createElement('div');
        errorEl.className = 'select-error';
        errorEl.style.display = 'none';
        wrapper.appendChild(errorEl);

        this.displayElement = select;
        this.dropdownElement = dropdown;
        this.errorElement = errorEl;
        this.wrapperElement = wrapper;

        return wrapper;
    }

    renderOptions(dropdown) {
        dropdown.innerHTML = '';
        const filteredOptions = this.searchable ? 
            this.options.filter(opt => 
                opt.label.toLowerCase().includes(this.searchQuery.toLowerCase())
            ) : this.options;

        if (filteredOptions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'select-no-results';
            noResults.textContent = 'Sonuç bulunamadı';
            dropdown.appendChild(noResults);
            return;
        }

        filteredOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            optionEl.addEventListener('click', () => this.selectOption(option));
            dropdown.appendChild(optionEl);
        });
    }

    selectOption(option) {
        if (this.multiple) {
            if (this.selectedOptions.has(option.value)) {
                this.selectedOptions.delete(option.value);
            } else {
                this.selectedOptions.add(option.value);
            }
        } else {
            this.selectedOptions.clear();
            this.selectedOptions.add(option.value);
            this.closeDropdown();
        }

        this.value = this.multiple ? 
            Array.from(this.selectedOptions) : 
            Array.from(this.selectedOptions)[0] || '';

        this.updateDisplay();
        this.validate();

        if (this.onChange) {
            this.onChange({
                target: { value: this.value }
            });
        }
    }

    toggleDropdown() {
        this.isOpen ? this.closeDropdown() : this.openDropdown();
    }

    openDropdown() {
        this.isOpen = true;
        this.wrapperElement.classList.add('select-open');
        if (this.searchable) {
            this.searchInput.focus();
        }
    }

    closeDropdown() {
        this.isOpen = false;
        this.wrapperElement.classList.remove('select-open');
        if (this.searchable) {
            this.searchQuery = '';
            this.filterOptions();
        }
    }

    filterOptions() {
        this.renderOptions(this.dropdownElement);
    }

    getDisplayText() {
        const selected = this.options.filter(opt => 
            this.selectedOptions.has(opt.value)
        );

        if (selected.length === 0) return this.placeholder;
        
        if (this.multiple) {
            return selected.length > 1 ? 
                `${selected.length} öğe seçildi` : 
                selected[0].label;
        }
        
        return selected[0].label;
    }

    updateDisplay() {
        if (!this.searchable) {
            this.displayElement.textContent = this.getDisplayText();
            const arrow = document.createElement('i');
            arrow.className = 'select-arrow fas fa-chevron-down';
            this.displayElement.appendChild(arrow);
        }
    }

    validate() {
        if (!this.validation) return true;

        let isValid = true;
        let errorMessage = '';

        if (this.required && (!this.value || (Array.isArray(this.value) && this.value.length === 0))) {
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

    setValue(value) {
        this.value = value;
        this.selectedOptions = new Set(Array.isArray(value) ? value : [value]);
        this.updateDisplay();
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
        this.wrapperElement.classList.toggle('disabled', disabled);
    }

    clear() {
        this.selectedOptions.clear();
        this.value = this.multiple ? [] : '';
        this.updateDisplay();
        this.validate();
    }

    render() {
        return this.element;
    }
} 