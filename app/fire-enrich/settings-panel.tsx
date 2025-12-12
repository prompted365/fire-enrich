"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Zap, Brain, Code, Info } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface EnrichmentSettings {
  // Agent Settings
  useSpecializedAgents: boolean;
  enabledAgents: {
    company: boolean;
    funding: boolean;
    people: boolean;
    product: boolean;
    techStack: boolean;
    metrics: boolean;
    contact: boolean;
  };
  
  // Context Configuration
  globalInstructions: string;
  rowContextMappings: Record<string, string>;
  columnInstructions: Record<string, string>;
  
  // Advanced Options
  useDetailedPrompts: boolean;
  enableMetricsFeedback: boolean;
  enableMcpServer: boolean;
  maxConcurrentRequests: number;
  confidenceThreshold: number;
}

const DEFAULT_SETTINGS: EnrichmentSettings = {
  useSpecializedAgents: true,
  enabledAgents: {
    company: true,
    funding: true,
    people: true,
    product: true,
    techStack: true,
    metrics: true,
    contact: true,
  },
  globalInstructions: 'Extract lead enrichment details using email as the primary identifier.',
  rowContextMappings: {
    email: 'Email',
    name: 'Person Name',
  },
  columnInstructions: {},
  useDetailedPrompts: false,
  enableMetricsFeedback: true,
  enableMcpServer: false,
  maxConcurrentRequests: 3,
  confidenceThreshold: 0.7,
};

interface SettingsPanelProps {
  settings: EnrichmentSettings;
  onSettingsChange: (settings: EnrichmentSettings) => void;
  fields?: { name: string; description: string }[];
}

export function SettingsPanel({ settings, onSettingsChange, fields = [] }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<EnrichmentSettings>(settings);
  const [isOpen, setIsOpen] = useState(false);
  const [newMappingKey, setNewMappingKey] = useState('');
  const [newMappingValue, setNewMappingValue] = useState('');
  const [newInstructionField, setNewInstructionField] = useState('');
  const [newInstructionText, setNewInstructionText] = useState('');

  const handleSave = () => {
    onSettingsChange(localSettings);
    // Save to localStorage for persistence
    localStorage.setItem('enrichment_settings', JSON.stringify(localSettings));
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  const addRowMapping = () => {
    if (newMappingKey && newMappingValue) {
      setLocalSettings({
        ...localSettings,
        rowContextMappings: {
          ...localSettings.rowContextMappings,
          [newMappingKey]: newMappingValue,
        },
      });
      setNewMappingKey('');
      setNewMappingValue('');
    }
  };

  const removeRowMapping = (key: string) => {
    const { [key]: _, ...rest } = localSettings.rowContextMappings;
    setLocalSettings({
      ...localSettings,
      rowContextMappings: rest,
    });
  };

  const addColumnInstruction = () => {
    if (newInstructionField && newInstructionText) {
      setLocalSettings({
        ...localSettings,
        columnInstructions: {
          ...localSettings.columnInstructions,
          [newInstructionField]: newInstructionText,
        },
      });
      setNewInstructionField('');
      setNewInstructionText('');
    }
  };

  const removeColumnInstruction = (field: string) => {
    const { [field]: _, ...rest } = localSettings.columnInstructions;
    setLocalSettings({
      ...localSettings,
      columnInstructions: rest,
    });
  };

  const agentInfo = {
    company: { name: 'Company Research Agent', desc: 'Finds company name, description, industry, HQ location' },
    funding: { name: 'Fundraising Intelligence Agent', desc: 'Discovers funding rounds, investors, valuation data' },
    people: { name: 'People & Leadership Agent', desc: 'Identifies founders, CEOs, key executives' },
    product: { name: 'Product & Technology Agent', desc: 'Researches products, features, pricing models' },
    techStack: { name: 'Tech Stack Agent', desc: 'Detects technologies, frameworks, infrastructure' },
    metrics: { name: 'Metrics Agent', desc: 'Gathers employee count, revenue, growth metrics' },
    contact: { name: 'Contact & Social Agent', desc: 'Finds social media profiles, contact information' },
  };

  const enabledCount = Object.values(localSettings.enabledAgents).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
          {localSettings.useSpecializedAgents && (
            <Badge variant="secondary" className="ml-1">
              {enabledCount} agents
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ReconnAIssance Configuration
          </DialogTitle>
          <DialogDescription>
            Customize agent behavior, context mappings, and advanced enrichment settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agents" className="gap-2">
              <Brain className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="context" className="gap-2">
              <Code className="h-4 w-4" />
              Context
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Zap className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              Info
            </TabsTrigger>
          </TabsList>

          {/* AGENTS TAB */}
          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Specialized AI Agents</CardTitle>
                    <CardDescription>
                      Enable domain-specific agents for more accurate data extraction
                    </CardDescription>
                  </div>
                  <Switch
                    checked={localSettings.useSpecializedAgents}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, useSpecializedAgents: checked })
                    }
                  />
                </div>
              </CardHeader>
              {localSettings.useSpecializedAgents && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {Object.entries(agentInfo).map(([key, info]) => (
                      <div key={key} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="font-semibold text-sm">{info.name}</Label>
                            {localSettings.enabledAgents[key as keyof typeof localSettings.enabledAgents] && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{info.desc}</p>
                        </div>
                        <Switch
                          checked={localSettings.enabledAgents[key as keyof typeof localSettings.enabledAgents]}
                          onCheckedChange={(checked) =>
                            setLocalSettings({
                              ...localSettings,
                              enabledAgents: {
                                ...localSettings.enabledAgents,
                                [key]: checked,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* CONTEXT TAB */}
          <TabsContent value="context" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Global Instructions</CardTitle>
                <CardDescription>
                  Base instructions prepended to all AI prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={localSettings.globalInstructions}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, globalInstructions: e.target.value })
                  }
                  placeholder="Enter global instructions for AI agents..."
                  rows={3}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Row Context Mappings</CardTitle>
                <CardDescription>
                  Map CSV columns to context labels for better AI understanding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {Object.entries(localSettings.rowContextMappings).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 border rounded">
                      <code className="text-sm font-mono flex-1">{key}</code>
                      <span>→</span>
                      <span className="text-sm flex-1">{value}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRowMapping(key)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Column name (e.g., email)"
                    value={newMappingKey}
                    onChange={(e) => setNewMappingKey(e.target.value)}
                  />
                  <Input
                    placeholder="Context label (e.g., Email)"
                    value={newMappingValue}
                    onChange={(e) => setNewMappingValue(e.target.value)}
                  />
                </div>
                <Button onClick={addRowMapping} size="sm" className="w-full">
                  Add Mapping
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Field-Specific Instructions</CardTitle>
                <CardDescription>
                  Override instructions for specific enrichment fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {Object.entries(localSettings.columnInstructions).map(([field, instruction]) => (
                    <div key={field} className="p-2 border rounded space-y-1">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono font-semibold">{field}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeColumnInstruction(field)}
                        >
                          ×
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{instruction}</p>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Input
                    placeholder="Field name"
                    value={newInstructionField}
                    onChange={(e) => setNewInstructionField(e.target.value)}
                  />
                  <Textarea
                    placeholder="Specific instructions for this field..."
                    value={newInstructionText}
                    onChange={(e) => setNewInstructionText(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button onClick={addColumnInstruction} size="sm" className="w-full">
                  Add Field Instruction
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance & Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Detailed Prompts</Label>
                    <p className="text-sm text-muted-foreground">
                      Use longer, more detailed prompts for higher accuracy
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.useDetailedPrompts}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, useDetailedPrompts: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Metrics Feedback Loop</Label>
                    <p className="text-sm text-muted-foreground">
                      Adapt strategies based on enrichment metrics
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.enableMetricsFeedback}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, enableMetricsFeedback: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Max Concurrent Requests</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Number of rows to enrich simultaneously (1-10)
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={localSettings.maxConcurrentRequests}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        maxConcurrentRequests: parseInt(e.target.value) || 3,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Confidence Threshold</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Minimum confidence score to accept results (0.0 - 1.0)
                  </p>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={localSettings.confidenceThreshold}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        confidenceThreshold: parseFloat(e.target.value) || 0.7,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model Context Protocol (MCP)</CardTitle>
                <CardDescription>
                  Enable MCP server for external agent integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable MCP Server</Label>
                    <p className="text-sm text-muted-foreground">
                      Expose enrichment as MCP tools for other AI systems
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.enableMcpServer}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, enableMcpServer: checked })
                    }
                  />
                </div>
                {localSettings.enableMcpServer && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono">
                      MCP server will be available at <code>/api/mcp</code>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INFO TAB */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Architecture Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="agents">
                    <AccordionTrigger>Multi-Agent System</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>
                        ReconnAIssance uses specialized agents that coordinate to gather comprehensive data:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Each agent is an expert in a specific domain</li>
                        <li>Agents can hand off to each other for complex queries</li>
                        <li>Results are aggregated with confidence scores</li>
                        <li>Adaptive strategies based on previous enrichments</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="context">
                    <AccordionTrigger>Context Configuration</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>
                        Context controls how AI agents understand your data:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li><strong>Global Instructions:</strong> Applied to all enrichment requests</li>
                        <li><strong>Row Mappings:</strong> Help agents understand input columns</li>
                        <li><strong>Field Instructions:</strong> Custom guidance per enrichment field</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mcp">
                    <AccordionTrigger>Model Context Protocol</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>
                        MCP enables external AI systems to use ReconnAIssance as a tool:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Expose enrichment capabilities as MCP tools</li>
                        <li>Preview enrichment plans before execution</li>
                        <li>Integrate with Claude Desktop, IDEs, and custom agents</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
