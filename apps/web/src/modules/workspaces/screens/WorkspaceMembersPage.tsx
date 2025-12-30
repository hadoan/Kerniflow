import React, { useEffect, useState } from "react";
import { UserPlus, Shield, Mail, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useToast } from "@/shared/ui/use-toast";
import type { WorkspaceMemberDto } from "@corely/contracts";

export const WorkspaceMembersPage: React.FC = () => {
  const { activeWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "MEMBER" });

  useEffect(() => {
    const load = async () => {
      if (!activeWorkspaceId) {
        return;
      }
      setIsLoading(true);
      try {
        const result = await workspacesApi.listMembers(activeWorkspaceId);
        setMembers(result.members ?? []);
      } catch (error) {
        toast({
          title: "Unable to load members",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [activeWorkspaceId, toast]);

  const sendInvite = async () => {
    if (!activeWorkspaceId || !inviteForm.email) {
      return;
    }
    setIsLoading(true);
    try {
      await workspacesApi.inviteMember(activeWorkspaceId, {
        email: inviteForm.email,
        role: inviteForm.role as any,
      });
      toast({ title: "Invite sent", description: inviteForm.email });
      setInviteForm({ email: "", role: "MEMBER" });
      const result = await workspacesApi.listMembers(activeWorkspaceId);
      setMembers(result.members ?? []);
    } catch (error) {
      toast({
        title: "Invite failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">Members & access</h1>
          <p className="text-muted-foreground">
            Invite teammates and manage their roles per workspace.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Invite member
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Email</Label>
            <Input
              placeholder="teammate@company.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={inviteForm.role}
              onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={sendInvite}
            disabled={isLoading || !inviteForm.email}
            className="md:col-span-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send invite
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.membershipId}>
                  <TableCell>{member.name ?? "Pending invite"}</TableCell>
                  <TableCell>{member.email ?? "—"}</TableCell>
                  <TableCell className="uppercase text-xs font-semibold">{member.role}</TableCell>
                  <TableCell className="capitalize text-sm">
                    {member.status.toLowerCase()}
                  </TableCell>
                </TableRow>
              ))}
              {!members.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
                    {isLoading ? "Loading members..." : "No members yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
