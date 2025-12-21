import { render as reactEmailRender } from "@react-email/render";
import type { ReactElement } from "react";

export type RenderEmailResult = {
  html: string;
  text: string;
};

export async function renderEmail(component: ReactElement): Promise<RenderEmailResult> {
  const html = await reactEmailRender(component, {
    pretty: false,
  });

  const text = await reactEmailRender(component, {
    plainText: true,
  });

  return { html, text };
}
