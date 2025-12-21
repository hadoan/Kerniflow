Notes for invoicing schema (v1):

- Existing Prisma schema includes `Invoice` and `InvoiceLine`. Payments table is not yet modeled; `PrismaInvoiceRepoAdapter` currently ignores payments persistence.
- New fields referenced by the domain (number, sentAt, notes, terms, customerPartyId, billTo\*) should be added to the `Invoice` model in a future migration.
