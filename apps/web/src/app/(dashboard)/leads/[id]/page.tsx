"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Building,
  Briefcase,
  Calendar,
  MessageSquare,
  PhoneCall,
  User,
  TrendingUp,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLead, useUpdateLead, useLeadList } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

// Loading skeleton component
function LeadDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-purple-100 text-purple-800 border-purple-200",
  qualified: "bg-green-100 text-green-800 border-green-200",
  converted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  not_interested: "bg-gray-100 text-gray-800 border-gray-200",
  dnc: "bg-red-100 text-red-800 border-red-200",
  New: "bg-blue-100 text-blue-800 border-blue-200",
  Contacted: "bg-purple-100 text-purple-800 border-purple-200",
  Qualified: "bg-green-100 text-green-800 border-green-200",
  Converted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Not Interested": "bg-gray-100 text-gray-800 border-gray-200",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const leadId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    status: string;
  } | null>(null);

  // Fetch lead data
  const { data: leadData, isLoading, error } = useLead(leadId);
  const lead = leadData?.lead;

  // Fetch lead list info
  const { data: leadList } = useLeadList(lead?.listId || "");

  // Update lead mutation
  const updateLead = useUpdateLead();

  // Handle loading state
  if (isLoading) {
    return <LeadDetailSkeleton />;
  }

  // Handle error state
  if (error || !lead) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Lead Details</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load lead. Please try again."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Extract custom fields
  const customFields = (lead.customFields || {}) as Record<string, string>;

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (!isEditing) {
      setEditForm({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phoneNumber: lead.phoneNumber || "",
        status: lead.status || "new",
      });
    }
    setIsEditing(!isEditing);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!editForm) return;

    try {
      await updateLead.mutateAsync({
        id: leadId,
        data: editForm,
      });
      toast({ title: "Lead updated", description: "Changes have been saved." });
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.split("_").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  // Placeholder call history (would come from calls API)
  const callHistory: Array<{
    id: string;
    date: string;
    agent: string;
    duration: number;
    disposition: string;
    notes: string;
  }> = [];

  // Placeholder notes (would come from lead history API)
  const notes: Array<{
    id: string;
    date: string;
    author: string;
    content: string;
  }> = [];

  // Placeholder disposition history
  const dispositionHistory: Array<{
    id: string;
    date: string;
    agent: string;
    disposition: string;
    notes: string;
  }> = [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {lead.firstName} {lead.lastName}
              </h1>
              <Badge variant="outline" className={statusColors[lead.status] || statusColors.new}>
                {formatStatus(lead.status)}
              </Badge>
            </div>
            {(customFields.position || lead.company) && (
              <p className="mt-1 text-muted-foreground">
                {customFields.position ? `${customFields.position} at ` : ""}{lead.company || "Unknown Company"}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Phone className="mr-2 h-4 w-4" />
            Call Now
          </Button>
          <Button variant="outline" onClick={handleEditToggle} disabled={updateLead.isPending}>
            {updateLead.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Edit className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Key Information Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lead Score</CardDescription>
            <CardTitle className="text-3xl">{lead.leadScore ? parseFloat(lead.leadScore).toFixed(0) : "N/A"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${lead.leadScore ? parseFloat(lead.leadScore) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Call Attempts</CardDescription>
            <CardTitle className="text-3xl">{lead.attemptCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Priority: {lead.priority || 50}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Last Contact</CardDescription>
            <CardTitle className="text-lg">
              {lead.lastContactAt
                ? new Date(lead.lastContactAt).toLocaleDateString()
                : "Never"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {lead.nextAttemptAt
                ? `Next: ${new Date(lead.nextAttemptAt).toLocaleDateString()}`
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>List</CardDescription>
            <CardTitle className="text-lg">{leadList?.name || "Unknown"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Added {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList>
              <TabsTrigger value="info">
                <User className="mr-2 h-4 w-4" />
                Information
              </TabsTrigger>
              <TabsTrigger value="calls">
                <PhoneCall className="mr-2 h-4 w-4" />
                Call History ({callHistory.length})
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageSquare className="mr-2 h-4 w-4" />
                Notes ({notes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && editForm ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={editForm.firstName}
                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={editForm.lastName}
                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={editForm.phoneNumber}
                            onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="not_interested">Not Interested</SelectItem>
                            <SelectItem value="dnc">Do Not Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSaveChanges} disabled={updateLead.isPending}>
                        {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.email || "Not provided"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Primary Phone</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.phoneNumber}
                          </p>
                        </div>
                      </div>
                      {lead.altPhoneNumber && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              Secondary Phone
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lead.altPhoneNumber}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Company</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.company || "Not provided"}
                          </p>
                        </div>
                      </div>
                      {customFields.position && (
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Position</p>
                            <p className="text-sm text-muted-foreground">
                              {customFields.position}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {customFields.industry && (
                      <div>
                        <p className="text-sm font-medium">Industry</p>
                        <p className="text-sm text-muted-foreground">
                          {customFields.industry}
                        </p>
                      </div>
                    )}
                    {customFields.size && (
                      <div>
                        <p className="text-sm font-medium">Company Size</p>
                        <p className="text-sm text-muted-foreground">
                          {customFields.size}
                        </p>
                      </div>
                    )}
                    {customFields.dealSize && (
                      <div>
                        <p className="text-sm font-medium">Deal Size</p>
                        <p className="text-sm text-muted-foreground">
                          {customFields.dealSize}
                        </p>
                      </div>
                    )}
                    {lead.timezone && (
                      <div>
                        <p className="text-sm font-medium">Timezone</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.timezone}
                        </p>
                      </div>
                    )}
                    {Object.keys(customFields).length === 0 && !lead.timezone && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">No additional information available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign & List</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Lead List</p>
                    <p className="text-sm text-muted-foreground">
                      {leadList?.name || "Unknown List"}
                    </p>
                  </div>
                  {leadList?.description && (
                    <div>
                      <p className="text-sm font-medium">List Description</p>
                      <p className="text-sm text-muted-foreground">
                        {leadList.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calls" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Call History</CardTitle>
                  <CardDescription>
                    Complete history of calls with this lead
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {callHistory.length > 0 ? (
                    <div className="space-y-4">
                      {callHistory.map((call) => (
                        <div
                          key={call.id}
                          className="border-b pb-4 last:border-0"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {call.agent
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{call.agent}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(call.date).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatDuration(call.duration)}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {call.disposition}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {call.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <PhoneCall className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No call history available</p>
                      <p className="text-xs mt-1">Call records will appear here once calls are made</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add a note about this lead..."
                    rows={3}
                  />
                  <Button>Add Note</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes History</CardTitle>
                </CardHeader>
                <CardContent>
                  {notes.length > 0 ? (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="border-b pb-4 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {note.author
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{note.author}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(note.date).toLocaleString()}
                                </p>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {note.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No notes available</p>
                      <p className="text-xs mt-1">Add a note to track important information</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                Call Lead
              </Button>
              <Button className="w-full" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Follow-up
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disposition History</CardTitle>
            </CardHeader>
            <CardContent>
              {dispositionHistory.length > 0 ? (
                <div className="space-y-3">
                  {dispositionHistory.map((disp) => (
                    <div key={disp.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {disp.disposition}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(disp.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        By {disp.agent}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No disposition history
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-muted-foreground">
                      {new Date(lead.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {lead.lastContactAt && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Last Contact</p>
                      <p className="text-muted-foreground">
                        {new Date(lead.lastContactAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
