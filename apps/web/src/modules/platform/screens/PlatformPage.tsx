import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Link } from "react-router-dom";
import { Package, FileText, Boxes, Menu } from "lucide-react";

export function PlatformPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-h1 text-foreground">Platform Management</h1>
        <p className="text-muted-foreground mt-2">
          Customize your workspace by managing apps, templates, and configurations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Apps</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Enable or disable apps to customize which features are available in your workspace.
              Apps can have dependencies that will be automatically enabled.
            </CardDescription>
            <Button asChild className="w-full">
              <Link to="/settings/platform/apps">Manage Apps</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Templates</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Apply configuration templates to quickly set up chart of accounts, tax rates, and
              other common business needs.
            </CardDescription>
            <Button asChild className="w-full">
              <Link to="/settings/platform/templates">Browse Templates</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <CardTitle>Packs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Install complete business setups with pre-configured apps and templates.
            </CardDescription>
            <Button asChild className="w-full" disabled>
              <Link to="/settings/platform/packs">View Packs (Coming Soon)</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-primary" />
              <CardTitle>Menu Customization</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Customize your navigation menu by hiding, reordering, or renaming menu items.
            </CardDescription>
            <Button asChild className="w-full">
              <Link to="/settings/platform/menu">Customize Menu</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
