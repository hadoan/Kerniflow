import { Controller, Get } from "@nestjs/common";
import { CONTRACTS_HELLO, mockReceipts } from "@corely/contracts";
import { DOMAIN_HELLO, formatEUR, vatCents } from "@corely/domain";

@Controller()
export class AppController {
  @Get("/health")
  health() {
    return { ok: true, service: "api", time: new Date().toISOString() };
  }

  @Get("/demo")
  demo() {
    const r = mockReceipts[0];
    return {
      contracts: CONTRACTS_HELLO,
      domain: DOMAIN_HELLO,
      sample: {
        merchant: r.merchant,
        total: formatEUR(r.totalCents, "de-DE"),
        vat: formatEUR(vatCents(r), "de-DE"),
      },
    };
  }
}
