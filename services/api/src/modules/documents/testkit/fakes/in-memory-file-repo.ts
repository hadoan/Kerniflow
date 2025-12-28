import { type FileRepoPort } from "../../application/ports/file-repository.port";
import { type FileEntity } from "../../domain/file.entity";
import { type FileKind } from "../../domain/document.types";

export class InMemoryFileRepo implements FileRepoPort {
  files = new Map<string, FileEntity>();

  async create(file: FileEntity): Promise<void> {
    this.files.set(file.id, file);
  }

  async save(file: FileEntity): Promise<void> {
    this.files.set(file.id, file);
  }

  async findById(tenantId: string, fileId: string): Promise<FileEntity | null> {
    const file = this.files.get(fileId);
    if (!file || file.tenantId !== tenantId) {
      return null;
    }
    return file;
  }

  async findByDocument(tenantId: string, documentId: string): Promise<FileEntity[]> {
    return Array.from(this.files.values()).filter(
      (f) => f.tenantId === tenantId && f.documentId === documentId
    );
  }

  async findByDocumentAndKind(
    tenantId: string,
    documentId: string,
    kind: FileKind
  ): Promise<FileEntity | null> {
    return (await this.findByDocument(tenantId, documentId)).find((f) => f.kind === kind) ?? null;
  }
}
