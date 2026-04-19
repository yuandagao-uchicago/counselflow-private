"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Video, Bot, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function IntegrationsPanel() {
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const { data, isLoading, refetch } = trpc.integration.list.useQuery();

  useEffect(() => {
    if (searchParams.get("zoom_connected")) {
      toast.success("Zoom connected!");
    }
    const err = searchParams.get("zoom_error");
    if (err) {
      toast.error(`Zoom connection failed: ${err}`);
    }
  }, [searchParams]);

  const zoom = data?.integrations.find((i) => i.provider === "zoom");

  async function disconnectZoom() {
    if (!confirm("Disconnect Zoom? Imported transcripts will remain, but you'll need to reconnect to import new ones.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/zoom/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      await refetch();
      toast.success("Zoom disconnected");
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect meeting platforms to pull transcripts automatically.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {/* Zoom */}
          <IntegrationRow
            icon={<Video className="h-5 w-5 text-[oklch(0.7_0.18_220)]" />}
            name="Zoom"
            description="Import cloud recording transcripts (.vtt) after each meeting."
            configured={data?.zoomConfigured ?? false}
            connected={!!zoom}
            accountLabel={zoom?.accountLabel || null}
            onConnect={() => (window.location.href = "/api/integrations/zoom/authorize")}
            onDisconnect={disconnectZoom}
            disconnecting={disconnecting}
            missingConfigMessage="Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env"
          />

          {/* Recall.ai */}
          <IntegrationRow
            icon={<Bot className="h-5 w-5 text-[oklch(0.75_0.15_265)]" />}
            name="AI Meeting Bot"
            description="A bot joins Zoom / Meet / Teams meetings on your behalf, records, transcribes, and runs the summary automatically."
            configured={data?.recallConfigured ?? false}
            connected={data?.recallConfigured ?? false}
            accountLabel={data?.recallConfigured ? "Powered by Recall.ai" : null}
            onConnect={() => {}}
            onDisconnect={() => {}}
            hideActions={true}
            missingConfigMessage="Set RECALL_API_KEY in .env"
          />
        </div>
      )}
    </div>
  );
}

function IntegrationRow(props: {
  icon: React.ReactNode;
  name: string;
  description: string;
  configured: boolean;
  connected: boolean;
  accountLabel: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting?: boolean;
  hideActions?: boolean;
  missingConfigMessage: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
          {props.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{props.name}</p>
            {props.connected && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {!props.configured && (
              <Badge className="bg-amber-500/15 text-amber-400 border-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not configured
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{props.description}</p>
          {props.accountLabel && (
            <p className="text-xs text-muted-foreground/80 mt-1 font-mono">
              {props.accountLabel}
            </p>
          )}
          {!props.configured && (
            <p className="text-xs text-amber-400/80 mt-1">{props.missingConfigMessage}</p>
          )}
        </div>
      </div>

      {!props.hideActions && (
        <div className="shrink-0">
          {props.connected ? (
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              onClick={props.onDisconnect}
              disabled={props.disconnecting}
            >
              {props.disconnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0"
              onClick={props.onConnect}
              disabled={!props.configured}
            >
              Connect
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
