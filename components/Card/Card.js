class Card {
    constructor(options = {}) {
        this.title = options.title || '';
        this.subtitle = options.subtitle || '';
        this.content = options.content || '';
        this.footer = options.footer || '';
        this.type = options.type || 'default';
        this.image = options.image || null;
        this.badge = options.badge || null;
        this.onClick = options.onClick || null;
        this.actions = options.actions || [];
        this.className = options.className || '';
        
        this.element = this.create();
    }

    create() {
        const card = document.createElement('div');
        card.className = `card card-${this.type} ${this.className}`;
        
        // Kart başlığı ve rozet
        if (this.title || this.badge) {
            const header = document.createElement('div');
            header.className = 'card-header';
            
            if (this.title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'card-title';
                titleEl.textContent = this.title;
                header.appendChild(titleEl);
            }
            
            if (this.badge) {
                const badgeEl = document.createElement('span');
                badgeEl.className = `badge badge-${this.badge.type}`;
                if (this.badge.icon) {
                    const icon = document.createElement('i');
                    icon.className = this.badge.icon;
                    badgeEl.appendChild(icon);
                }
                badgeEl.appendChild(document.createTextNode(this.badge.text));
                header.appendChild(badgeEl);
            }
            
            card.appendChild(header);
        }
        
        // Alt başlık
        if (this.subtitle) {
            const subtitleEl = document.createElement('div');
            subtitleEl.className = 'card-subtitle';
            subtitleEl.textContent = this.subtitle;
            card.appendChild(subtitleEl);
        }
        
        // Resim
        if (this.image) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'card-image';
            const img = document.createElement('img');
            img.src = this.image.src;
            img.alt = this.image.alt || '';
            imageContainer.appendChild(img);
            card.appendChild(imageContainer);
        }
        
        // İçerik
        if (this.content) {
            const contentEl = document.createElement('div');
            contentEl.className = 'card-content';
            
            if (typeof this.content === 'string') {
                contentEl.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                contentEl.appendChild(this.content);
            }
            
            card.appendChild(contentEl);
        }
        
        // Aksiyonlar
        if (this.actions.length > 0) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'card-actions';
            
            this.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `btn btn-${action.type || 'primary'}`;
                if (action.icon) {
                    const icon = document.createElement('i');
                    icon.className = action.icon;
                    button.appendChild(icon);
                }
                button.appendChild(document.createTextNode(action.text));
                if (action.onClick) {
                    button.addEventListener('click', action.onClick);
                }
                actionsEl.appendChild(button);
            });
            
            card.appendChild(actionsEl);
        }
        
        // Footer
        if (this.footer) {
            const footerEl = document.createElement('div');
            footerEl.className = 'card-footer';
            
            if (typeof this.footer === 'string') {
                footerEl.innerHTML = this.footer;
            } else if (this.footer instanceof HTMLElement) {
                footerEl.appendChild(this.footer);
            }
            
            card.appendChild(footerEl);
        }
        
        // Click event
        if (this.onClick) {
            card.addEventListener('click', this.onClick);
            card.style.cursor = 'pointer';
        }
        
        return card;
    }

    // Metotlar
    setTitle(title) {
        this.title = title;
        const titleEl = this.element.querySelector('.card-title');
        if (titleEl) titleEl.textContent = title;
    }

    setContent(content) {
        this.content = content;
        const contentEl = this.element.querySelector('.card-content');
        if (contentEl) {
            contentEl.innerHTML = '';
            if (typeof content === 'string') {
                contentEl.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                contentEl.appendChild(content);
            }
        }
    }

    setBadge(badge) {
        this.badge = badge;
        const header = this.element.querySelector('.card-header');
        const existingBadge = header?.querySelector('.badge');
        
        if (existingBadge) {
            existingBadge.remove();
        }
        
        if (badge && header) {
            const badgeEl = document.createElement('span');
            badgeEl.className = `badge badge-${badge.type}`;
            if (badge.icon) {
                const icon = document.createElement('i');
                icon.className = badge.icon;
                badgeEl.appendChild(icon);
            }
            badgeEl.appendChild(document.createTextNode(badge.text));
            header.appendChild(badgeEl);
        }
    }

    setType(type) {
        this.type = type;
        this.element.className = this.element.className.replace(/card-\w+/, `card-${type}`);
    }

    addAction(action) {
        this.actions.push(action);
        const actionsEl = this.element.querySelector('.card-actions') || 
            (() => {
                const el = document.createElement('div');
                el.className = 'card-actions';
                this.element.appendChild(el);
                return el;
            })();

        const button = document.createElement('button');
        button.className = `btn btn-${action.type || 'primary'}`;
        if (action.icon) {
            const icon = document.createElement('i');
            icon.className = action.icon;
            button.appendChild(icon);
        }
        button.appendChild(document.createTextNode(action.text));
        if (action.onClick) {
            button.addEventListener('click', action.onClick);
        }
        actionsEl.appendChild(button);
    }

    render() {
        return this.element;
    }
}

export default Card; 