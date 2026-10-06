var PRODUCTS = [
    {
        id: 'led12',
        name: '12" Multicolor LED pad',
        tagline: 'Reusable sketch pad-draw, erase, repeat endlessly',
        description: 'A mess-free drawing toy with a magnetic stylus that creates bold black lines on the white surface. Slide the eraser bar to clear the board instantly and start fresh. Includes shaped stamps for adding fun patterns. No ink, no paper waste.',
        price: 150,
        minQty: 1,
        qtyStep: 1,
        maxQty: 15,
        ageRange: '3+ years',
        imageCount: 5,
        discountTiers: [
            { minQty: 5, percent: 7 },
            { minQty: 12, percent: 15 }
        ],
        placeholderHue: 180
    },
    {
        id: 'led8',
        name: '8.5" Multicolor LED pad',
        tagline: 'Reusable sketch pad-draw, erase, repeat endlessly',
        description: 'A mess-free drawing toy with a magnetic stylus that creates bold black lines on the white surface. Slide the eraser bar to clear the board instantly and start fresh. Includes shaped stamps for adding fun patterns. No ink, no paper waste.',
        price: 90,
        minQty: 1,
        qtyStep: 1,
        maxQty: 15,
        ageRange: '3+ years',
        imageCount: 6,
        discountTiers: [
            { minQty: 5, percent: 7 },
            { minQty: 12, percent: 15 }
        ],
        placeholderHue: 180
    },
    {
        id: 'active-sand-animal',
        name: 'Active Sand Animal Play Set',
        tagline: 'Squeezable sand that never dries out - mould, play, repeat',
        description: 'A mess-free modeling sand that feels ultra soft and is easy to shape by hand. Includes 300 gms of sand and 8 animal moulds - bear, monkey, lion, hippo, giraffe, and more - so kids can press and create their favourite creatures again and again. Non-toxic and safe, with easy cleanup for indoor or outdoor play.',
        price: 310,
        minQty: 1,
        qtyStep: 1,
        maxQty: 15,
        ageRange: '3+ years',
        imageCount: 6,
        discountTiers: [
            { minQty: 5, percent: 7 },
            { minQty: 12, percent: 15 }
        ],
        placeholderHue: 180
    },
    {
        id: 'solar-system',
        name: 'My Working Solar System DIY Kit',
        tagline: 'Assemble, paint and learn - build your own solar system',
        description: 'A DIY educational model kit with pre-cut, paint-ready planet spheres, connecting arms, and a sturdy base. Paint the sun and all eight planets using the 6 included paint colours and brush, then assemble the pieces like a puzzle to build a rotating solar system display. Comes with an instruction manual and teaches planet positions, sizes, and order in our solar system.',
        price: 310,
        minQty: 1,
        qtyStep: 1,
        maxQty: 15,
        ageRange: '3+ years',
        imageCount: 6,
        discountTiers: [
            { minQty: 5, percent: 7 },
            { minQty: 12, percent: 15 }
        ],
        placeholderHue: 180
    },
    {
        id: 'flashcard-reader',
        name: 'Talking Flash Card Reader with 112 Cards',
        tagline: 'Insert, listen, learn - 224 words across 12 fun themes',
        description: 'An interactive audio learning toy that reads out words and sounds as flash cards are slotted in. Comes with 112 double-sided cards covering 12 themes - animals, colors, fruits, vehicles, shapes, and more - for a total of 224 sight words. Features simple repeat, volume, and power controls, a built-in loudspeaker, and a rechargeable USB port. Compact and lightweight, making it easy to carry in a bag or car seat for learning on the go.',
        price: 280,
        minQty: 1,
        qtyStep: 1,
        maxQty: 15,
        ageRange: '2+ years',
        imageCount: 5,
        discountTiers: [
            { minQty: 5, percent: 7 },
            { minQty: 12, percent: 15 }
        ],
        placeholderHue: 180
    },
    {
        id: 'magnetic-board',
        name: '5-1 Magnetic & white board',
        tagline: 'A fun and versatile learning companion that lets children switch between magnetic activities and chalk writing anytime!',
        description: 'Make learning fun, creative, and interactive with this 5-in-1 Double-Sided Writing Board, specially designed for young learners. One side features a magnetic whiteboard surface for arranging colorful magnetic letters, numbers, and shapes, while the reverse side is a chalkboard for drawing, writing, and practicing.',
        price: 550,
        minQty: 1,
        qtyStep: 1,
        maxQty: 8,
        ageRange: '3+ years',
        imageCount: 5,
        discountTiers: [
            { minQty: 5, percent: 7 }
        ],
        placeholderHue: 180
    },
    {
        id: 'magnetic-hindi',
        name: 'Magnetic Hindi Swar & Vyanjan Alphabets',
        tagline: 'Perfect for home, preschool, classroom, and activity-based learning',
        description: 'Make learning Hindi letters fun and interactive with this colorful Magnetic Swar & Vyanjan Set, designed for young children to recognize, arrange, and practice Hindi alphabets. The set includes brightly colored magnetic letters with smooth, rounded edges that can be easily placed on magnetic surfaces such as boards, refrigerators, or magnetic writing boards.',
        price: 240,
        minQty: 2,
        qtyStep: 2,
        maxQty: 22,
        ageRange: '3+ years',
        imageCount: 2,
        discountTiers: [
            { minQty: 6, percent: 7 },
            { minQty: 14, percent: 15 }
        ],
        placeholderHue: 180
    },
    {
        id: 'combo01',
        name: '5-1 Magnetic & white board + Hindi Swar & Vyanjan',
        tagline: 'A fun and versatile learning companion, perfect for home, preschool, classroom, and activity-based learning',
        description: 'Make learning fun, creative, and interactive with this 5-in-1 Double-Sided Writing Board with Magnetic Hindi Swar & Vyanjan Alphabets. One side features a magnetic whiteboard for arranging colorful Hindi letters, numbers, and shapes, while the other side is a chalkboard for writing, drawing, and practice. Perfect for helping children learn Hindi alphabets, letter recognition, spelling, handwriting, and creativity through engaging, hands-on play.',
        price: 750,
        minQty: 1,
        qtyStep: 1,
        maxQty: 10,
        ageRange: '3+ years',
        imageCount: 1,
        discountTiers: [
            { minQty: 5, percent: 10 }
        ],
        placeholderHue: 180
    },

    // Diwali Gifting Collection - sourced from DeepAsh_Collection.docx.
    // Box codes (DG-01 etc.) are kept in the name since customers are asked
    // to quote them when ordering on WhatsApp (see the doc's own "How to
    // Order" steps). No bulk discount percentages were given for these, so
    // discountTiers is left empty rather than guessing numbers.
    {
        id: 'dg01',
        name: 'Peacock Mahal Suitcase Box (DG-01)',
        tagline: 'Suitcase-style box with a palace-and-peacock scene and a gold handle',
        description: 'A suitcase-style gift box printed with a palace-and-peacock scene and finished with a gold handle. Opens to two glass jars with gold lids on bright satin.',
        price: 679,
        minQty: 1,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['2 glass jars with gold lids', 'Gold handle', 'Orange satin lining', 'Filled with dry fruits or chocolates']
    },
    {
        id: 'dg02',
        name: 'Tree of Life Wooden Box (DG-02)',
        tagline: 'Wood-finish box with a golden tree-of-life emblem',
        description: 'A wood-finish box with a golden tree-of-life emblem and a leaf-charm handle. The lid lifts off to reveal four jars resting on cream satin.',
        price: 929,
        minQty: 1,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['4 jars', 'Cream satin lining', 'Filled with dry fruits or chocolates']
    },
    {
        id: 'dg03',
        name: 'Golden Regal Compartment Box (DG-03)',
        tagline: 'Gold-embossed box with four molded compartments',
        description: 'A gold-embossed paper box with a blue jewel accent on the lid. Inside are four molded compartments, ready for chocolates or dry fruits.',
        price: 439,
        minQty: 4,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['4 compartments', 'Gold embossed lid', 'Ideal for chocolates or dry fruits', 'Price per item, minimum 4 qty']
    },
    {
        id: 'dg04',
        name: 'Peacock & Lotus Box (DG-04)',
        tagline: 'Cream MDF box with a peacock-and-lotus print and brass handle',
        description: 'A cream MDF box with a peacock-and-lotus print, brass handle and clasp. Four jars with peacock-print lids sit on rich orange satin.',
        price: 949,
        minQty: 1,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['4 jars with peacock-print lids', 'Brass finished handle and clasp', 'Orange satin lining']
    },
    {
        id: 'dg05',
        name: 'Crystal Deer Floral Box (DG-05)',
        tagline: 'Deer & floral design box with a crystal-finish, gold-rimmed lid',
        description: 'An elegant deer & floral design MDF box with crystal finish on the lid, a gold rim and floral fabric sides. Four jars sit on champagne satin.',
        price: 1079,
        minQty: 1,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['4 jars with floral-print lids', 'Gold-rimmed lid', 'Champagne satin lining']
    },
    {
        id: 'dg06',
        name: 'Royal Peacock Box (DG-06)',
        tagline: 'Vivid peacock design box with a crystal-finish lid and navy interior',
        description: 'A vivid peacock design MDF box with crystal finish on the lid, with a navy interior. Four peacock-print jars nestle in golden satin.',
        price: 1129,
        minQty: 1,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['4 jars with peacock-print lids', 'Navy interior', 'Gold satin lining', 'Filled with dry fruits or chocolates']
    },
    {
        id: 'dg07',
        name: 'Round Jar Box (DG-07)',
        tagline: 'Round box with a gold floral border and six gold-lidded jars',
        description: 'A round box with a gold floral border and six gold-lidded jars on soft satin. Available in chocolate brown and slate blue.',
        price: 1529,
        minQty: 1,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['6 gold-lidded jars', 'Available in 2 colors: brown and slate blue', 'Clear lid on the brown box']
    },
    {
        id: 'dg08',
        name: 'Wicker Jar Basket (DG-08)',
        tagline: 'White-and-natural wicker basket with two glass jars',
        description: 'A white-and-natural wicker basket with a carry handle, holding two glass jars with gold lids. A simple, charming gift.',
        price: 649,
        minQty: 2,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['2 glass jars with gold lids', 'Carry handle', 'Filled with dry fruits or chocolates', 'Price per item, minimum 2 qty']
    },
    {
        id: 'dg09',
        name: 'Paisley Gold Tray (DG-09)',
        tagline: 'Gold-beaded paisley tray with a red satin centre',
        description: 'A gold-beaded paisley cardboard tray with a red satin centre, for presenting sweets, dry fruits or chocolates.',
        price: 779,
        minQty: 2,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['Gold-beaded paisley border', 'Red satin center', 'Price per item, minimum 2 qty']
    },
    {
        id: 'dg10',
        name: 'Assorted Dry Fruits Tokri (DG-10)',
        tagline: 'Netted gold jute tokri wrapped in sheer red organza',
        description: 'A netted gold jute tokri wrapped in sheer red organza and finished with a gold starburst brooch, filled with dry fruits or chocolates.',
        price: 629,
        minQty: 2,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['Sheer red organza wrap', 'Gold starburst brooch', 'Price per item, minimum 2 qty']
    },
    {
        id: 'dg11',
        name: 'Assorted Dry Fruits & Chocolates Tray (DG-11)',
        tagline: 'Gold organza-topped tray of nuts, chocolates and dried fruit',
        description: 'A gold organza-topped plastic/cardboard tray of nuts alongside ornate gold, silver and glass trays of chocolates and dried fruit - a versatile assortment for gifting.',
        price: 729,
        minQty: 2,
        qtyStep: 1,
        imageCount: 1,
        discountTiers: [],
        placeholderHue: 350,
        category: 'gifting',
        features: ['Nuts, chocolates & dried fruit', 'Gold, silver & glass trays', 'Price per item, minimum 2 qty']
    }
];
