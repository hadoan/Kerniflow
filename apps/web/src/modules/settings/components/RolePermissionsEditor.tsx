import React, { useEffect, useMemo, useState } from "react";
import type { PermissionGroup } from "@corely/contracts";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

interface RolePermissionsEditorProps {
  catalog: PermissionGroup[];
  selectedKeys: Set<string>;
  onChange: (next: Set<string>) => void;
  readOnly?: boolean;
}

export const RolePermissionsEditor: React.FC<RolePermissionsEditorProps> = ({
  catalog,
  selectedKeys,
  onChange,
  readOnly = false,
}) => {
  const [activeGroupId, setActiveGroupId] = useState(catalog[0]?.id ?? "");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!catalog.find((group) => group.id === activeGroupId)) {
      setActiveGroupId(catalog[0]?.id ?? "");
    }
  }, [catalog, activeGroupId]);

  const totalCount = useMemo(
    () => catalog.reduce((sum, group) => sum + group.permissions.length, 0),
    [catalog]
  );

  const selectedCount = selectedKeys.size;
  const activeGroup = catalog.find((group) => group.id === activeGroupId);

  const filteredPermissions = useMemo(() => {
    if (!activeGroup) {
      return [];
    }
    const term = search.trim().toLowerCase();
    if (!term) {
      return activeGroup.permissions;
    }
    return activeGroup.permissions.filter((permission) => {
      return (
        permission.label.toLowerCase().includes(term) ||
        permission.key.toLowerCase().includes(term) ||
        permission.description?.toLowerCase().includes(term)
      );
    });
  }, [activeGroup, search]);

  const togglePermission = (key: string, checked: boolean) => {
    const next = new Set(selectedKeys);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    onChange(next);
  };

  const toggleGroup = () => {
    if (!activeGroup) {
      return;
    }
    const next = new Set(selectedKeys);
    const groupKeys = activeGroup.permissions.map((permission) => permission.key);
    const allSelected = groupKeys.every((key) => next.has(key));

    if (allSelected) {
      groupKeys.forEach((key) => next.delete(key));
    } else {
      groupKeys.forEach((key) => next.add(key));
    }
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium">Groups</div>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="p-2 space-y-1">
            {catalog.map((group) => {
              const groupSelected = group.permissions.filter((permission) =>
                selectedKeys.has(permission.key)
              ).length;
              const isActive = group.id === activeGroupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition",
                    isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted"
                  )}
                >
                  <span className="truncate">{group.label}</span>
                  <Badge variant={groupSelected ? "accent" : "outline"}>
                    {groupSelected}/{group.permissions.length}
                  </Badge>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Permissions</div>
            <div className="text-xs text-muted-foreground">
              {selectedCount} / {totalCount} permissions enabled
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search permissions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleGroup}
              disabled={!activeGroup || readOnly}
            >
              Toggle group
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="divide-y">
            {filteredPermissions.map((permission) => (
              <label
                key={permission.key}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 text-sm transition",
                  readOnly ? "opacity-60" : "hover:bg-muted/40"
                )}
              >
                <Checkbox
                  checked={selectedKeys.has(permission.key)}
                  onCheckedChange={(checked) => togglePermission(permission.key, Boolean(checked))}
                  disabled={readOnly}
                />
                <span className="space-y-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{permission.label}</span>
                    {permission.danger && (
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        Sensitive
                      </Badge>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">{permission.key}</span>
                  {permission.description && (
                    <span className="block text-xs text-muted-foreground">
                      {permission.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
