import { IsArray, IsOptional, IsString } from "class-validator";
import { type CopilotUIMessage } from "../../domain/types/ui-message";

export class CopilotChatRequestDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsArray()
  messages?: CopilotUIMessage[];

  requestData!: {
    tenantId: string;
    locale?: string;
    activeModule?: string;
    modelHint?: string;
  };
}
