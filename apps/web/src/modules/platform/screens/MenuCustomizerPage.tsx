import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Pin,
  PinOff,
  Edit2,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  useMenu,
  useUpdateMenuOverrides,
  useResetMenuOverrides,
  type MenuItem,
  type MenuOverrides,
} from "../hooks/useMenu";

export function MenuCustomizerPage() {
  const scope = "web"; // Can be made dynamic with tabs for web/pos
  const { data: menu, isLoading, error } = useMenu(scope);
  const updateOverrides = useUpdateMenuOverrides();
  const resetOverrides = useResetMenuOverrides();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [overrides, setOverrides] = useState<MenuOverrides>({
    hidden: [],
    order: {},
    renames: {},
    pins: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Initialize items from menu
  useEffect(() => {
    if (menu?.items) {
      setItems([...menu.items].sort((a, b) => a.order - b.order));
    }
  }, [menu]);

  const handleHideToggle = (itemId: string) => {
    setOverrides((prev) => {
      const hidden = prev.hidden || [];
      const isHidden = hidden.includes(itemId);
      return {
        ...prev,
        hidden: isHidden ? hidden.filter((id) => id !== itemId) : [...hidden, itemId],
      };
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) {
      return;
    }
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);

    // Update order overrides
    const newOrder: Record<string, number> = {};
    newItems.forEach((item, idx) => {
      newOrder[item.id] = idx;
    });
    setOverrides((prev) => ({ ...prev, order: newOrder }));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) {
      return;
    }
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);

    // Update order overrides
    const newOrder: Record<string, number> = {};
    newItems.forEach((item, idx) => {
      newOrder[item.id] = idx;
    });
    setOverrides((prev) => ({ ...prev, order: newOrder }));
  };

  const handlePinToggle = (itemId: string) => {
    setOverrides((prev) => {
      const pins = prev.pins || [];
      const isPinned = pins.includes(itemId);
      return {
        ...prev,
        pins: isPinned ? pins.filter((id) => id !== itemId) : [...pins, itemId],
      };
    });
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditLabel(overrides.renames?.[item.id] || item.label);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editLabel.trim()) {
      setOverrides((prev) => ({
        ...prev,
        renames: { ...prev.renames, [itemId]: editLabel.trim() },
      }));
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
  };

  const handleSave = async () => {
    try {
      await updateOverrides.mutateAsync({ scope, overrides });
    } catch (error) {
      console.error("Failed to save menu customizations:", error);
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset menu customizations to defaults?")) {
      try {
        await resetOverrides.mutateAsync(scope);
        setOverrides({ hidden: [], order: {}, renames: {}, pins: [] });
      } catch (error) {
        console.error("Failed to reset menu:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load menu. Please try again.</AlertDescription>
      </Alert>
    );
  }

  const isItemHidden = (itemId: string) => overrides.hidden?.includes(itemId) || false;
  const isItemPinned = (itemId: string) => overrides.pins?.includes(itemId) || false;
  const getItemLabel = (item: MenuItem) => overrides.renames?.[item.id] || item.label;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Menu Customization</h1>
          <p className="text-muted-foreground mt-2">
            Customize your navigation menu by hiding, reordering, renaming, or pinning items.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={resetOverrides.isPending}>
            {resetOverrides.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={updateOverrides.isPending}>
            {updateOverrides.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {updateOverrides.isSuccess && (
        <Alert>
          <AlertDescription>Menu customizations saved successfully!</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>
            Manage visibility, order, labels, and pinned status of menu items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((item, index) => {
              const isHidden = isItemHidden(item.id);
              const isPinned = isItemPinned(item.id);
              const label = getItemLabel(item);
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isHidden ? "bg-muted/50 opacity-50" : "bg-background"
                  }`}
                >
                  {/* Visibility Toggle */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleHideToggle(item.id)}
                    title={isHidden ? "Show item" : "Hide item"}
                  >
                    {isHidden ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Move Up/Down */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-4 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className="h-4 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(item.id);
                            }
                            if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.section}
                        </Badge>
                        {isPinned && (
                          <Badge variant="secondary" className="text-xs">
                            Pinned
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleStartEdit(item)}
                      title="Rename item"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handlePinToggle(item.id)}
                      title={isPinned ? "Unpin item" : "Pin item"}
                    >
                      {isPinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
