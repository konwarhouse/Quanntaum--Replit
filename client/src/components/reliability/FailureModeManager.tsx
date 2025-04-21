import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Asset, FailureMode } from "@shared/schema";
import { UserRole } from "@shared/auth";
import { Switch } from "@/components/ui/switch";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Plus, RefreshCw, FileEdit, Trash2, Filter } from "lucide-react";

// Define the form schema for creating/editing failure modes
const failureModeFormSchema = z.object({
  equipmentClass: z.string().min(1, "Please select an equipment class"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  consequences: z.string().min(3, "Consequences must be at least 3 characters"),
  detectionMethod: z.string().optional(),
  currentControl: z.string().optional(),
  isPredictable: z.boolean().default(false),
  costOfFailure: z.coerce.number().min(0, "Cost must be a positive number").optional(),
});

type FailureModeFormValues = z.infer<typeof failureModeFormSchema>;

interface FailureModeManagerProps {
  currentUserRole: UserRole;
}

const FailureModeManager = ({ currentUserRole }: FailureModeManagerProps) => {
  const { toast } = useToast();
  const [selectedEquipmentClass, setSelectedEquipmentClass] = useState<string | null>(null);
  const [selectedFailureModeId, setSelectedFailureModeId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Check if current user has admin privileges
  const hasAdminAccess = currentUserRole === UserRole.ADMIN;

  // Fetch assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 60000,
  });

  // Extract unique equipment classes from assets
  const equipmentClasses = useMemo(() => {
    const classes = new Set<string>();
    assets.forEach(asset => {
      if (asset.equipmentClass) {
        classes.add(asset.equipmentClass);
      }
    });
    return Array.from(classes).sort();
  }, [assets]);

  // Fetch failure modes
  const { 
    data: failureModes = [], 
    isLoading,
    refetch: refetchFailureModes 
  } = useQuery<FailureMode[]>({
    queryKey: ['/api/failure-modes', selectedEquipmentClass],
    enabled: true,
    queryFn: async () => {
      let url = `/api/failure-modes`;
      if (selectedEquipmentClass) {
        url = `/api/failure-modes/class/${encodeURIComponent(selectedEquipmentClass)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch failure modes');
      return response.json();
    },
  });

  // The failureModes will already be filtered server-side based on the selected equipment class,
  // so we don't need to filter them again here. Just use them directly.
  const filteredFailureModes = failureModes;

  // Mutations for CRUD operations
  const createFailureModeMutation = useMutation({
    mutationFn: async (data: FailureModeFormValues) => {
      const response = await fetch('/api/failure-modes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create failure mode');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-modes'] });
      toast({
        title: 'Success',
        description: 'Failure mode has been created',
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create failure mode',
      });
    },
  });

  const updateFailureModeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FailureModeFormValues }) => {
      const response = await fetch(`/api/failure-modes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update failure mode');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-modes'] });
      toast({
        title: 'Success',
        description: 'Failure mode has been updated',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update failure mode',
      });
    },
  });

  const deleteFailureModeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/failure-modes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete failure mode');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-modes'] });
      toast({
        title: 'Success',
        description: 'Failure mode has been deleted',
      });
      setIsDeleteDialogOpen(false);
      setSelectedFailureModeId(null);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete failure mode',
      });
    },
  });

  // Form setup for adding a new failure mode
  const addForm = useForm<FailureModeFormValues>({
    resolver: zodResolver(failureModeFormSchema),
    defaultValues: {
      equipmentClass: selectedEquipmentClass || "",
      description: "",
      consequences: "",
      detectionMethod: "",
      currentControl: "",
      isPredictable: false,
      costOfFailure: undefined,
    },
  });

  // Form setup for editing an existing failure mode
  const editForm = useForm<FailureModeFormValues>({
    resolver: zodResolver(failureModeFormSchema),
    defaultValues: {
      equipmentClass: "",
      description: "",
      consequences: "",
      detectionMethod: "",
      currentControl: "",
      isPredictable: false,
      costOfFailure: undefined,
    },
  });

  // Reset the add form when the dialog opens
  const handleAddDialogOpen = () => {
    addForm.reset({
      equipmentClass: selectedEquipmentClass || "",
      description: "",
      consequences: "",
      detectionMethod: "",
      currentControl: "",
      isPredictable: false,
      costOfFailure: undefined,
    });
    setIsAddDialogOpen(true);
  };

  // Load the selected failure mode when editing
  const handleEditDialogOpen = (failureMode: FailureMode) => {
    setSelectedFailureModeId(failureMode.id);
    editForm.reset({
      equipmentClass: failureMode.equipmentClass || "",
      description: failureMode.description,
      consequences: failureMode.consequences,
      detectionMethod: failureMode.detectionMethod || "",
      currentControl: failureMode.currentControl || "",
      isPredictable: failureMode.isPredictable || false,
      costOfFailure: failureMode.costOfFailure || undefined,
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteDialogOpen = (id: number) => {
    setSelectedFailureModeId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedFailureModeId) {
      deleteFailureModeMutation.mutate(selectedFailureModeId);
    }
  };

  // Handle form submission for adding a new failure mode
  const onAddSubmit = (data: FailureModeFormValues) => {
    createFailureModeMutation.mutate(data);
  };

  // Handle form submission for editing an existing failure mode
  const onEditSubmit = (data: FailureModeFormValues) => {
    if (!selectedFailureModeId) return;
    
    updateFailureModeMutation.mutate({
      id: selectedFailureModeId,
      data
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Failure Mode Manager</h2>
          <p className="text-muted-foreground">
            Manage failure modes by equipment class
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchFailureModes()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {hasAdminAccess && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddDialogOpen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Failure Mode
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Failure Mode</DialogTitle>
                  <DialogDescription>
                    Define a potential failure mode for an equipment class. These will be available 
                    for selection when recording failures for any asset in this class.
                  </DialogDescription>
                </DialogHeader>
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
                    <FormField
                      control={addForm.control}
                      name="equipmentClass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment Class</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select equipment class" />
                            </SelectTrigger>
                            <SelectContent>
                              {equipmentClasses.map((equipClass) => (
                                <SelectItem key={equipClass} value={equipClass}>
                                  {equipClass}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This failure mode will apply to all assets in this equipment class
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Bearing Failure, Motor Overheating" {...field} />
                          </FormControl>
                          <FormDescription>
                            Clear, concise description of the failure mode
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="consequences"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consequences</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the impact of this failure..." 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            What happens when this failure occurs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="detectionMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detection Method</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Visual inspection, Vibration analysis" {...field} />
                          </FormControl>
                          <FormDescription>
                            How this failure can be detected
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="currentControl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Control</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Preventive maintenance, Inspections" {...field} />
                          </FormControl>
                          <FormDescription>
                            Existing controls to prevent or mitigate this failure
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="isPredictable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Failure is Predictable
                            </FormLabel>
                            <FormDescription>
                              Can this failure be predicted based on condition monitoring?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="costOfFailure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost of Failure</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Average cost when this failure occurs" 
                              {...field}
                              value={field.value === undefined ? '' : field.value} 
                              onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Average cost impact when this failure occurs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit">Add Failure Mode</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Equipment Class Filter */}
      <div className="flex items-center space-x-2">
        <div className="w-full max-w-sm">
          <Select
            value={selectedEquipmentClass || "_all_"}
            onValueChange={(value) => setSelectedEquipmentClass(value === "_all_" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by equipment class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Equipment Classes</SelectItem>
              {equipmentClasses.map((equipClass) => (
                <SelectItem key={equipClass} value={equipClass}>
                  {equipClass}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSelectedEquipmentClass(null)}
          disabled={!selectedEquipmentClass}
        >
          Clear Filter
        </Button>
      </div>

      {/* Failure Modes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Failure Modes</CardTitle>
          <CardDescription>
            {selectedEquipmentClass 
              ? `Failure modes for ${selectedEquipmentClass} equipment`
              : "All equipment failure modes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <p>Loading failure modes...</p>
            </div>
          ) : filteredFailureModes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold">No Failure Modes Found</h3>
              <p className="text-muted-foreground">
                {selectedEquipmentClass 
                  ? `No failure modes have been defined for ${selectedEquipmentClass} equipment.`
                  : "No failure modes have been defined yet. Add your first one!"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Class</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Consequences</TableHead>
                    <TableHead>Detection Method</TableHead>
                    <TableHead className="text-center">Is Predictable</TableHead>
                    <TableHead className="text-right">Cost of Failure</TableHead>
                    {hasAdminAccess && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFailureModes.map((failureMode) => (
                    <TableRow key={failureMode.id}>
                      <TableCell className="font-medium">{failureMode.equipmentClass}</TableCell>
                      <TableCell>{failureMode.description}</TableCell>
                      <TableCell>{failureMode.consequences}</TableCell>
                      <TableCell>{failureMode.detectionMethod}</TableCell>
                      <TableCell className="text-center">
                        {failureMode.isPredictable ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-right">
                        {failureMode.costOfFailure 
                          ? `$${failureMode.costOfFailure.toFixed(2)}` 
                          : "-"}
                      </TableCell>
                      {hasAdminAccess && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditDialogOpen(failureMode)}
                            >
                              <FileEdit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteDialogOpen(failureMode.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      {hasAdminAccess && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Failure Mode</DialogTitle>
              <DialogDescription>
                Update the details for this failure mode.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <FormField
                  control={editForm.control}
                  name="equipmentClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Class</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment class" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentClasses.map((equipClass) => (
                            <SelectItem key={equipClass} value={equipClass}>
                              {equipClass}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="consequences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consequences</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="detectionMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detection Method</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="currentControl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Control</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isPredictable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Failure is Predictable
                        </FormLabel>
                        <FormDescription>
                          Can this failure be predicted based on condition monitoring?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="costOfFailure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost of Failure</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          value={field.value === undefined ? '' : field.value} 
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Update Failure Mode</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {hasAdminAccess && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this failure mode? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FailureModeManager;