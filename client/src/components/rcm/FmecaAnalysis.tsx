import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { Component } from '@shared/rcm-schema';

// Interface for FMECA entry
interface FmecaEntry {
  id?: number;
  componentId: number;
  component?: string;
  function?: string;
  failureMode: string;
  failureCause: string;
  localEffect: string;
  systemEffect: string;
  endEffect: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  criticality: 'High' | 'Medium' | 'Low';
  recommendedActions: string;
}

// Form for adding/editing FMECA entries
interface FmecaFormProps {
  defaultValues?: FmecaEntry;
  components: Component[];
  onSubmit: (data: FmecaEntry) => void;
  isSubmitting: boolean;
}

const FmecaForm: React.FC<FmecaFormProps> = ({
  defaultValues,
  components,
  onSubmit,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<FmecaEntry>(
    defaultValues || {
      componentId: 0,
      failureMode: '',
      failureCause: '',
      localEffect: '',
      systemEffect: '',
      endEffect: '',
      severity: 5,
      occurrence: 5,
      detection: 5,
      rpn: 125, // Default calculated value
      criticality: 'Medium',
      recommendedActions: ''
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      
      // If any of the RPN factors changed, recalculate RPN
      if (['severity', 'occurrence', 'detection'].includes(name)) {
        const severity = name === 'severity' ? parseInt(value) : prev.severity;
        const occurrence = name === 'occurrence' ? parseInt(value) : prev.occurrence;
        const detection = name === 'detection' ? parseInt(value) : prev.detection;
        
        const rpn = severity * occurrence * detection;
        
        // Automatically determine criticality based on RPN
        let criticality: 'High' | 'Medium' | 'Low' = 'Medium';
        if (rpn > 200 || severity >= 9) {
          criticality = 'High';
        } else if (rpn < 80 && severity < 7) {
          criticality = 'Low';
        }
        
        return { ...updatedData, rpn, criticality };
      }
      
      return updatedData;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'componentId') {
      // When component changes, update both the componentId and function
      const componentId = parseInt(value);
      const selectedComponent = components.find(c => c.id === componentId);
      
      setFormData(prev => ({
        ...prev,
        componentId,
        function: selectedComponent?.function || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Helper function to get badge variant based on value
  const getSeverityBadgeVariant = (value: number) => {
    if (value >= 8) return 'destructive';
    if (value >= 5) return 'default';
    return 'secondary';
  };

  // Helper function to get criticality from RPN
  const getCriticality = (rpn: number, severity: number): 'High' | 'Medium' | 'Low' => {
    if (rpn > 200 || severity >= 9) return 'High';
    if (rpn < 80 && severity < 7) return 'Low';
    return 'Medium';
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="componentId">Component</Label>
          <Select
            value={formData.componentId.toString()}
            onValueChange={(value) => handleSelectChange('componentId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a component" />
            </SelectTrigger>
            <SelectContent>
              {components.map((component) => (
                <SelectItem key={component.id} value={component.id.toString()}>
                  {component.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="function">Function</Label>
          <Textarea
            id="function"
            name="function"
            value={formData.function || ''}
            onChange={handleChange}
            readOnly // Function is determined by the selected component
            className="h-20 bg-muted"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="failureMode">Failure Mode</Label>
          <Input
            id="failureMode"
            name="failureMode"
            value={formData.failureMode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="failureCause">Failure Cause</Label>
          <Input
            id="failureCause"
            name="failureCause"
            value={formData.failureCause}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="localEffect">Local Effect</Label>
            <Input
              id="localEffect"
              name="localEffect"
              value={formData.localEffect}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="systemEffect">System Effect</Label>
            <Input
              id="systemEffect"
              name="systemEffect"
              value={formData.systemEffect}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endEffect">End Effect</Label>
            <Input
              id="endEffect"
              name="endEffect"
              value={formData.endEffect}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="severity">
              Severity (1-10)
              <Badge className="ml-2" variant={getSeverityBadgeVariant(formData.severity)}>
                {formData.severity}
              </Badge>
            </Label>
            <Input
              id="severity"
              name="severity"
              type="number"
              min={1}
              max={10}
              value={formData.severity}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-muted-foreground">1 (minor) to 10 (catastrophic)</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="occurrence">
              Occurrence (1-10)
              <Badge className="ml-2" variant={formData.occurrence >= 7 ? 'destructive' : 'secondary'}>
                {formData.occurrence}
              </Badge>
            </Label>
            <Input
              id="occurrence"
              name="occurrence"
              type="number"
              min={1}
              max={10}
              value={formData.occurrence}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-muted-foreground">1 (unlikely) to 10 (frequent)</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="detection">
              Detection (1-10)
              <Badge className="ml-2" variant={formData.detection >= 7 ? 'destructive' : 'secondary'}>
                {formData.detection}
              </Badge>
            </Label>
            <Input
              id="detection"
              name="detection"
              type="number"
              min={1}
              max={10}
              value={formData.detection}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-muted-foreground">1 (easily detected) to 10 (undetectable)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rpn">Risk Priority Number (RPN)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rpn"
                name="rpn"
                value={formData.rpn}
                readOnly
                className="bg-muted"
              />
              <Badge variant={
                formData.rpn > 200 ? 'destructive' : 
                formData.rpn > 80 ? 'default' : 
                'secondary'
              }>
                {formData.criticality}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              RPN = Severity × Occurrence × Detection
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="criticality">Criticality</Label>
            <Select
              value={formData.criticality}
              onValueChange={(value) => handleSelectChange('criticality', value)}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-calculated, but can be manually adjusted
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="recommendedActions">Recommended Actions</Label>
          <Textarea
            id="recommendedActions"
            name="recommendedActions"
            value={formData.recommendedActions}
            onChange={handleChange}
            className="h-20"
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? 'Update FMECA Entry' : 'Create FMECA Entry'}
        </Button>
      </DialogFooter>
    </form>
  );
};

interface FmecaAnalysisProps {
  systemId?: number;
}

const FmecaAnalysis: React.FC<FmecaAnalysisProps> = ({ systemId }) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FmecaEntry | null>(null);

  // Fetch components for the selected system
  const { data: components, isLoading: isLoadingComponents } = useQuery({
    queryKey: [systemId ? `/api/rcm/components?systemId=${systemId}` : ''],
    queryFn: ({ signal }) => 
      systemId
        ? fetch(`/api/rcm/components?systemId=${systemId}`, { signal })
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch components');
              return res.json();
            })
        : Promise.resolve([]),
    enabled: !!systemId,
  });

  // Fetch FMECA entries for the selected system
  const fmecaQueryUrl = systemId ? `/api/rcm/fmeca?systemId=${systemId}` : '';
  const { data: fmecaEntries, isLoading: isLoadingFmeca } = useQuery({
    queryKey: [fmecaQueryUrl],
    queryFn: ({ signal }) => 
      systemId
        ? fetch(fmecaQueryUrl, { signal })
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch FMECA entries');
              return res.json();
            })
        : Promise.resolve([]),
    enabled: !!systemId,
  });

  // Create FMECA entry mutation
  const createFmecaMutation = useMutation({
    mutationFn: (newFmeca: FmecaEntry) => 
      fetch('/api/rcm/fmeca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFmeca),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create FMECA entry');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [fmecaQueryUrl] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "FMECA entry created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create FMECA entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update FMECA entry mutation
  const updateFmecaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FmecaEntry }) => 
      fetch(`/api/rcm/fmeca/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update FMECA entry');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [fmecaQueryUrl] });
      setEditingEntry(null);
      toast({
        title: "Success",
        description: "FMECA entry updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update FMECA entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete FMECA entry mutation
  const deleteFmecaMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/rcm/fmeca/${id}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete FMECA entry');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [fmecaQueryUrl] });
      toast({
        title: "Success",
        description: "FMECA entry deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete FMECA entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: FmecaEntry) => {
    createFmecaMutation.mutate(data);
  };

  const handleUpdateSubmit = (data: FmecaEntry) => {
    if (editingEntry?.id) {
      updateFmecaMutation.mutate({
        id: editingEntry.id,
        data,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this FMECA entry? This action cannot be undone.')) {
      deleteFmecaMutation.mutate(id);
    }
  };

  const getComponentName = (componentId: number) => {
    const component = components?.find((c: { id: number }) => c.id === componentId);
    return component ? component.name : 'Unknown Component';
  };

  const getCriticalityBadgeVariant = (criticality: string) => {
    switch (criticality) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!systemId) {
    return (
      <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-800 text-sm">
        <AlertTriangle className="h-4 w-4 inline-block mr-2" />
        Please select a system from the Systems tab first to perform FMECA analysis.
      </div>
    );
  }

  if (isLoadingComponents || isLoadingFmeca) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!components || components.length === 0) {
    return (
      <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-800 text-sm">
        <AlertTriangle className="h-4 w-4 inline-block mr-2" />
        No components found for this system. Please create components in the Components tab first.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>FMECA Analysis</CardTitle>
        <CardDescription>
          Failure Mode, Effects, and Criticality Analysis for the selected system. 
          Identify and prioritize potential failure modes based on severity, occurrence, and detection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add FMECA Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New FMECA Entry</DialogTitle>
                <DialogDescription>
                  Add a new Failure Mode, Effects, and Criticality Analysis entry. Fill in all the required fields.
                </DialogDescription>
              </DialogHeader>
              <FmecaForm 
                components={components || []}
                onSubmit={handleCreateSubmit} 
                isSubmitting={createFmecaMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableCaption>FMECA Worksheet</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Failure Mode</TableHead>
                <TableHead>Failure Cause</TableHead>
                <TableHead>System Effect</TableHead>
                <TableHead className="text-center">S</TableHead>
                <TableHead className="text-center">O</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">RPN</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fmecaEntries && fmecaEntries.length > 0 ? (
                fmecaEntries.map((entry: FmecaEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{getComponentName(entry.componentId)}</TableCell>
                    <TableCell>{entry.failureMode}</TableCell>
                    <TableCell>{entry.failureCause}</TableCell>
                    <TableCell>{entry.systemEffect}</TableCell>
                    <TableCell className="text-center">{entry.severity}</TableCell>
                    <TableCell className="text-center">{entry.occurrence}</TableCell>
                    <TableCell className="text-center">{entry.detection}</TableCell>
                    <TableCell className="text-center font-semibold">{entry.rpn}</TableCell>
                    <TableCell>
                      <Badge variant={getCriticalityBadgeVariant(entry.criticality)}>
                        {entry.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Dialog open={editingEntry?.id === entry.id} onOpenChange={(open) => !open && setEditingEntry(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Edit FMECA Entry</DialogTitle>
                              <DialogDescription>
                                Update the information for this FMECA entry.
                              </DialogDescription>
                            </DialogHeader>
                            {editingEntry && (
                              <FmecaForm 
                                defaultValues={editingEntry} 
                                components={components || []}
                                onSubmit={handleUpdateSubmit} 
                                isSubmitting={updateFmecaMutation.isPending} 
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => entry.id && handleDelete(entry.id)}
                          disabled={deleteFmecaMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No FMECA entries found. Create your first entry to start analyzing failure modes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {fmecaEntries && fmecaEntries.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">FMECA Summary</h3>
            <div className="p-4 border rounded-md bg-muted">
              <h4 className="font-medium mb-2">Critical Failure Modes:</h4>
              <ul className="list-disc list-inside space-y-1 mb-4">
                {fmecaEntries
                  .filter((entry: FmecaEntry) => entry.criticality === 'High')
                  .map((entry: FmecaEntry) => (
                    <li key={entry.id} className="ml-2">
                      {getComponentName(entry.componentId)} - {entry.failureMode} (RPN = {entry.rpn})
                    </li>
                  ))}
                {!fmecaEntries.some((entry: FmecaEntry) => entry.criticality === 'High') && (
                  <li className="text-muted-foreground ml-2">No critical failure modes identified</li>
                )}
              </ul>
              
              <h4 className="font-medium mb-2">Key Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1">
                {fmecaEntries
                  .sort((a: FmecaEntry, b: FmecaEntry) => b.rpn - a.rpn)
                  .slice(0, 3)
                  .map((entry: FmecaEntry) => (
                    <li key={entry.id} className="ml-2">
                      {entry.recommendedActions}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FmecaAnalysis;