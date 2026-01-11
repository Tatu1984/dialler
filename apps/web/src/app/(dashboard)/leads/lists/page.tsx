"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Users,
  List,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLeadLists, useCreateLeadList, useDeleteLeadList } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-yellow-100 text-yellow-800 border-yellow-200",
  archived: "bg-gray-100 text-gray-800 border-gray-200",
  Active: "bg-green-100 text-green-800 border-green-200",
  Inactive: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Archived: "bg-gray-100 text-gray-800 border-gray-200",
};

// Loading skeleton component
function LeadListsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
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
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LeadListsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newList, setNewList] = useState({
    name: "",
    description: "",
  });

  // Fetch lead lists
  const { data: leadListsData, isLoading, error } = useLeadLists();
  const createLeadList = useCreateLeadList();
  const deleteLeadList = useDeleteLeadList();

  // Handle loading state
  if (isLoading) {
    return <LeadListsSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Lead Lists</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message || "Failed to load lead lists. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const leadLists = leadListsData?.items || [];

  const filteredLists = leadLists.filter((list: any) => {
    const matchesSearch = list.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || list.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateList = async () => {
    try {
      await createLeadList.mutateAsync({
        name: newList.name,
        description: newList.description,
      });
      toast({ title: "List created", description: "New lead list has been created." });
      setIsCreateDialogOpen(false);
      setNewList({ name: "", description: "" });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create list. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteLeadList.mutateAsync(id);
      toast({ title: "List deleted", description: "Lead list has been deleted." });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete list. Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalLeads = leadLists.reduce((sum: number, list: any) => sum + (list.totalLeads || 0), 0);
  const activeLists = leadLists.filter((l: any) => l.status === "active").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Lists</h1>
          <p className="text-muted-foreground">
            Organize and manage your lead lists
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/import">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Import Leads
            </Button>
          </Link>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lead List</DialogTitle>
                <DialogDescription>
                  Create a new list to organize your leads
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listName">List Name *</Label>
                  <Input
                    id="listName"
                    placeholder="e.g., Enterprise Prospects Q1 2026"
                    value={newList.name}
                    onChange={(e) =>
                      setNewList({ ...newList, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listDescription">Description</Label>
                  <Textarea
                    id="listDescription"
                    placeholder="Describe the purpose and criteria for this list..."
                    rows={3}
                    value={newList.description}
                    onChange={(e) =>
                      setNewList({ ...newList, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateList} disabled={!newList.name || createLeadList.isPending}>
                  {createLeadList.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create List
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Total Lists</CardDescription>
            </div>
            <CardTitle className="text-3xl">{leadLists.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Lists</CardDescription>
            <CardTitle className="text-3xl">{activeLists}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Total Leads</CardDescription>
            </div>
            <CardTitle className="text-3xl">
              {totalLeads.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg. List Size</CardDescription>
            <CardTitle className="text-3xl">
              {leadLists.length > 0 ? Math.round(totalLeads / leadLists.length).toLocaleString() : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lists Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>List Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLists.map((list: any) => {
                return (
                  <TableRow key={list.id}>
                    <TableCell>
                      <Link
                        href={`/leads?list=${list.id}`}
                        className="font-medium hover:underline"
                      >
                        {list.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[list.status] || statusColors.active}>
                        {list.status.charAt(0).toUpperCase() + list.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(list.totalLeads || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {list.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(list.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/leads?list=${list.id}`}>
                              <Users className="mr-2 h-4 w-4" />
                              View Leads
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit List
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Export Leads
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {list.status === "active" && (
                            <DropdownMenuItem>Archive</DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteList(list.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete List
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredLists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <List className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {leadLists.length === 0 ? "No lead lists yet" : "No lists found matching your filters"}
              </p>
              {leadLists.length === 0 && (
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first list
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* List Performance Overview */}
      {leadLists.filter((l: any) => l.status === "active").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>List Performance Overview</CardTitle>
            <CardDescription>
              Performance metrics across all active lists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadLists
                .filter((l: any) => l.status === "active")
                .slice(0, 5)
                .map((list: any) => {
                  const totalLeads = list.totalLeads || 0;
                  // Placeholder progress - would come from stats API
                  const progressPercent = 50;
                  return (
                    <div key={list.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Link href={`/leads?list=${list.id}`} className="font-medium hover:underline">
                          {list.name}
                        </Link>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {totalLeads.toLocaleString()} leads
                          </span>
                          <Badge variant="outline">
                            {list.status}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={progressPercent} />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
