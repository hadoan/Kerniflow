import React, { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Copy, ExternalLink, Send } from "lucide-react";
import type { ChannelDefinition } from "@corely/contracts";
import { interpolateTemplate, buildChannelUrl } from "../lib/channel-templating";
import { toast } from "sonner";

type ChannelComposerDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelDefinition | null;
  context: Record<string, string | undefined>;
  onLog: (payload: { subject?: string; body: string; openUrl?: string }) => void;
};

export const ChannelComposerDrawer: React.FC<ChannelComposerDrawerProps> = ({
  open,
  onOpenChange,
  channel,
  context,
  onLog,
}) => {
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (channel?.templates?.length) {
      const first = channel.templates[0];
      setTemplateId(first.id);
      setBody(interpolateTemplate(first.body, context, channel?.key));
      if (channel.capabilities.subject && first.subject) {
        setSubject(interpolateTemplate(first.subject, context, channel?.key));
      }
    } else {
      setTemplateId(undefined);
      setBody("");
      setSubject("");
    }
  }, [channel, context]);

  const canCopy = channel?.capabilities.copy;
  const canOpen = channel?.capabilities.open;

  const openUrl = useMemo(() => {
    if (!channel) {return "";}
    const ctx = {
      ...context,
      subject,
      message: body,
      encodedMessage: encodeURIComponent(body ?? ""),
    };
    return buildChannelUrl(channel.action.urlTemplate, ctx, channel.key);
  }, [channel, context, subject, body]);

  if (!channel) {
    return null;
  }

  const applyTemplate = (id: string) => {
    const tpl = channel.templates.find((t) => t.id === id);
    if (!tpl) {return;}
    setTemplateId(id);
    setBody(interpolateTemplate(tpl.body, context, channel?.key));
    if (channel.capabilities.subject && tpl.subject) {
      setSubject(interpolateTemplate(tpl.subject, context, channel?.key));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpen = () => {
    if (openUrl) {
      window.open(openUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleLog = () => {
    onLog({ subject, body, openUrl });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-6 space-y-4">
        <DrawerHeader>
          <DrawerTitle>Message via {channel.label}</DrawerTitle>
        </DrawerHeader>

        {channel.templates.length > 0 && (
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                {channel.templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {channel.capabilities.subject && (
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <DrawerFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {canCopy && (
            <Button variant="secondary" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          )}
          {canOpen && (
            <Button variant="outline" onClick={handleOpen} disabled={!openUrl}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          )}
          <Button variant="accent" onClick={handleLog}>
            <Send className="h-4 w-4 mr-1" />
            Log
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
