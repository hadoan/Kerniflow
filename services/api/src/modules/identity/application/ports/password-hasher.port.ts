/**
 * Password Hasher Port (Interface)
 * Abstracts password hashing/verification logic
 */
export interface IPasswordHasher {
  /**
   * Hash a plain text password
   */
  hash(password: string): Promise<string>;

  /**
   * Verify a plain text password against a hash
   */
  verify(password: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER_TOKEN = Symbol("PASSWORD_HASHER");
