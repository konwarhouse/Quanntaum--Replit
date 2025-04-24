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
import { Label } from '@/components/ui/label';
import { System, InsertSystem } from '@shared/rcm-schema';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

type SystemFormProps = {
  defaultValues?: System;
  onSubmit: (data: Partial<InsertSystem>) => void;
  isSubmitting: boolean;
};

const SystemForm: React.FC<SystemFormProps> = ({ defaultValues, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<Partial<InsertSystem>>({
    name: defaultValues?.name || '',
    purpose: defaultValues?.purpose || '',
    operatingContext: defaultValues?.operatingContext || '',
    boundaries: defaultValues?.boundaries || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">System Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="operatingContext">Operating Context</Label>
          <Textarea
            id="operatingContext"
            name="operatingContext"
            value={formData.operatingContext}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="boundaries">System Boundaries</Label>
          <Textarea
            id="boundaries"
            name="boundaries"
            value={formData.boundaries}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? 'Update System' : 'Create System'}
        </Button>
      </DialogFooter>
    </form>
  );
};

type SystemManagerProps = {
  onSystemSelect?: (id: number) => void;
};

const SystemManager: React.FC<SystemManagerProps> = ({ onSystemSelect }) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);

  // Fetch systems
  const { data: systems, isLoading } = useQuery({
    queryKey: ['/api/rcm/systems'],
    queryFn: ({ signal }) => 
      fetch('/api/rcm/systems', { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch systems');
          return res.json();
        }),
  });

  // Create system mutation
  const createSystemMutation = useMutation({
    mutationFn: (newSystem: Partial<InsertSystem>) => 
      fetch('/api/rcm/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSystem),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create system');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcm/systems'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "System created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create system: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update system mutation
  const updateSystemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSystem> }) => 
      fetch(`/api/rcm/systems/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update system');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcm/systems'] });
      setEditingSystem(null);
      toast({
        title: "Success",
        description: "System updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update system: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete system mutation
  const deleteSystemMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/rcm/systems/${id}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete system');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcm/systems'] });
      toast({
        title: "Success",
        description: "System deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete system: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleCreateSubmit = (data: Partial<InsertSystem>) => {
    createSystemMutation.mutate(data);
  };

  const handleUpdateSubmit = (data: Partial<InsertSystem>) => {
    if (editingSystem) {
      updateSystemMutation.mutate({
        id: editingSystem.id,
        data,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this system? This action cannot be undone.')) {
      deleteSystemMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Systems Management</CardTitle>
        <CardDescription>
          Create and manage systems for RCM analysis. A system defines the scope and context for reliability analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add System
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New System</DialogTitle>
                <DialogDescription>
                  Add a new system for RCM analysis. Fill in all the required fields.
                </DialogDescription>
              </DialogHeader>
              <SystemForm 
                onSubmit={handleCreateSubmit} 
                isSubmitting={createSystemMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableCaption>List of system definitions for RCM analysis</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems && systems.length > 0 ? (
              systems.map((system: System) => (
                <TableRow 
                  key={system.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSystemSelect && onSystemSelect(system.id)}
                >
                  <TableCell className="font-medium">{system.name}</TableCell>
                  <TableCell>{system.purpose}</TableCell>
                  <TableCell>{new Date(system.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click event
                          onSystemSelect && onSystemSelect(system.id);
                        }}
                      >
                        Select
                      </Button>
                      <Dialog open={editingSystem?.id === system.id} onOpenChange={(open) => !open && setEditingSystem(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              setEditingSystem(system);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Edit System</DialogTitle>
                            <DialogDescription>
                              Update the information for this system.
                            </DialogDescription>
                          </DialogHeader>
                          {editingSystem && (
                            <SystemForm 
                              defaultValues={editingSystem} 
                              onSubmit={handleUpdateSubmit} 
                              isSubmitting={updateSystemMutation.isPending} 
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click event
                          handleDelete(system.id);
                        }}
                        disabled={deleteSystemMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No systems found. Create your first system to get started with RCM analysis.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SystemManager;