"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DialingSettingsProps {
  value: {
    dialingMode: "Preview" | "Progressive" | "Predictive";
    dialRatio?: number;
    maxRetries: number;
    retryInterval: number;
    abandonRate?: number;
  };
  onChange: (settings: DialingSettingsProps["value"]) => void;
}

export function DialingSettings({ value, onChange }: DialingSettingsProps) {
  const updateSettings = (updates: Partial<DialingSettingsProps["value"]>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Dialing Mode *</Label>
        <RadioGroup
          value={value.dialingMode}
          onValueChange={(mode) =>
            updateSettings({
              dialingMode: mode as "Preview" | "Progressive" | "Predictive",
            })
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
                  Agent reviews lead info before call is placed. Best for
                  high-value leads.
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
                  Automatically dials when agent becomes available. Good balance
                  of efficiency and control.
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
                  Dials multiple numbers simultaneously. Maximum efficiency for
                  large campaigns.
                </p>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>

      {value.dialingMode === "Predictive" && (
        <div className="space-y-2">
          <Label>
            Dial Ratio: {(value.dialRatio || 2.5).toFixed(1)}:1
          </Label>
          <Slider
            value={[value.dialRatio || 2.5]}
            onValueChange={([dialRatio]) => updateSettings({ dialRatio })}
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
            value={value.maxRetries}
            onChange={(e) =>
              updateSettings({ maxRetries: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of call attempts per lead
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="retryInterval">Retry Interval (hours)</Label>
          <Input
            id="retryInterval"
            type="number"
            min="1"
            max="168"
            value={value.retryInterval}
            onChange={(e) =>
              updateSettings({ retryInterval: parseInt(e.target.value) || 1 })
            }
          />
          <p className="text-xs text-muted-foreground">
            Time to wait between retry attempts
          </p>
        </div>
      </div>

      {value.dialingMode === "Predictive" && (
        <div className="space-y-2">
          <Label htmlFor="abandonRate">Max Abandon Rate (%)</Label>
          <Input
            id="abandonRate"
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={value.abandonRate || 3}
            onChange={(e) =>
              updateSettings({
                abandonRate: parseFloat(e.target.value) || 0,
              })
            }
          />
          <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Regulatory limit for abandoned calls. System will adjust dial
              ratio to stay within this limit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
