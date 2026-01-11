"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Converted"
  | "Not Interested"
  | "Do Not Call";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: LeadStatus;
  list: string;
  campaign?: string;
  lastContact?: string;
  callAttempts: number;
  score: number;
}

interface LeadTableProps {
  leads: Lead[];
  selectedLeads?: string[];
  onSelectLead?: (leadId: string) => void;
  onSelectAll?: () => void;
  onEdit?: (leadId: string) => void;
  onDelete?: (leadId: string) => void;
}

type SortField = "name" | "company" | "status" | "score" | "lastContact";
type SortDirection = "asc" | "desc" | null;

const statusColors: Record<LeadStatus, string> = {
  New: "bg-blue-100 text-blue-800 border-blue-200",
  Contacted: "bg-purple-100 text-purple-800 border-purple-200",
  Qualified: "bg-green-100 text-green-800 border-green-200",
  Converted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Not Interested": "bg-gray-100 text-gray-800 border-gray-200",
  "Do Not Call": "bg-red-100 text-red-800 border-red-200",
};

export function LeadTable({
  leads,
  selectedLeads = [],
  onSelectLead,
  onSelectAll,
  onEdit,
  onDelete,
}: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "name":
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case "company":
        aValue = a.company.toLowerCase();
        bValue = b.company.toLowerCase();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "score":
        aValue = a.score;
        bValue = b.score;
        break;
      case "lastContact":
        aValue = a.lastContact ? new Date(a.lastContact).getTime() : 0;
        bValue = b.lastContact ? new Date(b.lastContact).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({
    field,
    currentField,
    direction,
  }: {
    field: SortField;
    currentField: SortField | null;
    direction: SortDirection;
  }) => {
    if (field !== currentField) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (direction === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    if (direction === "desc") {
      return <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {onSelectLead && onSelectAll && (
            <TableHead className="w-12">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
          )}
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort("name")}
              className="h-8 p-0 hover:bg-transparent"
            >
              Name
              <SortIcon
                field="name"
                currentField={sortField}
                direction={sortDirection}
              />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort("company")}
              className="h-8 p-0 hover:bg-transparent"
            >
              Company
              <SortIcon
                field="company"
                currentField={sortField}
                direction={sortDirection}
              />
            </Button>
          </TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort("status")}
              className="h-8 p-0 hover:bg-transparent"
            >
              Status
              <SortIcon
                field="status"
                currentField={sortField}
                direction={sortDirection}
              />
            </Button>
          </TableHead>
          <TableHead>List</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort("score")}
              className="h-8 p-0 hover:bg-transparent"
            >
              Score
              <SortIcon
                field="score"
                currentField={sortField}
                direction={sortDirection}
              />
            </Button>
          </TableHead>
          <TableHead className="text-center">Attempts</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort("lastContact")}
              className="h-8 p-0 hover:bg-transparent"
            >
              Last Contact
              <SortIcon
                field="lastContact"
                currentField={sortField}
                direction={sortDirection}
              />
            </Button>
          </TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedLeads.map((lead) => (
          <TableRow key={lead.id}>
            {onSelectLead && (
              <TableCell>
                <Checkbox
                  checked={selectedLeads.includes(lead.id)}
                  onCheckedChange={() => onSelectLead(lead.id)}
                />
              </TableCell>
            )}
            <TableCell>
              <div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium hover:underline"
                >
                  {lead.firstName} {lead.lastName}
                </Link>
                <p className="text-xs text-muted-foreground">{lead.position}</p>
              </div>
            </TableCell>
            <TableCell>{lead.company}</TableCell>
            <TableCell>
              <div className="text-sm">
                <div>{lead.email}</div>
                <div className="text-muted-foreground">{lead.phone}</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={statusColors[lead.status]}>
                {lead.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{lead.list}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${lead.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{lead.score}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">{lead.callAttempts}</TableCell>
            <TableCell className="text-sm">
              {lead.lastContact
                ? new Date(lead.lastContact).toLocaleDateString()
                : "-"}
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
                    <Link href={`/leads/${lead.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(lead.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Lead
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(lead.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
