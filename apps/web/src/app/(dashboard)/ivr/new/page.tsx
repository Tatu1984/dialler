'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Phone,
  MessageSquare,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

type WizardStep = 'basic' | 'welcome' | 'menu' | 'routing' | 'hours' | 'review';

export default function NewIVRPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    phoneNumber: '',

    // Welcome Message
    welcomeMessage: 'Thank you for calling. Please listen to the following options.',
    welcomeLanguage: 'en-US',

    // Menu Options
    menuOptions: [
      { digit: '1', label: 'Sales', destination: 'sales-queue' },
      { digit: '2', label: 'Support', destination: 'support-queue' },
      { digit: '0', label: 'Operator', destination: 'operator' },
    ],
    invalidRetries: 3,
    timeoutSeconds: 10,

    // Routing
    afterHoursDestination: 'voicemail',
    overflowDestination: 'callback-queue',

    // Business Hours
    startTime: '09:00',
    endTime: '17:00',
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  });

  const steps: Array<{ id: WizardStep; label: string; icon: any }> = [
    { id: 'basic', label: 'Basic Info', icon: Phone },
    { id: 'welcome', label: 'Welcome', icon: MessageSquare },
    { id: 'menu', label: 'Menu Options', icon: Users },
    { id: 'routing', label: 'Routing', icon: Users },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'review', label: 'Review', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'basic') {
      if (!formData.name.trim()) {
        newErrors.name = 'IVR name is required';
      }
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleSubmit = () => {
    console.log('Creating IVR:', formData);
    // TODO: Implement API call
    // router.push('/ivr');
  };

  const handleAddMenuOption = () => {
    setFormData({
      ...formData,
      menuOptions: [
        ...formData.menuOptions,
        { digit: '', label: '', destination: '' },
      ],
    });
  };

  const handleRemoveMenuOption = (index: number) => {
    setFormData({
      ...formData,
      menuOptions: formData.menuOptions.filter((_, i) => i !== index),
    });
  };

  const toggleDay = (day: string) => {
    setFormData({
      ...formData,
      operatingDays: formData.operatingDays.includes(day)
        ? formData.operatingDays.filter(d => d !== day)
        : [...formData.operatingDays, day],
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ivr">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New IVR Menu</h1>
          <p className="text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <Progress value={progress} className="mb-4" />
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the basic details for your IVR menu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                IVR Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Main Customer Service Menu"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this IVR menu's purpose"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phoneNumber"
                placeholder="+1-800-555-0100"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className={errors.phoneNumber ? 'border-destructive' : ''}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.phoneNumber}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The phone number that will use this IVR menu
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'welcome' && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome Message</CardTitle>
            <CardDescription>
              Configure the greeting message that callers hear first
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This will be converted to speech or you can upload an audio file
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.welcomeLanguage}
                onValueChange={(value) => setFormData({ ...formData, welcomeLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Keep your welcome message concise and friendly. Clearly state
                the menu options that follow.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'menu' && (
        <Card>
          <CardHeader>
            <CardTitle>Menu Options</CardTitle>
            <CardDescription>
              Define the menu choices available to callers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.menuOptions.map((option, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-lg border">
                <div className="flex-1 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Digit</Label>
                    <Input
                      placeholder="1"
                      value={option.digit}
                      onChange={(e) => {
                        const updated = [...formData.menuOptions];
                        updated[index].digit = e.target.value;
                        setFormData({ ...formData, menuOptions: updated });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      placeholder="Sales"
                      value={option.label}
                      onChange={(e) => {
                        const updated = [...formData.menuOptions];
                        updated[index].label = e.target.value;
                        setFormData({ ...formData, menuOptions: updated });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Select
                      value={option.destination}
                      onValueChange={(value) => {
                        const updated = [...formData.menuOptions];
                        updated[index].destination = value;
                        setFormData({ ...formData, menuOptions: updated });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales-queue">Sales Queue</SelectItem>
                        <SelectItem value="support-queue">Support Queue</SelectItem>
                        <SelectItem value="billing-queue">Billing Queue</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMenuOption(index)}
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={handleAddMenuOption}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Add Menu Option
            </Button>

            <div className="grid gap-4 md:grid-cols-2 pt-4">
              <div className="space-y-2">
                <Label htmlFor="invalidRetries">Invalid Input Retries</Label>
                <Input
                  id="invalidRetries"
                  type="number"
                  value={formData.invalidRetries}
                  onChange={(e) =>
                    setFormData({ ...formData, invalidRetries: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.timeoutSeconds}
                  onChange={(e) =>
                    setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'routing' && (
        <Card>
          <CardHeader>
            <CardTitle>Routing Destinations</CardTitle>
            <CardDescription>
              Configure where calls should go in different scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="afterHours">After Hours Destination</Label>
              <Select
                value={formData.afterHoursDestination}
                onValueChange={(value) =>
                  setFormData({ ...formData, afterHoursDestination: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="callback-queue">Callback Queue</SelectItem>
                  <SelectItem value="emergency-line">Emergency Line</SelectItem>
                  <SelectItem value="hangup">Hangup</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Where to send calls outside of business hours
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overflow">Overflow Destination</Label>
              <Select
                value={formData.overflowDestination}
                onValueChange={(value) => setFormData({ ...formData, overflowDestination: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="callback-queue">Callback Queue</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="overflow-queue">Overflow Queue</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Where to send calls when all agents are busy
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'hours' && (
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set the operating hours for this IVR menu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Operating Days</Label>
              <div className="flex gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <Button
                    key={day}
                    variant={formData.operatingDays.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>
              Review your IVR configuration before creating
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Basic Information</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd className="font-medium">{formData.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Phone Number:</dt>
                  <dd className="font-medium">{formData.phoneNumber}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Menu Options</h3>
              <div className="space-y-2">
                {formData.menuOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{option.digit}</Badge>
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{option.destination}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Business Hours</h3>
              <p className="text-sm">
                {formData.startTime} - {formData.endTime}
              </p>
              <div className="flex gap-1 mt-2">
                {formData.operatingDays.map(day => (
                  <Badge key={day} variant="secondary">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        {currentStepIndex === steps.length - 1 ? (
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            Create IVR Menu
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
