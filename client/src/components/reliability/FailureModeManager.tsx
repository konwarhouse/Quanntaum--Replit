import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Asset, FailureMode } from "@shared/schema";
import { UserRole } from "@shared/auth";

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
import { AlertTriangle, Plus, RefreshCw, FileEdit, Trash2 } from "lucide-react";

// Define the form schema for creating/editing failure modes
const failureModeFormSchema = z.object({
  assetId: z.coerce.number().min(1, "Please select an asset"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  category: z.string().min(1, "Please select a category"),
  failureEffect: z.string().min(3, "Failure effect must be at least 3 characters"),
  detectionMethod: z.string().optional(),
  mttr: z.coerce.number().min(0, "MTTR must be a positive number").optional(),
  notes: z.string().optional(),
});

type FailureModeFormValues = z.infer<typeof failureModeFormSchema>;

interface FailureModeManagerProps {
  currentUserRole: UserRole;
}

const FailureModeManager = ({ currentUserRole }: FailureModeManagerProps) => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
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

  // Fetch failure modes
  const { 
    data: failureModes = [], 
    isLoading,
    refetch: refetchFailureModes 
  } = useQuery<FailureMode[]>({
    queryKey: ['/api/failure-modes', selectedAssetId],
    enabled: true,
    queryFn: async () => {
      let url = `/api/failure-modes`;
      if (selectedAssetId) {
        url = `/api/failure-modes/${selectedAssetId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch failure modes');
      return response.json();
    },
  });

  // Mutations for CRUD operations
  const createFailureModeMutation = useMutation({
    mutationFn: async (data: any) => {
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
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
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
      assetId: selectedAssetId ? parseInt(selectedAssetId) : undefined,
      description: "",
      category: "",
      failureEffect: "",
      detectionMethod: "",
      mttr: undefined,
      notes: "",
    },
  });

  // Form setup for editing an existing failure mode
  const editForm = useForm<FailureModeFormValues>({
    resolver: zodResolver(failureModeFormSchema),
    defaultValues: {
      assetId: "",
      description: "",
      category: "",
      failureEffect: "",
      detectionMethod: "",
      mttr: undefined,
      notes: "",
    },
  });

  // Reset the add form when the dialog opens
  const handleAddDialogOpen = () => {
    addForm.reset({
      assetId: selectedAssetId ? parseInt(selectedAssetId) : undefined,
      description: "",
      category: "",
      failureEffect: "",
      detectionMethod: "",
      mttr: undefined,
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  // Load the selected failure mode when editing
  const handleEditDialogOpen = (failureMode: FailureMode) => {
    setSelectedFailureModeId(failureMode.id);
    editForm.reset({
      assetId: failureMode.assetId,
      description: failureMode.description,
      category: failureMode.category || "",
      failureEffect: failureMode.failureEffect || "",
      detectionMethod: failureMode.detectionMethod || "",
      mttr: failureMode.mttr,
      notes: failureMode.notes || "",
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

  // Failure mode categories for dropdowns
  const failureCategories = [
    { value: "mechanical", label: "Mechanical" },
    { value: "electrical", label: "Electrical" },
    { value: "instrumentation", label: "Instrumentation" },
    { value: "material", label: "Material/Corrosion" },
    { value: "external", label: "External Factor" },
    { value: "operational", label: "Operational" },
  ];

  // Detection methods for dropdowns
  const detectionMethods = [
    { value: "visual", label: "Visual Inspection" },
    { value: "vibration", label: "Vibration Analysis" },
    { value: "temperature", label: "Temperature Monitoring" },
    { value: "pressure", label: "Pressure Monitoring" },
    { value: "electrical", label: "Electrical Testing" },
    { value: "oil", label: "Oil Analysis" },
    { value: "noise", label: "Noise/Sound Detection" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Failure Mode Manager</h2>
          <p className="text-muted-foreground">
            Manage failure modes for assets and equipment
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
                    Define a potential failure mode for an asset. These will be available for selection when recording failures.
                  </DialogDescription>
                </DialogHeader>
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
                    <FormField
                      control={addForm.control}
                      name="assetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset" />
                            </SelectTrigger>
                            <SelectContent>
                              {assets.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id.toString()}>
                                  {asset.assetNumber} - {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the asset this failure mode applies to
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {failureCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Category or type of failure
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="failureEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Failure Effect</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what happens when this failure occurs" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Outcome or consequence of the failure
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
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select detection method" />
                            </SelectTrigger>
                            <SelectContent>
                              {detectionMethods.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How this failure can be detected
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="mttr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mean Time To Repair (hours)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Average repair time in hours" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Typical time needed to fix this failure
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional information about this failure mode" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Any other relevant details
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createFailureModeMutation.isPending}
                      >
                        {createFailureModeMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Filter</CardTitle>
          <CardDescription>Filter failure modes by asset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select
                value={selectedAssetId || "all"}
                onValueChange={(value) => setSelectedAssetId(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assets</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.assetNumber} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failure Modes List */}
      <Card>
        <CardHeader>
          <CardTitle>Failure Modes</CardTitle>
          <CardDescription>
            All defined failure modes for assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : failureModes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No failure modes found</p>
              {selectedAssetId && (
                <p>Try selecting a different asset or create new failure modes for this asset</p>
              )}
              {!selectedAssetId && hasAdminAccess && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleAddDialogOpen}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Failure Mode
                </Button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Detection Method</TableHead>
                    <TableHead>MTTR (hrs)</TableHead>
                    {hasAdminAccess && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failureModes.map((failureMode) => {
                    const asset = assets.find((a) => a.id === failureMode.assetId);
                    return (
                      <TableRow key={failureMode.id}>
                        <TableCell>
                          {asset ? `${asset.assetNumber} - ${asset.name}` : `Asset ID: ${failureMode.assetId}`}
                        </TableCell>
                        <TableCell>{failureMode.description}</TableCell>
                        <TableCell>{failureMode.category}</TableCell>
                        <TableCell>{failureMode.detectionMethod}</TableCell>
                        <TableCell>{failureMode.mttr}</TableCell>
                        {hasAdminAccess && (
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDialogOpen(failureMode)}
                              >
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDialogOpen(failureMode.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
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
                Update the details of this failure mode
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <FormField
                  control={editForm.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {assets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id.toString()}>
                              {asset.assetNumber} - {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the asset this failure mode applies to
                      </FormDescription>
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
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {failureCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Category or type of failure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="failureEffect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Failure Effect</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what happens when this failure occurs" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Outcome or consequence of the failure
                      </FormDescription>
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select detection method" />
                        </SelectTrigger>
                        <SelectContent>
                          {detectionMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How this failure can be detected
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="mttr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mean Time To Repair (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Average repair time in hours" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Typical time needed to fix this failure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional information about this failure mode" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Any other relevant details
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateFailureModeMutation.isPending}
                  >
                    {updateFailureModeMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update"
                    )}
                  </Button>
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
              <DialogTitle>Delete Failure Mode</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this failure mode? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 py-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <p>This will permanently remove this failure mode from the database.</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteFailureModeMutation.isPending}
              >
                {deleteFailureModeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FailureModeManager;