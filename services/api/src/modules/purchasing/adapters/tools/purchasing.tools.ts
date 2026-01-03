import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { EnvService } from "@corely/config";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import type { PurchasingApplication } from "../../application/purchasing.application";
import {
  SupplierPartyProposalCardSchema,
  PurchaseOrderDraftProposalCardSchema,
  VendorBillDraftProposalCardSchema,
  LineCategorizationCardSchema,
  DuplicateRiskCardSchema,
  MessageDraftCardSchema,
  ExpenseChangesNarrativeCardSchema,
  PostingExplanationCardSchema,
} from "@corely/contracts";

const validationError = (issues: unknown) => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Invalid input for tool call",
  details: issues,
});

export const buildPurchasingTools = (
  _app: PurchasingApplication,
  env: EnvService
): DomainToolPort[] => {
  const defaultModel = anthropic(env.AI_MODEL_ID) as any;

  return [
    {
      name: "purchasing_createSupplierFromText",
      description: "Extract supplier information from text and return a supplier proposal card.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string(),
      }),
      execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
        const parsed = z.object({ sourceText: z.string() }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText } = parsed.data;

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            displayName: z.string(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            vatId: z.string().optional(),
            notes: z.string().optional(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: `Extract supplier information from this text.\n\nText:\n${sourceText}`,
        });

        const proposal = SupplierPartyProposalCardSchema.parse({
          ok: true,
          proposal: {
            displayName: object.displayName,
            roles: ["SUPPLIER"],
            email: object.email,
            phone: object.phone,
            vatId: object.vatId,
            notes: object.notes,
            duplicates: [],
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });

        return proposal;
      },
    },
    {
      name: "purchasing_createPOFromText",
      description: "Create a purchase order draft proposal from natural language.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string(),
        supplierPartyId: z.string().optional(),
      }),
      execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
        const parsed = z
          .object({ sourceText: z.string(), supplierPartyId: z.string().optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText, supplierPartyId } = parsed.data;

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            supplierName: z.string().optional(),
            orderDate: z.string().optional(),
            expectedDeliveryDate: z.string().optional(),
            currency: z.string().optional(),
            notes: z.string().optional(),
            lineItems: z.array(
              z.object({
                description: z.string(),
                quantity: z.number().positive(),
                unitCostCents: z.number().int().nonnegative(),
                category: z.string().optional(),
              })
            ),
            missingFields: z.array(z.string()).optional(),
            followUpQuestions: z.array(z.string()).optional(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: `Extract a purchase order draft from this text.\n\nText:\n${sourceText}`,
        });

        const proposal = PurchaseOrderDraftProposalCardSchema.parse({
          ok: true,
          proposal: {
            supplierPartyId,
            supplierName: object.supplierName,
            orderDate: object.orderDate,
            expectedDeliveryDate: object.expectedDeliveryDate,
            currency: object.currency,
            notes: object.notes,
            lineItems: object.lineItems,
            missingFields: object.missingFields,
            followUpQuestions: object.followUpQuestions,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });

        return proposal;
      },
    },
    {
      name: "purchasing_createBillFromText",
      description: "Create a vendor bill draft proposal from unstructured text.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string(),
      }),
      execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
        const parsed = z.object({ sourceText: z.string() }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText } = parsed.data;

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            supplierName: z.string().optional(),
            billNumber: z.string().optional(),
            billDate: z.string().optional(),
            dueDate: z.string().optional(),
            currency: z.string().optional(),
            paymentTerms: z.string().optional(),
            notes: z.string().optional(),
            lineItems: z.array(
              z.object({
                description: z.string(),
                quantity: z.number().positive(),
                unitCostCents: z.number().int().nonnegative(),
                category: z.string().optional(),
                glAccountId: z.string().optional(),
              })
            ),
            missingFields: z.array(z.string()).optional(),
            followUpQuestions: z.array(z.string()).optional(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: `Extract a vendor bill draft from this text.\n\nText:\n${sourceText}`,
        });

        const proposal = VendorBillDraftProposalCardSchema.parse({
          ok: true,
          proposal: {
            supplierName: object.supplierName,
            billNumber: object.billNumber,
            billDate: object.billDate,
            dueDate: object.dueDate,
            currency: object.currency,
            paymentTerms: object.paymentTerms,
            notes: object.notes,
            lineItems: object.lineItems,
            missingFields: object.missingFields,
            followUpQuestions: object.followUpQuestions,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });

        return proposal;
      },
    },
    {
      name: "purchasing_categorizeBillLines",
      description: "Suggest categories and GL accounts for vendor bill lines.",
      kind: "server",
      inputSchema: z.object({
        vendorBillId: z.string().optional(),
        lines: z
          .array(
            z.object({
              lineId: z.string().optional(),
              description: z.string(),
              amountCents: z.number().int().nonnegative(),
            })
          )
          .optional(),
      }),
      execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
        const parsed = z
          .object({
            vendorBillId: z.string().optional(),
            lines: z
              .array(
                z.object({
                  lineId: z.string().optional(),
                  description: z.string(),
                  amountCents: z.number().int().nonnegative(),
                })
              )
              .optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            lines: z.array(
              z.object({
                lineIndex: z.number().int().nonnegative(),
                category: z.string().optional(),
                glAccountId: z.string().optional(),
                glAccountName: z.string().optional(),
                confidence: z.number().min(0).max(1),
                rationale: z.string(),
              })
            ),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: `Categorize vendor bill lines and suggest GL accounts.`,
        });

        return LineCategorizationCardSchema.parse({
          ok: true,
          lines: object.lines,
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: { extractedFields: Object.keys(object) },
        });
      },
    },
    {
      name: "purchasing_detectDuplicateBills",
      description: "Detect possible duplicate vendor bills.",
      kind: "server",
      inputSchema: z.object({
        supplierPartyId: z.string().optional(),
        billNumber: z.string().optional(),
        amountCents: z.number().int().optional(),
        billDate: z.string().optional(),
      }),
      execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
        const parsed = z
          .object({
            supplierPartyId: z.string().optional(),
            billNumber: z.string().optional(),
            amountCents: z.number().int().optional(),
            billDate: z.string().optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        return DuplicateRiskCardSchema.parse({
          ok: true,
          possibleDuplicates: [],
          recommendation: "No obvious duplicates found.",
          confidence: 0.4,
          rationale: "No existing vendor bill matches were provided in this run.",
          provenance: { extractedFields: [] },
        });
      },
    },
    {
      name: "purchasing_draftVendorEmail",
      description: "Draft an email to the vendor based on PO or bill context.",
      kind: "server",
      inputSchema: z.object({
        objective: z.string(),
        context: z.string().optional(),
      }),
      execute: async ({ input }) => {
        const parsed = z
          .object({ objective: z.string(), context: z.string().optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            subject: z.string(),
            body: z.string(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: `Draft a vendor email for this objective: ${parsed.data.objective}\n\nContext:\n${parsed.data.context ?? ""}`,
        });

        return MessageDraftCardSchema.parse({
          ok: true,
          draft: {
            subject: object.subject,
            body: object.body,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: { extractedFields: ["subject", "body"] },
        });
      },
    },
    {
      name: "purchasing_explainExpenseChanges",
      description: "Explain expense changes for a period and supplier filter.",
      kind: "server",
      inputSchema: z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        supplierPartyId: z.string().optional(),
      }),
      execute: async ({ input }) => {
        const parsed = z
          .object({
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
            supplierPartyId: z.string().optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        return ExpenseChangesNarrativeCardSchema.parse({
          ok: true,
          narrative:
            "Spend changes are driven by updated vendor bills and recurring subscriptions.",
          highlights: [],
          confidence: 0.4,
          rationale: "No detailed report data was attached to this request.",
          provenance: { extractedFields: [] },
        });
      },
    },
    {
      name: "purchasing_explainPosting",
      description: "Explain the posting for a vendor bill or bill payment.",
      kind: "server",
      inputSchema: z.object({
        vendorBillId: z.string().optional(),
        billPaymentId: z.string().optional(),
      }),
      execute: async ({ input }) => {
        const parsed = z
          .object({ vendorBillId: z.string().optional(), billPaymentId: z.string().optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        return PostingExplanationCardSchema.parse({
          ok: true,
          explanation:
            "Posting follows standard AP rules: debit expense, credit AP; payments debit AP and credit bank.",
          confidence: 0.5,
          rationale: "No journal entry details provided; explanation is generic.",
          provenance: { extractedFields: [] },
        });
      },
    },
  ];
};
