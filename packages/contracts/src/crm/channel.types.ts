import { z } from "zod";

const ChannelTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  body: z.string(),
  subject: z.string().optional(),
});

const ChannelActionSchema = z.object({
  type: z.enum(["deeplink", "profileUrl", "mailto"]),
  urlTemplate: z.string(),
});

const ChannelCapabilitiesSchema = z.object({
  open: z.boolean().default(true),
  copy: z.boolean().default(true),
  log: z.boolean().default(true),
  subject: z.boolean().default(false),
  attachments: z.boolean().default(false),
});

export const ChannelDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  order: z.number().int().default(0),
  iconKey: z.string().optional(),
  requiredContactFields: z.array(z.string()).default([]),
  capabilities: ChannelCapabilitiesSchema,
  action: ChannelActionSchema,
  templates: z.array(ChannelTemplateSchema).default([]),
});

export type ChannelDefinition = z.infer<typeof ChannelDefinitionSchema>;

export const ListChannelsOutputSchema = z.object({
  channels: z.array(ChannelDefinitionSchema),
});

export type ListChannelsOutput = z.infer<typeof ListChannelsOutputSchema>;
