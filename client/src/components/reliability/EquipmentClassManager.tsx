import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserRole } from "@shared/auth";

// Define schema for equipment class form
const equipmentClassSchema = z.object({
  name: z.string().min(1, "Equipment class name is required"),
  description: z.string().optional(),
});

type EquipmentClassFormValues = z.infer<typeof equipmentClassSchema>;

// Interface for equipment class data
interface EquipmentClass {
  id: number;
  name: string;
  description: string | null;
}

interface EquipmentClassManagerProps {
  currentUserRole: UserRole;
}

const EquipmentClassManager = ({ currentUserRole }: EquipmentClassManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  // Check if user has admin access
  const hasAdminAccess = currentUserRole === UserRole.ADMIN;

  // Form for adding new equipment class
  const form = useForm<EquipmentClassFormValues>({
    resolver: zodResolver(equipmentClassSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Query to fetch all equipment classes
  const {
    data: equipmentClasses = [],
    isLoading,
    isError,
    error,
  } = useQuery<EquipmentClass[]>({
    queryKey: ['/api/equipment-classes'],
    enabled: true,
    queryFn: async () => {
      const response = await fetch('/api/equipment-classes');
      if (!response.ok) throw new Error('Failed to fetch equipment classes');
      return response.json();
    },
  });

  // Mutation to add a new equipment class
  const createMutation = useMutation({
    mutationFn: async (data: EquipmentClassFormValues) => {
      const response = await fetch('/api/equipment-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentUserRole },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create equipment class');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-classes'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Equipment class has been added",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add equipment class",
      });
    },
  });

  // Mutation to delete an equipment class
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/equipment-classes/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': currentUserRole },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete equipment class');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-classes'] });
      setDeleteDialogOpen(false);
      setSelectedClassId(null);
      toast({
        title: "Success",
        description: "Equipment class has been deleted",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete equipment class",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: EquipmentClassFormValues) => {
    createMutation.mutate(data);
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: number) => {
    setSelectedClassId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedClassId !== null) {
      deleteMutation.mutate(selectedClassId);
    }
  };

  // If user is not admin, show limited view
  if (!hasAdminAccess) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Equipment Classes</CardTitle>
          <CardDescription>
            View the available equipment classes used in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading equipment classes...</p>
          ) : isError ? (
            <p className="text-destructive">Error loading equipment classes: {error?.toString()}</p>
          ) : equipmentClasses.length === 0 ? (
            <p>No equipment classes defined yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipmentClasses.map((eqClass) => (
                <Card key={eqClass.id} className="bg-muted/50">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{eqClass.name}</CardTitle>
                  </CardHeader>
                  {eqClass.description && (
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground">{eqClass.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equipment Classes</h2>
          <p className="text-muted-foreground">
            Manage equipment classes following ISO 14224 standards
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Class
        </Button>
      </div>

      {isLoading ? (
        <p>Loading equipment classes...</p>
      ) : isError ? (
        <p className="text-destructive">Error loading equipment classes: {error?.toString()}</p>
      ) : equipmentClasses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Equipment Classes Found</CardTitle>
            <CardDescription>
              Add your first equipment class to start categorizing assets and failure modes
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Equipment Class
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipmentClasses.map((eqClass) => (
            <Card key={eqClass.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{eqClass.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteClick(eqClass.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardHeader>
              {eqClass.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{eqClass.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Equipment Class Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Equipment Class</DialogTitle>
            <DialogDescription>
              Add a new equipment class following ISO 14224 standards
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Pump, Compressor, Motor" {...field} />
                    </FormControl>
                    <FormDescription>
                      ISO 14224 standard equipment class name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the equipment class" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Equipment Class"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this equipment class and may affect associated assets and failure modes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedClassId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquipmentClassManager;