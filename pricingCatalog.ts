export type StudioPackage = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  details: string;
};

export const POS_PRICING_SOURCE_LABEL = 'WYPS-POS / public/js/master-data.js / Firestore packages';
export const POS_PRICING_CONTEXT_KEY = 'wyps_pricing_catalog_context_v1';
export const POS_PACKAGE_CACHE_KEY = 'wyps_pos_package_catalog_v1';
export const POS_SESSION_KEY = 'wyps_pos_session_v1';

export const FALLBACK_STUDIO_PACKAGES: StudioPackage[] = [
  {
    id: '0jqvgLRow48WCNsxgULB',
    name: 'Indoor Solo Portrait ( No MUA+ Own Dress1 )',
    category: 'Solo Indoor Package',
    subcategory: 'Solo Portrait',
    price: 100000,
    details: 'Solo Portrait အတွက်\nSoftcopy No Print 10 Pic',
  },
  {
    id: '8R2YjTWtmfNjjDMqN8IF',
    name: 'Pre Wedding Outdoor 2 Dress + Own 1 Dress ( Gold )',
    category: 'Pre Wedding Outdoor',
    subcategory: 'Pre Wedding Outdoor',
    price: 650000,
    details: 'ဝတ်စုံ 2 စုံ၊ မိတ်ကပ် 2 ကြိမ်၊ ဖိနပ်၊ လက်ဝတ်လက်စား ပါဝင်ပါသည်။ ကိုယ်ပိုင်ဝတ်စုံအတွက် မိတ်ကပ်မပါဝင်ပါ။ Taunggyi Location 2 နေရာနှင့် အနီးအနားသာ။ Soft Copy No Print 30 Pic၊ 16x24 With Love Frame 1 Pic၊ 6x8 Table Stand 1 Pic',
  },
  {
    id: 'E0ZVMNgN4pFTLVmIqvRM',
    name: 'Inlay Pre Wedding Package',
    category: 'Inlay',
    subcategory: 'Inlay Pre Wedding',
    price: 2300000,
    details: 'ဝတ်စုံ 3 စုံ + ကိုယ်ပိုင် 1 စုံ၊ မိတ်ကပ် 3 ကြိမ်၊ ဖိနပ်၊ လက်ဝတ်လက်စား၊ လက်ကိုင်ပန်း၊ ကားအသွားအပြန်၊ ဝင်ခ၊ လှေခ ပါဝင်ပါသည်။ Softcopy No Print 40 Pic၊ 16x24 With Love Frame 2 Pic၊ 6x8 Crystal Album 1 Pic၊ 8x10 Table Stand 1 Pic',
  },
  {
    id: 'GvWdAX0n8g1sNccnJSI1',
    name: 'Pre Wedding Indoor 1 Dress',
    category: 'Pre Wedding Indoor',
    subcategory: 'Pre Wedding 1 Dress',
    price: 260000,
    details: 'ဝတ်စုံ ၁ စုံ၊ မိတ်ကပ် ၁ ကြိမ်၊ ဖိနပ်၊ လက်ဝတ်လက်စား ပါဝင်ပါသည်။ Soft Copy No Print 10 Pic၊ 12x18 With Love Frame 1 Pic',
  },
  {
    id: 'HVVfEcOwMZru44QRT97B',
    name: 'မင်္ဂလာဆွမ်းကပ် ဓါတ်ပုံရိုက်ကူးရေး ( cam 2 )',
    category: 'Outdoor',
    subcategory: 'ဆွမ်းကပ် ဓါတ်ပုံရိုက်ကူးရေး',
    price: 450000,
    details: 'Softcopy No Print 70 Pic + 16x24 With Frame 1 Pic သို့မဟုတ် Print Photo 50 Pic + 16x24 With Frame 1 Pic ထဲက စိတ်ကြိုက် ၁ ခု ရွေးချယ်နိုင်ပါတယ်။',
  },
  {
    id: 'J1W543YhHaR2kpESLCTF',
    name: 'Pre Wedding Outdoor 2 Dress ( Sliver )',
    category: 'Pre Wedding Outdoor',
    subcategory: 'Pre Wedding Outdoor',
    price: 550000,
    details: 'ဝတ်စုံ 2 စုံ၊ မိတ်ကပ် 2 ကြိမ်၊ ဖိနပ်၊ လက်ဝတ်လက်စား ပါဝင်ပါသည်။ Taunggyi Location 1 နေရာနှင့် အနီးအနားသာ။ Soft Copy No Print 25 Pic၊ 16x24 With Love Frame 1 Pic',
  },
  {
    id: 'ODR2cQfuv1P9vm65at86',
    name: 'Indoor အလှူအကြိုအလှပုံ',
    category: 'အလှူအကြိုရိုက်ကူးရေး indoor',
    subcategory: 'အလှူအကြို',
    price: 200000,
    details: 'မိတ်ကပ်၊ ဝတ်စုံ မပါဝင်ပါ။ ဝတ်စုံ ၁ စုံ အတွက်သာ။ Extra ဝတ်စုံအတွက် + ၅၀,၀၀၀ ကျပ်။ Softcopy No Print 15 Pic၊ 12x18 With Love Frame 1 Pic',
  },
  {
    id: 'RZjZqEFGqYhtqxNheUTi',
    name: 'မော်ကွန်းတင်လက်မှတ်ရေးထိုး',
    category: 'Outdoor',
    subcategory: 'General',
    price: 155000,
    details: 'မိတ်ကပ်၊ ဝတ်စုံ မပါ။ ကိုယ်ပိုင်ဝတ်စုံ ၁ စုံ အတွက်သာ။ တရားရုံးဝန်းထဲနှင့် outdoor အနီးအနားတွင် ရိုက်ကူးပေးပါသည်။ Softcopy No Print 15 Pic',
  },
  {
    id: 'RdHVz2ndaIoT1PSznLio',
    name: 'အလှူပွဲနေ့ရိုက်ကူးရေး ကင်မရာ ၁ လုံး',
    category: 'အလှူပွဲနေ့ရိုက်ကူးရေး',
    subcategory: 'CAM 1',
    price: 390000,
    details: 'Softcopy No Print 60 Pic သို့မဟုတ် Print 40 Pic၊ 12x18 With Love Frame 1 Pic။ ပွဲအစမှအဆုံးအထိ CD/USB Stick ဖြင့်ပေးပါမည်။ ပွဲချိန် ၃ နာရီစာအတွက်သာ။ အချိန်ပို နာရီဝက် ၃ သောင်း၊ တစ်နာရီ ၅ သောင်း။',
  },
  {
    id: 'Rym16lQRxo4J47X7xQjY',
    name: 'Outdoor Package ( Couple)',
    category: 'Outdoor',
    subcategory: 'Couple',
    price: 250000,
    details: 'မိတ်ကပ် ၁ ကြိမ် (မိတ်ကပ်ဆရာမ မလိုက်ပေးပါ)၊ ကိုယ်ပိုင်ဝတ်စုံ ၁ စုံ။ Softcopy No Print 15 Pic။ တောင်ကြီးမြို့တွင်းအတွက်သာ။',
  },
  {
    id: 'VMRXODlYTwxH1Bv8uKs0',
    name: 'Kalaw Pre Wedding',
    category: 'Kalaw',
    subcategory: 'Kalaw Pre Wedding',
    price: 2600000,
    details: 'ဝတ်စုံ 3 စုံ + ကိုယ်ပိုင် 1 စုံ၊ မိတ်ကပ် 3 ကြိမ်၊ ဖိနပ်၊ လက်ဝတ်လက်စား၊ လက်ကိုင်ပန်း၊ ကားအသွားအပြန်၊ ဝင်ခ ပါဝင်ပါသည်။ Softcopy No Print 40 Pic၊ 16x24 With Love Frame 2 Pic၊ 6x8 Crystal Album 1 Pic၊ 8x10 Table Stand 1 Pic',
  },
  {
    id: 'WvZRhb33krYWIcOtcq2S',
    name: 'အလှူပွဲနေ့ရိုက်ကူးရေး ကင်မရာ ၂ လုံး',
    category: 'အလှူပွဲနေ့ရိုက်ကူးရေး',
    subcategory: 'CAM 2',
    price: 470000,
    details: 'Softcopy No Print 80 Pic သို့မဟုတ် Print 60 Pic၊ 16x24 With Love Frame 1 Pic။ ပွဲအစမှအဆုံးအထိ CD/USB Stick ဖြင့်ပေးပါမည်။ ပွဲချိန် ၃ နာရီစာအတွက်သာ။ အချိန်ပို နာရီဝက် ၃ သောင်း၊ တစ်နာရီ ၅ သောင်း။',
  },
  {
    id: 'b7L5MaDrwX1nVZlBNJd8',
    name: 'Indoor Family Photo',
    category: 'Family',
    subcategory: 'Family Photo',
    price: 150000,
    details: 'Indoor Family Photo package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'birthday-mua-dress-1',
    name: 'Indoor Birthday Portrait ( MUA+Dress 1)',
    category: 'Birthday Indoor Package',
    subcategory: 'Birthday Portrait',
    price: 150000,
    details: 'Birthday Portrait အတွက် MUA + Dress 1 ပါဝင်သော Indoor package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'pre-wedding-indoor-2-dress',
    name: 'Pre Wedding Indoor 2 Dress',
    category: 'Pre Wedding Indoor',
    subcategory: 'Indoor 2 Dress',
    price: 500000,
    details: 'Pre Wedding Indoor 2 Dress package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'pre-wedding-indoor-1-own-1',
    name: 'Pre Wedding Indoor 1 Dress + Own 1 Dress',
    category: 'Pre Wedding Indoor',
    subcategory: 'Pre Wedding 1 Dress + Own 1 Dress',
    price: 400000,
    details: 'Pre Wedding Indoor 1 Dress + Own 1 Dress package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'pregnancy-indoor',
    name: 'Indoor Pregnancy Photo',
    category: 'Pregnancy',
    subcategory: 'Pregnancy',
    price: 150000,
    details: 'Indoor Pregnancy Photo package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'court-signing-indoor',
    name: 'မော်ကွန်းတင်လက်မှတ်ရေးထို ( ရုံးထဲအတွင်းသာ )',
    category: 'Outdoor',
    subcategory: 'General',
    price: 100000,
    details: 'ရုံးထဲအတွင်းသာ မော်ကွန်းတင်လက်မှတ်ရေးထိုး package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'graduation-with-frame',
    name: 'Indoor Graduation (With Frame)',
    category: 'Graduation',
    subcategory: 'Graduation',
    price: 160000,
    details: 'Indoor Graduation package with frame။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'pre-wedding-outdoor-basic',
    name: 'Pre Wedding Outdoor 1 Dress ( Basic )',
    category: 'Pre Wedding Outdoor',
    subcategory: 'Pre Wedding Outdoor',
    price: 450000,
    details: 'Pre Wedding Outdoor 1 Dress Basic package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
  {
    id: 'birthday-mua-1',
    name: 'Indoor Birthday Portrait ( MUA1)',
    category: 'Birthday Indoor Package',
    subcategory: 'Birthday Portrait',
    price: 110000,
    details: 'Birthday Portrait အတွက် MUA1 ပါဝင်သော Indoor package။ အသေးစိတ်ကို POS package detail အတိုင်း အတည်ယူပါ။',
  },
];

export const formatMmk = (price: number) => `${Number(price || 0).toLocaleString('en-US')} MMK`;

export const splitPackageDetails = (details: string) => (
  String(details || '')
    .split(/\n|။|(?=Softcopy)|(?=Soft Copy)|(?=Print)|(?=16x24)|(?=12x18)|(?=8x10)|(?=6x8)|(?=20x30)/)
    .map((item) => item.trim())
    .filter(Boolean)
);

export const normalizeStudioPackages = (packages: StudioPackage[]) => (
  packages
    .filter((pkg) => Number(pkg.price || 0) > 0)
    .map((pkg) => ({
      ...pkg,
      name: String(pkg.name || '').trim(),
      category: String(pkg.category || 'Other').trim(),
      subcategory: String(pkg.subcategory || 'General').trim(),
      price: Number(pkg.price || 0),
      details: String(pkg.details || '').trim(),
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.price - b.price || a.name.localeCompare(b.name))
);

export const buildPricingContext = (packages: StudioPackage[], sourceLabel = POS_PRICING_SOURCE_LABEL) => {
  const normalized = normalizeStudioPackages(packages);
  const rows = normalized.map((pkg) => (
    `- ${pkg.category} / ${pkg.subcategory}: ${pkg.name} = ${formatMmk(pkg.price)}. Details: ${pkg.details || 'POS package detail ကို အတည်ယူပါ။'}`
  ));

  return [
    `[CURRENT POS PACKAGE PRICE SOURCE]`,
    `Source: ${sourceLabel}`,
    `Rule: စျေးနှုန်း၊ package name၊ package detail ပါလာတိုင်း ဒီ list ကိုသာ အတည်ယူပါ။ အဟောင်း hardcoded price မသုံးပါနှင့်။`,
    ...rows,
  ].join('\n');
};

export const getSavedPricingContext = () => {
  if (typeof localStorage === 'undefined') return buildPricingContext(FALLBACK_STUDIO_PACKAGES, `${POS_PRICING_SOURCE_LABEL} fallback`);
  return localStorage.getItem(POS_PRICING_CONTEXT_KEY) || buildPricingContext(FALLBACK_STUDIO_PACKAGES, `${POS_PRICING_SOURCE_LABEL} fallback`);
};
