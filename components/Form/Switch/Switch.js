export class Switch {
    constructor(options = {}) {
        this.id = options.id || crypto.randomUUID();
        this.name = options.name || '';
        this.checked = options.checked || false;
        this.label = options.label || '';
        this.onChange = options.onChange || (() => {});
        
        this.element = this.createSwitch();
    }

    createSwitch() {
        const wrapper = document.createElement('div');
        wrapper.className = 'switch-wrapper';

        const label = document.createElement('label');
        label.className = 'switch';
        label.htmlFor = this.id;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = this.id;
        input.name = this.name;
        input.checked = this.checked;
        input.addEventListener('change', (e) => {
            this.checked = e.target.checked;
            this.onChange(e);
        });

        const slider = document.createElement('span');
        slider.className = 'slider';

        if (this.label) {
            const labelText = document.createElement('span');
            labelText.className = 'switch-label';
            labelText.textContent = this.label;
            wrapper.appendChild(labelText);
        }

        label.appendChild(input);
        label.appendChild(slider);
        wrapper.appendChild(label);

        return wrapper;
    }

    render(container) {
        if (container) {
            container.appendChild(this.element);
        }
        return this.element;
    }
} 