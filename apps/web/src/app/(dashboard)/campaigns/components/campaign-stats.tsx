import {
  Phone,
  CheckCircle,
  Target,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CampaignStatsProps {
  stats: {
    totalLeads: number;
    contactedLeads: number;
    connectedCalls: number;
    conversions: number;
    failedAttempts: number;
    avgCallDuration: number;
    assignedAgents: number;
  };
  showProgress?: boolean;
}

export function CampaignStats({
  stats,
  showProgress = true,
}: CampaignStatsProps) {
  const progress =
    stats.totalLeads > 0
      ? (stats.contactedLeads / stats.totalLeads) * 100
      : 0;
  const contactRate =
    stats.contactedLeads > 0
      ? (stats.connectedCalls / stats.contactedLeads) * 100
      : 0;
  const conversionRate =
    stats.connectedCalls > 0
      ? (stats.conversions / stats.connectedCalls) * 100
      : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.contactedLeads.toLocaleString()}
          </div>
          {showProgress && (
            <>
              <Progress value={progress} className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.contactedLeads.toLocaleString()} of{" "}
                {stats.totalLeads.toLocaleString()} leads
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Connected Calls</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.connectedCalls.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Contact rate: {contactRate.toFixed(1)}%
            </span>
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
            {stats.conversions.toLocaleString()}
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
            {formatDuration(stats.avgCallDuration)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {stats.assignedAgents} agents assigned
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
