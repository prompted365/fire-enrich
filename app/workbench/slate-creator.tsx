'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SlateCreatorProps {
  trigger?: React.ReactNode;
}

export function SlateCreator({ trigger }: SlateCreatorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [slateName, setSlateName] = useState('');
  const [columns, setColumns] = useState(['Column 1', 'Column 2', 'Column 3']);
  const [newColumnName, setNewColumnName] = useState('');

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      setColumns([...columns, newColumnName.trim()]);
      setNewColumnName('');
    }
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/slates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slateName || 'Untitled Slate',
          columns,
          rows: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create slate');
      }

      const result = await response.json();
      
      // Navigate to the workbench with the new session
      router.push(`/workbench?session=${result.sessionId}`);
      setOpen(false);
      
      // Reset form
      setSlateName('');
      setColumns(['Column 1', 'Column 2', 'Column 3']);
    } catch (error) {
      console.error('Error creating slate:', error);
      alert('Failed to create slate. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Slate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Create New Slate
          </DialogTitle>
          <DialogDescription>
            Start with a blank slate and build your dataset from scratch. Add columns and start enriching!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Slate Name */}
          <div className="space-y-2">
            <Label htmlFor="slate-name">Slate Name</Label>
            <Input
              id="slate-name"
              placeholder="e.g., Company Research Q4"
              value={slateName}
              onChange={(e) => setSlateName(e.target.value)}
            />
          </div>

          {/* Column Configuration */}
          <div className="space-y-3">
            <Label>Columns</Label>
            <div className="flex flex-wrap gap-2">
              {columns.map((column, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-2 pr-1 pl-3 py-1.5"
                >
                  {column}
                  <button
                    onClick={() => handleRemoveColumn(index)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="New column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddColumn();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddColumn}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
            <div className="text-sm font-medium mb-2">Preview</div>
            <div className="overflow-x-auto">
              <div className="inline-flex gap-2 min-w-full">
                {columns.map((column, index) => (
                  <div
                    key={index}
                    className="flex-1 min-w-[120px] p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium text-center"
                  >
                    {column}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              {columns.length} columns • Ready to start enriching
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || columns.length === 0}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isCreating ? 'Creating...' : 'Create Slate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
