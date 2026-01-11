"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Info,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STEPS = [
  { id: 1, name: "Upload File", description: "Choose your file" },
  { id: 2, name: "Map Columns", description: "Match fields" },
  { id: 3, name: "Options", description: "Import settings" },
  { id: 4, name: "Preview", description: "Review data" },
  { id: 5, name: "Import", description: "Process & complete" },
];

const FIELD_MAPPINGS = [
  { field: "firstName", label: "First Name", required: true },
  { field: "lastName", label: "Last Name", required: true },
  { field: "email", label: "Email", required: false },
  { field: "phone", label: "Phone", required: true },
  { field: "company", label: "Company", required: false },
  { field: "position", label: "Position", required: false },
  { field: "industry", label: "Industry", required: false },
  { field: "address", label: "Address", required: false },
  { field: "city", label: "City", required: false },
  { field: "state", label: "State", required: false },
  { field: "zip", label: "ZIP Code", required: false },
  { field: "country", label: "Country", required: false },
];

const mockCsvColumns = [
  "First Name",
  "Last Name",
  "Email Address",
  "Phone Number",
  "Company Name",
  "Job Title",
  "Industry",
  "Street Address",
  "City",
  "State",
  "Postal Code",
  "Country",
];

const mockPreviewData = [
  {
    firstName: "John",
    lastName: "Anderson",
    email: "john.anderson@techcorp.com",
    phone: "+1 (555) 123-4567",
    company: "TechCorp Solutions",
    position: "CTO",
    industry: "Technology",
    address: "123 Tech Street",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    country: "USA",
  },
  {
    firstName: "Sarah",
    lastName: "Martinez",
    email: "s.martinez@innovatesoft.io",
    phone: "+1 (555) 234-5678",
    company: "InnovateSoft",
    position: "VP of Engineering",
    industry: "Software",
    address: "456 Innovation Ave",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "USA",
  },
  {
    firstName: "Michael",
    lastName: "Chen",
    email: "mchen@healthtech.com",
    phone: "+1 (555) 345-6789",
    company: "HealthTech Innovations",
    position: "Director of IT",
    industry: "Healthcare",
    address: "789 Medical Blvd",
    city: "Boston",
    state: "MA",
    zip: "02115",
    country: "USA",
  },
];

const mockLeadLists = [
  { id: "1", name: "Enterprise Tech Companies" },
  { id: "2", name: "SaaS Startups - Series A+" },
  { id: "3", name: "Healthcare Industry Leads" },
  { id: "4", name: "Financial Services Prospects" },
];

export default function ImportLeadsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [fileName, setFileName] = useState<string>("");
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {}
  );
  const [importOptions, setImportOptions] = useState({
    targetList: "",
    createNewList: false,
    newListName: "",
    duplicateHandling: "skip",
    skipValidation: false,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Auto-map columns based on common naming patterns
      const autoMappings: Record<string, string> = {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email Address",
        phone: "Phone Number",
        company: "Company Name",
        position: "Job Title",
        industry: "Industry",
        address: "Street Address",
        city: "City",
        state: "State",
        zip: "Postal Code",
        country: "Country",
      };
      setColumnMappings(autoMappings);
    }
  };

  const handleImport = () => {
    setIsImporting(true);
    // Simulate import progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setImportProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsImporting(false);
        setImportComplete(true);
      }
    }, 300);
  };

  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import Leads</h1>
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
          <CardDescription>
            {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Upload File */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">Upload CSV or Excel File</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Drag and drop or click to browse
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="max-w-xs"
                  />
                  {fileName && (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <span className="font-medium">{fileName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFileName("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Supported formats</p>
                  <ul className="mt-1 list-inside list-disc text-blue-800">
                    <li>CSV files (.csv)</li>
                    <li>Excel files (.xlsx, .xls)</li>
                    <li>Maximum file size: 10 MB</li>
                    <li>Maximum records: 50,000 per import</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map the columns from your file to lead fields. Required fields
                are marked with an asterisk (*).
              </p>

              <div className="space-y-3">
                {FIELD_MAPPINGS.map((mapping) => (
                  <div
                    key={mapping.field}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <Label htmlFor={mapping.field}>
                      {mapping.label}
                      {mapping.required && (
                        <span className="text-destructive"> *</span>
                      )}
                    </Label>
                    <Select
                      value={columnMappings[mapping.field] || ""}
                      onValueChange={(value) =>
                        setColumnMappings({
                          ...columnMappings,
                          [mapping.field]: value,
                        })
                      }
                    >
                      <SelectTrigger id={mapping.field}>
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          <span className="text-muted-foreground">
                            - Do not import -
                          </span>
                        </SelectItem>
                        {mockCsvColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-4 text-sm text-yellow-900">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  Ensure all required fields are mapped before proceeding.
                  Unmapped fields will not be imported.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Import Options */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Lead List *</Label>
                  <RadioGroup
                    value={
                      importOptions.createNewList ? "new" : importOptions.targetList
                    }
                    onValueChange={(value) => {
                      if (value === "new") {
                        setImportOptions({
                          ...importOptions,
                          createNewList: true,
                          targetList: "",
                        });
                      } else {
                        setImportOptions({
                          ...importOptions,
                          createNewList: false,
                          targetList: value,
                        });
                      }
                    }}
                  >
                    {mockLeadLists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem value={list.id} id={list.id} />
                        <Label htmlFor={list.id} className="font-normal">
                          {list.name}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new" className="font-normal">
                        Create new list
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {importOptions.createNewList && (
                  <div className="space-y-2">
                    <Label htmlFor="newListName">New List Name *</Label>
                    <Input
                      id="newListName"
                      placeholder="Enter list name..."
                      value={importOptions.newListName}
                      onChange={(e) =>
                        setImportOptions({
                          ...importOptions,
                          newListName: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <RadioGroup
                  value={importOptions.duplicateHandling}
                  onValueChange={(value) =>
                    setImportOptions({
                      ...importOptions,
                      duplicateHandling: value,
                    })
                  }
                >
                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="flex items-start space-x-2 p-4">
                      <RadioGroupItem value="skip" id="skip" />
                      <div className="flex-1">
                        <Label htmlFor="skip" className="cursor-pointer font-medium">
                          Skip duplicates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Skip any records that match existing leads (by email or
                          phone)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="flex items-start space-x-2 p-4">
                      <RadioGroupItem value="update" id="update" />
                      <div className="flex-1">
                        <Label
                          htmlFor="update"
                          className="cursor-pointer font-medium"
                        >
                          Update duplicates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Update existing lead records with new information from
                          the import
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="flex items-start space-x-2 p-4">
                      <RadioGroupItem value="create" id="create" />
                      <div className="flex-1">
                        <Label
                          htmlFor="create"
                          className="cursor-pointer font-medium"
                        >
                          Create duplicates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Create new lead records even if duplicates exist
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">File:</span>
                    <span>{fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Records:</span>
                    <span>{mockPreviewData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Target List:</span>
                    <span>
                      {importOptions.createNewList
                        ? importOptions.newListName
                        : mockLeadLists.find(
                            (l) => l.id === importOptions.targetList
                          )?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Duplicate Handling:</span>
                    <span className="capitalize">
                      {importOptions.duplicateHandling}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium">Preview (First 3 records)</h3>
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Position</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPreviewData.map((lead, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {lead.firstName} {lead.lastName}
                          </TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>{lead.company}</TableCell>
                          <TableCell>{lead.position}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  Please review the preview data carefully. Click "Start Import"
                  to begin the import process.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Import Progress */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {!importComplete ? (
                <>
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-8 w-8 animate-pulse text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium">
                        {isImporting ? "Importing leads..." : "Ready to import"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isImporting
                          ? "Please wait while we process your file"
                          : "Click Start Import to begin"}
                      </p>
                    </div>
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  )}

                  {!isImporting && (
                    <Button onClick={handleImport} className="w-full" size="lg">
                      <Upload className="mr-2 h-4 w-4" />
                      Start Import
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium">Import Complete!</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Successfully imported {mockPreviewData.length} leads
                      </p>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Import Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Records:</span>
                        <Badge variant="outline">
                          {mockPreviewData.length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Successfully Imported:</span>
                        <Badge className="bg-green-500">
                          {mockPreviewData.length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Duplicates Skipped:</span>
                        <Badge variant="outline">0</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Errors:</span>
                        <Badge variant="outline">0</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Link href="/leads" className="flex-1">
                      <Button className="w-full" size="lg">
                        View Leads
                      </Button>
                    </Link>
                    <Link href="/leads/import" className="flex-1">
                      <Button variant="outline" className="w-full" size="lg">
                        Import More
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={nextStep}
            disabled={
              (currentStep === 1 && !fileName) ||
              (currentStep === 3 &&
                !importOptions.targetList &&
                !importOptions.newListName)
            }
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
