/**
 * Email Value Object
 * Encapsulates email validation and normalization
 */
export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    const normalized = email.toLowerCase().trim();

    if (!this.isValid(normalized)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    return new Email(normalized);
  }

  private static isValid(email: string): boolean {
    // Simple email regex - production should use a proper email validator
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
