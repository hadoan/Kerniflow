import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { getClients } from "@/shared/mock/mockApi";
import { EmptyState } from "@/shared/components/EmptyState";

export default function ClientsPage() {
  const { t } = useTranslation();
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: getClients });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("clients.title")}</h1>
        <Button variant="accent">
          <Plus className="h-4 w-4" />
          {t("clients.addClient")}
        </Button>
      </div>

      {clients?.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("clients.noClients")}
          description={t("clients.noClientsDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients?.map((client) => (
            <Card key={client.id} variant="interactive">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-semibold">
                    {(client.company || client.name).substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {client.company || client.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{client.name}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
