"use client";

import { useState } from "react";
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

const STEPS = [
  { id: 1, name: "Upload File" },
  { id: 2, name: "Map Columns" },
  { id: 3, name: "Options" },
  { id: 4, name: "Preview" },
  { id: 5, name: "Import" },
];

interface ImportWizardProps {
  onComplete?: (result: {
    fileName: string;
    mappings: Record<string, string>;
    options: {
      targetList: string;
      duplicateHandling: string;
    };
  }) => void;
  onCancel?: () => void;
}

export function ImportWizard({ onComplete, onCancel }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [fileName, setFileName] = useState<string>("");
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {}
  );
  const [importOptions, setImportOptions] = useState({
    targetList: "",
    duplicateHandling: "skip",
  });

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
      // Auto-map common columns
      const autoMappings: Record<string, string> = {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email Address",
        phone: "Phone Number",
        company: "Company Name",
      };
      setColumnMappings(autoMappings);
    }
  };

  const handleComplete = () => {
    onComplete?.({
      fileName,
      mappings: columnMappings,
      options: importOptions,
    });
  };

  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progressPercent} />
        <div className="flex justify-between">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`text-xs ${
                step.id === currentStep
                  ? "text-primary font-medium"
                  : step.id < currentStep
                    ? "text-green-600"
                    : "text-muted-foreground"
              }`}
            >
              {step.name}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-8">
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Upload CSV or Excel File</p>
                    <p className="text-sm text-muted-foreground">
                      Click to browse
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="max-w-xs"
                  />
                  {fileName && (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="text-sm">{fileName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Map your file columns to lead fields
              </p>
              {Object.keys(columnMappings).map((field) => (
                <div key={field} className="grid grid-cols-2 gap-4">
                  <Label className="capitalize">{field}</Label>
                  <Input value={columnMappings[field]} readOnly />
                </div>
              ))}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Target List</Label>
                <Input
                  placeholder="Select or create list..."
                  value={importOptions.targetList}
                  onChange={(e) =>
                    setImportOptions({
                      ...importOptions,
                      targetList: e.target.value,
                    })
                  }
                />
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
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip">Skip duplicates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update">Update duplicates</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4 text-sm">
                <p>
                  <strong>File:</strong> {fileName}
                </p>
                <p>
                  <strong>Target List:</strong> {importOptions.targetList}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                <Info className="h-4 w-4 flex-shrink-0" />
                <p>Review settings before importing</p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <Check className="h-16 w-16 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Import Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Successfully imported leads
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : prevStep}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? "Cancel" : "Previous"}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={nextStep} disabled={currentStep === 1 && !fileName}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : currentStep === STEPS.length - 1 ? (
          <Button onClick={nextStep}>
            Start Import
            <Check className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete}>
            <Check className="mr-2 h-4 w-4" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
