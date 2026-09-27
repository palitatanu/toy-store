// Site Configuration
// Edit these values before deploying

var CONFIG = {
    // WhatsApp number in full international format (digits only, no + or spaces)
    // Replace 919999999999 with your business WhatsApp number
    whatsappNumber: '918882573884',

    // Business name shown in WhatsApp messages and site header
    businessName: 'Deep-Ash Collections',

    // Currency symbol displayed throughout the site
    currency: '₹',

    // Welcome message prefix for WhatsApp leads
    greeting: 'Hello! I would like to order:',

    // Google Apps Script Web App URL that appends "Notify Me" signups to a Google
    // Sheet. Leave blank until you've deployed the script (see the setup steps) -
    // the notify form will show a friendly error instead of failing silently.
    sheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbykknpps4mZNdUt-9xxmk5tKwCgYYh-WFzbjfaJ8gWFGUmVHk3ftkOXoPjsSPA_EaHo_A/exec',

    // Site metadata
    siteTitle: 'Deep-Ash Collections - Bulk Toys for Parties & Events',
    siteDescription: 'Quality Educational toys. Perfect for birthday parties, school events, and celebrations.',

    // Rolling banner shown above the notify section. Edit this list to change
    // what scrolls through - each string becomes one item in the loop.
    announcements: [
        'Free Shipping above ₹1299',
        'Discounts on Bulk Orders',
        'Hamper Collection Coming Soon'
    ],

    // Minimum viable quantity values (fallback if product data is malformed)
    defaultMinQty: 1,
    defaultMaxQty: 20,
    defaultDiscountTiers: [
        { minQty: 5, percent: 7 },
        { minQty: 12, percent: 15 }
    ],
    defaultQtyStep: 1
};
