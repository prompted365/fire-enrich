"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // For potential notes in future
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { Agency, AgencySettings, DailyActivity, DailyActivityData, AgencySettingsData } from '@/lib/services/db'; // Assuming these are exported

// --- Zod Schemas for Forms ---
const agencyFormSchema = z.object({
  name: z.string().min(2, "Agency name must be at least 2 characters"),
});

const activityFormSchema = z.object({
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  dials: z.coerce.number().int().min(0).optional().default(0),
  contacts: z.coerce.number().int().min(0).optional().default(0),
  transfers: z.coerce.number().int().min(0).optional().default(0),
  quoted_transfers: z.coerce.number().int().min(0).optional().default(0),
  failed_transfers: z.coerce.number().int().min(0).optional().default(0),
  sales_qty: z.coerce.number().int().min(0).optional().default(0),
  premium_sold: z.coerce.number().min(0).optional().default(0),
  marketing_spend: z.coerce.number().min(0).optional().default(0),
  lead_cost: z.coerce.number().min(0).optional().default(0),
});

const settingsFormSchema = z.object({
  new_business_comp_pct: z.coerce.number().min(0).max(100).optional().default(15.00),
  first_renewal_comp_pct: z.coerce.number().min(0).max(100).optional().default(10.00),
  renewal_comp_pct: z.coerce.number().min(0).max(100).optional().default(8.00),
  retention_rate_pct: z.coerce.number().min(0).max(100).optional().default(75.00),
});


export default function PandCDashboardPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings | null>(null);

  const [isLoadingAgencies, setIsLoadingAgencies] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const { register: registerAgency, handleSubmit: handleSubmitAgency, reset: resetAgencyForm, formState: { errors: agencyErrors } } = useForm<{ name: string }>({
    resolver: zodResolver(agencyFormSchema),
  });
  const { control: activityControl, handleSubmit: handleSubmitActivity, reset: resetActivityForm, formState: { errors: activityErrors } } = useForm<z.infer<typeof activityFormSchema>>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: { activity_date: new Date().toISOString().split('T')[0] }
  });
  const { control: settingsControl, handleSubmit: handleSubmitSettings, reset: resetSettingsForm, formState: { errors: settingsErrors }, setValue: setSettingsValue } = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
  });

  const fetchAgencies = useCallback(async () => {
    setIsLoadingAgencies(true);
    setError(null);
    try {
      const response = await fetch('/api/pandc/agencies');
      if (!response.ok) throw new Error('Failed to fetch agencies');
      const data = await response.json();
      setAgencies(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingAgencies(false);
    }
  }, []);

  const fetchActivities = useCallback(async (agencyId: string) => {
    if (!agencyId) return;
    setIsLoadingActivities(true);
    setError(null);
    try {
      const response = await fetch(`/api/pandc/activities?agencyId=${agencyId}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const fetchAgencySettings = useCallback(async (agencyId: string) => {
    if (!agencyId) return;
    setIsLoadingSettings(true);
    setError(null);
    try {
      const response = await fetch(`/api/pandc/agencies/${agencyId}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data: AgencySettings = await response.json();
      setAgencySettings(data);
      // Populate form with fetched settings
      setSettingsValue('new_business_comp_pct', data.new_business_comp_pct || 15.00);
      setSettingsValue('first_renewal_comp_pct', data.first_renewal_comp_pct || 10.00);
      setSettingsValue('renewal_comp_pct', data.renewal_comp_pct || 8.00);
      setSettingsValue('retention_rate_pct', data.retention_rate_pct || 75.00);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [setSettingsValue]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  useEffect(() => {
    if (selectedAgency) {
      fetchActivities(selectedAgency.id);
      fetchAgencySettings(selectedAgency.id);
    } else {
      setActivities([]);
      setAgencySettings(null);
    }
  }, [selectedAgency, fetchActivities, fetchAgencySettings]);

  const handleCreateAgency = async (data: { name: string }) => {
    setError(null);
    try {
      const response = await fetch('/api/pandc/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create agency');
      }
      await fetchAgencies(); // Refresh list
      resetAgencyForm();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogActivity = async (data: z.infer<typeof activityFormSchema>) => {
    if (!selectedAgency) {
      setError("Please select an agency first.");
      return;
    }
    setError(null);
    const activityPayload: DailyActivityData = {
        ...data,
        agency_id: selectedAgency.id,
    };
    try {
      const response = await fetch('/api/pandc/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityPayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to log activity');
      }
      await fetchActivities(selectedAgency.id); // Refresh list
      resetActivityForm({ activity_date: new Date().toISOString().split('T')[0] });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSaveSettings = async (data: z.infer<typeof settingsFormSchema>) => {
    if (!selectedAgency) {
      setError("Please select an agency first.");
      return;
    }
    setError(null);
    const settingsPayload: Omit<AgencySettingsData, 'agency_id'> = data;
    try {
      const response = await fetch(`/api/pandc/agencies/${selectedAgency.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }
      await fetchAgencySettings(selectedAgency.id); // Refresh settings
      alert("Settings saved successfully!");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAgencySelect = (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    setSelectedAgency(agency || null);
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">P&C Insurance Dashboard (MVP)</h1>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      {/* Agency Creation and Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Agencies</CardTitle>
          <CardDescription>Manage and select insurance agencies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmitAgency(handleCreateAgency)} className="flex items-end space-x-2">
            <div className="flex-grow">
              <Label htmlFor="agencyName">New Agency Name</Label>
              <Input id="agencyName" {...registerAgency("name")} placeholder="Enter agency name" />
              {agencyErrors.name && <p className="text-sm text-red-500">{agencyErrors.name.message}</p>}
            </div>
            <Button type="submit">Create Agency</Button>
          </form>

          <div>
            <Label htmlFor="selectAgency">Select Agency</Label>
            <Select onValueChange={handleAgencySelect} value={selectedAgency?.id || ""}>
              <SelectTrigger id="selectAgency">
                <SelectValue placeholder="Select an agency" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingAgencies ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                  agencies.map(agency => (
                    <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAgency && (
        <>
          {/* Agency Settings */}
           <Card>
            <CardHeader>
              <CardTitle>Agency Settings: {selectedAgency.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? <p>Loading settings...</p> :
              <form onSubmit={handleSubmitSettings(handleSaveSettings)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new_business_comp_pct">New Business Comp %</Label>
                    <Controller name="new_business_comp_pct" control={settingsControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {settingsErrors.new_business_comp_pct && <p className="text-sm text-red-500">{settingsErrors.new_business_comp_pct.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="first_renewal_comp_pct">1st Renewal Comp %</Label>
                    <Controller name="first_renewal_comp_pct" control={settingsControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {settingsErrors.first_renewal_comp_pct && <p className="text-sm text-red-500">{settingsErrors.first_renewal_comp_pct.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="renewal_comp_pct">2nd+ Renewal Comp %</Label>
                    <Controller name="renewal_comp_pct" control={settingsControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {settingsErrors.renewal_comp_pct && <p className="text-sm text-red-500">{settingsErrors.renewal_comp_pct.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="retention_rate_pct">Retention Rate %</Label>
                    <Controller name="retention_rate_pct" control={settingsControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {settingsErrors.retention_rate_pct && <p className="text-sm text-red-500">{settingsErrors.retention_rate_pct.message}</p>}
                  </div>
                </div>
                <Button type="submit">Save Settings</Button>
              </form>
              }
            </CardContent>
           </Card>

          {/* Daily Activity Logging */}
          <Card>
            <CardHeader>
              <CardTitle>Log Daily Activity for {selectedAgency.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitActivity(handleLogActivity)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="activity_date">Activity Date</Label>
                    <Controller name="activity_date" control={activityControl} render={({ field }) => <Input type="date" {...field} />} />
                    {activityErrors.activity_date && <p className="text-sm text-red-500">{activityErrors.activity_date.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="dials">Dials</Label>
                    <Controller name="dials" control={activityControl} render={({ field }) => <Input type="number" {...field} />} />
                    {activityErrors.dials && <p className="text-sm text-red-500">{activityErrors.dials.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contacts">Contacts</Label>
                    <Controller name="contacts" control={activityControl} render={({ field }) => <Input type="number" {...field} />} />
                     {activityErrors.contacts && <p className="text-sm text-red-500">{activityErrors.contacts.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="transfers">Transfers</Label>
                    <Controller name="transfers" control={activityControl} render={({ field }) => <Input type="number" {...field} />} />
                    {activityErrors.transfers && <p className="text-sm text-red-500">{activityErrors.transfers.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="quoted_transfers">Quoted Transfers</Label>
                    <Controller name="quoted_transfers" control={activityControl} render={({ field }) => <Input type="number" {...field} />} />
                    {activityErrors.quoted_transfers && <p className="text-sm text-red-500">{activityErrors.quoted_transfers.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="failed_transfers">Failed Transfers</Label>
                    <Controller name="failed_transfers" control={activityControl} render={({ field }) => <Input type="number" {...field} />} />
                    {activityErrors.failed_transfers && <p className="text-sm text-red-500">{activityErrors.failed_transfers.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="sales_qty">Sales Quantity</Label>
                    <Controller name="sales_qty" control={activityControl} render={({ field }) => <Input type="number" {...field} />} />
                    {activityErrors.sales_qty && <p className="text-sm text-red-500">{activityErrors.sales_qty.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="premium_sold">Premium Sold ($)</Label>
                    <Controller name="premium_sold" control={activityControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {activityErrors.premium_sold && <p className="text-sm text-red-500">{activityErrors.premium_sold.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="marketing_spend">Marketing Spend ($)</Label>
                    <Controller name="marketing_spend" control={activityControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {activityErrors.marketing_spend && <p className="text-sm text-red-500">{activityErrors.marketing_spend.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lead_cost">Lead Cost ($)</Label>
                    <Controller name="lead_cost" control={activityControl} render={({ field }) => <Input type="number" step="0.01" {...field} />} />
                    {activityErrors.lead_cost && <p className="text-sm text-red-500">{activityErrors.lead_cost.message}</p>}
                  </div>
                </div>
                <Button type="submit">Log Activity</Button>
              </form>
            </CardContent>
          </Card>

          {/* Activity Display */}
          <Card>
            <CardHeader>
              <CardTitle>Logged Activities for {selectedAgency.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivities ? <p>Loading activities...</p> :
                activities.length === 0 ? <p>No activities logged yet for this agency.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dials</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Transfers</TableHead>
                      <TableHead>Quoted</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Premium ($)</TableHead>
                      <TableHead>Mkt Spend ($)</TableHead>
                      <TableHead>Lead Cost ($)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map(activity => (
                      <TableRow key={activity.id}>
                        <TableCell>{new Date(activity.activity_date).toLocaleDateString()}</TableCell>
                        <TableCell>{activity.dials}</TableCell>
                        <TableCell>{activity.contacts}</TableCell>
                        <TableCell>{activity.transfers}</TableCell>
                        <TableCell>{activity.quoted_transfers}</TableCell>
                        <TableCell>{activity.failed_transfers}</TableCell>
                        <TableCell>{activity.sales_qty}</TableCell>
                        <TableCell>{activity.premium_sold?.toFixed(2)}</TableCell>
                        <TableCell>{activity.marketing_spend?.toFixed(2)}</TableCell>
                        <TableCell>{activity.lead_cost?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
