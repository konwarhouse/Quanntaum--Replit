import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UserRole } from "@shared/auth";
import { Plus, Trash2 } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define the form validation schema
const equipmentClassSchema = z.object({
  name: z.string().min(1, "Equipment class name is required"),
  description: z.string().optional(),
});

// TypeScript type for the form values
type EquipmentClassFormValues = z.infer<typeof equipmentClassSchema>;

// TypeScript interface for equipment class
interface EquipmentClass {
  id: number;
  name: string;
  description: string | null;
}

// Component props
interface EquipmentClassManagerProps {
  currentUserRole: UserRole;
}

const EquipmentClassManager = ({ currentUserRole }: EquipmentClassManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  // Check if the user has admin permissions
  const canManageEquipmentClasses = currentUserRole === UserRole.ADMIN;
  
  // Query to fetch equipment classes
  const { data: equipmentClasses, isLoading } = useQuery({
    queryKey: ['/api/equipment-classes'],
    queryFn: async () => {
      const response = await fetch('/api/equipment-classes');
      if (!response.ok) {
        throw new Error('Failed to fetch equipment classes');
      }
      return response.json() as Promise<EquipmentClass[]>;
    }
  });

  // Mutation to add a new equipment class
  const addEquipmentClassMutation = useMutation({
    mutationFn: async (data: EquipmentClassFormValues) => {
      const response = await fetch('/api/equipment-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': currentUserRole
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add equipment class');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equipment class added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-classes'] });
      form.reset({ name: "", description: "" });
      setError(null);
    },
    onError: (error) => {
      console.error("Error adding equipment class:", error);
      setError("Failed to add equipment class. Check console for details.");
    },
  });

  // Mutation to delete an equipment class
  const deleteEquipmentClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/equipment-classes/${id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Role': currentUserRole
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete equipment class');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equipment class deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-classes'] });
      setError(null);
    },
    onError: (error) => {
      console.error("Error deleting equipment class:", error);
      setError("Failed to delete equipment class. Check console for details.");
    },
  });

  // Form setup
  const form = useForm<EquipmentClassFormValues>({
    resolver: zodResolver(equipmentClassSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Form submission handler
  const onSubmit = (data: EquipmentClassFormValues) => {
    addEquipmentClassMutation.mutate(data);
  };

  // Handler for deleting an equipment class
  const handleDeleteEquipmentClass = (id: number) => {
    if (window.confirm("Are you sure you want to delete this equipment class? This action cannot be undone.")) {
      deleteEquipmentClassMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipment Class Manager</CardTitle>
          <CardDescription>
            Add and manage equipment classes for ISO 14224 categorization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form for adding new equipment class */}
          {canManageEquipmentClasses && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                <div className="flex flex-col gap-4 md:flex-row">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Equipment Class Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Pump, Motor, Compressor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of this equipment class"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={addEquipmentClassMutation.isPending || !canManageEquipmentClasses}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Equipment Class
                </Button>
              </form>
            </Form>
          )}

          {/* Table of equipment classes */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Equipment Class</TableHead>
                  <TableHead>Description</TableHead>
                  {canManageEquipmentClasses && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canManageEquipmentClasses ? 3 : 2} className="text-center">
                      Loading equipment classes...
                    </TableCell>
                  </TableRow>
                ) : !equipmentClasses || equipmentClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageEquipmentClasses ? 3 : 2} className="text-center">
                      No equipment classes found
                    </TableCell>
                  </TableRow>
                ) : (
                  equipmentClasses.map((equipmentClass) => (
                    <TableRow key={equipmentClass.id}>
                      <TableCell className="font-medium">{equipmentClass.name}</TableCell>
                      <TableCell>{equipmentClass.description || "-"}</TableCell>
                      {canManageEquipmentClasses && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteEquipmentClass(equipmentClass.id)}
                            disabled={deleteEquipmentClassMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentClassManager;