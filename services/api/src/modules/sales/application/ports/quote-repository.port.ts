import { QuoteAggregate } from "../../domain/quote.aggregate";
import { QuoteStatus } from "../../domain/sales.types";

export type ListQuotesFilters = {
  status?: QuoteStatus;
  customerPartyId?: string;
  fromDate?: Date;
  toDate?: Date;
};

export type ListQuotesResult = {
  items: QuoteAggregate[];
  nextCursor?: string | null;
};

export interface QuoteRepositoryPort {
  findById(tenantId: string, quoteId: string): Promise<QuoteAggregate | null>;
  list(
    tenantId: string,
    filters: ListQuotesFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListQuotesResult>;
  save(tenantId: string, quote: QuoteAggregate): Promise<void>;
  create(tenantId: string, quote: QuoteAggregate): Promise<void>;
  isQuoteNumberTaken(tenantId: string, number: string): Promise<boolean>;
}

export const QUOTE_REPOSITORY_PORT = Symbol("QUOTE_REPOSITORY_PORT");
