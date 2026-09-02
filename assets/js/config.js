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

    // Site metadata
    siteTitle: 'Deep-Ash Collections - Bulk Toys for Parties & Events',
    siteDescription: 'Quality toys with bulk discounts. Perfect for birthday parties, school events, and celebrations.',

    // Minimum viable quantity values (fallback if product data is malformed)
    defaultMinQty: 1,
    defaultMaxQty: 20,
    defaultDiscountTiers: [
        { minQty: 5, percent: 7 },
        { minQty: 12, percent: 15 }
    ]
    defaultQtyStep: 1
};
