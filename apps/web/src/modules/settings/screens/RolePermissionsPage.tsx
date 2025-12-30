import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { RolePermissionsEditor } from "../components/RolePermissionsEditor";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { useUpdateRolePermissions } from "../hooks/useUpdateRolePermissions";
import type { RolePermissionGrant } from "@corely/contracts";

export default function RolePermissionsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { data, isLoading } = useRolePermissions(roleId);
  const updatePermissions = useUpdateRolePermissions(roleId || "");

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [initialKeys, setInitialKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data) {
      return;
    }
    const granted = data.grants.filter((grant) => grant.granted).map((grant) => grant.key);
    const next = new Set(granted);
    setSelectedKeys(next);
    setInitialKeys(new Set(granted));
  }, [data]);

  const dirty = useMemo(() => {
    if (selectedKeys.size !== initialKeys.size) {
      return true;
    }
    for (const key of selectedKeys) {
      if (!initialKeys.has(key)) {
        return true;
      }
    }
    return false;
  }, [initialKeys, selectedKeys]);

  const role = data?.role;
  const readOnly = role?.isSystem ?? false;

  const handleSave = async () => {
    if (!roleId) {
      return;
    }
    const grants: RolePermissionGrant[] = Array.from(selectedKeys).map((key) => ({
      key,
      effect: "ALLOW",
    }));
    await updatePermissions.mutateAsync({ grants });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings/roles">Back</Link>
            </Button>
            <h1 className="text-h2 text-foreground">Role permissions</h1>
          </div>
          {role && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{role.name}</span>
              {role.isSystem && <Badge variant="outline">System</Badge>}
            </div>
          )}
        </div>
        <Button
          variant="accent"
          onClick={handleSave}
          disabled={!dirty || readOnly || updatePermissions.isPending}
        >
          Save changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="text-sm text-muted-foreground">Loading permissions...</div>
          ) : (
            <RolePermissionsEditor
              catalog={data.catalog}
              selectedKeys={selectedKeys}
              onChange={setSelectedKeys}
              readOnly={readOnly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
