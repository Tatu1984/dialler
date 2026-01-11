import Link from "next/link";
import { Play, Pause, Square } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CampaignType = "Outbound" | "Inbound" | "Blended";
type CampaignStatus = "Active" | "Paused" | "Scheduled" | "Completed" | "Draft";

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    type: CampaignType;
    status: CampaignStatus;
    totalLeads: number;
    contactedLeads: number;
    connectedCalls: number;
    conversions: number;
    assignedAgents: number;
    dialingMode: string;
    startDate: string;
    endDate?: string;
  };
  onAction?: (campaignId: string, action: string) => void;
}

const statusColors: Record<CampaignStatus, string> = {
  Active: "bg-green-500",
  Paused: "bg-yellow-500",
  Scheduled: "bg-blue-500",
  Completed: "bg-gray-500",
  Draft: "bg-slate-400",
};

const typeColors: Record<CampaignType, string> = {
  Outbound: "bg-purple-100 text-purple-800 border-purple-200",
  Inbound: "bg-blue-100 text-blue-800 border-blue-200",
  Blended: "bg-orange-100 text-orange-800 border-orange-200",
};

export function CampaignCard({ campaign, onAction }: CampaignCardProps) {
  const progress =
    campaign.totalLeads > 0
      ? (campaign.contactedLeads / campaign.totalLeads) * 100
      : 0;
  const conversionRate =
    campaign.connectedCalls > 0
      ? (campaign.conversions / campaign.connectedCalls) * 100
      : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/campaigns/${campaign.id}`}>
              <CardTitle className="hover:underline">{campaign.name}</CardTitle>
            </Link>
            <CardDescription className="mt-1">
              {campaign.dialingMode} Dialing
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                ⋮
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {campaign.status === "Active" && (
                <DropdownMenuItem
                  onClick={() => onAction?.(campaign.id, "pause")}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}
              {campaign.status === "Paused" && (
                <DropdownMenuItem
                  onClick={() => onAction?.(campaign.id, "resume")}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              )}
              {(campaign.status === "Active" || campaign.status === "Paused") && (
                <DropdownMenuItem
                  onClick={() => onAction?.(campaign.id, "stop")}
                  className="text-destructive"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </DropdownMenuItem>
              )}
              {campaign.status === "Scheduled" && (
                <DropdownMenuItem
                  onClick={() => onAction?.(campaign.id, "start")}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Now
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className={typeColors[campaign.type]}>
            {campaign.type}
          </Badge>
          <Badge variant="outline">
            <div
              className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[campaign.status]}`}
            />
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {/* Progress */}
          {campaign.type !== "Inbound" && campaign.totalLeads > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {campaign.contactedLeads.toLocaleString()} /{" "}
                  {campaign.totalLeads.toLocaleString()}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Connected</p>
              <p className="text-lg font-semibold">
                {campaign.connectedCalls.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Conversions</p>
              <p className="text-lg font-semibold">
                {campaign.conversions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Conv. Rate</p>
              <p className="text-lg font-semibold">
                {conversionRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Agents</p>
              <p className="text-lg font-semibold">{campaign.assignedAgents}</p>
            </div>
          </div>

          {/* Date Info */}
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Started:</span>
              <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
            </div>
            {campaign.endDate && (
              <div className="flex justify-between">
                <span>Ended:</span>
                <span>{new Date(campaign.endDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
