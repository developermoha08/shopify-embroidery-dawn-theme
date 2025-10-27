(() => {
    // Wait for DOM to be ready
    const init = () => {
        const wrap = document.getElementById('embroidery');
        if (!wrap) return;
  
        const cfgEl = wrap.querySelector('[data-emb-config]');
        const cfg = cfgEl ? JSON.parse(cfgEl.textContent) : { price_cents: 0, currency: '' };
  
        const checkbox = wrap.querySelector('[data-emb-toggle-checkbox]');
        const panel = wrap.querySelector('[data-emb-panel]');
        const enabled = wrap.querySelector('input[name="emb_enabled"]');
        const nameIn = wrap.querySelector('[data-emb-name]');
        const countEl = wrap.querySelector('[data-emb-count]');
  
        const formatMoney = (cents, currency) => {
            try { 
                return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((cents || 0) / 100); 
            } catch (e) { 
                return ((cents || 0) / 100).toFixed(2) + (currency ? (' ' + currency) : ''); 
            }
        };
  
        // Toggle panel
        const setEnabled = (on) => {
            enabled.value = on ? 'true' : 'false';
            if (on) { 
                panel.classList.remove('hidden'); 
            } else { 
                panel.classList.add('hidden'); 
            }
        };
        
        checkbox.addEventListener('change', () => {
            setEnabled(checkbox.checked);
        });
        
        // Auto-expand and check if URL has embroidery parameter
        const urlParams = new URLSearchParams(window.location.search);
        const shouldExpand = urlParams.get('embroidery') === 'true';
        if (shouldExpand) {
            checkbox.checked = true;
        }
        setEnabled(shouldExpand);
  
        // Name validation function
        const validateNameField = () => {
            if (nameIn) {
                const nameValue = nameIn.value.trim();
                const isValid = nameValue.length >= 1;
                
                // Add/remove error styling
                if (isValid) {
                    nameIn.classList.remove('border-red-500');
                    nameIn.classList.add('border-gray-300');
                } else {
                    nameIn.classList.remove('border-gray-300');
                    nameIn.classList.add('border-red-500');
                }
                
                // Show/hide error message only if user has interacted
                let errorMsg = document.querySelector('.emb-name-error');
                if (!isValid && (nameIn.value.length > 0 || nameIn.dataset.touched === 'true')) {
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'emb-name-error text-red-500 text-xs mt-1';
                        errorMsg.textContent = 'Name must be at least 1 character';
                        nameIn.parentNode.appendChild(errorMsg);
                    }
                } else if (errorMsg) {
                    errorMsg.remove();
                }
                
                return isValid;
            }
            return true;
        };

        // Name counter and validation
        if (nameIn && countEl) {
            countEl.textContent = String(nameIn.value.length || 0);
            
            // Mark field as touched when user starts typing
            nameIn.addEventListener('input', () => {
                nameIn.dataset.touched = 'true';
                countEl.textContent = String(nameIn.value.length);
                validateNameField();
            });
            
            // Validate on blur (when user leaves the field)
            nameIn.addEventListener('blur', () => {
                nameIn.dataset.touched = 'true';
                validateNameField();
            });
        }
  
        // Hook into product form submission
        const productForm = document.querySelector('product-form');
        console.log("productForm", productForm);
        if (!productForm) {
            console.log("No product-form found, embroidery will not be added to cart");
            return;
        }

        const getSelectedValue = (name) => {
            // Try multiple selectors
            let el = wrap.querySelector(`input[name="${name}"]:checked`);
            if (!el) {
                el = document.querySelector(`input[name="${name}"]:checked`);
            }
            console.log(`Looking for input[name="${name}"]:checked:`, el);
            return el ? el.value : '';
        };

        // Override the form's onSubmitHandler to add embroidery properties
        const originalOnSubmit = productForm.onSubmitHandler;
        productForm.onSubmitHandler = function(evt) {
            console.log("product form submit");
            if (enabled.value === 'true') {
                // Validate name field before submission
                if (!validateNameField()) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    nameIn.focus();
                    return false;
                }
                
                const colour = getSelectedValue('emb_colour');
                const font = getSelectedValue('emb_font');
                const name = nameIn ? nameIn.value.trim() : '';

                // Add embroidery properties to form data
                const form = productForm.form;
                const properties = [
                    ['properties[_embroidery]', 'true'],
                    ['properties[Embroidery Name]', name],
                    ['properties[Embroidery Colour Code]', colour],
                    ['properties[Embroidery Font Code]', font],
                    ['properties[Embroidery Surcharge]', formatMoney(cfg.price_cents, cfg.currency)]
                ];
                
                properties.forEach(([name, value]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                });
            }
            
            // Call original submit handler
            originalOnSubmit.call(this, evt);
        };
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
  