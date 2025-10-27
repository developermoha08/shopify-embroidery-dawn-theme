(() => {
    let isUpdating = false;
    let embroideryState = new Map();
    
    const saveEmbroideryState = () => {
        document.querySelectorAll('.cart-item').forEach(item => {
            const checkbox = item.querySelector('[data-emb-cart-toggle]');
                const surchargeElement = item.querySelector('[data-emb-surcharge]');
            if (checkbox && surchargeElement) {
                embroideryState.set(checkbox.getAttribute('data-line-key'), {
                    checked: checkbox.checked,
                    surcharge: surchargeElement.getAttribute('data-emb-surcharge')
                });
            }
        });
    };
    
    const restoreEmbroideryState = () => {
        embroideryState.forEach((state, lineKey) => {
            const checkbox = document.querySelector(`[data-line-key="${lineKey}"]`);
            if (checkbox) checkbox.checked = state.checked;
        });
    };
    
    const toggleTotals = (show = true) => {
        const elements = [
            ...document.querySelectorAll('.totals'),
            ...document.querySelectorAll('.totals__total'),
            ...document.querySelectorAll('.totals__total-value')
        ];
        elements.forEach(el => el.style.display = show ? '' : 'none');
    };
    
    const updateCartTotal = (hideFirst = true) => {
        if (isUpdating) return;
        
        isUpdating = true;
        if (hideFirst) toggleTotals(false);
        
        let totalSurcharge = 0;
        embroideryState.forEach((state, lineKey) => {
            if (state.checked && state.surcharge) {
                const surchargePerItem = parseFloat(state.surcharge.replace(/\./g, '')) || 0;
                const quantityElement = document.querySelector(`[data-line-key="${lineKey}"]`)?.closest('.cart-item')?.querySelector('.quantity__input');
                const quantity = quantityElement ? parseInt(quantityElement.value) || 1 : 1;
                totalSurcharge += surchargePerItem * quantity;
            }
        });
        
        document.querySelectorAll('.totals__total-value').forEach(element => {
            const currentText = element.textContent || element.innerText;
            const currentAmount = parseFloat(currentText.replace(/[^\d.,]/g, '').replace(/\./g, '')) || 0;
            const newTotal = currentAmount + totalSurcharge;
            const currencySymbol = currentText.match(/[^\d.,\s]/g)?.[0] || '₫';
            const formattedTotal = newTotal.toLocaleString('vi-VN');
            
            element.textContent = `${formattedTotal}${currencySymbol}`;
            
                const surchargeNote = document.querySelector('.embroidery-surcharge-note');
            if (totalSurcharge > 0) {
                let noteContent = `<span>+ Embroidery surcharge:</span><span>${totalSurcharge.toLocaleString('vi-VN')}${currencySymbol}</span>`;
                
                const embroideryItems = Array.from(embroideryState.entries()).filter(([_, state]) => state.checked && state.surcharge);
                if (embroideryItems.length > 1) {
                    const breakdown = embroideryItems.map(([lineKey, state]) => {
                        const surchargePerItem = parseFloat(state.surcharge.replace(/\./g, '')) || 0;
                        const quantityElement = document.querySelector(`[data-line-key="${lineKey}"]`)?.closest('.cart-item')?.querySelector('.quantity__input');
                        const quantity = quantityElement ? parseInt(quantityElement.value) || 1 : 1;
                        const itemTotal = surchargePerItem * quantity;
                        return `${quantity} × ${surchargePerItem.toLocaleString('vi-VN')}${currencySymbol}`;
                    }).join(' + ');
                    noteContent += `<div style="font-size: 0.75rem; margin-top: 0.25rem; opacity: 0.8;">(${breakdown})</div>`;
                }
                
                if (!surchargeNote) {
                    const note = document.createElement('div');
                    note.className = 'embroidery-surcharge-note';
                    note.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280; flex-direction: column; align-items: flex-start;';
                    element.parentNode.appendChild(note);
                } else {
                    surchargeNote.innerHTML = noteContent;
                }
            } else if (surchargeNote) {
                surchargeNote.remove();
            }
        });
        
        isUpdating = false;
        toggleTotals(true);
    };

    const getDefaultEmbroideryValues = () => {
        const productData = window.productData || {};
        const template = productData.embroidery_template;
        
            return {
                'Embroidery Name': 'Custom Name',
            'Embroidery Colour Code': template?.colors?.[0]?.code || 'default',
            'Embroidery Font Code': template?.fonts?.[0]?.code || 'default',
            'Embroidery Surcharge': template?.price ? `+${template.price}` : '+$5.00'
        };
    };

    const onToggle = async (e) => {
        const checkbox = e.target.closest('[data-emb-cart-toggle]');
        if (!checkbox) return;
        
        const lineKey = checkbox.getAttribute('data-line-key');
        const turnOn = checkbox.checked;
        
        saveEmbroideryState();
        toggleTotals(false);
        checkbox.disabled = true;
        
        try {
            const props = turnOn ? {
                    _embroidery: 'true',
                ...getDefaultEmbroideryValues()
            } : {
                    _embroidery: null,
                    'Embroidery Name': null,
                    'Embroidery Colour Code': null,
                    'Embroidery Font Code': null,
                    'Embroidery Surcharge': null
                };
            
            const response = await fetch(`${window.routes.cart_change_url}.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: lineKey, properties: props })
            });
            
            if (!response.ok) throw new Error('Failed to update cart');
            
            const cart = await response.json();
            
            if (window.Shopify?.theme?.sections) {
                document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
                restoreEmbroideryState();
                updateCartTotal(false);
            } else {
                window.location.reload();
            }
        } catch (error) {
            checkbox.checked = !turnOn;
            checkbox.disabled = false;
        }
    };
    
    const initializeCart = () => {
        document.addEventListener('change', onToggle);
        saveEmbroideryState();
        updateCartTotal(false);
        toggleTotals(true);
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCart);
    } else {
        initializeCart();
    }
    
    const cartEvents = [
        'cart:updated', 'cart:refresh', 'cart:change', 'cart:add', 'cart:remove',
        'shopify:section:load', 'shopify:section:reorder', 'shopify:section:unload',
        'cart:open', 'cart:close', 'cart:drawer:open', 'cart:drawer:close',
        'cart:item:add', 'cart:item:remove', 'cart:item:update'
    ];
    
    cartEvents.forEach(eventName => {
        document.addEventListener(eventName, () => {
            toggleTotals(false);
            updateCartTotal(false);
            toggleTotals(true);
        });
    });
    
    const cartObserver = new MutationObserver((mutations) => {
        const shouldUpdate = mutations.some(mutation => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const target = mutation.target;
                return target.closest && (
                    target.closest('.cart-item') || 
                    target.closest('.totals') ||
                    target.closest('[data-cart-items]') ||
                    target.closest('#main-cart-items') ||
                    target.closest('.cart-drawer') ||
                    target.closest('.cart__footer')
                );
            }
            return false;
        });
        
        if (shouldUpdate && !isUpdating) {
            toggleTotals(false);
            updateCartTotal(false);
            toggleTotals(true);
        }
    });
    
    const startObserving = () => {
        const cartContainer = document.querySelector('#main-cart-items') || 
                            document.querySelector('.cart-items') || 
                            document.body;
        if (cartContainer) {
            cartObserver.observe(cartContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserving);
    } else {
        startObserving();
    }
    
    document.addEventListener('input', (event) => {
        if (event.target.matches('.quantity__input') && 
            event.target.closest('.cart-item')) {
            toggleTotals(false);
        }
    });
    
    document.addEventListener('change', (event) => {
        if (event.target.matches('.quantity__input') && 
            event.target.closest('.cart-item')) {
            toggleTotals(false);
        }
    });
    
    document.addEventListener('click', (event) => {
        if (event.target.closest('.quantity__button') && 
            event.target.closest('.cart-item')) {
            toggleTotals(false);
        } else if (!isUpdating && 
                   !event.target.closest('.quantity__button') &&
                   (event.target.closest('.cart-item') || 
                    event.target.closest('.cart-drawer') || 
                    event.target.closest('#main-cart-items'))) {
            toggleTotals(false);
            updateCartTotal(false);
            toggleTotals(true);
        }
    });
})();
