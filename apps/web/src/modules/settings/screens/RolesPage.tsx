import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from "../hooks/useRoles";
import type { RoleDto } from "@corely/contracts";

export default function RolesPage() {
  const { data: roles = [], isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleDto | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Create roles and manage permission assignments.
          </p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}>
          New role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role list</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading roles...
                  </TableCell>
                </TableRow>
              ) : sortedRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No roles yet.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="outline">System</Badge>
                      ) : (
                        <Badge variant="accent">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setEditRole(role)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/settings/roles/${role.id}/permissions`}>Permissions</Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={role.isSystem}
                        onClick={() => setDeleteRoleId(role.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleDialog
        open={createOpen}
        title="Create role"
        submitLabel="Create"
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createRole.mutateAsync(values).then(() => setCreateOpen(false))}
      />

      <RoleDialog
        open={!!editRole}
        title="Edit role"
        submitLabel="Save"
        role={editRole}
        disableName={editRole?.isSystem}
        onClose={() => setEditRole(null)}
        onSubmit={(values) =>
          editRole
            ? updateRole
                .mutateAsync({ roleId: editRole.id, patch: values })
                .then(() => setEditRole(null))
            : Promise.resolve()
        }
      />

      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Make sure the role is not assigned to members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteRoleId
                  ? deleteRole.mutateAsync(deleteRoleId).then(() => setDeleteRoleId(null))
                  : Promise.resolve()
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RoleDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  role?: RoleDto | null;
  disableName?: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; description?: string | null }) => Promise<void>;
}

const RoleDialog: React.FC<RoleDialogProps> = ({
  open,
  title,
  submitLabel,
  role,
  disableName = false,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");

  React.useEffect(() => {
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
  }, [role, open]);

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Role name"
              disabled={disableName}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What can this role do?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={() => onSubmit({ name, description: description || null })}
            disabled={!name.trim()}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
