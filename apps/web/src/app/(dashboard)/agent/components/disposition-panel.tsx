'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  UserX,
  AlertTriangle,
} from 'lucide-react';

interface Disposition {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: 'positive' | 'neutral' | 'negative';
  requiresNotes?: boolean;
  requiresCallback?: boolean;
  requiresAmount?: boolean;
}

const dispositions: Disposition[] = [
  {
    id: 'sale',
    label: 'Sale',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'bg-green-500 hover:bg-green-600',
    category: 'positive',
    requiresNotes: true,
    requiresAmount: true,
  },
  {
    id: 'interested',
    label: 'Interested',
    icon: <PhoneCall className="h-5 w-5" />,
    color: 'bg-blue-500 hover:bg-blue-600',
    category: 'positive',
    requiresCallback: true,
    requiresNotes: true,
  },
  {
    id: 'callback',
    label: 'Callback',
    icon: <Calendar className="h-5 w-5" />,
    color: 'bg-orange-500 hover:bg-orange-600',
    category: 'neutral',
    requiresCallback: true,
    requiresNotes: true,
  },
  {
    id: 'no-answer',
    label: 'No Answer',
    icon: <PhoneMissed className="h-5 w-5" />,
    color: 'bg-yellow-500 hover:bg-yellow-600',
    category: 'neutral',
  },
  {
    id: 'not-interested',
    label: 'Not Interested',
    icon: <XCircle className="h-5 w-5" />,
    color: 'bg-red-500 hover:bg-red-600',
    category: 'negative',
    requiresNotes: true,
  },
  {
    id: 'dnc',
    label: 'Do Not Call',
    icon: <UserX className="h-5 w-5" />,
    color: 'bg-purple-500 hover:bg-purple-600',
    category: 'negative',
    requiresNotes: true,
  },
  {
    id: 'wrong-number',
    label: 'Wrong Number',
    icon: <PhoneOff className="h-5 w-5" />,
    color: 'bg-gray-500 hover:bg-gray-600',
    category: 'negative',
  },
  {
    id: 'voicemail',
    label: 'Voicemail',
    icon: <FileText className="h-5 w-5" />,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    category: 'neutral',
  },
];

interface DispositionPanelProps {
  onSubmit?: (data: DispositionData) => void;
}

interface DispositionData {
  disposition: string;
  notes: string;
  callbackDate?: string;
  callbackTime?: string;
  amount?: string;
  customFields: Record<string, string>;
}

export function DispositionPanel({ onSubmit }: DispositionPanelProps) {
  const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [amount, setAmount] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({
    priority: '',
    followUpReason: '',
    productInterest: '',
  });

  const selectedDispositionConfig = dispositions.find(
    (d) => d.id === selectedDisposition
  );

  const handleSubmit = () => {
    if (!selectedDisposition) {
      return;
    }

    const data: DispositionData = {
      disposition: selectedDisposition,
      notes,
      customFields,
    };

    if (selectedDispositionConfig?.requiresCallback) {
      data.callbackDate = callbackDate;
      data.callbackTime = callbackTime;
    }

    if (selectedDispositionConfig?.requiresAmount) {
      data.amount = amount;
    }

    onSubmit?.(data);

    // Reset form
    setSelectedDisposition(null);
    setNotes('');
    setCallbackDate('');
    setCallbackTime('');
    setAmount('');
    setCustomFields({
      priority: '',
      followUpReason: '',
      productInterest: '',
    });
  };

  const isFormValid = () => {
    if (!selectedDisposition) return false;
    if (selectedDispositionConfig?.requiresNotes && !notes) return false;
    if (selectedDispositionConfig?.requiresCallback && (!callbackDate || !callbackTime))
      return false;
    if (selectedDispositionConfig?.requiresAmount && !amount) return false;
    return true;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Call Disposition</CardTitle>
          {selectedDisposition && (
            <Badge
              variant="outline"
              className={selectedDispositionConfig?.color.replace('bg-', 'border-')}
            >
              {selectedDispositionConfig?.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[700px] pr-4">
          <div className="space-y-6">
            {/* Quick Disposition Buttons */}
            <div className="space-y-2">
              <Label>Select Disposition</Label>
              <div className="grid grid-cols-2 gap-2">
                {dispositions.map((disposition) => (
                  <Button
                    key={disposition.id}
                    variant={
                      selectedDisposition === disposition.id ? 'default' : 'outline'
                    }
                    className={`justify-start h-auto py-3 ${
                      selectedDisposition === disposition.id
                        ? disposition.color + ' text-white'
                        : ''
                    }`}
                    onClick={() => setSelectedDisposition(disposition.id)}
                  >
                    {disposition.icon}
                    <span className="ml-2">{disposition.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Conditional Fields Based on Selected Disposition */}
            {selectedDisposition && (
              <>
                <Separator />

                {/* Sale Amount Field */}
                {selectedDispositionConfig?.requiresAmount && (
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Sale Amount
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg font-semibold"
                    />
                  </div>
                )}

                {/* Callback Scheduler */}
                {selectedDispositionConfig?.requiresCallback && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Callback
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="callback-date" className="text-xs">
                          Date
                        </Label>
                        <Input
                          id="callback-date"
                          type="date"
                          value={callbackDate}
                          onChange={(e) => setCallbackDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="callback-time" className="text-xs">
                          Time
                        </Label>
                        <Input
                          id="callback-time"
                          type="time"
                          value={callbackTime}
                          onChange={(e) => setCallbackTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Field */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Call Notes
                    {selectedDispositionConfig?.requiresNotes && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add detailed notes about this call..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {notes.length} characters
                  </p>
                </div>

                <Separator />

                {/* Custom Fields */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Additional Details</Label>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-xs">
                      Priority
                    </Label>
                    <Select
                      value={customFields.priority}
                      onValueChange={(value) =>
                        setCustomFields({ ...customFields, priority: value })
                      }
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDisposition === 'callback' && (
                    <div className="space-y-2">
                      <Label htmlFor="followUpReason" className="text-xs">
                        Callback Reason
                      </Label>
                      <Select
                        value={customFields.followUpReason}
                        onValueChange={(value) =>
                          setCustomFields({ ...customFields, followUpReason: value })
                        }
                      >
                        <SelectTrigger id="followUpReason">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="requested-info">
                            Requested More Information
                          </SelectItem>
                          <SelectItem value="decision-pending">
                            Decision Pending
                          </SelectItem>
                          <SelectItem value="budget-approval">
                            Budget Approval Needed
                          </SelectItem>
                          <SelectItem value="schedule-demo">Schedule Demo</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(selectedDisposition === 'sale' ||
                    selectedDisposition === 'interested') && (
                    <div className="space-y-2">
                      <Label htmlFor="productInterest" className="text-xs">
                        Product/Service Interest
                      </Label>
                      <Select
                        value={customFields.productInterest}
                        onValueChange={(value) =>
                          setCustomFields({ ...customFields, productInterest: value })
                        }
                      >
                        <SelectTrigger id="productInterest">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic Plan</SelectItem>
                          <SelectItem value="professional">
                            Professional Plan
                          </SelectItem>
                          <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                          <SelectItem value="custom">Custom Solution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Submit Button */}
                <div className="space-y-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid()}
                    className="w-full"
                    size="lg"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Save Disposition
                  </Button>
                  {!isFormValid() && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Please fill in all required fields before submitting.</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {!selectedDisposition && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a disposition to continue</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
