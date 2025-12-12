"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CSVRow, EnrichmentField } from "@/lib/types";
import { detectEmailColumn, EMAIL_REGEX } from "@/lib/utils/email-detection";
import { generateVariableName } from "@/lib/utils/field-utils";
import { X, Plus, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AgentToggle } from "./agent-toggle";
import { SettingsPanel, EnrichmentSettings } from "./settings-panel";

interface UnifiedEnrichmentViewProps {
  rows: CSVRow[];
  columns: string[];
  onStartEnrichment: (primaryKeyColumn: string, fields: EnrichmentField[]) => void;
}

const PRESET_FIELDS: EnrichmentField[] = [
  { name: 'companyName', displayName: 'Company Name', description: 'The name of the company', type: 'string', required: false },
  { name: 'companyDescription', displayName: 'Company Description', description: 'A brief description of what the company does', type: 'string', required: false },
  { name: 'industry', displayName: 'Industry', description: 'The primary industry the company operates in', type: 'string', required: false },
  { name: 'employeeCount', displayName: 'Employee Count', description: 'The number of employees at the company', type: 'number', required: false },
  { name: 'yearFounded', displayName: 'Year Founded', description: 'The year the company was founded', type: 'number', required: false },
  { name: 'headquarters', displayName: 'Headquarters', description: 'The location of the company headquarters', type: 'string', required: false },
  { name: 'revenue', displayName: 'Revenue', description: 'The annual revenue of the company', type: 'string', required: false },
  { name: 'fundingRaised', displayName: 'Funding Raised', description: 'Total funding raised by the company', type: 'string', required: false },
  { name: 'fundingStage', displayName: 'Funding Stage', description: 'The current funding stage (e.g., Pre-seed, Seed, Series A, Series B, Series C, Series D+, IPO)', type: 'string', required: false },
];

export function UnifiedEnrichmentView({ rows, columns, onStartEnrichment }: UnifiedEnrichmentViewProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<EnrichmentField[]>([
    // Default selected fields (3 fields)
    PRESET_FIELDS.find(f => f.name === 'companyName')!,
    PRESET_FIELDS.find(f => f.name === 'companyDescription')!,
    PRESET_FIELDS.find(f => f.name === 'industry')!
  ]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showNaturalLanguage, setShowNaturalLanguage] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [suggestedFields, setSuggestedFields] = useState<EnrichmentField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [showEmailDropdownStep1, setShowEmailDropdownStep1] = useState(false);
  const [customField, setCustomField] = useState<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array';
  }>({
    name: '',
    description: '',
    type: 'string'
  });
  const [useAgents, setUseAgents] = useState(true);
  const [settings, setSettings] = useState<EnrichmentSettings>(() => {
    // Load settings from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enrichment_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
    }
    return {
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
      globalInstructions: 'Extract enrichment details using the primary key to identify each record.',
      rowContextMappings: {
        primary_key: 'Record Identifier',
        name: 'Name/Company',
      },
      columnInstructions: {},
      useDetailedPrompts: false,
      enableMetricsFeedback: true,
      enableMcpServer: false,
      maxConcurrentRequests: 3,
      confidenceThreshold: 0.7,
    };
  });

  // Auto-detect primary key column (email, name, company, or first column)
  useEffect(() => {
    if (rows && columns && Array.isArray(rows) && Array.isArray(columns)) {
      // Try email detection first
      const emailDetection = detectEmailColumn(rows, columns);
      if (emailDetection.columnName && emailDetection.confidence > 50) {
        setPrimaryKeyColumn(emailDetection.columnName);
      } else {
        // Fall back to common primary key column names
        const commonKeys = ['name', 'company', 'company_name', 'id', 'identifier'];
        const foundKey = columns.find(col => 
          commonKeys.some(key => col.toLowerCase().includes(key))
        );
        setPrimaryKeyColumn(foundKey || columns[0]);
      }
    }
  }, [rows, columns]);

  // Safety check for undefined props
  if (!rows || !columns || !Array.isArray(rows) || !Array.isArray(columns)) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No data available. Please upload a CSV file.</p>
      </div>
    );
  }

  const handleAddField = (field: EnrichmentField) => {
    if (selectedFields.length >= 10) {
      toast.error("Maximum 10 fields allowed");
      return;
    }
    if (!selectedFields.find(f => f.name === field.name)) {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleRemoveField = (fieldName: string) => {
    setSelectedFields(selectedFields.filter(f => f.name !== fieldName));
  };

  const handleGenerateFields = async () => {
    if (!naturalLanguageInput.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: naturalLanguageInput })
      });
      
      if (!response.ok) throw new Error('Failed to generate fields');
      
      const result = await response.json();
      
      // Convert API response format to frontend format
      if (result.success && result.data && result.data.fields) {
        const convertedFields = result.data.fields.map((field: { displayName: string; description: string; type: string }) => ({
          name: generateVariableName(field.displayName, selectedFields.map(f => f.name)),
          displayName: field.displayName,
          description: field.description,
          type: field.type === 'text' ? 'string' : field.type === 'array' ? 'string' : field.type as 'string' | 'number' | 'boolean' | 'array',
          required: false
        }));
        setSuggestedFields(convertedFields);
      } else {
        throw new Error('Invalid response format');
      }
      
      setShowNaturalLanguage(false);
      setNaturalLanguageInput('');
    } catch (error) {
      console.error('Error generating fields:', error);
      toast.error('Failed to generate fields. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCustomField = () => {
    if (!customField.name || !customField.description) {
      toast.error("Please fill in all fields");
      return;
    }
    
    const fieldName = generateVariableName(customField.name, selectedFields.map(f => f.name));
    const newField: EnrichmentField = {
      name: fieldName,
      displayName: customField.name,
      description: customField.description,
      type: customField.type,
      required: false
    };
    
    handleAddField(newField);
    setCustomField({ name: '', description: '', type: 'string' });
    setShowManualAdd(false);
  };

  const displayRows = showAllRows ? rows : rows.slice(0, 3);
  const maxVisibleFields = 5;
  const startFieldIndex = Math.max(0, selectedFields.length - maxVisibleFields);
  const visibleFields = selectedFields.slice(startFieldIndex);

  return (
    <div className="space-y-6">
      {/* Table Preview at the top */}
      <div className="w-full">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-orange-100">
                {/* All columns - highlight email column */}
                {columns.map((col, idx) => {
                  const isPrimaryKeyCol = col === primaryKeyColumn;
                  return (
                    <TableHead 
                      key={idx}
                      className={cn(
                        "transition-all duration-700 relative",
                        isPrimaryKeyCol
                          ? "sticky left-0 z-10 bg-orange-500 text-white font-bold email-column-glow"
                          : "bg-zinc-50 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                        !isPrimaryKeyCol && step >= 2 && "opacity-30"
                      )}
                    >
                      <span>{col}</span>
                    </TableHead>
                  );
                })}
                {/* Preview columns for selected fields */}
                {step >= 2 && visibleFields.map((field, idx) => (
                  <TableHead 
                    key={`new-${idx}`}
                    className={cn(
                      "font-semibold transition-all duration-700 bg-orange-50 text-orange-900 dark:bg-orange-950/20 dark:text-orange-400",
                      "animate-in fade-in slide-in-from-right-2"
                    )}
                    style={{
                      animationDelay: `${idx * 100}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">✨</span>
                      <span>{field.displayName}</span>
                    </div>
                  </TableHead>
                ))}
                {step >= 2 && selectedFields.length > maxVisibleFields && (
                  <TableHead className="text-center text-muted-foreground animate-in fade-in duration-700">
                    +{selectedFields.length - maxVisibleFields} more
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="group">
                  {/* All columns data - highlight primary key column */}
                  {columns.map((col, colIdx) => {
                    const isPrimaryKeyCol = col === primaryKeyColumn;
                    const cellValue = row[col] || '';
                    
                    if (isPrimaryKeyCol) {
                      const email = cellValue.trim();
                      const isValidEmail = email && EMAIL_REGEX.test(email);
                      return (
                        <TableCell 
                          key={colIdx}
                          className={cn(
                            "sticky left-0 z-10 bg-orange-50 transition-all duration-700",
                            "text-zinc-900 dark:bg-orange-950/20 dark:text-zinc-100",
                            rowIdx === displayRows.length - 1 && "email-column-rounded-bottom"
                          )}
                        >
                          <span className={cn(
                            "text-sm truncate block max-w-[200px] font-mono font-bold",
                            isValidEmail ? "text-zinc-900 dark:text-zinc-100" : email ? "text-red-600" : "text-muted-foreground"
                          )}>
                            {email || '-'}
                          </span>
                        </TableCell>
                      );
                    }
                    
                    return (
                      <TableCell 
                        key={colIdx}
                        className={cn(
                          "transition-all duration-700 bg-zinc-50/50 dark:bg-zinc-800/50",
                          step >= 2 && "opacity-30"
                        )}
                      >
                        <span className="text-sm truncate block max-w-[150px] text-muted-foreground">
                          {cellValue || '-'}
                        </span>
                      </TableCell>
                    );
                  })}
                  {/* Preview cells for selected fields */}
                  {step >= 2 && visibleFields.map((field, idx) => (
                    <TableCell 
                      key={`new-${idx}`}
                      className={cn(
                        "transition-all duration-700",
                        "animate-in fade-in slide-in-from-right-2"
                      )}
                      style={{
                        animationDelay: `${(idx * 100) + (rowIdx * 50)}ms`,
                        animationFillMode: 'backwards'
                      }}
                    >
                      <div className="h-5 rounded-full bg-gradient-to-r from-zinc-200 to-zinc-300 animate-pulse dark:from-zinc-700 dark:to-zinc-600" />
                    </TableCell>
                  ))}
                  {step >= 2 && selectedFields.length > maxVisibleFields && (
                    <TableCell className="text-center text-muted-foreground animate-in fade-in duration-700">
                      ...
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!showAllRows && rows.length > 3 && (
          <button
            onClick={() => setShowAllRows(true)}
            className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 mt-2 font-medium"
          >
            Show {rows.length - 3} more rows →
          </button>
        )}
        {showAllRows && (
          <button
            onClick={() => setShowAllRows(false)}
            className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 mt-2 font-medium"
          >
            Show less
          </button>
        )}
      </div>

      {/* Step content below */}
      <div className="w-full">
        {/* Step 1: Email column selection */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="p-5 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-[#36322F] dark:text-white">
                    {primaryKeyColumn ? 'Record Primary Key Detected:' : 'Select Record Primary Key:'}
                  </h3>
                  {primaryKeyColumn ? (
                    <>
                      <span className="font-mono text-sm bg-orange-100 px-3 py-1 rounded-full border border-orange-300 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400 font-medium">
                        {primaryKeyColumn}
                      </span>
                      {!showEmailDropdownStep1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEmailDropdownStep1(true)}
                          className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 px-2 py-1 h-auto"
                        >
                          Change
                        </Button>
                      )}
                      {showEmailDropdownStep1 && (
                        <Select value={primaryKeyColumn} onValueChange={(value) => {
                          setEmailColumn(value);
                          setShowEmailDropdownStep1(false);
                        }}>
                          <SelectTrigger className="w-48 bg-white border-orange-300 dark:bg-zinc-800 dark:border-orange-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-800">
                            {columns.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  ) : (
                    <Select value={primaryKeyColumn} onValueChange={(value) => setEmailColumn(value)}>
                      <SelectTrigger className="w-64 bg-white border-orange-300 dark:bg-zinc-800 dark:border-orange-700">
                        <SelectValue placeholder="Select primary key column" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-800">
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <Button 
                  variant="orange"
                  onClick={() => setStep(2)}
                  disabled={!primaryKeyColumn}
                  className="px-6"
                >
                  Next
                </Button>
              </div>
            </Card>

            {/* Skip List Warning */}
            {primaryKeyColumn && (() => {
              const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
              const skippableEmails = rows.filter(row => {
                const email = row[primaryKeyColumn]?.toLowerCase();
                if (!email) return false;
                const domain = email.split('@')[1];
                return domain && commonDomains.includes(domain);
              });
              
              if (skippableEmails.length === 0) return null;
              
              return (
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>{skippableEmails.length} emails</strong> from common providers (Gmail, Yahoo, etc.) will be automatically skipped to save API calls.
                    These are typically personal emails without company information.
                  </AlertDescription>
                </Alert>
              );
            })()}
          </div>
        )}

        {/* Primary Key Column info for step 2+ */}
        {step >= 2 && (
          <div className="mb-4 flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Record Primary Key:</span>
              <span className="font-mono text-sm bg-white px-3 py-1 rounded-full border border-orange-300 text-orange-700 dark:bg-zinc-800 dark:border-orange-700 dark:text-orange-400">
                {primaryKeyColumn}
              </span>
            </div>
            {!showEmailDropdown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmailDropdown(true)}
                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                Change
              </Button>
            )}
            {showEmailDropdown && (
              <Select value={primaryKeyColumn} onValueChange={(value) => {
                setEmailColumn(value);
                setShowEmailDropdown(false);
              }}>
                <SelectTrigger className="w-48 bg-white border-orange-300 dark:bg-zinc-800 dark:border-orange-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-800">
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Step 2: Field Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#36322F] dark:text-white">
                  Select fields to enrich ({selectedFields.length}/10)
                </h3>
                {/* Selected fields counter */}
                {selectedFields.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
              
              {/* Preset fields */}
              <div className="space-y-3 mb-6">
                <Label>Quick add fields</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_FIELDS.map((field) => {
                    const isSelected = selectedFields.find(f => f.name === field.name);
                    return (
                      <button
                        key={field.name}
                        disabled={selectedFields.length >= 10 && !isSelected}
                        onClick={() => isSelected ? handleRemoveField(field.name) : handleAddField(field)}
                        className={cn(
                          "px-2 py-1 text-xs rounded-full transition-all duration-200 font-medium",
                          isSelected 
                            ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100" 
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                          selectedFields.length >= 10 && !isSelected && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {field.displayName}
                          {isSelected && <X size={12} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add additional fields section */}
              <div className="border-t pt-6">
                <Label className="mb-4 block text-base font-semibold">Add additional fields</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Natural Language Card */}
                  <Card className="p-4 border-orange-200 hover:border-orange-300 transition-all duration-300 dark:border-orange-900/30 dark:hover:border-orange-800/50">
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 hover:bg-transparent"
                      onClick={() => setShowNaturalLanguage(!showNaturalLanguage)}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Sparkles size={18} className="text-orange-500" />
                        Add with natural language
                      </span>
                      {showNaturalLanguage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    
                    {showNaturalLanguage && (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          placeholder="Describe the fields you want to add (e.g., 'I need the CEO name, company mission statement, and main product categories')"
                          value={naturalLanguageInput}
                          onChange={(e) => setNaturalLanguageInput(e.target.value)}
                          rows={3}
                          className="border-orange-200 focus:border-orange-400 dark:border-orange-900/30 dark:focus:border-orange-700"
                        />
                        <Button 
                          onClick={handleGenerateFields}
                          disabled={!naturalLanguageInput.trim() || isGenerating}
                          variant="orange"
                          className="w-full"
                        >
                          {isGenerating ? "Generating..." : "Generate Fields"}
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Manual Add Card */}
                  <Card className="p-4 border-orange-200 hover:border-orange-300 transition-all duration-300 dark:border-orange-900/30 dark:hover:border-orange-800/50">
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 hover:bg-transparent"
                      onClick={() => setShowManualAdd(!showManualAdd)}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Plus size={18} className="text-orange-500" />
                        Add manually
                      </span>
                      {showManualAdd ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    
                    {showManualAdd && (
                      <div className="mt-4 space-y-3">
                        <Input
                          placeholder="Field name"
                          value={customField.name}
                          onChange={(e) => setCustomField({ ...customField, name: e.target.value })}
                          className="w-full border-orange-200 focus:border-orange-400 dark:border-orange-900/30 dark:focus:border-orange-700"
                        />
                        <Textarea
                          placeholder="Field description"
                          value={customField.description}
                          onChange={(e) => setCustomField({ ...customField, description: e.target.value })}
                          rows={2}
                          className="w-full border-orange-200 focus:border-orange-400 dark:border-orange-900/30 dark:focus:border-orange-700"
                        />
                        <Select 
                          value={customField.type} 
                          onValueChange={(value: 'string' | 'number' | 'boolean' | 'array') => 
                            setCustomField({ ...customField, type: value })
                          }
                        >
                          <SelectTrigger className="w-full border-orange-200 focus:border-orange-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="array">List</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleAddCustomField}
                          variant="orange"
                          className="w-full"
                        >
                          Add Field
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Suggested fields */}
              {suggestedFields.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Suggested fields</Label>
                  {suggestedFields.map((field, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{field.displayName}</p>
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="orange"
                            onClick={() => {
                              handleAddField(field);
                              setSuggestedFields(suggestedFields.filter((_, i) => i !== idx));
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            onClick={() => setSuggestedFields(suggestedFields.filter((_, i) => i !== idx))}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Agent and Settings Configuration */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20">
                  <AgentToggle
                    checked={useAgents && settings.useSpecializedAgents}
                    onCheckedChange={(checked) => {
                      setUseAgents(checked);
                      setSettings({ ...settings, useSpecializedAgents: checked });
                    }}
                    fields={selectedFields}
                  />
                  <SettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    fields={selectedFields}
                  />
                </div>
              </div>

              <Button 
                variant="orange"
                className="w-full mt-6 h-10 text-base" 
                onClick={() => onStartEnrichment(primaryKeyColumn, selectedFields)}
                disabled={selectedFields.length === 0}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Enrichment
                </span>
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}