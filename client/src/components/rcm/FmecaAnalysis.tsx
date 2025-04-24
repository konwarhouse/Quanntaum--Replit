import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose 
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
import { Loader2, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Interface for the form data
interface FmecaFormData {
  componentId: number;
  failureMode: string;
  failureCause: string;
  localEffect: string;
  systemEffect: string;
  endEffect: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  criticality: string;
  recommendedActions: string;
}

// Empty form for new entries
const emptyForm: FmecaFormData = {
  componentId: 0,
  failureMode: '',
  failureCause: '',
  localEffect: '',
  systemEffect: '',
  endEffect: '',
  severity: 5,
  occurrence: 5,
  detection: 5,
  rpn: 125, // Default (5×5×5)
  criticality: 'Medium',
  recommendedActions: '',
};

// FMECA Entry component properties
interface FmecaAnalysisProps {
  systemId?: number;
}

const FmecaAnalysis: React.FC<FmecaAnalysisProps> = ({ systemId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<FmecaFormData>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);

  // Get system components
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ['/api/rcm/components', systemId],
    queryFn: ({ signal }) => 
      fetch(`/api/rcm/components?systemId=${systemId}`, { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch components');
          return res.json();
        }),
    enabled: !!systemId,
  });

  // Get FMECA entries for this system
  const { 
    data: fmecaEntries, 
    isLoading: entriesLoading, 
    error: entriesError 
  } = useQuery({
    queryKey: ['/api/rcm/fmeca', systemId],
    queryFn: ({ signal }) => 
      fetch(`/api/rcm/fmeca?systemId=${systemId}`, { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch FMECA entries');
          return res.json();
        }),
    enabled: !!systemId,
  });

  // Mutation for creating a new entry
  const createEntryMutation = useMutation({
    mutationFn: (data: FmecaFormData) => 
      fetch('/api/rcm/fmeca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create FMECA entry');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcm/fmeca', systemId] });
      toast({
        title: 'Success',
        description: 'FMECA entry created successfully',
      });
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to create entry: ${error.message}`,
      });
    },
  });

  // Mutation for updating an entry
  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: FmecaFormData }) => 
      fetch(`/api/rcm/fmeca/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update FMECA entry');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcm/fmeca', systemId] });
      toast({
        title: 'Success',
        description: 'FMECA entry updated successfully',
      });
      setIsFormOpen(false);
      setIsEditing(false);
      setCurrentEditId(null);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update entry: ${error.message}`,
      });
    },
  });

  // Mutation for deleting an entry
  const deleteEntryMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/rcm/fmeca/${id}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete FMECA entry');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcm/fmeca', systemId] });
      toast({
        title: 'Success',
        description: 'FMECA entry deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete entry: ${error.message}`,
      });
    },
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Calculate RPN when severity, occurrence, or detection change
  React.useEffect(() => {
    const rpn = formData.severity * formData.occurrence * formData.detection;
    setFormData(prev => ({
      ...prev,
      rpn,
      // Automatically set criticality based on RPN
      criticality: rpn >= 200 ? 'High' : rpn >= 80 ? 'Medium' : 'Low',
    }));
  }, [formData.severity, formData.occurrence, formData.detection]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.componentId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a component',
      });
      return;
    }

    if (!formData.failureMode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Failure mode is required',
      });
      return;
    }

    if (isEditing && currentEditId) {
      updateEntryMutation.mutate({ id: currentEditId, data: formData });
    } else {
      createEntryMutation.mutate(formData);
    }
  };

  // Handle edit button click
  const handleEdit = (entry: any) => {
    setFormData({
      componentId: entry.componentId,
      failureMode: entry.failureMode,
      failureCause: entry.failureCause || '',
      localEffect: entry.localEffect || '',
      systemEffect: entry.systemEffect || '',
      endEffect: entry.endEffect || '',
      severity: entry.severity,
      occurrence: entry.occurrence,
      detection: entry.detection,
      rpn: entry.rpn,
      criticality: entry.criticality,
      recommendedActions: entry.recommendedActions || '',
    });
    setCurrentEditId(entry.id);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  // Handle delete button click
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this FMECA entry?')) {
      deleteEntryMutation.mutate(id);
    }
  };

  // Reset form when opening new form
  const handleOpenNewForm = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setCurrentEditId(null);
    setIsFormOpen(true);
  };

  if (!systemId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FMECA Analysis</CardTitle>
          <CardDescription>
            Failure Mode, Effects, and Criticality Analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-800 text-sm">
            Please select a system from the Systems tab first to perform FMECA analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (componentsLoading || entriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading FMECA Data</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (entriesError || !components) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading FMECA Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center p-4 border border-red-200 bg-red-50 rounded-md text-red-800 text-sm">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {entriesError instanceof Error ? entriesError.message : 'An error occurred'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get component name by ID
  const getComponentName = (id: number) => {
    const component = components.find((c: any) => c.id === id);
    return component ? component.name : 'Unknown Component';
  };

  // Get color for RPN value
  const getRpnBadgeColor = (rpn: number) => {
    if (rpn >= 200) return 'destructive';
    if (rpn >= 80) return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>FMECA Analysis</CardTitle>
          <CardDescription>
            Failure Mode, Effects, and Criticality Analysis (FMECA) for the selected system
          </CardDescription>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNewForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit FMECA Entry' : 'Add New FMECA Entry'}</DialogTitle>
              <DialogDescription>
                Complete all fields to perform a comprehensive FMECA analysis
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="componentId">Component</Label>
                  <Select
                    value={formData.componentId.toString()}
                    onValueChange={(value) => handleSelectChange('componentId', value)}
                  >
                    <SelectTrigger id="componentId">
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent>
                      {components.map((component: any) => (
                        <SelectItem key={component.id} value={component.id.toString()}>
                          {component.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="failureMode">Failure Mode</Label>
                  <Input
                    id="failureMode"
                    name="failureMode"
                    value={formData.failureMode}
                    onChange={handleInputChange}
                    placeholder="Describe the failure mode"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="failureCause">Failure Cause</Label>
                  <Input
                    id="failureCause"
                    name="failureCause"
                    value={formData.failureCause}
                    onChange={handleInputChange}
                    placeholder="Describe the cause of failure"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="localEffect">Local Effect</Label>
                  <Input
                    id="localEffect"
                    name="localEffect"
                    value={formData.localEffect}
                    onChange={handleInputChange}
                    placeholder="Effect on the component"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="systemEffect">System Effect</Label>
                  <Input
                    id="systemEffect"
                    name="systemEffect"
                    value={formData.systemEffect}
                    onChange={handleInputChange}
                    placeholder="Effect on the system"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endEffect">End Effect</Label>
                  <Input
                    id="endEffect"
                    name="endEffect"
                    value={formData.endEffect}
                    onChange={handleInputChange}
                    placeholder="Ultimate impact"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity (1-10)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="severity"
                      name="severity"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.severity}
                      onChange={(e) => {
                        const value = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                        handleInputChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: e.target.name,
                            value: value.toString(),
                          },
                        });
                      }}
                    />
                    <Badge>{formData.severity <= 3 ? 'Low' : formData.severity <= 6 ? 'Medium' : 'High'}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="occurrence">Occurrence (1-10)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="occurrence"
                      name="occurrence"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.occurrence}
                      onChange={(e) => {
                        const value = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                        handleInputChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: e.target.name,
                            value: value.toString(),
                          },
                        });
                      }}
                    />
                    <Badge>{formData.occurrence <= 3 ? 'Rare' : formData.occurrence <= 6 ? 'Occasional' : 'Frequent'}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="detection">Detection (1-10)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="detection"
                      name="detection"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.detection}
                      onChange={(e) => {
                        const value = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                        handleInputChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: e.target.name,
                            value: value.toString(),
                          },
                        });
                      }}
                    />
                    <Badge>{formData.detection <= 3 ? 'Easily Detected' : formData.detection <= 6 ? 'Moderately Detected' : 'Hard to Detect'}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rpn">Risk Priority Number (RPN)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="rpn"
                      name="rpn"
                      value={formData.rpn}
                      readOnly
                      className="bg-muted"
                    />
                    <Badge variant={formData.rpn >= 200 ? 'destructive' : formData.rpn >= 80 ? 'default' : 'secondary'}>
                      {formData.criticality}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recommendedActions">Recommended Actions</Label>
                <Textarea
                  id="recommendedActions"
                  name="recommendedActions"
                  value={formData.recommendedActions}
                  onChange={handleInputChange}
                  placeholder="Describe recommended maintenance or corrective actions"
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={createEntryMutation.isPending || updateEntryMutation.isPending}
                >
                  {(createEntryMutation.isPending || updateEntryMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {isEditing ? 'Update Entry' : 'Create Entry'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {fmecaEntries && fmecaEntries.length > 0 ? (
          <Table>
            <TableCaption>FMECA entries for the selected system</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Failure Mode</TableHead>
                <TableHead>Failure Cause</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Occurrence</TableHead>
                <TableHead>Detection</TableHead>
                <TableHead>RPN</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fmecaEntries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>{getComponentName(entry.componentId)}</TableCell>
                  <TableCell className="font-medium">{entry.failureMode}</TableCell>
                  <TableCell>{entry.failureCause}</TableCell>
                  <TableCell>{entry.severity}</TableCell>
                  <TableCell>{entry.occurrence}</TableCell>
                  <TableCell>{entry.detection}</TableCell>
                  <TableCell>
                    <Badge variant={getRpnBadgeColor(entry.rpn)}>
                      {entry.rpn}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No FMECA entries found for this system</p>
            <p className="text-sm">Click the 'Add Entry' button to create your first FMECA analysis entry</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FmecaAnalysis;