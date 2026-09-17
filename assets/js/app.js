/* Main Application Logic */

// State
var currentProduct = null;
var currentQuantity = 0;
var focusTrapElements = [];
var lastFocusedElement = null;
var notifyModalOpen = false;

// Escapes quotes too: these values are interpolated into HTML attributes, not just text
function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Utility: Format currency with rounding to whole units
function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) {
        return CONFIG.currency + '0';
    }
    return CONFIG.currency + Math.round(amount);
}

// Utility: Get array of image paths for a product
function getProductImages(product) {
    var images = [];
    for (var i = 1; i <= product.imageCount; i++) {
        images.push('assets/img/'+ product.id +'/' + product.id + '-' + i + '.png');
    }
    return images;
}

// Calculate applicable discount for a given quantity
function calculateDiscount(product, qty) {
    var discount = 0;
    var tiers = getDiscountTiers(product);

    for (var i = 0; i < tiers.length; i++) {
        if (qty >= tiers[i].minQty && tiers[i].percent > discount) {
            discount = tiers[i].percent;
        }
    }

    return discount;
}

// Calculate price breakdown
function calculatePricing(product, qty) {
    var unitPrice = product.price;
    var discount = calculateDiscount(product, qty);
    var subtotal = unitPrice * qty;
    var discountAmount = Math.round((subtotal * discount) / 100);
    var total = subtotal - discountAmount;

    return {
        unitPrice: unitPrice,
        discount: discount,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total
    };
}

// Find next discount tier for incentive display
function getNextTier(product, currentQty) {
    var tiers = getDiscountTiers(product);
    var sortedTiers = tiers.slice().sort(function(a, b) {
        return a.minQty - b.minQty;
    });

    // A tier past the order limit can never be reached, so promising it would be a lie.
    var ceiling = getHighestValidQuantity(product);

    for (var i = 0; i < sortedTiers.length; i++) {
        if (currentQty < sortedTiers[i].minQty && sortedTiers[i].minQty <= ceiling) {
            var targetQty = sortedTiers[i].minQty;
            var maxPercent = sortedTiers[i].percent;
            for (var j = i + 1; j < sortedTiers.length && sortedTiers[j].minQty === targetQty; j++) {
                if (sortedTiers[j].percent > maxPercent) {
                    maxPercent = sortedTiers[j].percent;
                }
            }
            return {
                minQty: targetQty,
                percent: maxPercent,
                itemsNeeded: targetQty - currentQty
            };
        }
    }

    return null;
}

// The largest orderable quantity: the product's own limit, else the site default.
// Never below minQty, so bad data cannot produce an empty range.
function getMaxQuantity(product) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var maxQty = product.maxQty || CONFIG.defaultMaxQty;
    return maxQty < minQty ? minQty : maxQty;
}

function getDiscountTiers(product) {
    return product.discountTiers || CONFIG.defaultDiscountTiers;
}

// The highest valid quantity that is on the step ladder and within the maximum.
// maxQty itself may not sit on the ladder (min 12, step 6, max 50 tops out at 48).
function getHighestValidQuantity(product) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var step = product.qtyStep || CONFIG.defaultQtyStep;
    var maxQty = getMaxQuantity(product);
    return minQty + Math.floor((maxQty - minQty) / step) * step;
}

// Clamp and snap quantity to valid value
function normalizeQuantity(product, qty) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var step = product.qtyStep || CONFIG.defaultQtyStep;

    if (qty < minQty) {
        return minQty;
    }

    // Snap to the step ladder first, then pull back inside the maximum. Doing it in
    // this order means the result is always both on-step and within range.
    var snapped = minQty + Math.round((qty - minQty) / step) * step;
    var ceiling = getHighestValidQuantity(product);

    return snapped > ceiling ? ceiling : snapped;
}

// Validate and sanitize quantity input
function validateQuantity(product, value) {
    var parsed = parseInt(value, 10);

    if (isNaN(parsed) || parsed < 1) {
        return product.minQty || CONFIG.defaultMinQty;
    }

    return normalizeQuantity(product, parsed);
}

// The "(Minimum: 12, Maximum: 48)" line under the Quantity label. The maximum is
// only mentioned when the product actually sets one, so the site default stays hidden.
function quantityRangeLabel(product) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    if (!product.maxQty) {
        return '(Minimum: ' + minQty + ')';
    }
    return '(Minimum: ' + minQty + ', Maximum: ' + getHighestValidQuantity(product) + ')';
}

// Grey out a stopper button once pressing it could not change anything
function updateStepperState() {
    var decreaseBtn = document.getElementById('qty-decrease');
    var increaseBtn = document.getElementById('qty-increase');
    if (!decreaseBtn || !increaseBtn || !currentProduct) return;

    var minQty = currentProduct.minQty || CONFIG.defaultMinQty;
    decreaseBtn.disabled = currentQuantity <= minQty;
    increaseBtn.disabled = currentQuantity >= getHighestValidQuantity(currentProduct);
}

// Get maximum discount percent for badge
function getMaxDiscount(product) {
    var tiers = getDiscountTiers(product);
    var max = 0;

    for (var i = 0; i < tiers.length; i++) {
        if (tiers[i].percent > max) {
            max = tiers[i].percent;
        }
    }

    return max;
}

// --- Hover image roll -----------------------------------------------
// While the pointer rests on a card, its images cross-fade in sequence. Two
// stacked <img> layers alternate, so there is never a blank frame between images.
var ROLL_INTERVAL_MS = 1100;

function canAnimateRoll() {
    if (!window.matchMedia) return false;
    // No hover on touch screens, and honour the OS reduce-motion setting.
    return window.matchMedia('(hover: hover)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stopImageRoll(card) {
    if (card.rollTimer) {
        clearInterval(card.rollTimer);
        card.rollTimer = null;
    }

    var layers = card.querySelectorAll('.card-image');
    if (layers.length === 2) {
        layers[0].src = card.baseImage;
        layers[0].classList.add('is-visible');
        layers[1].classList.remove('is-visible');
    }

    var dots = card.querySelectorAll('.card-dot');
    for (var i = 0; i < dots.length; i++) {
        if (i === 0) dots[i].classList.add('is-active');
        else dots[i].classList.remove('is-active');
    }
}

function startImageRoll(card, product) {
    var images = getProductImages(product);
    if (images.length < 2 || card.rollTimer) return;

    // Fetch the remaining images once, on first hover, so page load stays light.
    if (!card.preloaded) {
        for (var i = 1; i < images.length; i++) {
            var pre = new Image();
            pre.src = images[i];
        }
        card.preloaded = true;
    }

    var layers = card.querySelectorAll('.card-image');
    var dots = card.querySelectorAll('.card-dot');
    if (layers.length !== 2) return;

    var index = 0;
    var shown = 0;

    card.rollTimer = setInterval(function () {
        index = (index + 1) % images.length;
        var next = shown === 0 ? 1 : 0;

        layers[next].src = images[index];
        layers[next].classList.add('is-visible');
        layers[shown].classList.remove('is-visible');
        shown = next;

        for (var j = 0; j < dots.length; j++) {
            if (j === index) dots[j].classList.add('is-active');
            else dots[j].classList.remove('is-active');
        }
    }, ROLL_INTERVAL_MS);
}

// Theme
// The inline script in index.html already set data-theme before first paint.
// This only keeps the button label in sync and saves the visitor's choice.
var THEME_KEY = 'toystore-theme';

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
        // Private browsing can block storage; the theme still applies for this visit.
    }

    // Keep the browser's own chrome (Android address bar, iOS status bar strip)
    // matching the page instead of staying stuck on the light-mode default.
    var themeColorMeta = document.getElementById('meta-theme-color');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#1C1F24');
    }

    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var next = theme === 'light' ? 'dark' : 'light';
    btn.textContent = next === 'light' ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
}

function setupThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    applyTheme(currentTheme());
    btn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
}

// Render product grid
function renderProducts() {
    var grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    if (PRODUCTS.length === 0) {
        grid.innerHTML = '<div class="grid-empty">No products available yet. Add products in assets/js/products.js to get started.</div>';
        return;
    }

    PRODUCTS.forEach(function (product, index) {
        if (!product.name || !product.price || !product.imageCount) {
            console.warn('Product missing required fields:', product);
            return;
        }
        var card = document.createElement('article');
        card.className = 'product-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('data-product-index', index);

        var images = getProductImages(product);
        var maxDiscount = getMaxDiscount(product);

        var discountBadge = '';
        if (maxDiscount > 0) {
            discountBadge = '<div class="discount-badge">Save up to ' + maxDiscount + '% OFF</div>';
        }

        var dots = '';
        if (images.length > 1) {
            dots = '<div class="card-dots" aria-hidden="true">';
            for (var d = 0; d < images.length; d++) {
                dots += '<span class="card-dot' + (d === 0 ? ' is-active' : '') + '"></span>';
            }
            dots += '</div>';
        }

        card.innerHTML =
            '<div class="card-image-container">' +
            '<img src="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(product.name) + '" class="card-image is-visible" data-layer="0">' +
            '<img alt="" aria-hidden="true" class="card-image" data-layer="1">' +
            dots +
            discountBadge +
            '</div>' +
            '<div class="card-content">' +
                '<h2 class="card-title">' + escapeHtml(product.name) + '</h2>' +
                '<p class="card-tagline">' + escapeHtml(product.tagline) + '</p>' +
                '<div class="card-price">'+ formatCurrency(product.price) +
                    ' <span class="card-price-unit">per unit</span>' +
                '</div>' +
                '<div class="card-age">' + escapeHtml(product.ageRange) + '</div>' +
            '</div>';

        card.baseImage = images[0];

        if (images.length > 1 && canAnimateRoll()) {
            card.addEventListener('mouseenter', function () {
                startImageRoll(this, product);
            });
            card.addEventListener('mouseleave', function () {
                stopImageRoll(this);
            });
        }

        grid.appendChild(card);
    });
}

// Open modal for product
function openModal(product) {
    currentProduct = product;
    currentQuantity = product.minQty || CONFIG.defaultMinQty;

    lastFocusedElement = document.activeElement;

    var modal = document.getElementById('product-modal');
    var overlay = document.getElementById('modal-overlay');

    renderModalContent();

    modal.style.display = 'block';
    overlay.style.display = 'flex';

    document.querySelector('.site-header').setAttribute('aria-hidden', 'true');
    document.getElementById('product-grid').setAttribute('aria-hidden', 'true');

    // Focus close button
    var closeBtn = document.getElementById('modal-close');
    setTimeout(function() {
        closeBtn.focus();
    }, 100);

    // Setup focus trap
    setupFocusTrap(modal);
}

// Close modal
function closeModal() {
    var modal = document.getElementById('product-modal');
    var overlay = document.getElementById('modal-overlay');

    document.querySelector('.site-header').removeAttribute('aria-hidden');
    document.getElementById('product-grid').removeAttribute('aria-hidden');

    modal.style.display = 'none';
    overlay.style.display = 'none';

    currentProduct = null;
    currentQuantity = 0;
    focusTrapElements = [];

    // Restore focus
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Open the "notify me about new products" modal
function openNotifyModal() {
    notifyModalOpen = true;
    lastFocusedElement = document.activeElement;

    var overlay = document.getElementById('notify-overlay');
    var modal = document.getElementById('notify-modal');

    overlay.style.display = 'flex';

    document.querySelector('.site-header').setAttribute('aria-hidden', 'true');
    document.getElementById('product-grid').setAttribute('aria-hidden', 'true');

    var phoneInput = document.getElementById('notify-phone');
    setTimeout(function() {
        phoneInput.focus();
    }, 100);

    setupFocusTrap(modal);
}

// Close the notify modal and reset it for next time
function closeNotifyModal() {
    var overlay = document.getElementById('notify-overlay');
    var form = document.getElementById('notify-form');
    var success = document.getElementById('notify-success');
    var error = document.getElementById('notify-error');
    var submitBtn = form.querySelector('.notify-submit-btn');

    document.querySelector('.site-header').removeAttribute('aria-hidden');
    document.getElementById('product-grid').removeAttribute('aria-hidden');

    overlay.style.display = 'none';
    form.reset();
    form.hidden = false;
    success.hidden = true;
    error.textContent = '';
    document.getElementById('notify-phone').removeAttribute('aria-invalid');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Notify Me <span aria-hidden="true">💬</span>';

    notifyModalOpen = false;
    focusTrapElements = [];

    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Handle notify form submit: validate the number, then send it to the Google Sheet
// webhook (see config.js). GitHub Pages can't run a backend itself, so a small
// Apps Script Web App bound to a Sheet is what actually stores the signup.
//
// The save happens in the background rather than being waited on: with
// mode: 'no-cors' the response is opaque anyway (see the fetch call below), so
// waiting on it before showing "Thanks!" would only add a delay without adding
// any real certainty. The one case this trades away is a genuine network failure -
// there is no error shown for that; the row will simply be missing from the Sheet.
function handleNotifySubmit(e) {
    e.preventDefault();

    var input = document.getElementById('notify-phone');
    var error = document.getElementById('notify-error');
    var form = document.getElementById('notify-form');
    var digits = input.value.replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 15) {
        error.textContent = 'Please enter a valid WhatsApp number.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
    }

    error.textContent = '';
    input.removeAttribute('aria-invalid');

    if (!CONFIG.sheetWebhookUrl) {
        error.textContent = 'Sign-ups aren\'t set up yet - please check back soon.';
        return;
    }

    if (window.fetch) {
        fetch(CONFIG.sheetWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ phone: digits, submittedAt: new Date().toISOString() })
        }).catch(function () {
            // Best-effort: nothing meaningful to show the visitor at this point,
            // since the "Thanks!" confirmation is already on screen.
        });
    }

    form.hidden = true;
    document.getElementById('notify-success').hidden = false;
    setTimeout(closeNotifyModal, 2400);
}

// Wire up the notify button, modal close controls and form submit. Called once
// from init(), unlike the product modal's handlers which are rebound on every open
// because that modal's HTML is rebuilt each time.
function setupNotifyModal() {
    var openBtn = document.getElementById('notify-open-btn');
    var closeBtn = document.getElementById('notify-close');
    var overlay = document.getElementById('notify-overlay');
    var form = document.getElementById('notify-form');

    if (!openBtn) return;

    openBtn.addEventListener('click', openNotifyModal);
    closeBtn.addEventListener('click', closeNotifyModal);
    form.addEventListener('submit', handleNotifySubmit);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeNotifyModal();
        }
    });
}


function renderModalContent() {
    if (!currentProduct) return;

    var modal = document.getElementById('product-modal');
    var images = getProductImages(currentProduct);

    // Gallery
    var thumbnails = images.map(function(src, i) {
        return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(currentProduct.name + ' view ' + (i + 1)) +
		'" class="gallery-thumb" tabindex="0" role="button" data-image-index="' + i + '">';
    }).join('');

    // Discount tiers
    var tierList = '';
    var currDiscountTiers = getDiscountTiers(currentProduct);
    if (currDiscountTiers && currDiscountTiers.length > 0) {
        var sorted = currDiscountTiers.slice().sort(function(a, b) {
            return a.minQty - b.minQty;
        });
        tierList = sorted.map(function(tier) {
            return '<div>' + tier.minQty + '+ units: ' + tier.percent + '% off</div>';
        }).join('');
    }

    var tierPanel = tierList ?
        '<div class="discount-panel">' +
        '<div class="discount-panel-title">Bulk Pricing:</div>' +
        tierList +
        '</div>' : '';

    var thumbsHtml = images.length > 1 ? '<div class="gallery-thumbs">' + thumbnails + '</div>' : '';

    var navHtml = images.length > 1 ?
        '<button type="button" class="gallery-nav gallery-nav-prev" aria-label="Previous image">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<button type="button" class="gallery-nav gallery-nav-next" aria-label="Next image">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<div class="gallery-counter" aria-hidden="true"><span id="gallery-counter-current">1</span> / ' + images.length + '</div>'
        : '';

    modal.innerHTML =
        '<button id="modal-close" class="modal-close" aria-label="Close product details">&times;</button>' +
        '<div class="modal-layout">' +
        '<div class="modal-gallery">' +
        '<div class="gallery-frame">' +
        '<img id="gallery-main" src="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(currentProduct.name) + '" class="gallery-main">' +
        navHtml +
        '</div>' +
        thumbsHtml +
        '</div>' +
        '<div class="modal-details">' +
        '<h1 id="modal-title" class="modal-title">' + escapeHtml(currentProduct.name) + '</h1>' +
        '<p class="modal-tagline">' + escapeHtml(currentProduct.tagline) + '</p>' +
        '<p class="modal-description">' + escapeHtml(currentProduct.description) + '</p>' +
        '<div class="modal-age">Recommended: ' + escapeHtml(currentProduct.ageRange) + '</div>' +
        tierPanel +
        '<div class="quantity-section">' +
        '<label for="quantity-input" class="quantity-label">Quantity</label>' +
        '<div class="quantity-note">(Minimum: ' + currentProduct.minQty + ')</div>' +
        '<div class="quantity-stepper">' +
        '<button id="qty-decrease" class="qty-btn" aria-label="Decrease quantity">−</button>' +
        '<input type="number" id="quantity-input" class="qty-input" value="' + currentQuantity +
		'" min="' + currentProduct.minQty + '" step="' + currentProduct.qtyStep + '" aria-label="Quantity">' +
        '<button id="qty-increase" class="qty-btn" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '</div>' +
        '<div id="price-display" class="price-display" role="status" aria-live="polite"></div>' +
        '<div id="incentive-display" class="incentive-display"></div>' +
        '<a id="whatsapp-cta" class="whatsapp-btn" href="#" target="_blank" rel="noopener">' +
        'Order via WhatsApp <span aria-hidden="true">💬</span>' +
        '</a>' +
        '</div>' +
        '</div>';

    updatePriceDisplay();
    attachModalHandlers();
}

// Update price display
function updatePriceDisplay() {
    if (!currentProduct) return;

    var pricing = calculatePricing(currentProduct, currentQuantity);
    var display = document.getElementById('price-display');
    var incentiveDisplay = document.getElementById('incentive-display');

    var html = '<div class="price-row">' +
        '<span>Unit Price:</span>' +
        '<span>' + formatCurrency(pricing.unitPrice) + '</span>' +
        '</div>';

    if (pricing.discount > 0) {
        html += '<div class="price-row">' +
            '<span>Discount (' + pricing.discount + '%):</span>' +
            '<span class="discount-amount">&minus;' + formatCurrency(pricing.discountAmount) + '</span>' +
            '</div>';
    }

    html += '<div class="price-row price-row-total">' +
        '<span>Total:</span>' +
        '<span>' + formatCurrency(pricing.total) + '</span>' +
        '</div>';

    if (pricing.discount > 0) {
        html += '<div class="price-row savings-note">You save ' + formatCurrency(pricing.discountAmount) + '!</div>';
    }

    display.innerHTML = html;

    // Incentive
    var nextTier = getNextTier(currentProduct, currentQuantity);
    if (nextTier) {
        incentiveDisplay.innerHTML =
            '<div class="incentive-note"><span aria-hidden="true">💡</span> Add ' + nextTier.itemsNeeded + ' more to save ' +
			nextTier.percent + '%</div>';
    } else {
        incentiveDisplay.innerHTML = '';
    }

    updateStepperState();
    updateWhatsAppLink();
}

// Generate WhatsApp message
function generateWhatsAppMessage() {
    if (!currentProduct) return '';

    var pricing = calculatePricing(currentProduct, currentQuantity);

    var message = CONFIG.greeting + '\n\n';
    message += 'Product: ' + currentProduct.name + '\n';
    message += 'Quantity: ' + currentQuantity + '\n';
    message += 'Unit Price: ' + formatCurrency(pricing.unitPrice) + '\n';

    if (pricing.discount > 0) {
        message += 'Discount: ' + pricing.discount + '%\n';
    }

    message += 'Total: ' + formatCurrency(pricing.total) + '\n\n';
    message += 'Thank you!';

    return message;
}

// Update WhatsApp Link
function updateWhatsAppLink() {
    var btn = document.getElementById('whatsapp-cta');
    if (!btn) return;

    var message = generateWhatsAppMessage();
    var encoded = encodeURIComponent(message);
    var phoneNumber = CONFIG.whatsappNumber.replace(/\D/g, '');
    var url = 'https://wa.me/' + phoneNumber + '?text=' + encoded;

    btn.href = url;
}

// Setup focus trap. Shared by the product modal and the notify modal - whichever
// element is passed in is the one Tab gets trapped inside.
function setupFocusTrap(modalEl) {
    focusTrapElements = modalEl.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
}

// Handle focus trap
function handleFocusTrap(e) {
    if (focusTrapElements.length === 0) return;

    var firstElement = focusTrapElements[0];
    var lastElement = focusTrapElements[focusTrapElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
    }
}

// Attach modal event handlers
function attachModalHandlers() {
    var closeBtn = document.getElementById('modal-close');
    var qtyInput = document.getElementById('quantity-input');
    var decreaseBtn = document.getElementById('qty-decrease');
    var increaseBtn = document.getElementById('qty-increase');
    var thumbs = document.querySelectorAll('.gallery-thumb');

    closeBtn.addEventListener('click', closeModal);

    qtyInput.addEventListener('change', function() {
        currentQuantity = validateQuantity(currentProduct, qtyInput.value);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    qtyInput.addEventListener('blur', function() {
        currentQuantity = validateQuantity(currentProduct, qtyInput.value);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    decreaseBtn.addEventListener('click', function() {
        var newQty = currentQuantity - currentProduct.qtyStep;
        currentQuantity = normalizeQuantity(currentProduct, newQty);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    increaseBtn.addEventListener('click', function() {
        var newQty = currentQuantity + currentProduct.qtyStep;
        currentQuantity = normalizeQuantity(currentProduct, newQty);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    var images = getProductImages(currentProduct);
    var mainImage = document.getElementById('gallery-main');
    var counter = document.getElementById('gallery-counter-current');
    var activeIndex = 0;

    // Single source of truth for "which image is showing" - used by thumbnail
    // taps, the prev/next buttons, and the swipe gesture below, so all three stay
    // in sync instead of duplicating the same DOM updates three times.
    function setActiveImage(index) {
        // Wrap around both ends so prev/next (and swiping) never dead-end.
        var wrapped = (index + images.length) % images.length;
        activeIndex = wrapped;

        mainImage.src = images[wrapped];
        mainImage.alt = currentProduct.name + ' - view ' + (wrapped + 1) + ' of ' + images.length;

        thumbs.forEach(function(t) {
            t.classList.remove('active');
            t.removeAttribute('aria-current');
        });
        if (thumbs[wrapped]) {
            thumbs[wrapped].classList.add('active');
            thumbs[wrapped].setAttribute('aria-current', 'true');
            // Bring the active thumbnail into view if the strip has scrolled past it -
            // otherwise swiping or using the prev/next buttons can silently move the
            // selection off-screen in the thumbnail row.
            thumbs[wrapped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        if (counter) {
            counter.textContent = wrapped + 1;
        }
    }

    thumbs.forEach(function(thumb) {
        thumb.addEventListener('click', function() {
            setActiveImage(parseInt(thumb.getAttribute('data-image-index'), 10));
        });

        thumb.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                thumb.click();
            }
        });
    });

    // Set first thumb as active
    if (thumbs.length > 0) {
        thumbs[0].classList.add('active');
        thumbs[0].setAttribute('aria-current', 'true');
    }

    if (images.length > 1 && mainImage) {
        var prevBtn = document.querySelector('.gallery-nav-prev');
        var nextBtn = document.querySelector('.gallery-nav-next');

        if (prevBtn) prevBtn.addEventListener('click', function() { setActiveImage(activeIndex - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function() { setActiveImage(activeIndex + 1); });

        // Swipe the main photo left/right to move between images. Both listeners
        // are passive (no preventDefault) and the gesture is only interpreted on
        // touchend, so this never competes with or blocks the page's native
        // scrolling - it just additionally reads the gesture.
        var touchStartX = 0;
        var touchStartY = 0;

        mainImage.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        mainImage.addEventListener('touchend', function(e) {
            if (!e.changedTouches || e.changedTouches.length !== 1) return;
            var dx = e.changedTouches[0].clientX - touchStartX;
            var dy = e.changedTouches[0].clientY - touchStartY;

            // Require a deliberate, mostly-horizontal drag so an ordinary vertical
            // scroll or a tap-to-zoom attempt doesn't get mistaken for a swipe.
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                setActiveImage(dx < 0 ? activeIndex + 1 : activeIndex - 1);
            }
        }, { passive: true });
    }
}

// Initialize app
function init() {
    // All visible naming comes from config.js, so editing it there is enough.
    // The values hardcoded in index.html are only what shows before this runs.
    var title = document.getElementById('site-title');
    var subtitle = document.getElementById('site-subtitle');
    if (title && CONFIG.businessName) title.textContent = CONFIG.businessName;
    if (subtitle && CONFIG.siteDescription) subtitle.textContent = CONFIG.siteDescription;

    if (CONFIG.siteTitle) document.title = CONFIG.siteTitle;

    var metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && CONFIG.siteDescription) {
        metaDescription.setAttribute('content', CONFIG.siteDescription);
    }

    setupThemeToggle();
    renderProducts();
    setupNotifyModal();

    // Grid click delegation
    var grid = document.getElementById('product-grid');
    grid.addEventListener('click', function(e) {
        var card = e.target.closest('.product-card');
        if (card) {
            var index = parseInt(card.getAttribute('data-product-index'), 10);
            openModal(PRODUCTS[index]);
        }
    });

    // Grid keyboard navigation
    grid.addEventListener('keydown', function(e) {
        var card = e.target.closest('.product-card');
        if (card && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            var index = parseInt(card.getAttribute('data-product-index'), 10);
            openModal(PRODUCTS[index]);
        }
    });

    // Overlay click to close
    var overlay = document.getElementById('modal-overlay');
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (currentProduct) {
                closeModal();
            } else if (notifyModalOpen) {
                closeNotifyModal();
            }
        }

        if (e.key === 'Tab' && (currentProduct || notifyModalOpen)) {
            handleFocusTrap(e);
        }
    });
}

// Start when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

