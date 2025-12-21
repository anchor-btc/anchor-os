//! Sample data for generating test messages

/// Sample messages for generating content
pub const SAMPLE_MESSAGES: &[&str] = &[
    "Hello, ANCHOR! 🔗",
    "First message on the Bitcoin blockchain!",
    "This is a test of the ANCHOR protocol.",
    "gm frens ☀️",
    "Building on Bitcoin, one message at a time.",
    "The future is decentralized.",
    "Stack sats, post anchors.",
    "21 million reasons to love Bitcoin.",
    "Proof of message: timestamped forever.",
    "Thread me up, Scotty! 🚀",
    "Another block, another message.",
    "On-chain social is the way.",
    "Can't stop, won't stop, posting.",
    "This message is immutable.",
    "Satoshi would be proud.",
    "HODL your messages on-chain.",
    "Wen mainnet?",
    "Testing 1, 2, 3...",
    "Bitcoin fixes this too.",
    "Anchored to the chain forever.",
];

pub const REPLY_PREFIXES: &[&str] = &[
    "Agreed! ",
    "Interesting take: ",
    "I think ",
    "Reply: ",
    "👍 ",
    "💯 ",
    "Following up: ",
    "Re: ",
    "Good point! ",
    "Adding to this: ",
];

/// Sample images as hex-encoded PNG
pub const SAMPLE_IMAGES: &[(&str, &str)] = &[
    // 16x16 Bitcoin icon PNG (827 bytes)
    ("bitcoin", "89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff610000030249444154785e75935f689b5500c57ff77ef7cb9734b14b69dc0cddccb24ee69059edd6ceada373828f520404ec93802f453494591447652e7b1136b676137c338253a080742f054445541d0ad351d0c0e8ca2a13d7766dd224cdf7f75edb0045dd3cdcd773cfb9dcdfe13f1280dd9b6fcf5c3f3f5898ff60b0347f79a074fdfd4385deddc90c600382ff91145233e38787163e3c7eb5f9c971dffbf8b0f14a074df3a33e7fe152dff4ccdb0786801420b712ff692e4f0e9ec9775a058206c6ab12fa2e425858b104425a18a998bf174cec1f9b7d17a8035a0002682b4f1c2be63bf4a87157087c8fc06bb2bee3594c324bb2361bc5ddbb48e35ab079497861ff3b37c7817509a8a9933d032db3b786093caa1d4759eb3985f5f408ea89611ab9972c81b64c2b2f62775a8f7e36923b0228796c5f3a7da4bded4d4c80c020e3ed24fd3fb1bb0ee1640f60c762c89d47a9ef388136068c4648c9c01e3536f058322d275fd9339c4972822884580a120fa384c60aaa98c622db7e398b539fa3fee4498287f6823120049d49f9dcc597b70fcb8e78d44fd850f87588028c0ed1ce36a2f4e344c26675e78be8c423c4dd3b282781b0dbc06800d51e377d121d08a210630c3a70716b2b34651a693b387f7d0b910be93cca5dc2360db013ad9fd146630cc8d5dafa4f3a0ac3d6f322977a472f61ff299452d877af11bf7d15ab718766e641b488c36690b40942c2e59afe59be7e65f1cabd7af435422005c48325acd532c2af52dbf72a6bcf9ca7696f47fdf105965f01bf8eef7b2cd5f55763534b9faaef6fae577e986b9e7ba127f93c2852b5dfa8dd9ed1815f95ba2d8bb3fc254eb54cbc3187712b04a14f181aaedd72cffd38d7ac6c81347b2657cc67ec514b00b164a81359dd8875f9e96639a5bd2a443e61a4f102c3ade5e0425f71a105d2bf50be713a57cc75da6f2825b09502d33a446148a80d7e68985f0e26facf2e6ca17cdf983e7f2d3bf47b3137bd32d9ed572f779bcaa5bd66f162b7bfd1707a6a247bdf981e38e7a7763999efdeea2adc78efd1d2afa773a56fc6ba0a3dbb9c07cef96fca8e63940fd069c40000000049454e44ae426082"),
    // 1x1 Orange pixel PNG (~70 bytes)
    ("orange", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da636cf8cf00000102010089d1c26a0000000049454e44ae426082"),
    // 1x1 Blue pixel PNG  
    ("blue", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6364f8ff00000201010075e5a2c70000000049454e44ae426082"),
    // 1x1 Green pixel PNG
    ("green", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6364fc6f00000102010023c7b8b00000000049454e44ae426082"),
    // 1x1 Purple pixel PNG
    ("purple", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6364dcff000001020100a9c16e680000000049454e44ae426082"),
    // 1x1 Yellow pixel PNG
    ("yellow", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da63fcfc0b00000201010048e92b6f0000000049454e44ae426082"),
    // 1x1 Red pixel PNG
    ("red", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da63f8cf0000000201010078a834d00000000049454e44ae426082"),
];

/// Sample domain names for DNS
pub const SAMPLE_DOMAINS: &[&str] = &[
    "bitcoin",
    "satoshi",
    "anchor",
    "crypto",
    "web3",
    "defi",
    "nft",
    "hodl",
    "moon",
    "stack",
];

/// Sample city names for map markers
pub const SAMPLE_CITIES: &[(&str, f64, f64)] = &[
    ("New York", 40.7128, -74.0060),
    ("London", 51.5074, -0.1278),
    ("Tokyo", 35.6762, 139.6503),
    ("Paris", 48.8566, 2.3522),
    ("Sydney", -33.8688, 151.2093),
    ("São Paulo", -23.5505, -46.6333),
    ("Dubai", 25.2048, 55.2708),
    ("Singapore", 1.3521, 103.8198),
    ("Berlin", 52.5200, 13.4050),
    ("Toronto", 43.6532, -79.3832),
];

