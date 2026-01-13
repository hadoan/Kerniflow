import { Injectable } from "@nestjs/common";
import type { ChannelDefinition } from "@corely/contracts";

const PLACEHOLDER_WHITELIST = [
  "firstName",
  "lastName",
  "companyName",
  "dealTitle",
  "amount",
  "currency",
  "phoneE164",
  "email",
  "profileHandle",
  "profileUrl",
  // Support channel-specific profile placeholders like profileUrl_facebook, profileUrl_linkedin
  "profileUrl_*",
  "encodedMessage",
  "message",
  "subject",
];

const SAFE_SCHEMES = ["https://", "mailto:"];

const DEFAULT_CHANNELS: ChannelDefinition[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    enabled: true,
    order: 1,
    iconKey: "whatsapp",
    requiredContactFields: ["phoneE164"],
    capabilities: { open: true, copy: true, log: true, subject: false, attachments: false },
    action: {
      type: "deeplink",
      urlTemplate: "https://wa.me/{phoneE164}?text={encodedMessage}",
    },
    templates: [
      {
        id: "whatsapp-followup",
        name: "Follow-up",
        body: "Hi {firstName}, following up on {dealTitle}",
      },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    enabled: true,
    order: 2,
    iconKey: "linkedin",
    requiredContactFields: ["profileUrl_linkedin"],
    capabilities: { open: true, copy: true, log: true, subject: false, attachments: false },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_linkedin}",
    },
    templates: [
      {
        id: "linkedin-intro",
        name: "Intro",
        body: "Hi {firstName}, great to connect about {dealTitle}.",
      },
    ],
  },
  {
    key: "facebook",
    label: "Facebook",
    enabled: true,
    order: 2.5,
    iconKey: "facebook",
    requiredContactFields: ["profileUrl_facebook"],
    capabilities: { open: true, copy: true, log: true, subject: false, attachments: false },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_facebook}",
    },
    templates: [
      {
        id: "facebook-intro",
        name: "Intro",
        body: "Hi {firstName}, reaching out regarding {dealTitle}.",
      },
    ],
  },
  {
    key: "email",
    label: "Email",
    enabled: true,
    order: 3,
    iconKey: "email",
    requiredContactFields: ["email"],
    capabilities: { open: true, copy: true, log: true, subject: true, attachments: false },
    action: {
      type: "mailto",
      urlTemplate: "mailto:{email}?subject={subject}&body={encodedMessage}",
    },
    templates: [
      {
        id: "email-proposal",
        name: "Proposal",
        subject: "Proposal for {dealTitle}",
        body: "Hi {firstName}, please find details about {dealTitle}.",
      },
    ],
  },
];

function validatePlaceholders(template: string) {
  const matches = template.match(/{([^}]+)}/g) || [];
  for (const match of matches) {
    const key = match.replace(/[{}]/g, "");
    const isProfileSpecific = key.startsWith("profileUrl_");
    if (!isProfileSpecific && !PLACEHOLDER_WHITELIST.includes(key)) {
      throw new Error(`Invalid placeholder: ${key}`);
    }
  }
}

function validateUrlTemplate(url: string) {
  const lower = url.toLowerCase();
  const startsWithPlaceholder = lower.startsWith("{");
  if (!startsWithPlaceholder && !SAFE_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    throw new Error("Only https and mailto schemes are allowed");
  }
  validatePlaceholders(url);
}

@Injectable()
export class ChannelCatalogService {
  async getChannels(): Promise<ChannelDefinition[]> {
    for (const channel of DEFAULT_CHANNELS) {
      validateUrlTemplate(channel.action.urlTemplate);
    }
    return DEFAULT_CHANNELS;
  }
}
