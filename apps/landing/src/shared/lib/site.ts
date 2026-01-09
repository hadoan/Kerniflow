export const siteConfig = {
  name: "Corely",
  tagline: "Run your business, clearly.",
  description:
    "Corely is an AI-native ERP kernel that starts in freelancer mode and scales to company workflows without rewrites.",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://corely.one",
  social: {
    github: "https://github.com/corely",
    docs: "https://docs.corely.ai",
  },
};

export const primaryNav = [
  { label: "Freelancer", href: "/freelancer" },
  { label: "Company", href: "/company" },
  { label: "Developers", href: "/developers" },
];

export const footerNav = {
  product: [
    { label: "Home", href: "/" },
    { label: "Freelancer", href: "/freelancer" },
    { label: "Company", href: "/company" },
  ],
  platform: [
    { label: "Developers", href: "/developers" },
    { label: "Request access", href: "mailto:hello@corely.ai" },
    { label: "GitHub", href: "https://github.com/corely" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};
