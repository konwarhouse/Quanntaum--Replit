import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Asset, FailureMode, FailureHistory as FailureHistoryType
} from "@shared/schema";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  FilePlus,
  FileEdit,
  Trash2,
  AlertTriangle,
  Info,
  RefreshCw,
  Filter,
  XCircle,
  Check,
  ChevronRight,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Define the form schema for creating/editing failure records
const failureRecordFormSchema = z.object({
  assetId: z.coerce.number().min(1, "Please select an asset"),
  failureModeId: z.coerce.number().optional(),
  failureDate: z.date({
    required_error: "Please select the failure date",
  }),
  repairCompleteDate: z.date({
    required_error: "Please select the repair completion date",
  }).nullable(),
  downtimeHours: z.coerce.number().min(0, "Downtime hours must be a positive number"),
  repairTimeHours: z.coerce.number().min(0, "Repair time hours must be a positive number"),
  operatingHoursAtFailure: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  failureDescription: z.string().min(5, "Please provide a failure description"),
  failureMechanism: z.string().optional(),
  failureCause: z.string().min(3, "Please provide the failure cause"),
  failureClassification: z.string().optional(),
  failureDetectionMethod: z.string().min(1, "Please select how the failure was detected"),
  safetyImpact: z.string().optional(),
  environmentalImpact: z.string().optional(),
  productionImpact: z.string().optional(),
  repairCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  consequentialCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  partsReplaced: z.string().optional(),
  repairActions: z.string().min(3, "Please describe the repair actions taken"),
  repairTechnician: z.string().optional(),
  operatingConditions: z.string().optional(),
  preventability: z.string().optional(),
  recommendedPreventiveAction: z.string().optional(),
  recordedBy: z.string().optional(),
});

type FailureRecordFormValues = z.infer<typeof failureRecordFormSchema>;

// Main Failure History component
const FailureHistory = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  // Fetch assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 60000,
  });

  // Fetch all failure modes - we'll filter by asset when needed
  const { data: allFailureModes = [] } = useQuery<FailureMode[]>({
    queryKey: ['/api/failure-modes'],
    staleTime: 60000,
  });
  
  // State to track the currently selected asset in the add form
  const [currentAssetId, setCurrentAssetId] = useState<number | null>(null);
  
  // Filter failure modes for the currently selected asset
  const assetFailureModes = useMemo(() => {
    if (!currentAssetId) return [];
    return allFailureModes.filter(mode => mode.assetId === currentAssetId);
  }, [currentAssetId, allFailureModes]);

  // Fetch failure history records
  const { 
    data: failureRecords = [], 
    isLoading,
    refetch: refetchFailureRecords 
  } = useQuery<FailureHistoryType[]>({
    queryKey: ['/api/failure-history', selectedAssetId],
    enabled: true,
    queryFn: async () => {
      let url = `/api/failure-history`;
      if (selectedAssetId) {
        url += `?assetId=${selectedAssetId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch failure history');
      return response.json();
    },
  });

  // Filter records based on date range
  const filteredRecords = failureRecords.filter(record => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const recordDate = new Date(record.failureDate);
    if (dateRange.start && dateRange.end) {
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    } else if (dateRange.start) {
      return recordDate >= dateRange.start;
    } else if (dateRange.end) {
      return recordDate <= dateRange.end;
    }
    return true;
  });

  // Mutations for CRUD operations
  const createFailureRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/failure-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create failure record');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-history'] });
      toast({
        title: 'Success',
        description: 'Failure record has been created',
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create failure record',
      });
    },
  });

  const updateFailureRecordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/failure-history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update failure record');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-history'] });
      toast({
        title: 'Success',
        description: 'Failure record has been updated',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update failure record',
      });
    },
  });

  const deleteFailureRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/failure-history/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete failure record');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-history'] });
      toast({
        title: 'Success',
        description: 'Failure record has been deleted',
      });
      setIsDeleteDialogOpen(false);
      setSelectedRecordId(null);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete failure record',
      });
    },
  });

  // Form setup for adding a new failure record
  const addForm = useForm<any>({
    resolver: zodResolver(failureRecordFormSchema),
    defaultValues: {
      assetId: selectedAssetId || "",
      failureModeId: "",
      failureDate: new Date(),
      repairCompleteDate: new Date(),
      downtimeHours: "",
      repairTimeHours: "",
      operatingHoursAtFailure: "",
      failureDescription: "",
      failureMechanism: "",
      failureCause: "",
      failureClassification: "",
      failureDetectionMethod: "",
      safetyImpact: "",
      environmentalImpact: "",
      productionImpact: "",
      repairCost: "",
      consequentialCost: "",
      partsReplaced: "",
      repairActions: "",
      repairTechnician: "",
      operatingConditions: "",
      preventability: "",
      recommendedPreventiveAction: "",
      recordedBy: "",
    },
  });

  // Form setup for editing an existing record
  const editForm = useForm<any>({
    resolver: zodResolver(failureRecordFormSchema),
    defaultValues: {
      assetId: "",
      failureModeId: "",
      failureDate: new Date(),
      repairCompleteDate: new Date(),
      downtimeHours: "",
      repairTimeHours: "",
      operatingHoursAtFailure: "",
      failureDescription: "",
      failureMechanism: "",
      failureCause: "",
      failureClassification: "",
      failureDetectionMethod: "",
      safetyImpact: "",
      environmentalImpact: "",
      productionImpact: "",
      repairCost: "",
      consequentialCost: "",
      partsReplaced: "",
      repairActions: "",
      repairTechnician: "",
      operatingConditions: "",
      preventability: "",
      recommendedPreventiveAction: "",
      recordedBy: "",
    },
  });

  // Reset the add form when the dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      addForm.reset({
        assetId: selectedAssetId || "",
        failureModeId: "",
        failureDate: new Date(),
        repairCompleteDate: new Date(),
        downtimeHours: "",
        repairTimeHours: "",
        operatingHoursAtFailure: "",
        failureDescription: "",
        failureMechanism: "",
        failureCause: "",
        failureClassification: "",
        failureDetectionMethod: "",
        safetyImpact: "",
        environmentalImpact: "",
        productionImpact: "",
        repairCost: "",
        consequentialCost: "",
        partsReplaced: "",
        repairActions: "",
        repairTechnician: "",
        operatingConditions: "",
        preventability: "",
        recommendedPreventiveAction: "",
        recordedBy: "",
      });
    }
  }, [isAddDialogOpen, selectedAssetId, addForm]);

  // Load the selected record when editing
  useEffect(() => {
    if (isEditDialogOpen && selectedRecordId) {
      const record = failureRecords.find(r => r.id === selectedRecordId);
      if (record) {
        // Set current asset ID for edit mode to filter failure modes for this asset
        setCurrentAssetId(record.assetId);
        
        editForm.reset({
          assetId: record.assetId.toString(),
          failureModeId: record.failureModeId?.toString() || "",
          failureDate: new Date(record.failureDate),
          repairCompleteDate: new Date(record.repairCompleteDate),
          downtimeHours: record.downtimeHours.toString(),
          repairTimeHours: record.repairTimeHours.toString(),
          operatingHoursAtFailure: record.operatingHoursAtFailure?.toString() || "",
          failureDescription: record.failureDescription,
          failureMechanism: record.failureMechanism || "",
          failureCause: record.failureCause,
          failureClassification: record.failureClassification || "",
          failureDetectionMethod: record.failureDetectionMethod,
          safetyImpact: record.safetyImpact || "",
          environmentalImpact: record.environmentalImpact || "",
          productionImpact: record.productionImpact || "",
          repairCost: record.repairCost?.toString() || "",
          consequentialCost: record.consequentialCost?.toString() || "",
          partsReplaced: record.partsReplaced || "",
          repairActions: record.repairActions,
          repairTechnician: record.repairTechnician || "",
          operatingConditions: record.operatingConditions || "",
          preventability: record.preventability || "",
          recommendedPreventiveAction: record.recommendedPreventiveAction || "",
          recordedBy: record.recordedBy || "",
        });
      }
    }
  }, [isEditDialogOpen, selectedRecordId, failureRecords, editForm]);

  // Handle form submission for adding a new record
  const onAddSubmit = (data: any) => {
    // Use the data as a FailureRecordFormValues
    const formValues = data as FailureRecordFormValues;
    
    // Format dates properly for PostgreSQL timestamp format
    const formattedFailureDate = formValues.failureDate instanceof Date 
      ? format(formValues.failureDate, 'yyyy-MM-dd HH:mm:ss')
      : formValues.failureDate;
    
    const formattedRepairDate = formValues.repairCompleteDate instanceof Date
      ? format(formValues.repairCompleteDate, 'yyyy-MM-dd HH:mm:ss')
      : formValues.repairCompleteDate;

    // Convert form values to numbers where needed
    const assetId = parseInt(formValues.assetId as string);
    // Allow null for failure mode if not selected
    const failureModeId = formValues.failureModeId ? parseInt(formValues.failureModeId as string) : null;
    
    createFailureRecordMutation.mutate({
      assetId: assetId,
      failureModeId: failureModeId,
      failureDate: formattedFailureDate,
      repairCompleteDate: formattedRepairDate,
      downtimeHours: parseFloat(formValues.downtimeHours as string) || 0,
      repairTimeHours: parseFloat(formValues.repairTimeHours as string) || 0,
      operatingHoursAtFailure: formValues.operatingHoursAtFailure ? parseFloat(formValues.operatingHoursAtFailure as string) : null,
      failureDescription: formValues.failureDescription,
      failureMechanism: formValues.failureMechanism,
      failureCause: formValues.failureCause,
      failureClassification: formValues.failureClassification,
      failureDetectionMethod: formValues.failureDetectionMethod,
      safetyImpact: formValues.safetyImpact,
      environmentalImpact: formValues.environmentalImpact,
      productionImpact: formValues.productionImpact,
      repairCost: formValues.repairCost ? parseFloat(formValues.repairCost as string) : null,
      consequentialCost: formValues.consequentialCost ? parseFloat(formValues.consequentialCost as string) : null,
      partsReplaced: formValues.partsReplaced,
      repairActions: formValues.repairActions,
      repairTechnician: formValues.repairTechnician,
      operatingConditions: formValues.operatingConditions,
      preventability: formValues.preventability,
      recommendedPreventiveAction: formValues.recommendedPreventiveAction,
      recordedBy: formValues.recordedBy,
    });
  };

  // Handle form submission for editing an existing record
  const onEditSubmit = (data: any) => {
    if (!selectedRecordId) return;
    
    // Use the data as a FailureRecordFormValues
    const formValues = data as FailureRecordFormValues;
    
    // Format dates properly for PostgreSQL timestamp format
    const formattedFailureDate = formValues.failureDate instanceof Date 
      ? format(formValues.failureDate, 'yyyy-MM-dd HH:mm:ss')
      : formValues.failureDate;
    
    const formattedRepairDate = formValues.repairCompleteDate instanceof Date
      ? format(formValues.repairCompleteDate, 'yyyy-MM-dd HH:mm:ss')
      : formValues.repairCompleteDate;

    // Convert form values to numbers where needed
    const assetId = parseInt(formValues.assetId as string);
    // Allow null for failure mode if not selected
    const failureModeId = formValues.failureModeId ? parseInt(formValues.failureModeId as string) : null;
    
    updateFailureRecordMutation.mutate({
      id: selectedRecordId,
      data: {
        assetId: assetId,
        failureModeId: failureModeId,
        failureDate: formattedFailureDate,
        repairCompleteDate: formattedRepairDate,
        downtimeHours: parseFloat(formValues.downtimeHours as string) || 0,
        repairTimeHours: parseFloat(formValues.repairTimeHours as string) || 0,
        operatingHoursAtFailure: formValues.operatingHoursAtFailure ? parseFloat(formValues.operatingHoursAtFailure as string) : null,
        failureDescription: formValues.failureDescription,
        failureMechanism: formValues.failureMechanism,
        failureCause: formValues.failureCause,
        failureClassification: formValues.failureClassification,
        failureDetectionMethod: formValues.failureDetectionMethod,
        safetyImpact: formValues.safetyImpact,
        environmentalImpact: formValues.environmentalImpact,
        productionImpact: formValues.productionImpact,
        repairCost: formValues.repairCost ? parseFloat(formValues.repairCost as string) : null,
        consequentialCost: formValues.consequentialCost ? parseFloat(formValues.consequentialCost as string) : null,
        partsReplaced: formValues.partsReplaced,
        repairActions: formValues.repairActions,
        repairTechnician: formValues.repairTechnician,
        operatingConditions: formValues.operatingConditions,
        preventability: formValues.preventability,
        recommendedPreventiveAction: formValues.recommendedPreventiveAction,
        recordedBy: formValues.recordedBy,
      }
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedRecordId) {
      deleteFailureRecordMutation.mutate(selectedRecordId);
    }
  };

  // Helper function for rendering form fields
  const renderFormField = (
    form: any,
    name: string,
    label: string,
    description: string | null = null,
    type: string = "text",
    options: { value: string; label: string }[] = []
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {type === "select" ? (
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === "textarea" ? (
              <Textarea
                placeholder={`Enter ${label.toLowerCase()}`}
                {...field}
                value={field.value || ""}
              />
            ) : type === "date" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={!field.value ? "text-muted-foreground" : ""}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                type={type}
                placeholder={`Enter ${label.toLowerCase()}`}
                {...field}
                value={field.value || ""}
              />
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Failure History</h2>
          <p className="text-muted-foreground">
            Track and analyze equipment failures to improve reliability and prevent recurrence
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchFailureRecords()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Failure Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Failure Record</DialogTitle>
                <DialogDescription>
                  Enter the details of the failure event. This information is crucial for reliability analysis.
                </DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      <Separator />
                      <FormField
                        control={addForm.control}
                        name="assetId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Update the current asset ID to filter failure modes
                                  setCurrentAssetId(parseInt(value));
                                  // Reset failure mode when asset changes
                                  addForm.setValue("failureModeId", "");
                                }}
                                value={field.value}
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
                            </FormControl>
                            <FormDescription>Select the equipment that failed</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {renderFormField(
                        addForm,
                        "failureModeId",
                        "Failure Mode",
                        "Select the specific failure mode if known",
                        "select",
                        assetFailureModes.map((mode) => ({
                          value: mode.id.toString(),
                          label: mode.description,
                        }))
                      )}
                      {renderFormField(
                        addForm,
                        "failureDate",
                        "Failure Date",
                        "When did the failure occur?",
                        "date"
                      )}
                      {renderFormField(
                        addForm,
                        "repairCompleteDate",
                        "Repair Complete Date",
                        "When was the repair completed?",
                        "date"
                      )}
                      {renderFormField(
                        addForm,
                        "downtimeHours",
                        "Downtime Hours",
                        "Total equipment unavailable time",
                        "number"
                      )}
                      {renderFormField(
                        addForm,
                        "repairTimeHours",
                        "Repair Time Hours",
                        "Actual hands-on repair time",
                        "number"
                      )}
                      {renderFormField(
                        addForm,
                        "operatingHoursAtFailure",
                        "Operating Hours at Failure",
                        "Machine hours/cycles at failure (if applicable)",
                        "number"
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Failure Details</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "failureDescription",
                        "Failure Description",
                        "Describe what happened in detail",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "failureMechanism",
                        "Failure Mechanism",
                        "Physical/chemical process that caused the failure",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "failureCause",
                        "Failure Cause",
                        "Root cause of the failure",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "failureClassification",
                        "Failure Classification",
                        "Category per ISO 14224",
                        "select",
                        [
                          { value: "mechanical", label: "Mechanical" },
                          { value: "electrical", label: "Electrical" },
                          { value: "instrumentation", label: "Instrumentation" },
                          { value: "external", label: "External Influence" },
                          { value: "material", label: "Material/Corrosion" },
                          { value: "misoperation", label: "Misoperation" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "failureDetectionMethod",
                        "Detection Method",
                        "How was the failure discovered?",
                        "select",
                        [
                          { value: "inspection", label: "Inspection" },
                          { value: "testing", label: "Testing" },
                          { value: "monitoring", label: "Condition Monitoring" },
                          { value: "operation", label: "During Operation" },
                          { value: "maintenance", label: "During Maintenance" },
                          { value: "other", label: "Other" },
                        ]
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Impact Assessment</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "safetyImpact",
                        "Safety Impact",
                        null,
                        "select",
                        [
                          { value: "none", label: "None" },
                          { value: "minor", label: "Minor" },
                          { value: "major", label: "Major" },
                          { value: "critical", label: "Critical" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "environmentalImpact",
                        "Environmental Impact",
                        null,
                        "select",
                        [
                          { value: "none", label: "None" },
                          { value: "minor", label: "Minor" },
                          { value: "major", label: "Major" },
                          { value: "critical", label: "Critical" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "productionImpact",
                        "Production Impact",
                        null,
                        "select",
                        [
                          { value: "none", label: "None" },
                          { value: "minor", label: "Minor" },
                          { value: "major", label: "Major" },
                          { value: "critical", label: "Critical" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "repairCost",
                        "Repair Cost",
                        "Direct cost of repairs",
                        "number"
                      )}
                      {renderFormField(
                        addForm,
                        "consequentialCost",
                        "Consequential Cost",
                        "Business impact costs",
                        "number"
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Repair Details</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "partsReplaced",
                        "Parts Replaced",
                        "List components that were replaced",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "repairActions",
                        "Repair Actions",
                        "Describe what was done to fix the issue",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "repairTechnician",
                        "Repair Technician",
                        "Who performed the repair",
                        "text"
                      )}
                      {renderFormField(
                        addForm,
                        "operatingConditions",
                        "Operating Conditions",
                        "Conditions at time of failure",
                        "textarea"
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Prevention</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "preventability",
                        "Preventability",
                        "Could this failure have been prevented?",
                        "select",
                        [
                          { value: "preventable", label: "Preventable" },
                          { value: "nonPreventable", label: "Non-Preventable" },
                          { value: "unknown", label: "Unknown" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "recommendedPreventiveAction",
                        "Recommended Preventive Action",
                        "Suggestions to prevent recurrence",
                        "textarea"
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Metadata</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "recordedBy",
                        "Recorded By",
                        "Who recorded this failure",
                        "text"
                      )}
                    </div>
                  </div>
                  
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
                      disabled={createFailureRecordMutation.isPending}
                    >
                      {createFailureRecordMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Record"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Filters</CardTitle>
          <CardDescription>Filter failure records by asset, date, and other criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="assetFilter">Asset</Label>
              <Select
                value={selectedAssetId || "all"}
                onValueChange={(value) => setSelectedAssetId(value === "all" ? null : value)}
              >
                <SelectTrigger id="assetFilter">
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
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={!dateRange.start ? "text-muted-foreground" : ""}
                    >
                      {dateRange.start ? (
                        format(dateRange.start, "PP")
                      ) : (
                        <span>Start date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.start || undefined}
                      onSelect={(date) =>
                        setDateRange({ ...dateRange, start: date ? date : null })
                      }
                      disabled={(date) =>
                        date > new Date() || (dateRange.end ? date > dateRange.end : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="flex items-center">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={!dateRange.end ? "text-muted-foreground" : ""}
                    >
                      {dateRange.end ? (
                        format(dateRange.end, "PP")
                      ) : (
                        <span>End date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.end || undefined}
                      onSelect={(date) =>
                        setDateRange({ ...dateRange, end: date ? date : null })
                      }
                      disabled={(date) =>
                        date > new Date() || (dateRange.start ? date < dateRange.start : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAssetId(null);
                  setDateRange({ start: null, end: null });
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Failure Records</CardTitle>
          <CardDescription>
            {filteredRecords.length} 
            {selectedAssetId ? ` record${filteredRecords.length !== 1 ? 's' : ''} for selected asset` : ' total records'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No failure records found</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                {selectedAssetId ? 
                  "There are no failure records for the selected asset. Add a new failure record to begin tracking reliability data." : 
                  "There are no failure records in the system. Add a new failure record to begin tracking reliability data."}
              </p>
              <Button
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Failure Record
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Asset</TableHead>
                  <TableHead>Failure Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Downtime (hrs)</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const asset = assets.find(a => a.id === record.assetId);
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {asset ? (
                          <div>
                            <div>{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{asset.assetNumber}</div>
                          </div>
                        ) : (
                          `Asset ${record.assetId}`
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.failureDate), "PPP")}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate" title={record.failureDescription}>
                          {record.failureDescription}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cause: {record.failureCause}
                        </div>
                      </TableCell>
                      <TableCell>{record.downtimeHours.toFixed(1)}</TableCell>
                      <TableCell>
                        {record.safetyImpact && record.safetyImpact !== "none" && (
                          <Badge 
                            className={
                              record.safetyImpact === "critical" ? "bg-red-100 text-red-800" :
                              record.safetyImpact === "major" ? "bg-orange-100 text-orange-800" :
                              "bg-yellow-100 text-yellow-800"
                            }
                            variant="outline"
                          >
                            Safety: {record.safetyImpact}
                          </Badge>
                        )}
                        {record.productionImpact && record.productionImpact !== "none" && (
                          <Badge 
                            className={
                              record.productionImpact === "critical" ? "bg-red-100 text-red-800" :
                              record.productionImpact === "major" ? "bg-orange-100 text-orange-800" :
                              "bg-yellow-100 text-yellow-800"
                            }
                            variant="outline"
                          >
                            Production: {record.productionImpact}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRecordId(record.id);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <FileEdit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRecordId(record.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Failure Record</DialogTitle>
            <DialogDescription>
              Update the details of this failure event.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "assetId",
                    "Asset",
                    "Select the equipment that failed",
                    "select",
                    assets.map((asset) => ({
                      value: asset.id.toString(),
                      label: `${asset.assetNumber} - ${asset.name}`,
                    }))
                  )}
                  {renderFormField(
                    editForm,
                    "failureModeId",
                    "Failure Mode",
                    "Select the specific failure mode if known",
                    "select",
                    failureModes.map((mode) => ({
                      value: mode.id.toString(),
                      label: mode.description,
                    }))
                  )}
                  {renderFormField(
                    editForm,
                    "failureDate",
                    "Failure Date",
                    "When did the failure occur?",
                    "date"
                  )}
                  {renderFormField(
                    editForm,
                    "repairCompleteDate",
                    "Repair Complete Date",
                    "When was the repair completed?",
                    "date"
                  )}
                  {renderFormField(
                    editForm,
                    "downtimeHours",
                    "Downtime Hours",
                    "Total equipment unavailable time",
                    "number"
                  )}
                  {renderFormField(
                    editForm,
                    "repairTimeHours",
                    "Repair Time Hours",
                    "Actual hands-on repair time",
                    "number"
                  )}
                  {renderFormField(
                    editForm,
                    "operatingHoursAtFailure",
                    "Operating Hours at Failure",
                    "Machine hours/cycles at failure (if applicable)",
                    "number"
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Failure Details</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "failureDescription",
                    "Failure Description",
                    "Describe what happened in detail",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "failureMechanism",
                    "Failure Mechanism",
                    "Physical/chemical process that caused the failure",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "failureCause",
                    "Failure Cause",
                    "Root cause of the failure",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "failureClassification",
                    "Failure Classification",
                    "Category per ISO 14224",
                    "select",
                    [
                      { value: "mechanical", label: "Mechanical" },
                      { value: "electrical", label: "Electrical" },
                      { value: "instrumentation", label: "Instrumentation" },
                      { value: "external", label: "External Influence" },
                      { value: "material", label: "Material/Corrosion" },
                      { value: "misoperation", label: "Misoperation" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "failureDetectionMethod",
                    "Detection Method",
                    "How was the failure discovered?",
                    "select",
                    [
                      { value: "inspection", label: "Inspection" },
                      { value: "testing", label: "Testing" },
                      { value: "monitoring", label: "Condition Monitoring" },
                      { value: "operation", label: "During Operation" },
                      { value: "maintenance", label: "During Maintenance" },
                      { value: "other", label: "Other" },
                    ]
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Impact Assessment</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "safetyImpact",
                    "Safety Impact",
                    null,
                    "select",
                    [
                      { value: "none", label: "None" },
                      { value: "minor", label: "Minor" },
                      { value: "major", label: "Major" },
                      { value: "critical", label: "Critical" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "environmentalImpact",
                    "Environmental Impact",
                    null,
                    "select",
                    [
                      { value: "none", label: "None" },
                      { value: "minor", label: "Minor" },
                      { value: "major", label: "Major" },
                      { value: "critical", label: "Critical" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "productionImpact",
                    "Production Impact",
                    null,
                    "select",
                    [
                      { value: "none", label: "None" },
                      { value: "minor", label: "Minor" },
                      { value: "major", label: "Major" },
                      { value: "critical", label: "Critical" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "repairCost",
                    "Repair Cost",
                    "Direct cost of repairs",
                    "number"
                  )}
                  {renderFormField(
                    editForm,
                    "consequentialCost",
                    "Consequential Cost",
                    "Business impact costs",
                    "number"
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Repair Details</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "partsReplaced",
                    "Parts Replaced",
                    "List components that were replaced",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "repairActions",
                    "Repair Actions",
                    "Describe what was done to fix the issue",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "repairTechnician",
                    "Repair Technician",
                    "Who performed the repair",
                    "text"
                  )}
                  {renderFormField(
                    editForm,
                    "operatingConditions",
                    "Operating Conditions",
                    "Conditions at time of failure",
                    "textarea"
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Prevention</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "preventability",
                    "Preventability",
                    "Could this failure have been prevented?",
                    "select",
                    [
                      { value: "preventable", label: "Preventable" },
                      { value: "nonPreventable", label: "Non-Preventable" },
                      { value: "unknown", label: "Unknown" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "recommendedPreventiveAction",
                    "Recommended Preventive Action",
                    "Suggestions to prevent recurrence",
                    "textarea"
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Metadata</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "recordedBy",
                    "Recorded By",
                    "Who recorded this failure",
                    "text"
                  )}
                </div>
              </div>
              
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
                  disabled={updateFailureRecordMutation.isPending}
                >
                  {updateFailureRecordMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Record"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Failure Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this failure record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <p>This will permanently remove this record from the database.</p>
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
              disabled={deleteFailureRecordMutation.isPending}
            >
              {deleteFailureRecordMutation.isPending ? (
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
    </div>
  );
};

export default FailureHistory;