import home from "@/content/home.json";

export interface NavLink {
  label: string;
  href: string;
}

export const productCategories = home.categoryNav
  .filter((item) => item.href.startsWith("/cat/"))
  .map((item) => ({ label: item.label, href: item.href, img: item.img }));

export const primaryNav: NavLink[] = [
  { label: "Rooms", href: "/rooms/" },
  { label: "Offers", href: "/offers/" },
  { label: "Ideas & guides", href: "/ideas/" },
  { label: "Services", href: "/customer-service/services/" },
];

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export const footerColumns: FooterColumn[] = [
  {
    title: "Shop at IKEA",
    links: [
      { label: "Offers & promotions", href: "/offers/" },
      { label: "New products", href: "/new/new-products/?sort=NEWEST" },
      { label: "Planning tools", href: "/planners/" },
      { label: "Stores information", href: "/stores" },
      { label: "Restaurant menu", href: "/stores/restaurant" },
      { label: "IKEA Shopping app", href: "/customer-service/mobile-apps/" },
    ],
  },
  {
    title: "Customer Service",
    links: [
      { label: "FAQ", href: "/customer-service/faq/" },
      { label: "Delivery", href: "/customer-service/services/delivery/" },
      { label: "Return policy", href: "/customer-service/returns-claims/return-policy/" },
      { label: "Track your order", href: "/track-order" },
      { label: "Product guarantees", href: "/customer-service/returns-claims/guarantee/" },
      { label: "Our services", href: "/customer-service/services/" },
      { label: "Share your feedback", href: "/customer-service/create-a-better-ikea-experience-together-pub54fa5690/" },
      { label: "Spare parts", href: "/customer-service/returns-claims/spareparts/" },
    ],
  },
  {
    title: "This is IKEA",
    links: [
      { label: "About us", href: "/this-is-ikea/about-us/" },
      { label: "IKEA Family", href: "/ikea-family" },
      { label: "IKEA Family Kids' Club", href: "https://family.ikea.com.sg/kidsclub" },
      { label: "IKEA for Business", href: "/ikea-business/" },
      { label: "A sustainable everyday", href: "/this-is-ikea/sustainable-everyday/" },
      { label: "Work with us", href: "/this-is-ikea/work-with-us/" },
    ],
  },
  {
    title: "News & media",
    links: [
      { label: "Newsroom", href: "/newsroom/" },
      { label: "Product recalls", href: "/customer-service/product-support/recalls/" },
      { label: "Secure it or Return it!", href: "/customer-service/product-support/secure-it-or-return-it-pub6b7f8175/" },
      { label: "Media resources", href: "/newsroom/media-resources/" },
      { label: "Media contacts", href: "/newsroom/" },
      { label: "Disclaimer", href: "/newsroom/media-resources/disclaimers-pub3dd83fc1/" },
    ],
  },
];

export const socialLinks: NavLink[] = [
  { label: "Facebook", href: "https://www.facebook.com/IKEASingapore/" },
  { label: "Instagram", href: "https://www.instagram.com/ikea_singapore/" },
  { label: "YouTube", href: "https://www.youtube.com/@IKEASingapore" },
  { label: "TikTok", href: "https://www.tiktok.com/@ikeasingapore" },
];
