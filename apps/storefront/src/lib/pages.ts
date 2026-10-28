// Static/policy page content (BRD 4.10). Moves to the CMS module with versioning.
// Copy is a starting draft for the business to review — not legal advice.

export interface CmsPage {
  title: string;
  intro?: string;
  sections: { heading?: string; body: string[] }[];
}

export const PAGES: Record<string, CmsPage> = {
  about: {
    title: "Our story",
    intro: "Libas-ul-Fakhar — لِباسُ الفخر — means “the garment of pride”.",
    sections: [
      { body: ["We started with a simple belief: what you wear to your most important moments should be made with the same care you bring to them. Every kurta, waistcoat and shawl in our collection is designed in-house and finished by skilled artisans in Pakistan.", "Our style is modern heritage — the quiet elegance of traditional craft, cut for the way we live today."] },
      { heading: "Our promise", body: ["Honest fabrics, careful finishing, fair prices, and service that treats every customer like family."] },
    ],
  },
  contact: {
    title: "Contact us",
    intro: "We’re here Monday to Saturday, 10am–8pm.",
    sections: [
      { heading: "WhatsApp", body: ["The fastest way to reach us — tap the green button on any page. Send your order number for order questions."] },
      { heading: "Phone & email", body: ["0334 8322662 (calls and WhatsApp)", "libasulfakhar@gmail.com"] },
      { heading: "Follow us", body: ["Instagram and TikTok: @libas_ul_fakhar", "Join our WhatsApp channel for new arrivals and sale alerts — links are at the bottom of every page."] },
      { heading: "Head office", body: ["Address to be confirmed."] },
    ],
  },
  stores: {
    title: "Store locator",
    sections: [{ body: ["Our flagship store details will be published here. Physical store and POS integration is listed as an open question for launch."] }],
  },
  shipping: {
    title: "Shipping & delivery",
    sections: [
      { heading: "Delivery times", body: ["Karachi, Lahore, Islamabad and Rawalpindi: 2–3 working days.", "Other cities: 3–5 working days.", "Pre-order and made-to-order pieces ship within the time shown on the product page."] },
      { heading: "Delivery charges", body: ["Free delivery on orders of Rs. 4,999 and above.", "Major cities: Rs. 200. Other cities: Rs. 300."] },
      { heading: "Cash on delivery", body: ["Available nationwide. For some high-value orders we may confirm by call or WhatsApp before dispatch."] },
    ],
  },
  returns: {
    title: "Exchange & returns",
    sections: [
      { heading: "7-day exchange", body: ["Items can be exchanged or returned within 7 days of delivery if they are unworn, unwashed and have original tags attached.", "Sale items can be exchanged for size only.", "Made-to-order, altered and accessories such as caps are final sale unless faulty."] },
      { heading: "How to request", body: ["Message us on WhatsApp with your order number and photos, or use Track Your Order once your order is delivered. Our courier collects from your address.", "Refunds are issued to your bank account or as store credit within 5–7 working days of receiving the item."] },
    ],
  },
  cancellation: {
    title: "Cancellation policy",
    sections: [{ body: ["You can cancel an order any time before it is shipped from the Track Your Order page, or by contacting us on WhatsApp. Once shipped, an order can be returned after delivery under our exchange & returns policy."] }],
  },
  "size-guide": {
    title: "Size guide",
    sections: [
      { heading: "How to measure", body: ["Chest/bust: around the fullest part, under the arms.", "Waist: around your natural waistline.", "Hip: around the fullest part of the hips.", "Every product page has a size guide for its category, plus a size recommendation from your height and weight."] },
    ],
  },
  faqs: {
    title: "FAQs",
    sections: [
      { heading: "Do you offer cash on delivery?", body: ["Yes, across Pakistan."] },
      { heading: "How do I track my order?", body: ["Use the Track Your Order page with your order number and mobile number."] },
      { heading: "Can I order on WhatsApp?", body: ["Yes. Tap “Order on WhatsApp” on any product and we’ll confirm your size and address in chat."] },
      { heading: "Do you ship internationally?", body: ["Not yet — we currently deliver within Pakistan only."] },
    ],
  },
  terms: {
    title: "Terms & conditions",
    sections: [{ body: ["Draft terms to be supplied by the business and reviewed by legal counsel before launch. Prices are in PKR and include applicable taxes. We reserve the right to cancel orders in case of pricing errors or suspected fraud, with full refund of any payment received."] }],
  },
  privacy: {
    title: "Privacy policy",
    sections: [
      { body: ["We collect only what we need to fulfil your order: your name, phone, address and (optionally) email. We never store card details — card payments are handled by a PCI-compliant hosted gateway.", "Marketing messages are sent only with your consent, and you can opt out anytime. You may request a copy or deletion of your data by contacting libasulfakhar@gmail.com.", "Final policy to be reviewed by legal counsel before launch."] },
    ],
  },
};
