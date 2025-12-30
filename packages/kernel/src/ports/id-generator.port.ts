export interface IdGeneratorPort {
  newId(): string;
}

export const ID_GENERATOR_TOKEN = "kernel/id-generator";
