import { Email } from "../value-objects/email.vo";

/**
 * User Entity
 * Represents a user in the system
 * Framework-free domain logic
 */
export class User {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private readonly passwordHash: string,
    private readonly name: string | null,
    private readonly status: string,
    private readonly createdAt: Date
  ) {}

  static create(
    id: string,
    email: Email,
    passwordHash: string,
    name: string | null = null,
    status: string = "ACTIVE",
    createdAt: Date = new Date()
  ): User {
    return new User(id, email, passwordHash, name, status, createdAt);
  }

  static restore(data: {
    id: string;
    email: string;
    passwordHash: string;
    name: string | null;
    status: string;
    createdAt: Date;
  }): User {
    return new User(
      data.id,
      Email.create(data.email),
      data.passwordHash,
      data.name,
      data.status,
      data.createdAt
    );
  }

  getId(): string {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getName(): string | null {
    return this.name;
  }

  getStatus(): string {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  isActive(): boolean {
    return this.status === "ACTIVE";
  }
}
