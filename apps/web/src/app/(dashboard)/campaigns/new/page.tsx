"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Plus,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLeadLists, useAgents, useScripts, useCreateCampaign } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, name: "Basic Info", description: "Campaign details" },
  { id: 2, name: "Dialing Settings", description: "Configure dialing" },
  { id: 3, name: "Schedule", description: "Set timing" },
  { id: 4, name: "Lead Lists", description: "Select leads" },
  { id: 5, name: "Agents", description: "Assign team" },
  { id: 6, name: "Script", description: "Choose script" },
  { id: 7, name: "Review", description: "Confirm & create" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: "",
    type: "Outbound",
    description: "",

    // Step 2: Dialing Settings
    dialingMode: "Predictive",
    dialRatio: 2.5,
    maxRetries: 3,
    retryInterval: 24,
    abandonRate: 3,

    // Step 3: Schedule
    timezone: "America/New_York",
    startDate: "",
    endDate: "",
    operatingHours: {
      start: "09:00",
      end: "18:00",
    },
    activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],

    // Step 4: Lead Lists
    selectedLists: [] as string[],

    // Step 5: Agents
    selectedAgents: [] as string[],

    // Step 6: Script
    scriptId: "",
  });

  // Fetch data for the form
  const { data: leadListsData, isLoading: leadListsLoading } = useLeadLists({ status: "active" });
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: scriptsData, isLoading: scriptsLoading } = useScripts({ status: "published" });
  const createCampaign = useCreateCampaign();

  const leadLists = leadListsData?.items || [];
  const agents = agentsData?.items || [];
  const scripts = scriptsData?.items || [];

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await createCampaign.mutateAsync({
        name: formData.name,
        type: formData.type.toLowerCase(),
        dialMode: formData.dialingMode.toLowerCase(),
        settings: {
          dialRatio: formData.dialRatio,
          maxRetries: formData.maxRetries,
          retryInterval: formData.retryInterval,
          abandonRate: formData.abandonRate,
          selectedLists: formData.selectedLists,
          selectedAgents: formData.selectedAgents,
          scriptId: formData.scriptId || null,
        },
        schedule: {
          timezone: formData.timezone,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          operatingHours: formData.operatingHours,
          activeDays: formData.activeDays,
        },
      });
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully.",
      });
      router.push("/campaigns");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleDay = (day: string) => {
    const days = formData.activeDays;
    if (days.includes(day)) {
      updateFormData({ activeDays: days.filter((d) => d !== day) });
    } else {
      updateFormData({ activeDays: [...days, day] });
    }
  };

  const toggleList = (listId: string) => {
    const lists = formData.selectedLists;
    if (lists.includes(listId)) {
      updateFormData({ selectedLists: lists.filter((id) => id !== listId) });
    } else {
      updateFormData({ selectedLists: [...lists, listId] });
    }
  };

  const toggleAgent = (agentId: string) => {
    const selectedAgents = formData.selectedAgents;
    if (selectedAgents.includes(agentId)) {
      updateFormData({ selectedAgents: selectedAgents.filter((id) => id !== agentId) });
    } else {
      updateFormData({ selectedAgents: [...selectedAgents, agentId] });
    }
  };

  const totalLeads = leadLists
    .filter((list: any) => formData.selectedLists.includes(list.id))
    .reduce((sum: number, list: any) => sum + (list.totalLeads || 0), 0);

  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create New Campaign
            </h1>
            <p className="text-muted-foreground">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progressPercent} />
        <div className="flex justify-between">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id === currentStep
                  ? "text-primary"
                  : step.id < currentStep
                    ? "text-green-600"
                    : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  step.id === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.id < currentStep
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-muted-foreground"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{step.id}</span>
                )}
              </div>
              <span className="mt-1 hidden text-xs md:block">{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q1 2026 Product Launch"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign Type *</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => updateFormData({ type: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Outbound" id="outbound" />
                    <Label htmlFor="outbound" className="font-normal">
                      Outbound - Proactive outreach to leads
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Inbound" id="inbound" />
                    <Label htmlFor="inbound" className="font-normal">
                      Inbound - Handle incoming calls
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Blended" id="blended" />
                    <Label htmlFor="blended" className="font-normal">
                      Blended - Mix of inbound and outbound
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the campaign objectives and target audience"
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    updateFormData({ description: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 2: Dialing Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Dialing Mode *</Label>
                <RadioGroup
                  value={formData.dialingMode}
                  onValueChange={(value) =>
                    updateFormData({ dialingMode: value })
                  }
                >
                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="flex items-start space-x-2 p-4">
                      <RadioGroupItem value="Preview" id="preview" />
                      <div className="flex-1">
                        <Label
                          htmlFor="preview"
                          className="cursor-pointer font-medium"
                        >
                          Preview Dialing
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Agent reviews lead info before call is placed. Best
                          for high-value leads.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="flex items-start space-x-2 p-4">
                      <RadioGroupItem value="Progressive" id="progressive" />
                      <div className="flex-1">
                        <Label
                          htmlFor="progressive"
                          className="cursor-pointer font-medium"
                        >
                          Progressive Dialing
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically dials when agent becomes available.
                          Good balance of efficiency and control.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="flex items-start space-x-2 p-4">
                      <RadioGroupItem value="Predictive" id="predictive" />
                      <div className="flex-1">
                        <Label
                          htmlFor="predictive"
                          className="cursor-pointer font-medium"
                        >
                          Predictive Dialing
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Dials multiple numbers simultaneously. Maximum
                          efficiency for large campaigns.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>

              {formData.dialingMode === "Predictive" && (
                <div className="space-y-2">
                  <Label>
                    Dial Ratio: {formData.dialRatio.toFixed(1)}:1
                  </Label>
                  <Slider
                    value={[formData.dialRatio]}
                    onValueChange={([value]) =>
                      updateFormData({ dialRatio: value })
                    }
                    min={1}
                    max={5}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of calls to place per available agent
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retry Attempts</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) =>
                      updateFormData({ maxRetries: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryInterval">Retry Interval (hours)</Label>
                  <Input
                    id="retryInterval"
                    type="number"
                    min="1"
                    max="168"
                    value={formData.retryInterval}
                    onChange={(e) =>
                      updateFormData({
                        retryInterval: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {formData.dialingMode === "Predictive" && (
                <div className="space-y-2">
                  <Label htmlFor="abandonRate">
                    Max Abandon Rate (%)
                  </Label>
                  <Input
                    id="abandonRate"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.abandonRate}
                    onChange={(e) =>
                      updateFormData({
                        abandonRate: parseFloat(e.target.value),
                      })
                    }
                  />
                  <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      Regulatory limit for abandoned calls. System will adjust
                      dial ratio to stay within this limit.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => updateFormData({ timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">
                      Eastern Time (ET)
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time (CT)
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time (MT)
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time (PT)
                    </SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      updateFormData({ startDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      updateFormData({ endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm">
                      Start Time
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.operatingHours.start}
                      onChange={(e) =>
                        updateFormData({
                          operatingHours: {
                            ...formData.operatingHours,
                            start: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm">
                      End Time
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.operatingHours.end}
                      onChange={(e) =>
                        updateFormData({
                          operatingHours: {
                            ...formData.operatingHours,
                            end: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Active Days *</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <Badge
                      key={day}
                      variant={
                        formData.activeDays.includes(day)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleDay(day)}
                    >
                      {day.slice(0, 3)}
                      {formData.activeDays.includes(day) && (
                        <Check className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Lead Lists */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Select one or more lead lists to include in this campaign
                </p>
                <Link href="/leads/lists">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New List
                  </Button>
                </Link>
              </div>

              {leadListsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : leadLists.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No lead lists available</AlertTitle>
                  <AlertDescription>
                    Create a lead list first before setting up your campaign.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>List Name</TableHead>
                      <TableHead className="text-right">Total Leads</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadLists.map((list: any) => (
                      <TableRow
                        key={list.id}
                        className="cursor-pointer"
                        onClick={() => toggleList(list.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={formData.selectedLists.includes(list.id)}
                            onCheckedChange={() => toggleList(list.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{list.name}</TableCell>
                        <TableCell className="text-right">
                          {(list.totalLeads || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {list.status.charAt(0).toUpperCase() + list.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {formData.selectedLists.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formData.selectedLists.length} list(s) selected
                    </span>
                    <span className="text-lg font-bold">
                      {totalLeads.toLocaleString()} total leads
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Agents */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Assign agents to this campaign
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateFormData({
                        selectedAgents: agents.map((a: any) => a.id),
                      })
                    }
                    disabled={agents.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFormData({ selectedAgents: [] })}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {agentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No agents available</AlertTitle>
                  <AlertDescription>
                    Add agents to your team before assigning them to campaigns.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Agent Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent: any) => (
                      <TableRow
                        key={agent.id}
                        className="cursor-pointer"
                        onClick={() => toggleAgent(agent.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={formData.selectedAgents.includes(agent.id)}
                            onCheckedChange={() => toggleAgent(agent.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {agent.user?.firstName} {agent.user?.lastName}
                        </TableCell>
                        <TableCell>
                          {agent.currentState?.charAt(0).toUpperCase() + agent.currentState?.slice(1) || "Offline"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {agent.status?.charAt(0).toUpperCase() + agent.status?.slice(1) || "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {formData.selectedAgents.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <span className="text-sm font-medium">
                    {formData.selectedAgents.length} agent(s) selected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Script */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a call script for this campaign (optional)
              </p>

              {scriptsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={formData.scriptId}
                  onValueChange={(value) => updateFormData({ scriptId: value })}
                >
                  <div className="space-y-2">
                    {scripts.map((script: any) => (
                      <Card
                        key={script.id}
                        className="cursor-pointer hover:bg-accent"
                      >
                        <CardContent className="flex items-center space-x-2 p-4">
                          <RadioGroupItem value={script.id} id={script.id} />
                          <div className="flex-1">
                            <Label
                              htmlFor={script.id}
                              className="cursor-pointer font-medium"
                            >
                              {script.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {script.description || `Version: ${script.version}`}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {script.status?.charAt(0).toUpperCase() + script.status?.slice(1)}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}

                    <Card className="cursor-pointer hover:bg-accent">
                      <CardContent className="flex items-center space-x-2 p-4">
                        <RadioGroupItem value="" id="no-script" />
                        <Label
                          htmlFor="no-script"
                          className="cursor-pointer font-medium"
                        >
                          No script - Agents will use their own approach
                        </Label>
                      </CardContent>
                    </Card>
                  </div>
                </RadioGroup>
              )}
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-4 font-semibold">Campaign Summary</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Campaign Name</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.name || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Dialing Mode</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.dialingMode}
                      {formData.dialingMode === "Predictive" &&
                        ` (${formData.dialRatio.toFixed(1)}:1 ratio)`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Schedule</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.operatingHours.start} -{" "}
                      {formData.operatingHours.end}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Days</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.activeDays.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.startDate
                        ? new Date(formData.startDate).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Leads</p>
                    <p className="text-sm text-muted-foreground">
                      {totalLeads.toLocaleString()} leads from{" "}
                      {formData.selectedLists.length} list(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assigned Agents</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.selectedAgents.length} agent(s)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Ready to launch</p>
                  <p className="text-blue-800">
                    Review all settings above. The campaign will be created in
                    'Draft' status and can be started manually.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={!formData.name || createCampaign.isPending}
          >
            {createCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!createCampaign.isPending && <Check className="mr-2 h-4 w-4" />}
            Create Campaign
          </Button>
        )}
      </div>
    </div>
  );
}
