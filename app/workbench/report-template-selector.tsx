'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, Download, Sparkles } from 'lucide-react';
import { REPORT_TEMPLATES, type ReportTemplate, type ReportSection } from '@/lib/utils/report-templates';
import confetti from 'canvas-confetti';

interface ReportTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: any;
  data: Record<string, any>[];
  columns: string[];
  sessionId?: string;
  sessionName?: string;
  onExport: (templateId: string, customOptions: any) => Promise<void>;
}

export function ReportTemplateSelector({
  open,
  onOpenChange,
  analysis,
  data,
  columns,
  sessionId,
  sessionName,
  onExport,
}: ReportTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customSections, setCustomSections] = useState<Record<string, boolean>>({});
  const [customOptions, setCustomOptions] = useState<any>({});
  const [isExporting, setIsExporting] = useState(false);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    
    // Initialize sections
    const sections: Record<string, boolean> = {};
    template.sections.forEach((section) => {
      sections[section.id] = section.enabled;
    });
    setCustomSections(sections);
    
    // Initialize options
    setCustomOptions(template.defaultOptions);
  };

  const toggleSection = (sectionId: string) => {
    setCustomSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleExport = async () => {
    if (!selectedTemplate) return;

    setIsExporting(true);
    try {
      const exportOptions = {
        ...customOptions,
        template: selectedTemplate,
        sections: customSections,
      };

      await onExport(selectedTemplate.id, exportOptions);

      // Celebrate!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74'],
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Generate Custom Report
          </DialogTitle>
          <DialogDescription>
            Choose a template and customize your report sections
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Choose Template</TabsTrigger>
            <TabsTrigger value="customize" disabled={!selectedTemplate}>
              Customize
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-220px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {REPORT_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                      selectedTemplate?.id === template.id
                        ? 'border-2 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-2 border-transparent'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{template.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {template.sections.map((section) => (
                            <Badge key={section.id} variant="secondary" className="text-xs">
                              {section.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="customize" className="flex-1 overflow-hidden">
            {selectedTemplate && (
              <ScrollArea className="h-[calc(90vh-220px)]">
                <div className="space-y-6 p-1">
                  {/* Selected Template Info */}
                  <Card className="p-4 bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{selectedTemplate.icon}</div>
                      <div>
                        <h3 className="font-semibold">{selectedTemplate.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedTemplate.description}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Sections */}
                  <div>
                    <h4 className="font-semibold mb-3">Report Sections</h4>
                    <div className="space-y-2">
                      {selectedTemplate.sections.map((section) => (
                        <Card key={section.id} className="p-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={section.id}
                              checked={customSections[section.id] !== false}
                              onCheckedChange={() => toggleSection(section.id)}
                              disabled={section.required}
                            />
                            <Label
                              htmlFor={section.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{section.name}</span>
                                {section.required && (
                                  <Badge variant="outline" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {section.type === 'summary' && 'Executive summary of findings'}
                                {section.type === 'statistics' && 'Dataset overview and metrics'}
                                {section.type === 'insights' && 'AI-generated insights and patterns'}
                                {section.type === 'data' && 'Raw data table'}
                                {section.type === 'charts' && 'Visual data representations'}
                                {section.type === 'recommendations' && 'Actionable next steps'}
                              </div>
                            </Label>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <h4 className="font-semibold mb-3">Report Options</h4>
                    <Card className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="format">Export Format</Label>
                          <Select
                            value={customOptions.format || 'pdf'}
                            onValueChange={(value) =>
                              setCustomOptions({ ...customOptions, format: value })
                            }
                          >
                            <SelectTrigger id="format">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF Document</SelectItem>
                              <SelectItem value="html">HTML Report</SelectItem>
                              <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="color-scheme">Color Scheme</Label>
                          <Select
                            value={customOptions.colorScheme || 'slate'}
                            onValueChange={(value) =>
                              setCustomOptions({ ...customOptions, colorScheme: value })
                            }
                          >
                            <SelectTrigger id="color-scheme">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slate">Slate Orange</SelectItem>
                              <SelectItem value="professional">Professional Blue</SelectItem>
                              <SelectItem value="corporate">Corporate Green</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-rows">Max Data Rows</Label>
                        <Select
                          value={String(customOptions.maxDataRows || 20)}
                          onValueChange={(value) =>
                            setCustomOptions({ ...customOptions, maxDataRows: Number(value) })
                          }
                        >
                          <SelectTrigger id="max-rows">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            <SelectItem value="10">10 rows</SelectItem>
                            <SelectItem value="20">20 rows</SelectItem>
                            <SelectItem value="50">50 rows</SelectItem>
                            <SelectItem value="100">100 rows</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedTemplate ? (
              <span>
                {Object.values(customSections).filter(Boolean).length} sections selected
              </span>
            ) : (
              <span>Select a template to continue</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={!selectedTemplate || isExporting}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
