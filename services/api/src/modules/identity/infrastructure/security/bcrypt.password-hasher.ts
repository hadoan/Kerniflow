import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { IPasswordHasher } from "../../application/ports/password-hasher.port";

/**
 * Bcrypt Password Hasher Implementation
 */
@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
