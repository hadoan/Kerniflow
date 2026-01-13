import type {
  AcceptWorkspaceInviteInput,
  AcceptWorkspaceInviteOutput,
  CreateWorkspaceInput,
  CreateWorkspaceOutput,
  CreateWorkspaceInviteInput,
  CreateWorkspaceInviteOutput,
  ListWorkspaceMembersOutput,
  ListWorkspacesOutput,
  UpdateWorkspaceInput,
  UpdateWorkspaceOutput,
  UpgradeWorkspaceInput,
  UpgradeWorkspaceOutput,
  WorkspaceConfig,
  WorkspaceOnboardingStatusResponse,
} from "@corely/contracts";
import { apiClient } from "@/lib/api-client";

class WorkspacesApi {
  async listWorkspaces(): Promise<ListWorkspacesOutput["workspaces"]> {
    const result = await apiClient.get<ListWorkspacesOutput>("/workspaces");
    return result.workspaces ?? [];
  }

  async createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
    return apiClient.post<CreateWorkspaceOutput>(
      "/workspaces",
      input,
      this.withIdempotencyAndCorrelation()
    );
  }

  async updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput
  ): Promise<UpdateWorkspaceOutput> {
    return apiClient.patch<UpdateWorkspaceOutput>(
      `/workspaces/${workspaceId}`,
      input,
      this.withIdempotencyAndCorrelation()
    );
  }

  async listMembers(workspaceId: string): Promise<ListWorkspaceMembersOutput> {
    return apiClient.get<ListWorkspaceMembersOutput>(`/workspaces/${workspaceId}/members`);
  }

  async getWorkspaceConfig(
    workspaceId: string,
    options?: { scope?: "web" | "pos" }
  ): Promise<WorkspaceConfig> {
    const scope = options?.scope ?? "web";
    return apiClient.get<WorkspaceConfig>(`/workspaces/${workspaceId}/config?scope=${scope}`);
  }

  async upgradeWorkspace(
    workspaceId: string,
    input: UpgradeWorkspaceInput = {}
  ): Promise<UpgradeWorkspaceOutput> {
    return apiClient.post<UpgradeWorkspaceOutput>(
      `/workspaces/${workspaceId}/upgrade`,
      input,
      this.withIdempotencyAndCorrelation()
    );
  }

  async inviteMember(
    workspaceId: string,
    input: CreateWorkspaceInviteInput
  ): Promise<CreateWorkspaceInviteOutput> {
    return apiClient.post<CreateWorkspaceInviteOutput>(
      `/workspaces/${workspaceId}/invites`,
      input,
      this.withIdempotencyAndCorrelation()
    );
  }

  async acceptInvite(token: string): Promise<AcceptWorkspaceInviteOutput> {
    return apiClient.post<AcceptWorkspaceInviteOutput>(
      `/invites/${token}/accept`,
      {},
      this.withIdempotencyAndCorrelation()
    );
  }

  async getOnboardingStatus(workspaceId: string): Promise<WorkspaceOnboardingStatusResponse> {
    return apiClient.get<WorkspaceOnboardingStatusResponse>(
      `/workspaces/${workspaceId}/onboarding`
    );
  }

  private withIdempotencyAndCorrelation() {
    return {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    };
  }
}

export const workspacesApi = new WorkspacesApi();
