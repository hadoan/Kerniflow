import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CompleteUploadInputSchema,
  CreateUploadIntentInputSchema,
  GetDownloadUrlInputSchema,
  LinkDocumentInputSchema,
} from "@corely/contracts";
import { DocumentsApplication } from "../../application/documents.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";

@Controller("documents")
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly app: DocumentsApplication) {}

  @Post("upload-intent")
  async createUploadIntent(@Body() body: unknown, @Req() req: Request) {
    const input = CreateUploadIntentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createUploadIntent.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/files/:fileId/complete")
  async completeUpload(
    @Param("documentId") documentId: string,
    @Param("fileId") fileId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CompleteUploadInputSchema.parse({ ...(body as object), documentId, fileId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.completeUpload.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":documentId/files/:fileId/download-url")
  async getDownloadUrlWithFile(
    @Param("documentId") documentId: string,
    @Param("fileId") fileId: string,
    @Req() req: Request
  ) {
    const input = GetDownloadUrlInputSchema.parse({ documentId, fileId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDownloadUrl.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":documentId/download-url")
  async getDownloadUrl(@Param("documentId") documentId: string, @Req() req: Request) {
    const input = GetDownloadUrlInputSchema.parse({ documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDownloadUrl.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/link")
  async linkDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = LinkDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.linkDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
