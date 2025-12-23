import { TransactionContext } from "@kerniflow/kernel";
import { User } from "../../domain/entities/user.entity";

/**
 * User Repository Port (Interface)
 * Abstracts data persistence for User entity
 */
export interface IUserRepository {
  /**
   * Create a new user
   */
  create(user: User, tx?: TransactionContext): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string, tx?: TransactionContext): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string, tx?: TransactionContext): Promise<User | null>;

  /**
   * Check if user with email exists
   */
  emailExists(email: string, tx?: TransactionContext): Promise<boolean>;

  /**
   * Update user (status, name, etc.)
   */
  update(user: User, tx?: TransactionContext): Promise<User>;
}

export const USER_REPOSITORY_TOKEN = Symbol("USER_REPOSITORY");
