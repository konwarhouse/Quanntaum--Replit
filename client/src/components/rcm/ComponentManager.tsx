import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Component, InsertComponent, System } from '@shared/rcm-schema';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

type ComponentFormProps = {
  systems: System[];
  components?: Component[];
  defaultValues?: Partial<Component> | Component;
  onSubmit: (data: Partial<InsertComponent>) => void;
  isSubmitting: boolean;
};

const ComponentForm: React.FC<ComponentFormProps> = ({ 
  systems, 
  components, 
  defaultValues, 
  onSubmit, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<Partial<InsertComponent>>({
    systemId: defaultValues?.systemId || undefined,
    name: defaultValues?.name || '',
    function: defaultValues?.function || '',
    description: defaultValues?.description || '',
    parentId: defaultValues?.parentId || undefined,
    criticality: defaultValues?.criticality || 'Medium'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      systemId: Number(formData.systemId),
      parentId: formData.parentId ? Number(formData.parentId) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="systemId">System</Label>
          <Select
            value={formData.systemId?.toString() || ''}
            onValueChange={(value) => handleSelectChange('systemId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a system" />
            </SelectTrigger>
            <SelectContent>
              {systems.map((system) => (
                <SelectItem key={system.id} value={system.id.toString()}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Component Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="function">Function</Label>
          <Textarea
            id="function"
            name="function"
            value={formData.function}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parentId">Parent Component (Optional)</Label>
          <Select
            value={formData.parentId?.toString() || ''}
            onValueChange={(value) => handleSelectChange('parentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="None (Top-level component)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None (Top-level component)</SelectItem>
              {components?.filter(c => c.id !== defaultValues?.id).map((component) => (
                <SelectItem key={component.id} value={component.id.toString()}>
                  {component.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? 'Update Component' : 'Create Component'}
        </Button>
      </DialogFooter>
    </form>
  );
};

type ComponentManagerProps = {
  systemId?: number;
};

const ComponentManager: React.FC<ComponentManagerProps> = ({ systemId }) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  
  // Fetch systems for dropdown
  const { data: systems, isLoading: isLoadingSystems } = useQuery({
    queryKey: ['/api/rcm/systems'],
    queryFn: ({ signal }) => 
      fetch('/api/rcm/systems', { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch systems');
          return res.json();
        }),
  });

  // Fetch components
  const componentQueryUrl = systemId 
    ? `/api/rcm/components?systemId=${systemId}` 
    : '/api/rcm/components';
  
  const { data: components, isLoading } = useQuery({
    queryKey: [componentQueryUrl],
    queryFn: ({ signal }) => 
      fetch(componentQueryUrl, { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch components');
          return res.json();
        }),
  });

  // Create component mutation
  const createComponentMutation = useMutation({
    mutationFn: (newComponent: Partial<InsertComponent>) => 
      fetch('/api/rcm/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComponent),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create component');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [componentQueryUrl] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Component created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create component: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update component mutation
  const updateComponentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertComponent> }) => 
      fetch(`/api/rcm/components/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update component');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [componentQueryUrl] });
      setEditingComponent(null);
      toast({
        title: "Success",
        description: "Component updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update component: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete component mutation
  const deleteComponentMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/rcm/components/${id}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete component');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [componentQueryUrl] });
      toast({
        title: "Success",
        description: "Component deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete component: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleCreateSubmit = (data: Partial<InsertComponent>) => {
    createComponentMutation.mutate(data);
  };

  const handleUpdateSubmit = (data: Partial<InsertComponent>) => {
    if (editingComponent) {
      updateComponentMutation.mutate({
        id: editingComponent.id,
        data,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this component? This action cannot be undone.')) {
      deleteComponentMutation.mutate(id);
    }
  };

  const getSystemName = (systemId: number) => {
    const system = systems?.find((s: { id: number }) => s.id === systemId);
    return system ? system.name : 'Unknown System';
  };

  const getParentComponentName = (parentId: number | null) => {
    if (!parentId) return 'None';
    const parent = components?.find((c: { id: number }) => c.id === parentId);
    return parent ? parent.name : 'Unknown Component';
  };

  if (isLoading || isLoadingSystems) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Components Management</CardTitle>
        <CardDescription>
          Create and manage components for RCM analysis. Components are part of a system and can have parent-child relationships.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Component</DialogTitle>
                <DialogDescription>
                  Add a new component for RCM analysis. Fill in all the required fields.
                </DialogDescription>
              </DialogHeader>
              <ComponentForm 
                systems={systems || []}
                components={components}
                defaultValues={systemId ? { systemId } : undefined}
                onSubmit={handleCreateSubmit} 
                isSubmitting={createComponentMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableCaption>List of components for RCM analysis</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Function</TableHead>
              <TableHead>Parent Component</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components && components.length > 0 ? (
              components.map((component: Component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{getSystemName(component.systemId)}</TableCell>
                  <TableCell>{component.function}</TableCell>
                  <TableCell>{getParentComponentName(component.parentId)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      component.criticality === 'High' 
                        ? 'bg-red-100 text-red-800' 
                        : component.criticality === 'Medium' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {component.criticality}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Dialog open={editingComponent?.id === component.id} onOpenChange={(open) => !open && setEditingComponent(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setEditingComponent(component)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Edit Component</DialogTitle>
                            <DialogDescription>
                              Update the information for this component.
                            </DialogDescription>
                          </DialogHeader>
                          {editingComponent && (
                            <ComponentForm 
                              systems={systems || []}
                              components={components}
                              defaultValues={editingComponent} 
                              onSubmit={handleUpdateSubmit} 
                              isSubmitting={updateComponentMutation.isPending} 
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleDelete(component.id)}
                        disabled={deleteComponentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No components found. Create your first component to continue with RCM analysis.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ComponentManager;