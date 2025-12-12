"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Zap, Clock, TestTube, Code, Plus, Trash2, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export interface EnrichmentRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'manual' | 'auto' | 'scheduled' | 'onChange';
  conditions: RuleCondition[];
  targetFields: string[];
  agentMapping: Record<string, string>; // field -> agent
  promptTemplate?: string;
  schedule?: {
    interval: number;
    unit: 'minutes' | 'hours' | 'days';
  };
}

export interface RuleCondition {
  type: 'cellFilled' | 'cellEmpty' | 'cellEquals' | 'rowComplete' | 'custom';
  column?: string;
  value?: string;
  expression?: string;
}

interface EnrichmentOrchestratorProps {
  sessionId: string;
  columns: string[];
  enrichmentFields: string[];
  onEnrich: (rules: EnrichmentRule[], selectedRows?: number[]) => void;
}

const DEFAULT_RULE: EnrichmentRule = {
  id: '1',
  name: 'Auto-enrich on email',
  enabled: true,
  trigger: 'onChange',
  conditions: [
    {
      type: 'cellFilled',
      column: 'email',
    }
  ],
  targetFields: [],
  agentMapping: {},
};

export function EnrichmentOrchestrator({ 
  sessionId, 
  columns, 
  enrichmentFields,
  onEnrich 
}: EnrichmentOrchestratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rules, setRules] = useState<EnrichmentRule[]>([DEFAULT_RULE]);
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "test">("manual");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [promptVersions, setPromptVersions] = useState<{ id: string; name: string; template: string }[]>([
    { id: '1', name: 'Default', template: 'Extract {{field}} for {{email}}' },
  ]);

  // Agent mapping for specialized agents
  const agentOptions = [
    { value: 'company', label: 'Company Research Agent' },
    { value: 'funding', label: 'Fundraising Agent' },
    { value: 'people', label: 'People & Leadership Agent' },
    { value: 'product', label: 'Product & Tech Agent' },
    { value: 'techStack', label: 'Tech Stack Agent' },
    { value: 'metrics', label: 'Metrics Agent' },
    { value: 'contact', label: 'Contact & Social Agent' },
    { value: 'general', label: 'General Agent' },
  ];

  const handleManualRun = () => {
    const manualRule: EnrichmentRule = {
      id: 'manual-run',
      name: 'Manual Run',
      enabled: true,
      trigger: 'manual',
      conditions: [],
      targetFields: enrichmentFields,
      agentMapping: {},
    };
    onEnrich([manualRule], selectedRows.length > 0 ? selectedRows : undefined);
    toast.success(`Starting enrichment${selectedRows.length > 0 ? ` for ${selectedRows.length} rows` : ''}`);
    setIsOpen(false);
  };

  const handleTestRun = () => {
    toast.info("Running test enrichment on sample data...");
    // TODO: Implement test run with first 3 rows
  };

  const handleSaveRules = () => {
    localStorage.setItem(`enrichment_rules_${sessionId}`, JSON.stringify(rules));
    toast.success("Enrichment rules saved");
    setIsOpen(false);
  };

  const addRule = () => {
    const newRule: EnrichmentRule = {
      id: Date.now().toString(),
      name: `Rule ${rules.length + 1}`,
      enabled: true,
      trigger: 'onChange',
      conditions: [],
      targetFields: [],
      agentMapping: {},
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<EnrichmentRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const addCondition = (ruleId: string) => {
    updateRule(ruleId, {
      conditions: [
        ...(rules.find(r => r.id === ruleId)?.conditions || []),
        { type: 'cellFilled' }
      ]
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Zap className="h-4 w-4" />
          Enrichment Controls
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Enrichment Orchestrator
          </DialogTitle>
          <DialogDescription>
            Configure how and when enrichment runs: manual triggers, automation rules, agent mappings, and cell references
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <Play className="h-4 w-4" />
              Manual Run
            </TabsTrigger>
            <TabsTrigger value="auto" className="gap-2">
              <Clock className="h-4 w-4" />
              Automation Rules
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2">
              <TestTube className="h-4 w-4" />
              Test & Debug
            </TabsTrigger>
          </TabsList>

          {/* MANUAL RUN TAB */}
          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Run Enrichment Now</CardTitle>
                <CardDescription>
                  Manually trigger enrichment for selected rows or all rows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Fields ({enrichmentFields.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {enrichmentFields.map(field => (
                      <Badge key={field} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Row Selection</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="all-rows"
                        name="row-selection"
                        checked={selectedRows.length === 0}
                        onChange={() => setSelectedRows([])}
                      />
                      <label htmlFor="all-rows">All rows</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="selected-rows"
                        name="row-selection"
                        checked={selectedRows.length > 0}
                        onChange={() => {}}
                      />
                      <label htmlFor="selected-rows">
                        Selected rows ({selectedRows.length})
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Agent Assignment</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Map specific agents to fields (optional - uses smart routing if not set)
                  </p>
                  {enrichmentFields.slice(0, 3).map(field => (
                    <div key={field} className="flex items-center gap-2">
                      <span className="text-sm font-mono w-40 truncate">{field}</span>
                      <span>→</span>
                      <Select defaultValue="auto">
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-assign</SelectItem>
                          {agentOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {enrichmentFields.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{enrichmentFields.length - 3} more fields
                    </p>
                  )}
                </div>

                <Button onClick={handleManualRun} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Run Enrichment Now
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUTOMATION RULES TAB */}
          <TabsContent value="auto" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Automation Rules</CardTitle>
                    <CardDescription>
                      Set up triggers and conditions for automatic enrichment
                    </CardDescription>
                  </div>
                  <Button onClick={addRule} size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {rules.map((rule) => (
                    <AccordionItem key={rule.id} value={rule.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>{rule.name}</span>
                          <Badge variant={rule.trigger === 'manual' ? 'secondary' : 'default'}>
                            {rule.trigger}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        {/* Rule Name */}
                        <div className="space-y-2">
                          <Label>Rule Name</Label>
                          <Input
                            value={rule.name}
                            onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                          />
                        </div>

                        {/* Trigger Type */}
                        <div className="space-y-2">
                          <Label>Trigger Type</Label>
                          <Select
                            value={rule.trigger}
                            onValueChange={(value) => updateRule(rule.id, { trigger: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual only</SelectItem>
                              <SelectItem value="auto">Auto on load</SelectItem>
                              <SelectItem value="onChange">On cell change</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Schedule Config */}
                        {rule.trigger === 'scheduled' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label>Interval</Label>
                              <Input
                                type="number"
                                placeholder="15"
                                value={rule.schedule?.interval || ''}
                                onChange={(e) => updateRule(rule.id, {
                                  schedule: {
                                    interval: parseInt(e.target.value) || 15,
                                    unit: rule.schedule?.unit || 'minutes'
                                  }
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit</Label>
                              <Select
                                value={rule.schedule?.unit || 'minutes'}
                                onValueChange={(value) => updateRule(rule.id, {
                                  schedule: {
                                    interval: rule.schedule?.interval || 15,
                                    unit: value as any
                                  }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="minutes">Minutes</SelectItem>
                                  <SelectItem value="hours">Hours</SelectItem>
                                  <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Conditions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Conditions</Label>
                            <Button
                              onClick={() => addCondition(rule.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {rule.conditions.map((condition, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                              <Select value={condition.type}>
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cellFilled">Cell is filled</SelectItem>
                                  <SelectItem value="cellEmpty">Cell is empty</SelectItem>
                                  <SelectItem value="cellEquals">Cell equals</SelectItem>
                                  <SelectItem value="rowComplete">Row complete</SelectItem>
                                  <SelectItem value="custom">Custom expression</SelectItem>
                                </SelectContent>
                              </Select>
                              {condition.type !== 'rowComplete' && (
                                <Select value={condition.column || ''}>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {columns.map(col => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Button
                                onClick={() => {
                                  const newConditions = rule.conditions.filter((_, i) => i !== idx);
                                  updateRule(rule.id, { conditions: newConditions });
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {rule.conditions.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              No conditions - rule applies to all rows
                            </p>
                          )}
                        </div>

                        {/* Prompt Template */}
                        <div className="space-y-2">
                          <Label>Prompt Template (Mustache variables)</Label>
                          <Textarea
                            placeholder="Extract {{field}} for company at {{email}} in {{industry}}"
                            value={rule.promptTemplate || ''}
                            onChange={(e) => updateRule(rule.id, { promptTemplate: e.target.value })}
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground">
                            Use {'{{column_name}}'} to reference other cells in the same row
                          </p>
                        </div>

                        <Button
                          onClick={() => deleteRule(rule.id)}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Rule
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEST & DEBUG TAB */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test & Debug Enrichment</CardTitle>
                <CardDescription>
                  Run enrichment on sample data to test prompts and agent behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label>Test Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Run on first 3 rows without saving results
                    </p>
                  </div>
                  <Switch checked={testMode} onCheckedChange={setTestMode} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Prompt Versions</Label>
                  <div className="space-y-2">
                    {promptVersions.map(version => (
                      <div key={version.id} className="p-3 border rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{version.name}</span>
                          <Badge>v{version.id}</Badge>
                        </div>
                        <code className="text-xs block p-2 bg-muted rounded">
                          {version.template}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleTestRun} className="w-full" variant="outline">
                  <TestTube className="h-4 w-4 mr-2" />
                  Run Test Enrichment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cell Reference Preview</CardTitle>
                <CardDescription>
                  See how mustache variables will be resolved for each row
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <code className="block p-2 bg-muted rounded text-xs">
                    Extract data for {'{{email}}'} at {'{{companyName}}'} in {'{{industry}}'}
                  </code>
                  <Separator className="my-2" />
                  <Label>Sample Resolution (Row 1)</Label>
                  <code className="block p-2 bg-muted rounded text-xs">
                    Extract data for ben@example.com at Acme Corp in Technology
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveRules}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
