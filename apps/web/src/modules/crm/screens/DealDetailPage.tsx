import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/components/Skeleton";
import { DealHeader } from "../components/DealHeader";
import { DealDetailsCard } from "../components/DealDetailsCard";
import { DealQuickActions } from "../components/DealQuickActions";
import { DealMetaSidebar } from "../components/DealMetaSidebar";
import { ActivityComposer } from "../components/ActivityComposer";
import { TimelineView } from "../components/TimelineView";
import { ChannelComposerDrawer } from "../components/ChannelComposerDrawer";
import {
  type TimelineFilter,
  useAddDealActivity,
  useChangeDealStage,
  useDeal,
  useDealTimeline,
  useMarkDealLost,
  useMarkDealWon,
  usePipelineStages,
  useUpdateDeal,
} from "../hooks/useDeal";
import { useCrmChannels } from "../hooks/useChannels";
import { customersApi } from "@/lib/customers-api";
import { crmApi } from "@/lib/crm-api";
import type { ChannelDefinition } from "@corely/contracts";
import { toast } from "sonner";

const DealSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="h-64 lg:col-span-2" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("ALL");
  const [lostReason, setLostReason] = useState("");
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDefinition | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const queryClient = useQueryClient();

  const stages = usePipelineStages();
  const { data: deal, isLoading, isError, refetch } = useDeal(id);
  const { data: timelineData, isLoading: timelineLoading } = useDealTimeline(id, timelineFilter);
  const { data: channels, isLoading: channelsLoading, refetch: refetchChannels } = useCrmChannels();

  const { data: party } = useQuery({
    queryKey: ["deal-party", deal?.partyId],
    queryFn: () => customersApi.getCustomer(deal?.partyId as string),
    enabled: Boolean(deal?.partyId),
  });

  const updateDeal = useUpdateDeal();
  const changeStage = useChangeDealStage();
  const markWon = useMarkDealWon();
  const markLost = useMarkDealLost();
  const addActivity = useAddDealActivity();
  const logMessageMutation = useMutation({
    mutationFn: crmApi.logMessage,
    onSuccess: (activity) => {
      if (activity.dealId) {
        void queryClient.invalidateQueries({ queryKey: ["deal", activity.dealId] });
        void queryClient.invalidateQueries({ queryKey: ["deal", activity.dealId, "timeline"] });
      }
      toast.success("Message logged");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to log message");
    },
  });
  const isOpen = deal?.status === "OPEN";
  const contactContext = useMemo(() => {
    const displayName = party?.displayName || "";
    const [firstName, ...rest] = displayName.split(" ");
    const lastName = rest.join(" ");
    return {
      firstName,
      lastName,
      dealTitle: deal?.title,
      amount: deal?.amountCents ? (deal.amountCents / 100).toString() : undefined,
      currency: deal?.currency,
      email: party?.email,
      phoneE164: party?.phone,
      profileUrl: (party as any)?.profileUrl,
      profileUrl_linkedin: (party as any)?.profileUrl_linkedin ?? (party as any)?.profileUrl,
      profileUrl_facebook: (party as any)?.profileUrl_facebook ?? (party as any)?.profileUrl,
    };
  }, [party, deal]);

  const handleUpdateDetails = (patch: {
    notes?: string;
    probability?: number;
    expectedCloseDate?: string;
  }) => {
    if (!deal?.id) {
      return;
    }
    updateDeal.mutate({ dealId: deal.id, patch });
  };

  const handleQuickNote = (subject: string, body?: string) => {
    if (!deal?.id) {
      return;
    }
    addActivity.mutate({
      dealId: deal.id,
      payload: {
        type: "NOTE",
        subject,
        body,
        partyId: deal.partyId ?? undefined,
      },
    });
  };

  const handleDelete = () => {
    if (!deal?.id) {
      return;
    }
    markLost.mutate(
      { dealId: deal.id, reason: lostReason || "Deleted" },
      {
        onSuccess: () => {
          navigate("/crm/deals");
        },
      }
    );
  };

  const handleMarkWon = () => {
    if (!deal || !isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    markWon.mutate(deal.id);
  };

  const handleMarkLost = () => {
    if (!deal || !isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    setLostDialogOpen(true);
  };

  const handleChangeStage = (stageId: string) => {
    if (!deal) {
      return;
    }
    if (!isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    changeStage.mutate({ dealId: deal.id, stageId });
  };

  const timelineItems = useMemo(() => timelineData?.items ?? [], [timelineData]);

  const templateContext = useMemo(
    () => ({
      ...contactContext,
      encodedMessage: "",
      message: "",
      subject: "",
    }),
    [contactContext]
  );

  const handleSelectChannel = (channel: ChannelDefinition) => {
    setSelectedChannel(channel);
    setComposerOpen(true);
  };

  const handleLogMessage = (payload: { subject?: string; body: string; openUrl?: string }) => {
    if (!deal || !selectedChannel) {return;}
    logMessageMutation.mutate({
      dealId: deal.id,
      channelKey: selectedChannel.key,
      direction: "outbound",
      subject: payload.subject,
      body: payload.body,
      openUrl: payload.openUrl,
      to: contactContext.email || contactContext.phoneE164,
    });
    setComposerOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 animate-fade-in">
        <DealSkeleton />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-lg font-semibold">Failed to load deal</p>
            <p className="text-muted-foreground">
              Check your connection or permissions and try again.
            </p>
            <div className="flex gap-3">
              <Button variant="accent" onClick={() => refetch()}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate("/crm/deals")}>
                Back to deals
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <DealHeader
        deal={deal}
        stages={stages}
        onEdit={() => setDetailsEditing(true)}
        onChangeStage={handleChangeStage}
        onMarkWon={handleMarkWon}
        onMarkLost={handleMarkLost}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DealDetailsCard
            deal={deal}
            onSave={handleUpdateDetails}
            isSaving={updateDeal.isPending}
            editing={detailsEditing}
            onEditingChange={setDetailsEditing}
          />

          <Card>
            <CardContent className="p-0">
              <Tabs
                value={timelineFilter}
                onValueChange={(val) => setTimelineFilter(val as TimelineFilter)}
              >
                <div className="flex items-center justify-between px-6 pt-6">
                  <div>
                    <p className="text-lg font-semibold">Timeline</p>
                    <p className="text-sm text-muted-foreground">Activities and stage changes.</p>
                  </div>
                  <TabsList>
                    <TabsTrigger value="ALL">All</TabsTrigger>
                    <TabsTrigger value="NOTE">Notes</TabsTrigger>
                    <TabsTrigger value="CALL">Calls</TabsTrigger>
                    <TabsTrigger value="MEETING">Meetings</TabsTrigger>
                    <TabsTrigger value="TASK">Tasks</TabsTrigger>
                    <TabsTrigger value="STAGE">Stage</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value={timelineFilter}>
                  <div className="p-6">
                    {timelineLoading ? (
                      <Skeleton className="h-24" />
                    ) : (
                      <TimelineView items={timelineItems} />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <ActivityComposer dealId={deal.id} partyId={deal.partyId} />
        </div>

        <div className="space-y-6">
          <DealQuickActions
            deal={deal}
            stages={stages}
            onChangeStage={handleChangeStage}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
            onQuickNote={handleQuickNote}
            onDelete={() => setDeleteDialogOpen(true)}
            disabled={changeStage.isPending || markWon.isPending || markLost.isPending || !isOpen}
            channels={channels}
            channelsLoading={channelsLoading}
            onSelectChannel={handleSelectChannel}
            contactContext={contactContext}
          />
          <DealMetaSidebar deal={deal} />
        </div>
      </div>

      <ChannelComposerDrawer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        channel={selectedChannel}
        context={{
          ...templateContext,
          dealTitle: deal.title,
          amount: deal.amountCents ? (deal.amountCents / 100).toString() : undefined,
          currency: deal.currency,
          email: contactContext.email,
          phoneE164: contactContext.phoneE164,
          profileUrl: contactContext.profileUrl,
        }}
        onLog={handleLogMessage}
      />

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Provide an optional reason to track why this deal was lost.
            </p>
            <Input
              placeholder="Reason (optional)"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                markLost.mutate({ dealId: deal.id, reason: lostReason });
                setLostDialogOpen(false);
                setLostReason("");
              }}
            >
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (open) {
            setLostReason("Deleted");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the deal as lost with reason "Deleted". You can still find it in
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete();
                setDeleteDialogOpen(false);
              }}
            >
              Delete deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
