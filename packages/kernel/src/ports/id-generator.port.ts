export interface IdGeneratorPort {
  newId(): string;
}

// Re-export canonical token to avoid identity mismatches
export { ID_GENERATOR_TOKEN } from "../tokens";
