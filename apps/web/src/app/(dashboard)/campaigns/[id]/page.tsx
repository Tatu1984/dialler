"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Edit,
  Users,
  List,
  Settings,
  TrendingUp,
  Phone,
  CheckCircle,
  Clock,
  Target,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCampaign,
  useStartCampaign,
  usePauseCampaign,
  useStopCampaign,
  useLeadLists,
  useAgents,
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

const agentStatusColors: Record<string, string> = {
  "on_call": "bg-green-500",
  "available": "bg-blue-500",
  "break": "bg-yellow-500",
  "offline": "bg-gray-500",
  "wrap_up": "bg-purple-500",
  "On Call": "bg-green-500",
  Available: "bg-blue-500",
  Break: "bg-yellow-500",
  Offline: "bg-gray-500",
};

// Loading skeleton component
function CampaignDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-96" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const campaignId = params.id as string;

  // Fetch campaign data
  const { data: campaignData, isLoading, error } = useCampaign(campaignId);
  const campaign = campaignData?.campaign;

  // Fetch related data for assigned agents and lead lists
  const { data: leadListsData } = useLeadLists({ campaignId });
  const { data: agentsData } = useAgents();

  // Campaign action mutations
  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const stopCampaign = useStopCampaign();

  // Handle loading state
  if (isLoading) {
    return <CampaignDetailSkeleton />;
  }

  // Handle error state
  if (error || !campaign) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Details</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load campaign. Please try again."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Extract settings from campaign
  const settings = campaign.settings as {
    dialRatio?: number;
    maxAttempts?: number;
    retryInterval?: number;
    wrapUpTime?: number;
  } || {};

  const schedule = campaign.schedule as {
    enabled?: boolean;
    timezone?: string;
    hours?: Record<string, { start: string; end: string }>;
  } || {};

  // Calculate metrics (using placeholder values since these would come from a stats API)
  const totalLeads = leadListsData?.items?.reduce((sum: number, list: any) => sum + (list.totalLeads || 0), 0) || 0;
  const contactedLeads = Math.floor(totalLeads * 0.5); // Placeholder
  const connectedCalls = Math.floor(contactedLeads * 0.6); // Placeholder
  const conversions = Math.floor(connectedCalls * 0.2); // Placeholder
  const avgCallDuration = 245; // Placeholder in seconds

  const progress = totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0;
  const conversionRate = connectedCalls > 0 ? (conversions / connectedCalls) * 100 : 0;
  const contactRate = contactedLeads > 0 ? (connectedCalls / contactedLeads) * 100 : 0;

  // Get lead lists for this campaign
  const campaignLeadLists = leadListsData?.items || [];

  // Get agents (placeholder - would need campaign-agent assignment)
  const assignedAgents = agentsData?.items?.slice(0, 5).map((agent: any) => ({
    id: agent.id,
    name: `${agent.user?.firstName || ''} ${agent.user?.lastName || ''}`,
    status: "Available",
    callsToday: Math.floor(Math.random() * 50) + 10,
    conversionsToday: Math.floor(Math.random() * 15) + 2,
  })) || [];

  // Format schedule days
  const scheduleDays = schedule.hours ? Object.keys(schedule.hours).map(
    day => day.charAt(0).toUpperCase() + day.slice(1)
  ) : [];

  // Format schedule hours
  const scheduleHours = schedule.hours && Object.values(schedule.hours)[0]
    ? `${Object.values(schedule.hours)[0].start} - ${Object.values(schedule.hours)[0].end}`
    : "Not configured";

  const handleAction = async (action: string) => {
    try {
      if (action === "start" || action === "resume") {
        await startCampaign.mutateAsync(campaignId);
        toast({ title: "Campaign started", description: "The campaign is now active." });
      } else if (action === "pause") {
        await pauseCampaign.mutateAsync(campaignId);
        toast({ title: "Campaign paused", description: "The campaign has been paused." });
      } else if (action === "stop") {
        await stopCampaign.mutateAsync(campaignId);
        toast({ title: "Campaign stopped", description: "The campaign has been stopped." });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to ${action} campaign. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const isActionLoading = startCampaign.isPending || pauseCampaign.isPending || stopCampaign.isPending;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <Badge variant="outline">
                <div
                  className={`mr-1.5 h-2 w-2 rounded-full ${
                    campaign.status === "active"
                      ? "bg-green-500"
                      : campaign.status === "paused"
                        ? "bg-yellow-500"
                        : campaign.status === "draft"
                          ? "bg-blue-500"
                          : "bg-gray-500"
                  }`}
                />
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
              <Badge variant="outline">{campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}</Badge>
            </div>
            {campaign.description && <p className="mt-1 text-muted-foreground">{campaign.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "active" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleAction("pause")}
                className="gap-2"
                disabled={isActionLoading}
              >
                {pauseCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                Pause
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction("stop")}
                className="gap-2"
                disabled={isActionLoading}
              >
                {stopCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Stop
              </Button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <Button onClick={() => handleAction("resume")} className="gap-2" disabled={isActionLoading}>
                {startCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Resume
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction("stop")}
                className="gap-2"
                disabled={isActionLoading}
              >
                {stopCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Stop
              </Button>
            </>
          )}
          {(campaign.status === "draft" || campaign.status === "scheduled") && (
            <Button onClick={() => handleAction("start")} className="gap-2" disabled={isActionLoading}>
              {startCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start
            </Button>
          )}
          <Link href={`/campaigns/${campaign.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.contactedLeads.toLocaleString()}
            </div>
            <Progress value={progress} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {campaign.contactedLeads.toLocaleString()} of{" "}
              {campaign.totalLeads.toLocaleString()} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Connected Calls
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.connectedCalls.toLocaleString()}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Contact rate: {contactRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.conversions.toLocaleString()}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Conversion rate: {conversionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Call Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(campaign.avgCallDuration / 60)}:
              {(campaign.avgCallDuration % 60).toString().padStart(2, "0")}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="mr-2 h-4 w-4" />
            Agents ({campaign.assignedAgents.length})
          </TabsTrigger>
          <TabsTrigger value="leads">
            <List className="mr-2 h-4 w-4" />
            Lead Lists
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Campaign Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Progress</CardTitle>
                <CardDescription>Real-time campaign metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Leads Contacted
                    </span>
                    <span className="font-medium">
                      {campaign.contactedLeads.toLocaleString()} /{" "}
                      {campaign.totalLeads.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Connected
                    </span>
                    <span className="text-sm font-medium">
                      {campaign.connectedCalls.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Conversions
                    </span>
                    <span className="text-sm font-medium">
                      {campaign.conversions.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Failed Attempts
                    </span>
                    <span className="text-sm font-medium">
                      {campaign.failedAttempts.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Contact Rate</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {contactRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Conversion Rate</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {conversionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Avg Call Duration</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {Math.floor(campaign.avgCallDuration / 60)}:
                    {(campaign.avgCallDuration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Information */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Campaign timing configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">
                    {schedule.timezone || "Not configured"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Operating Hours</p>
                  <p className="text-sm text-muted-foreground">
                    {scheduleHours}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Active Days</p>
                  <p className="text-sm text-muted-foreground">
                    {scheduleDays.length > 0 ? scheduleDays.join(", ") : "Not configured"}
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium">Campaign Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Script Information */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Script</CardTitle>
                <CardDescription>Associated call script</CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.script ? (
                  <div className="space-y-2">
                    <p className="font-medium">{campaign.script.name}</p>
                    <Button variant="outline" size="sm">
                      View Script
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      No script assigned
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Assign Script
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Agents</CardTitle>
              <CardDescription>
                Agents currently assigned to this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Calls Today</TableHead>
                    <TableHead className="text-right">
                      Conversions Today
                    </TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedAgents.map((agent: any) => {
                    const agentConvRate =
                      agent.callsToday > 0
                        ? (agent.conversionsToday / agent.callsToday) * 100
                        : 0;
                    return (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {agent.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <div
                              className={`mr-1.5 h-2 w-2 rounded-full ${agentStatusColors[agent.status]}`}
                            />
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {agent.callsToday}
                        </TableCell>
                        <TableCell className="text-right">
                          {agent.conversionsToday}
                        </TableCell>
                        <TableCell className="text-right">
                          {agentConvRate.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Button variant="outline">Assign More Agents</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Lists</CardTitle>
              <CardDescription>
                Lead lists assigned to this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignLeadLists.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>List Name</TableHead>
                      <TableHead className="text-right">Total Leads</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignLeadLists.map((list: any) => {
                      const listProgress = 50; // Placeholder
                      return (
                        <TableRow key={list.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/leads/lists/${list.id}`}
                              className="hover:underline"
                            >
                              {list.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            {(list.totalLeads || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {list.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress
                                value={listProgress}
                                className="w-20"
                              />
                              <span className="text-sm">
                                {listProgress.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No lead lists assigned to this campaign
                </div>
              )}
              <div className="mt-4">
                <Button variant="outline">Assign More Lists</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dialing Settings</CardTitle>
              <CardDescription>
                Configuration for campaign dialing behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Dialing Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.dialMode ? campaign.dialMode.charAt(0).toUpperCase() + campaign.dialMode.slice(1) : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Dial Ratio</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.dialRatio || 1}:1
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Max Retry Attempts</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.maxAttempts || 5} attempts
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Retry Interval</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.retryInterval ? Math.floor(settings.retryInterval / 3600) : 1} hours
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Wrap Up Time</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.wrapUpTime || 30} seconds
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Campaign Type</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}
                  </p>
                </div>
              </div>
              <div className="pt-4">
                <Link href={`/campaigns/${campaign.id}/edit`}>
                  <Button variant="outline">Edit Dialing Settings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
