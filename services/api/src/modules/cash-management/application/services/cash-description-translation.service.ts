import { Inject, Injectable } from "@nestjs/common";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import { EnvService } from "@corely/config";
import { GoogleAuth } from "google-auth-library";
import { createHash } from "node:crypto";

const MODULE_ID = "cash-management";
// Vietnamese descriptions are often entered without diacritics, which makes
// automatic source-language detection unreliable.
const SCOPE = "description-translation:vi-de:v2";

@Injectable()
export class CashDescriptionTranslationService {
  private readonly auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  constructor(
    @Inject(EXT_KV_PORT) private readonly cache: ExtKvPort,
    private readonly env: EnvService
  ) {}

  async translateToGerman(tenantId: string, descriptions: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(descriptions.map((value) => value.trim()).filter(Boolean))];
    const result = new Map<string, string>();
    const missing: string[] = [];
    for (const text of unique) {
      const cached = await this.cache.get({
        tenantId,
        moduleId: MODULE_ID,
        scope: SCOPE,
        key: this.key(text),
      });
      if (cached && this.isTranslation(cached.value)) {
        result.set(text, cached.value.translatedText);
      } else {
        missing.push(text);
      }
    }
    if (missing.length === 0) {
      return result;
    }
    const projectId = this.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error("Google Cloud Translation is not configured");
    }
    const client = await this.auth.getClient();
    const response = await client.request<{
      data?: { translations?: Array<{ translatedText?: string }> };
    }>({
      url: "https://translation.googleapis.com/language/translate/v2",
      method: "POST",
      headers: { "x-goog-user-project": projectId },
      data: { q: missing, source: "vi", target: "de", format: "text" },
    });
    const translations = response.data.data?.translations ?? [];
    if (translations.length !== missing.length) {
      throw new Error("Google Cloud Translation returned an incomplete response");
    }
    await Promise.all(
      missing.map(async (text, index) => {
        const translatedText = translations[index]?.translatedText;
        if (!translatedText) {
          throw new Error("Google Cloud Translation returned an invalid response");
        }
        result.set(text, translatedText);
        await this.cache.set({
          tenantId,
          moduleId: MODULE_ID,
          scope: SCOPE,
          key: this.key(text),
          value: { translatedText, sourceLanguage: "vi", targetLanguage: "de" },
        });
      })
    );
    return result;
  }

  private key(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }
  private isTranslation(value: unknown): value is { translatedText: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      typeof (value as { translatedText?: unknown }).translatedText === "string"
    );
  }
}
