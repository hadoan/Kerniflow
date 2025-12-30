import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Loader2, Power, PowerOff, AlertCircle, CheckCircle2, Package } from "lucide-react";
import { usePlatformApps, useEnableApp, useDisableApp } from "../hooks/usePlatformApps";
import type { AppWithStatus } from "../hooks/usePlatformApps";

export function AppsManagementPage() {
  const { data: apps, isLoading, error } = usePlatformApps();
  const enableApp = useEnableApp();
  const disableApp = useDisableApp();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const handleEnableApp = async (appId: string) => {
    setSelectedApp(appId);
    try {
      await enableApp.mutateAsync(appId);
    } finally {
      setSelectedApp(null);
    }
  };

  const handleDisableApp = async (appId: string) => {
    setSelectedApp(appId);
    try {
      await disableApp.mutateAsync({ appId });
    } catch (error: any) {
      // Handle dependent apps error
      if (error.response?.data?.code === "Platform:HasDependents") {
        if (
          confirm(
            `Cannot disable "${appId}" because other apps depend on it. Force disable all dependent apps?`
          )
        ) {
          await disableApp.mutateAsync({ appId, force: true });
        }
      }
    } finally {
      setSelectedApp(null);
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
        <AlertDescription>Failed to load apps. Please try again.</AlertDescription>
      </Alert>
    );
  }

  const groupedApps = apps?.reduce(
    (acc, app) => {
      const tier = app.tier;
      if (!acc[tier]) {
        acc[tier] = [];
      }
      acc[tier].push(app);
      return acc;
    },
    {} as Record<number, AppWithStatus[]>
  );

  const tierNames: Record<number, string> = {
    0: "Platform & Core",
    1: "Basic Business Functions",
    2: "Standard Operations",
    3: "Advanced Features",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-7xl">
      <div>
        <h1 className="text-h1 text-foreground">Apps Management</h1>
        <p className="text-muted-foreground mt-2">
          Enable or disable apps to customize your workspace features.
        </p>
      </div>

      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          Apps are functional modules that can be independently enabled or disabled. Enabling an app
          will automatically enable its dependencies.
        </AlertDescription>
      </Alert>

      <div className="space-y-8">
        {Object.entries(groupedApps || {})
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([tier, tierApps]) => (
            <div key={tier}>
              <h2 className="text-xl font-semibold mb-4">
                {tierNames[Number(tier)] || `Tier ${tier}`}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tierApps.map((app) => (
                  <Card key={app.appId} className={app.enabled ? "border-primary" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                          <CardDescription className="mt-1">v{app.version}</CardDescription>
                        </div>
                        {app.enabled ? (
                          <Badge variant="default" className="ml-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-2">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {app.description && (
                        <p className="text-sm text-muted-foreground">{app.description}</p>
                      )}

                      {app.dependencies.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Dependencies:</p>
                          <div className="flex flex-wrap gap-1">
                            {app.dependencies.map((dep) => (
                              <Badge key={dep} variant="secondary" className="text-xs">
                                {dep}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {app.capabilities.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">
                            Capabilities ({app.capabilities.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {app.capabilities.slice(0, 3).map((cap) => (
                              <Badge key={cap} variant="outline" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                            {app.capabilities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{app.capabilities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        {app.enabled ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleDisableApp(app.appId)}
                            disabled={selectedApp === app.appId || disableApp.isPending}
                          >
                            {selectedApp === app.appId ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Disabling...
                              </>
                            ) : (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Disable App
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={() => handleEnableApp(app.appId)}
                            disabled={selectedApp === app.appId || enableApp.isPending}
                          >
                            {selectedApp === app.appId ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enabling...
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Enable App
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
