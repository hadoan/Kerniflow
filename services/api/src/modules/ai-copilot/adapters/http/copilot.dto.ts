import { IsArray, IsOptional, IsString } from "class-validator";

export class CopilotChatRequestDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsArray()
  messages?: unknown[];

  requestData!: {
    tenantId: string;
    locale?: string;
    activeModule?: string;
    modelHint?: string;
  };
}
