export type DocumentType = "UPLOAD" | "RECEIPT" | "CONTRACT" | "INVOICE_PDF" | "OTHER";
export type DocumentStatus = "PENDING" | "READY" | "FAILED" | "QUARANTINED";
export type FileKind = "ORIGINAL" | "DERIVED" | "GENERATED";
export type StorageProvider = "gcs" | "s3" | "azure";

export type DocumentLinkEntityType = "INVOICE" | "EXPENSE" | "AGENT_RUN" | "MESSAGE" | "OTHER";
