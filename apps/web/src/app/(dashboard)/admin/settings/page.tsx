'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Clock,
  Calendar,
  Globe,
  Bell,
  Palette,
  FileText,
  Shield,
  Users,
  Phone,
  Upload,
} from 'lucide-react';

export default function TenantSettingsPage() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Tenant Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your organization&apos;s settings and preferences
        </p>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input defaultValue="NexusDialer Demo" />
                </div>
                <div className="space-y-2">
                  <Label>Organization Slug</Label>
                  <Input defaultValue="nexus-demo" disabled />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs: app.nexusdialer.com/nexus-demo
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select defaultValue="financial">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial Services</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="telecom">Telecommunications</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select defaultValue="51-200">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Textarea defaultValue="123 Business Ave, Suite 100&#10;New York, NY 10001" />
                </div>
                <div className="space-y-2">
                  <Label>Primary Contact Email</Label>
                  <Input type="email" defaultValue="admin@nexusdemo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Primary Contact Phone</Label>
                  <Input defaultValue="+1 (555) 000-0000" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Hours */}
        <TabsContent value="business-hours">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Set your contact center&apos;s operating hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="America/New_York">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Weekly Schedule</h4>
                <div className="space-y-3">
                  {[
                    { day: 'Monday', open: '08:00', close: '20:00', enabled: true },
                    { day: 'Tuesday', open: '08:00', close: '20:00', enabled: true },
                    { day: 'Wednesday', open: '08:00', close: '20:00', enabled: true },
                    { day: 'Thursday', open: '08:00', close: '20:00', enabled: true },
                    { day: 'Friday', open: '08:00', close: '18:00', enabled: true },
                    { day: 'Saturday', open: '10:00', close: '16:00', enabled: true },
                    { day: 'Sunday', open: '00:00', close: '00:00', enabled: false },
                  ].map((schedule) => (
                    <div
                      key={schedule.day}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <Switch defaultChecked={schedule.enabled} />
                      <span className="w-24 font-medium">{schedule.day}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          defaultValue={schedule.open}
                          className="w-32"
                          disabled={!schedule.enabled}
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          defaultValue={schedule.close}
                          className="w-32"
                          disabled={!schedule.enabled}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">After Hours Settings</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>After Hours Action</Label>
                    <Select defaultValue="voicemail">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voicemail">Go to Voicemail</SelectItem>
                        <SelectItem value="message">Play Message & Disconnect</SelectItem>
                        <SelectItem value="forward">Forward to Number</SelectItem>
                        <SelectItem value="queue">Queue for Next Business Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>After Hours Message</Label>
                    <Input defaultValue="Thank you for calling. Our office is currently closed..." />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Holiday Calendar
              </CardTitle>
              <CardDescription>
                Configure holidays when the contact center is closed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-medium">2024 Holidays</h4>
                  <p className="text-sm text-muted-foreground">
                    8 holidays configured
                  </p>
                </div>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              </div>

              <div className="space-y-2">
                {[
                  { name: "New Year's Day", date: 'January 1, 2024' },
                  { name: "Martin Luther King Jr. Day", date: 'January 15, 2024' },
                  { name: "Presidents Day", date: 'February 19, 2024' },
                  { name: "Memorial Day", date: 'May 27, 2024' },
                  { name: "Independence Day", date: 'July 4, 2024' },
                  { name: "Labor Day", date: 'September 2, 2024' },
                  { name: "Thanksgiving Day", date: 'November 28, 2024' },
                  { name: "Christmas Day", date: 'December 25, 2024' },
                ].map((holiday) => (
                  <div
                    key={holiday.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-sm text-muted-foreground">{holiday.date}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>Customize the look and feel of your portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label>Company Logo</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="mx-auto max-h-24"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click or drag to upload logo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG up to 2MB
                        </p>
                      </div>
                    )}
                    <Input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setLogoPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <Button variant="outline" className="mt-4">
                      Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Brand Colors</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        defaultValue="#3b82f6"
                        className="w-12 h-10 p-1"
                      />
                      <div>
                        <p className="font-medium">Primary Color</p>
                        <p className="text-sm text-muted-foreground">#3b82f6</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        defaultValue="#1e40af"
                        className="w-12 h-10 p-1"
                      />
                      <div>
                        <p className="font-medium">Secondary Color</p>
                        <p className="text-sm text-muted-foreground">#1e40af</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        defaultValue="#22c55e"
                        className="w-12 h-10 p-1"
                      />
                      <div>
                        <p className="font-medium">Accent Color</p>
                        <p className="text-sm text-muted-foreground">#22c55e</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Custom CSS (Advanced)</Label>
                <Textarea
                  placeholder="/* Add custom CSS overrides here */"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure system notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Email Notifications</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Daily Summary Report</p>
                      <p className="text-sm text-muted-foreground">
                        Receive daily performance summary
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Queue Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Alert when queue exceeds threshold
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Campaign Completion</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when campaigns complete
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">System Maintenance</p>
                      <p className="text-sm text-muted-foreground">
                        Scheduled maintenance notifications
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Slack Integration</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input placeholder="https://hooks.slack.com/services/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Input defaultValue="#contact-center-alerts" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Settings
              </CardTitle>
              <CardDescription>
                Configure regulatory compliance and data protection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Recording Compliance</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Two-Party Consent</p>
                      <p className="text-sm text-muted-foreground">
                        Play recording disclosure to all parties
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">PCI-DSS Masking</p>
                      <p className="text-sm text-muted-foreground">
                        Pause recording during payment info
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">TCPA Compliance</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">DNC List Scrubbing</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically scrub against DNC lists
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Time Zone Restrictions</p>
                      <p className="text-sm text-muted-foreground">
                        Respect calling time restrictions
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label>Earliest Call Time</Label>
                    <Input type="time" defaultValue="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Latest Call Time</Label>
                    <Input type="time" defaultValue="21:00" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Data Retention</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Call Records Retention</Label>
                    <Select defaultValue="2years">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="2years">2 Years</SelectItem>
                        <SelectItem value="5years">5 Years</SelectItem>
                        <SelectItem value="7years">7 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recording Retention</Label>
                    <Select defaultValue="1year">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90days">90 Days</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="2years">2 Years</SelectItem>
                        <SelectItem value="5years">5 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
