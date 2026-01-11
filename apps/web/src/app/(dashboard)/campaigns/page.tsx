"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Play, Pause, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCampaigns, useStartCampaign, usePauseCampaign, useStopCampaign, useDeleteCampaign } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type CampaignType = "outbound" | "inbound" | "blended";
type CampaignStatus = "active" | "paused" | "scheduled" | "completed" | "draft";

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  scheduled: "bg-blue-500",
  completed: "bg-gray-500",
  draft: "bg-slate-400",
};

const typeColors: Record<string, string> = {
  outbound: "bg-purple-100 text-purple-800 border-purple-200",
  inbound: "bg-blue-100 text-blue-800 border-blue-200",
  blended: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  // API hooks
  const { data: campaignsResponse, isLoading, error } = useCampaigns({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const stopCampaign = useStopCampaign();
  const deleteCampaign = useDeleteCampaign();

  const campaigns = campaignsResponse?.data?.campaigns || [];

  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = campaign.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCampaignAction = async (campaignId: string, action: string) => {
    try {
      switch (action) {
        case "start":
        case "resume":
          await startCampaign.mutateAsync(campaignId);
          toast({ title: "Campaign started successfully" });
          break;
        case "pause":
          await pauseCampaign.mutateAsync(campaignId);
          toast({ title: "Campaign paused successfully" });
          break;
        case "stop":
          await stopCampaign.mutateAsync(campaignId);
          toast({ title: "Campaign stopped successfully" });
          break;
        case "delete":
          await deleteCampaign.mutateAsync(campaignId);
          toast({ title: "Campaign deleted successfully" });
          break;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to ${action} campaign`,
        variant: "destructive",
      });
    }
  };

  // Stats calculations
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
  const totalLeads = campaigns.reduce((sum: number, c: any) => sum + (c.totalLeads || 0), 0);
  const totalConversions = campaigns.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-destructive">Failed to load campaigns</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and monitor your contact center campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Campaign Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="blended">Blended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-16" /> : totalCampaigns}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Campaigns</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-16" /> : activeCampaigns}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-16" /> : totalLeads.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Conversions</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-16" /> : totalConversions.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign: any) => {
            const progress =
              campaign.totalLeads > 0
                ? (campaign.contactedLeads / campaign.totalLeads) * 100
                : 0;
            const conversionRate =
              campaign.connectedCalls > 0
                ? (campaign.conversions / campaign.connectedCalls) * 100
                : 0;

            return (
              <Card key={campaign.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/campaigns/${campaign.id}`}>
                        <CardTitle className="hover:underline">
                          {campaign.name}
                        </CardTitle>
                      </Link>
                      <CardDescription className="mt-1">
                        {campaign.dialMode || "Preview"} Dialing
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {campaign.status === "active" && (
                          <DropdownMenuItem
                            onClick={() => handleCampaignAction(campaign.id, "pause")}
                            disabled={pauseCampaign.isPending}
                          >
                            {pauseCampaign.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Pause className="mr-2 h-4 w-4" />
                            )}
                            Pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "paused" && (
                          <DropdownMenuItem
                            onClick={() => handleCampaignAction(campaign.id, "resume")}
                            disabled={startCampaign.isPending}
                          >
                            {startCampaign.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Resume
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "active" || campaign.status === "paused") && (
                          <DropdownMenuItem
                            onClick={() => handleCampaignAction(campaign.id, "stop")}
                            className="text-destructive"
                            disabled={stopCampaign.isPending}
                          >
                            {stopCampaign.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Square className="mr-2 h-4 w-4" />
                            )}
                            Stop
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "scheduled" || campaign.status === "draft") && (
                          <DropdownMenuItem
                            onClick={() => handleCampaignAction(campaign.id, "start")}
                            disabled={startCampaign.isPending}
                          >
                            {startCampaign.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Start Now
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/campaigns/${campaign.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleCampaignAction(campaign.id, "delete")}
                          disabled={deleteCampaign.isPending}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className={typeColors[campaign.type] || typeColors.outbound}>
                      {campaign.type}
                    </Badge>
                    <Badge variant="outline">
                      <div
                        className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[campaign.status] || statusColors.draft}`}
                      />
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    {/* Progress */}
                    {campaign.type !== "inbound" && campaign.totalLeads > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {(campaign.contactedLeads || 0).toLocaleString()} /{" "}
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
                          {(campaign.connectedCalls || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="text-lg font-semibold">
                          {(campaign.conversions || 0).toLocaleString()}
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
                        <p className="text-lg font-semibold">
                          {campaign.assignedAgents || 0}
                        </p>
                      </div>
                    </div>

                    {/* Date Info */}
                    <div className="border-t pt-3 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredCampaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No campaigns found matching your filters
            </p>
            <Link href="/campaigns/new">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create your first campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
