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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CalendarIcon, 
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
  FileDown,
  Download
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Define the form schema for creating/editing failure records
const failureRecordFormSchema = z.object({
  // References
  assetId: z.coerce.string().min(1, "Please select an asset"),
  failureModeId: z.coerce.string().min(1, "Please select a failure mode"),
  workOrderNumber: z.string().optional(),
  
  // Timing and dates
  installationDate: z.date().nullable().optional(),
  lastFailureDate: z.date().nullable().optional(),
  failureDate: z.date({
    required_error: "Please select the failure date",
  }),
  repairCompleteDate: z.date({
    required_error: "Please select the repair completion date",
  }).nullable(),
  tbfDays: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  
  // Duration metrics
  downtimeHours: z.coerce.number().min(0, "Downtime hours must be a positive number"),
  repairTimeHours: z.coerce.number().min(0, "Repair time hours must be a positive number"),
  operatingHoursAtFailure: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  
  // Failure details
  failedPart: z.string().optional(),
  failureDescription: z.string().min(5, "Please provide a failure description"),
  failureMechanism: z.string().optional(),
  failureCause: z.string().min(3, "Please provide the failure cause"),
  potentialRootCause: z.string().optional(),
  
  // Equipment status
  equipmentStatus: z.string().optional(),
  equipmentLocation: z.string().optional(),
  
  // Classification fields
  failureClassification: z.string().optional(),
  failureDetectionMethod: z.string().min(1, "Please select how the failure was detected"),
  
  // Impact assessment
  safetyImpact: z.string().optional(),
  environmentalImpact: z.string().optional(),
  productionImpact: z.string().optional(),
  
  // Financial data
  repairCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  consequentialCost: z.union([z.coerce.number().min(0), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  
  // Repair details
  partsReplaced: z.string().optional(),
  repairActions: z.string().min(3, "Please describe the repair actions taken"),
  repairTechnician: z.string().optional(),
  operatingConditions: z.string().optional(),
  
  // RCM and prevention
  preventability: z.string().optional(),
  recommendedPreventiveAction: z.string().optional(),
  needsRCA: z.string().min(1, "Please select whether RCA is required"),
  
  // Metadata
  recordedBy: z.string().optional(),
  verifiedBy: z.string().optional(),
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

  // State to track the currently selected asset in the add form
  const [currentAssetId, setCurrentAssetId] = useState<number | null>(null);
  const [currentEquipmentClass, setCurrentEquipmentClass] = useState<string | null>(null);

  // Fetch assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 60000,
  });

  // Fetch failure modes based on current equipment class
  const { data: allFailureModes = [] } = useQuery<FailureMode[]>({
    queryKey: ['/api/failure-modes/class', currentEquipmentClass],
    staleTime: 60000,
    queryFn: async () => {
      if (!currentEquipmentClass) return [];
      
      const response = await fetch(`/api/failure-modes/class/${encodeURIComponent(currentEquipmentClass)}`);
      if (!response.ok) throw new Error('Failed to fetch failure modes');
      return response.json();
    },
    enabled: !!currentEquipmentClass, // Only run the query when we have an equipment class
  });
  
  // When asset changes, update the equipment class
  useEffect(() => {
    if (currentAssetId) {
      const selectedAsset = assets.find(asset => asset.id === currentAssetId);
      if (selectedAsset) {
        setCurrentEquipmentClass(selectedAsset.equipmentClass || null);
      }
    } else {
      setCurrentEquipmentClass(null);
    }
  }, [currentAssetId, assets]);
  
  // Filter failure modes for the currently selected asset AND matching equipment class
  const assetFailureModes = useMemo(() => {
    if (!currentAssetId) return [];
    
    console.log("Current asset ID:", currentAssetId);
    console.log("Current equipment class:", currentEquipmentClass);
    console.log("All failure modes:", allFailureModes);
    
    // First try to find modes specifically for this asset
    const exactAssetModes = allFailureModes.filter(mode => mode.assetId === currentAssetId);
    
    if (exactAssetModes.length > 0) {
      console.log("Found exact asset modes:", exactAssetModes);
      return exactAssetModes;
    }
    
    // If no specific failure modes for this asset, try to find modes matching the equipment class
    if (currentEquipmentClass) {
      console.log("Searching for modes with equipment class:", currentEquipmentClass);
      
      // Direct debugging to check all modes
      console.log("All failure modes with equipmentClass:", 
        allFailureModes.map(mode => {
          return {
            id: mode.id,
            description: mode.description,
            equipmentClass: mode.equipmentClass
          };
        })
      );
      
      const classModes = allFailureModes.filter(mode => {
        // Simple string comparison with the equipment class
        return mode.equipmentClass === currentEquipmentClass;
      });
      
      console.log("Found equipment class modes:", classModes);
      return classModes;
    }
    
    console.log("No failure modes found for this asset");
    return [];
  }, [currentAssetId, currentEquipmentClass, allFailureModes]);

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
      // References
      assetId: selectedAssetId || "",
      failureModeId: "",
      workOrderNumber: "",
      
      // Timing and dates
      installationDate: undefined,
      lastFailureDate: undefined,
      failureDate: new Date(),
      repairCompleteDate: new Date(),
      tbfDays: "",
      
      // Duration metrics
      downtimeHours: "",
      repairTimeHours: "",
      operatingHoursAtFailure: "",
      
      // Failure details
      failedPart: "",
      failureDescription: "",
      failureMechanism: "",
      failureCause: "",
      potentialRootCause: "",
      
      // Equipment status
      equipmentStatus: "",
      equipmentLocation: "",
      
      // Classification
      failureClassification: "",
      failureDetectionMethod: "",
      
      // Impact assessment
      safetyImpact: "",
      environmentalImpact: "",
      productionImpact: "",
      
      // Financial data
      repairCost: "",
      consequentialCost: "",
      
      // Repair details
      partsReplaced: "",
      repairActions: "",
      repairTechnician: "",
      operatingConditions: "",
      
      // RCM and prevention
      preventability: "",
      recommendedPreventiveAction: "",
      needsRCA: "",
      
      // Metadata
      recordedBy: "",
      verifiedBy: "",
    },
  });

  // Form setup for editing an existing failure record
  const editForm = useForm<any>({
    resolver: zodResolver(failureRecordFormSchema),
    defaultValues: {
      assetId: "",
      failureModeId: "_empty_",
      workOrderNumber: "",
      installationDate: undefined,
      lastFailureDate: undefined,
      failureDate: new Date(),
      repairCompleteDate: undefined,
      tbfDays: "",
      downtimeHours: "",
      repairTimeHours: "",
      operatingHoursAtFailure: "",
      failureClassification: "",
      failureDetectionMethod: "",
      failedPart: "",
      failureDescription: "",
      failureMechanism: "",
      failureCause: "",
      potentialRootCause: "",
      equipmentStatus: "",
      equipmentLocation: "",
      operatingConditions: "",
      safetyImpact: "",
      environmentalImpact: "",
      productionImpact: "",
      repairCost: "",
      consequentialCost: "",
      partsReplaced: "",
      repairActions: "",
      repairTechnician: "",
      preventability: "",
      recommendedPreventiveAction: "",
      needsRCA: "",
      recordedBy: "",
      verifiedBy: "",
    },
  });

  // Handle edit button click
  const handleEditClick = (recordId: number) => {
    setSelectedRecordId(recordId);
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (recordId: number) => {
    setSelectedRecordId(recordId);
    setIsDeleteDialogOpen(true);
  };

  // Load the selected record into the edit form when it changes
  useEffect(() => {
    if (isEditDialogOpen && selectedRecordId) {
      const record = failureRecords.find(rec => rec.id === selectedRecordId);
      
      if (record) {
        // Find the asset for this record to set current asset and equipment class
        setCurrentAssetId(record.assetId);
        const selectedAsset = assets.find(a => a.id === record.assetId);
        if (selectedAsset) {
          setCurrentEquipmentClass(selectedAsset.equipmentClass || null);
        }
        
        // Convert string dates to Date objects for the form
        const formValues = {
          ...record,
          // Convert string dates to Date objects
          installationDate: record.installationDate ? new Date(record.installationDate) : undefined,
          lastFailureDate: record.lastFailureDate ? new Date(record.lastFailureDate) : undefined,
          failureDate: new Date(record.failureDate),
          repairCompleteDate: record.repairCompleteDate ? new Date(record.repairCompleteDate) : undefined,
          
          // Convert IDs to strings for select fields
          assetId: record.assetId.toString(),
          failureModeId: record.failureModeId ? record.failureModeId.toString() : "",
        };
        
        editForm.reset(formValues);
      }
    }
  }, [isEditDialogOpen, selectedRecordId, failureRecords, editForm]);

  // Handle form submission for adding a new record
  const onAddSubmit = (data: FailureRecordFormValues) => {
    // Convert form values to numbers where needed
    const assetId = parseInt(data.assetId);
    const failureModeId = parseInt(data.failureModeId);
    
    // Auto-calculate TBF/TTF if we have the dates and it's not manually set
    // First convert tbfDays to a number regardless of its current type
    let tbfValue = 0;
    if (typeof data.tbfDays === 'number') {
      tbfValue = data.tbfDays;
    } else if (typeof data.tbfDays === 'string' && data.tbfDays !== '') {
      tbfValue = parseFloat(data.tbfDays);
    }
    
    // Calculate TBF if it's not set and we have lastFailureDate
    if (data.lastFailureDate && data.failureDate && tbfValue === 0) {
      const differenceInMs = data.failureDate.getTime() - data.lastFailureDate.getTime();
      const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);
      tbfValue = parseFloat(differenceInDays.toFixed(2));
      console.log("TBF calculated from last failure:", tbfValue);
    } 
    // If no lastFailureDate but we have installation date, calculate TTF (Time To Failure)
    else if (data.installationDate && data.failureDate && tbfValue === 0) {
      const differenceInMs = data.failureDate.getTime() - data.installationDate.getTime();
      const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);
      tbfValue = parseFloat(differenceInDays.toFixed(2));
      console.log("TTF calculated from installation date:", tbfValue);
    }
    // For first failures without installation date, users can still manually enter TBF/TTF
    
    // Auto-calculate downtime hours if we have both dates
    // First convert downtimeHours to a number regardless of its current type
    let downtimeValue = 0;
    if (typeof data.downtimeHours === 'number') {
      downtimeValue = data.downtimeHours;
    } else if (typeof data.downtimeHours === 'string' && data.downtimeHours !== '') {
      downtimeValue = parseFloat(data.downtimeHours);
    }
    
    // Calculate downtime if it's not set and we have both dates
    if (data.failureDate && data.repairCompleteDate && downtimeValue === 0) {
      const differenceInMs = data.repairCompleteDate.getTime() - data.failureDate.getTime();
      const differenceInHours = differenceInMs / (1000 * 60 * 60);
      downtimeValue = parseFloat(differenceInHours.toFixed(2));
    }
    
    // Prepare dates in ISO string format to avoid type issues at the server
    createFailureRecordMutation.mutate({
      // References
      assetId: assetId,
      failureModeId: failureModeId,
      workOrderNumber: data.workOrderNumber,
      
      // Timing and dates - convert to ISO strings
      installationDate: data.installationDate ? data.installationDate.toISOString() : null,
      lastFailureDate: data.lastFailureDate ? data.lastFailureDate.toISOString() : null,
      failureDate: data.failureDate.toISOString(),
      repairCompleteDate: data.repairCompleteDate ? data.repairCompleteDate.toISOString() : null,
      tbfDays: tbfValue,
      
      // Duration metrics
      downtimeHours: downtimeValue,
      repairTimeHours: data.repairTimeHours,
      operatingHoursAtFailure: data.operatingHoursAtFailure,
      
      // Failure details
      failedPart: data.failedPart,
      failureDescription: data.failureDescription,
      failureMechanism: data.failureMechanism,
      failureCause: data.failureCause,
      potentialRootCause: data.potentialRootCause,
      
      // Equipment status
      equipmentStatus: data.equipmentStatus,
      equipmentLocation: data.equipmentLocation,
      
      // Classification fields
      failureClassification: data.failureClassification,
      failureDetectionMethod: data.failureDetectionMethod,
      
      // Impact assessment
      safetyImpact: data.safetyImpact,
      environmentalImpact: data.environmentalImpact,
      productionImpact: data.productionImpact,
      
      // Financial data
      repairCost: data.repairCost,
      consequentialCost: data.consequentialCost,
      
      // Repair details
      partsReplaced: data.partsReplaced,
      repairActions: data.repairActions,
      repairTechnician: data.repairTechnician,
      operatingConditions: data.operatingConditions,
      
      // RCM and prevention
      preventability: data.preventability,
      recommendedPreventiveAction: data.recommendedPreventiveAction,
      needsRCA: data.needsRCA,
      
      // Metadata
      recordedBy: data.recordedBy,
      verifiedBy: data.verifiedBy,
    });
  };

  // Handle form submission for editing an existing record
  const onEditSubmit = (data: any) => {
    if (!selectedRecordId) return;
    
    // Convert form values to numbers where needed
    const assetId = parseInt(data.assetId);
    const failureModeId = parseInt(data.failureModeId);
    
    // Auto-calculate TBF/TTF if we have the dates and it's not manually set
    // First convert tbfDays to a number regardless of its current type
    let tbfValue = 0;
    if (typeof data.tbfDays === 'number') {
      tbfValue = data.tbfDays;
    } else if (typeof data.tbfDays === 'string' && data.tbfDays !== '') {
      tbfValue = parseFloat(data.tbfDays);
    }
    
    // Calculate TBF if it's not set and we have lastFailureDate
    if (data.lastFailureDate && data.failureDate && tbfValue === 0) {
      const differenceInMs = data.failureDate.getTime() - data.lastFailureDate.getTime();
      const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);
      tbfValue = parseFloat(differenceInDays.toFixed(2));
      console.log("TBF calculated from last failure:", tbfValue);
    } 
    // If no lastFailureDate but we have installation date, calculate TTF (Time To Failure)
    else if (data.installationDate && data.failureDate && tbfValue === 0) {
      const differenceInMs = data.failureDate.getTime() - data.installationDate.getTime();
      const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);
      tbfValue = parseFloat(differenceInDays.toFixed(2));
      console.log("TTF calculated from installation date:", tbfValue);
    }
    
    // Auto-calculate downtime hours if we have both dates
    // First convert downtimeHours to a number regardless of its current type
    let downtimeValue = 0;
    if (typeof data.downtimeHours === 'number') {
      downtimeValue = data.downtimeHours;
    } else if (typeof data.downtimeHours === 'string' && data.downtimeHours !== '') {
      downtimeValue = parseFloat(data.downtimeHours);
    }
    
    // Calculate downtime if it's not set and we have both dates
    if (data.failureDate && data.repairCompleteDate && downtimeValue === 0) {
      const differenceInMs = data.repairCompleteDate.getTime() - data.failureDate.getTime();
      const differenceInHours = differenceInMs / (1000 * 60 * 60);
      downtimeValue = parseFloat(differenceInHours.toFixed(2));
    }
    
    // Prepare payload with properly formatted dates
    updateFailureRecordMutation.mutate({
      id: selectedRecordId,
      data: {
        // References
        assetId: assetId,
        failureModeId: failureModeId,
        workOrderNumber: data.workOrderNumber,
        
        // Timing and dates - convert to ISO strings
        installationDate: data.installationDate ? data.installationDate.toISOString() : null,
        lastFailureDate: data.lastFailureDate ? data.lastFailureDate.toISOString() : null,
        failureDate: data.failureDate.toISOString(),
        repairCompleteDate: data.repairCompleteDate ? data.repairCompleteDate.toISOString() : null,
        tbfDays: tbfValue,
        
        // Duration metrics
        downtimeHours: downtimeValue,
        repairTimeHours: data.repairTimeHours,
        operatingHoursAtFailure: data.operatingHoursAtFailure,
        
        // Failure details
        failedPart: data.failedPart,
        failureDescription: data.failureDescription,
        failureMechanism: data.failureMechanism,
        failureCause: data.failureCause,
        potentialRootCause: data.potentialRootCause,
        
        // Equipment status
        equipmentStatus: data.equipmentStatus,
        equipmentLocation: data.equipmentLocation,
        
        // Classification fields
        failureClassification: data.failureClassification,
        failureDetectionMethod: data.failureDetectionMethod,
        
        // Impact assessment
        safetyImpact: data.safetyImpact,
        environmentalImpact: data.environmentalImpact,
        productionImpact: data.productionImpact,
        
        // Financial data
        repairCost: data.repairCost,
        consequentialCost: data.consequentialCost,
        
        // Repair details
        partsReplaced: data.partsReplaced,
        repairActions: data.repairActions,
        repairTechnician: data.repairTechnician,
        operatingConditions: data.operatingConditions,
        
        // RCM and prevention
        preventability: data.preventability,
        recommendedPreventiveAction: data.recommendedPreventiveAction,
        needsRCA: data.needsRCA,
        
        // Metadata
        recordedBy: data.recordedBy,
        verifiedBy: data.verifiedBy,
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
    options: { value: string; label: string }[] = [],
    isReadOnly: boolean = false
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
                value={field.value || "_empty_"}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.length > 0 ? (
                    options.map((option) => (
                      <SelectItem key={option.value} value={option.value || "_empty_"}>
                        {option.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_empty_">No options available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : type === "textarea" ? (
              <Textarea
                placeholder={`Enter ${label.toLowerCase()}`}
                {...field}
                value={field.value || ""}
                disabled={isReadOnly}
              />
            ) : type === "date" ? (
              isReadOnly ? (
                // Read-only date display
                <div className="border rounded p-2 bg-muted/20">
                  {field.value ? format(field.value, "PPP") : "Not set"}
                </div>
              ) : (
                // Editable date picker
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
              )
            ) : (
              <Input
                type={type}
                placeholder={`Enter ${label.toLowerCase()}`}
                {...field}
                value={field.value || ""}
                disabled={isReadOnly}
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
          <Button 
            variant="outline" 
            onClick={() => {
              const csvData = [
                // CSV Header
                [
                  'Asset Number', 
                  'Asset Name', 
                  'Work Order', 
                  'Installation Date',
                  'Last Failure Date',
                  'Failure Date', 
                  'Repair Date',
                  'TTF/TBF (Days)',
                  'Downtime (Hours)',
                  'Repair Time (Hours)',
                  'Operating Hours at Failure',
                  'Failure Mode',
                  'Failure Classification',
                  'Failure Mechanism',
                  'Failure Detection Method',
                  'Failed Part',
                  'Equipment Status',
                  'Equipment Location',
                  'Failure Description',
                  'Failure Cause',
                  'Potential Root Cause',
                  'Safety Impact',
                  'Environmental Impact',
                  'Production Impact',
                  'Repair Cost',
                  'Consequential Cost',
                  'Parts Replaced',
                  'Repair Actions',
                  'Repair Technician',
                  'Operating Conditions',
                  'Preventability',
                  'Recommended Preventive Action',
                  'Needs RCA',
                  'Recorded By',
                  'Verified By'
                ],
                // Data rows
                ...filteredRecords.map(record => {
                  const asset = assets.find(a => a.id === record.assetId);
                  const failureMode = allFailureModes.find(m => m.id === record.failureModeId);
                  const timeLabel = record.lastFailureDate ? "TBF" : "TTF";
                  
                  return [
                    asset?.assetNumber || '',
                    asset?.name || '',
                    record.workOrderNumber || '',
                    record.installationDate ? format(new Date(record.installationDate), "yyyy-MM-dd") : '',
                    record.lastFailureDate ? format(new Date(record.lastFailureDate), "yyyy-MM-dd") : '',
                    record.failureDate ? format(new Date(record.failureDate), "yyyy-MM-dd") : '',
                    record.repairCompleteDate ? format(new Date(record.repairCompleteDate), "yyyy-MM-dd") : '',
                    `${timeLabel}: ${record.tbfDays?.toString() || ''}`,
                    record.downtimeHours?.toString() || '',
                    record.repairTimeHours?.toString() || '',
                    record.operatingHoursAtFailure?.toString() || '',
                    failureMode?.description || '',
                    record.failureClassification || '',
                    record.failureMechanism || '',
                    record.failureDetectionMethod || '',
                    record.failedPart || '',
                    record.equipmentStatus || '',
                    record.equipmentLocation || '',
                    record.failureDescription?.replace(/"/g, '""') || '',
                    record.failureCause?.replace(/"/g, '""') || '',
                    record.potentialRootCause?.replace(/"/g, '""') || '',
                    record.safetyImpact?.replace(/"/g, '""') || '',
                    record.environmentalImpact?.replace(/"/g, '""') || '',
                    record.productionImpact?.replace(/"/g, '""') || '',
                    record.repairCost?.toString() || '',
                    record.consequentialCost?.toString() || '',
                    record.partsReplaced?.replace(/"/g, '""') || '',
                    record.repairActions?.replace(/"/g, '""') || '',
                    record.repairTechnician || '',
                    record.operatingConditions?.replace(/"/g, '""') || '',
                    record.preventability || '',
                    record.recommendedPreventiveAction?.replace(/"/g, '""') || '',
                    record.needsRCA || '',
                    record.recordedBy || '',
                    record.verifiedBy || ''
                  ];
                })
              ];
              
              // Convert to CSV string
              const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
              
              // Create download link
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `failure_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
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
                                  console.log("Asset selected:", value);
                                  field.onChange(value);
                                  
                                  // Update the current asset ID to filter failure modes
                                  const assetId = parseInt(value);
                                  setCurrentAssetId(assetId);
                                  console.log("Set current asset ID to:", assetId);
                                  
                                  // Find selected asset to get its equipment class and update it immediately
                                  const selectedAsset = assets.find(a => a.id === assetId);
                                  console.log("Selected asset:", selectedAsset);
                                  
                                  // Update equipment class directly when asset changes
                                  if (selectedAsset && selectedAsset.equipmentClass) {
                                    console.log("Setting equipment class to:", selectedAsset.equipmentClass);
                                    setCurrentEquipmentClass(selectedAsset.equipmentClass);
                                    
                                    // Set installation date from Asset Master data
                                    if (selectedAsset.installationDate) {
                                      console.log("Setting installation date from Asset Master:", selectedAsset.installationDate);
                                      addForm.setValue("installationDate", new Date(selectedAsset.installationDate));
                                    } else {
                                      console.log("No installation date in Asset Master");
                                      addForm.setValue("installationDate", undefined);
                                    }
                                  } else {
                                    console.log("No equipment class found for this asset");
                                    setCurrentEquipmentClass(null);
                                  }
                                  
                                  // Reset failure mode when asset changes
                                  addForm.setValue("failureModeId", "_empty_");
                                }}
                                value={field.value || "_empty_"}
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
                        "workOrderNumber",
                        "Work Order Number",
                        "Reference WO number for this failure",
                        "text"
                      )}
                      {renderFormField(
                        addForm,
                        "failureModeId",
                        "Failure Mode",
                        "Select the failure mode that occurred (required)",
                        "select",
                        assetFailureModes.map((mode) => ({
                          value: mode.id.toString(),
                          label: mode.description,
                        }))
                      )}
                      
                      <h3 className="text-lg font-medium pt-4">Dates and Timing</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "installationDate",
                        "Installation Date",
                        "When the equipment was installed or last overhauled (auto-filled from Asset Master)",
                        "date",
                        [],
                        true
                      )}
                      {renderFormField(
                        addForm,
                        "lastFailureDate",
                        "Last Failure Date",
                        "When this equipment last failed (if applicable)",
                        "date"
                      )}
                      {renderFormField(
                        addForm,
                        "failureDate",
                        "Failure Date",
                        "When the current failure occurred",
                        "date"
                      )}
                      {renderFormField(
                        addForm,
                        "repairCompleteDate",
                        "Repair Complete Date",
                        "When repairs were completed",
                        "date"
                      )}
                      {renderFormField(
                        addForm,
                        "tbfDays",
                        "TTF/TBF (Days)",
                        "Time To First Failure (TTF) when installation date is provided but no last failure date. Time Between Failures (TBF) when last failure date is provided. Can be manually entered.",
                        "number"
                      )}
                      
                      <h3 className="text-lg font-medium pt-4">Duration Metrics</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "downtimeHours",
                        "Downtime Hours",
                        "Total hours the equipment was unavailable (calculated automatically from dates if not provided)",
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
                        "Running hours since installation or last overhaul",
                        "number"
                      )}
                      
                      <h3 className="text-lg font-medium pt-4">Classification</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "failureClassification",
                        "Failure Classification",
                        "Category of failure",
                        "select",
                        [
                          { value: "Catastrophic", label: "Catastrophic" },
                          { value: "Major", label: "Major" },
                          { value: "Minor", label: "Minor" },
                          { value: "Incipient", label: "Incipient" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "failureDetectionMethod",
                        "Failure Detection Method",
                        "How the failure was identified",
                        "select",
                        [
                          { value: "Alarm", label: "Alarm" },
                          { value: "Operator Observation", label: "Operator Observation" },
                          { value: "Condition Monitoring", label: "Condition Monitoring" },
                          { value: "Routine Inspection", label: "Routine Inspection" },
                          { value: "Performance Degradation", label: "Performance Degradation" },
                          { value: "Maintenance Check", label: "Maintenance Check" },
                          { value: "Functional Failure", label: "Functional Failure" },
                        ]
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Failure Details</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "failureDescription",
                        "Failure Description",
                        "What happened? Describe the failure symptoms and effects.",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "failureCause",
                        "Failure Cause",
                        "What caused the failure? Immediate technical reason (e.g., bearing seizure, control system error)",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "potentialRootCause",
                        "Potential Root Cause",
                        "Why did the failure occur? Underlying system or process issues.",
                        "textarea"
                      )}
                      {renderFormField(
                        addForm,
                        "failureMechanism",
                        "Failure Mechanism",
                        "How did it fail? Physical/chemical process (e.g., fatigue, corrosion, wear)",
                        "select",
                        [
                          { value: "Mechanical Wear", label: "Mechanical Wear" },
                          { value: "Fatigue", label: "Fatigue" },
                          { value: "Corrosion", label: "Corrosion" },
                          { value: "Erosion", label: "Erosion" },
                          { value: "Overload", label: "Overload" },
                          { value: "Electrical Failure", label: "Electrical Failure" },
                          { value: "Contamination", label: "Contamination" },
                          { value: "Human Error", label: "Human Error" },
                          { value: "Software/Control Fault", label: "Software/Control Fault" },
                          { value: "Unknown", label: "Unknown" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "failedPart",
                        "Failed Part",
                        "Specific component or part that failed",
                        "text"
                      )}
                      
                      <h3 className="text-lg font-medium pt-4">Equipment Status</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "equipmentStatus",
                        "Equipment Status",
                        "Condition or operating mode at time of failure",
                        "select",
                        [
                          { value: "Normal Operation", label: "Normal Operation" },
                          { value: "Startup", label: "Startup" },
                          { value: "Shutdown", label: "Shutdown" },
                          { value: "Standby", label: "Standby" },
                          { value: "Abnormal Operation", label: "Abnormal Operation" },
                          { value: "Overload", label: "Overload" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "equipmentLocation",
                        "Equipment Location",
                        "Specific area or location where the asset was installed",
                        "text"
                      )}
                      {renderFormField(
                        addForm,
                        "operatingConditions",
                        "Operating Conditions",
                        "Environmental or process conditions at time of failure",
                        "textarea"
                      )}
                      
                      <h3 className="text-lg font-medium pt-4">Impact Assessment</h3>
                      <Separator />
                      {renderFormField(
                        addForm,
                        "safetyImpact",
                        "Safety Impact",
                        "Impact on personnel safety",
                        "select",
                        [
                          { value: "None", label: "None" },
                          { value: "Low", label: "Low" },
                          { value: "Medium", label: "Medium" },
                          { value: "High", label: "High" },
                          { value: "Critical", label: "Critical" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "environmentalImpact",
                        "Environmental Impact",
                        "Impact on environment",
                        "select",
                        [
                          { value: "None", label: "None" },
                          { value: "Low", label: "Low" },
                          { value: "Medium", label: "Medium" },
                          { value: "High", label: "High" },
                          { value: "Critical", label: "Critical" },
                        ]
                      )}
                      {renderFormField(
                        addForm,
                        "productionImpact",
                        "Production Impact",
                        "Impact on production or operations",
                        "select",
                        [
                          { value: "None", label: "None" },
                          { value: "Minimal", label: "Minimal" },
                          { value: "Partial", label: "Partial" },
                          { value: "Significant", label: "Significant" },
                          { value: "Complete", label: "Complete" },
                        ]
                      )}
                      
                      <h3 className="text-lg font-medium pt-4">Financial Data</h3>
                      <Separator />
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
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Repair Details</h3>
                    <Separator />
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
                      "partsReplaced",
                      "Parts Replaced",
                      "List of parts that were replaced during repair",
                      "textarea"
                    )}
                  </div>
                  
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
                        { value: "Preventable", label: "Preventable" },
                        { value: "Partially Preventable", label: "Partially Preventable" },
                        { value: "Not Preventable", label: "Not Preventable" },
                        { value: "Unknown", label: "Unknown" },
                      ]
                    )}
                    {renderFormField(
                      addForm,
                      "recommendedPreventiveAction",
                      "Recommended Preventive Action",
                      "Suggestions to prevent recurrence",
                      "textarea"
                    )}
                    {renderFormField(
                      addForm,
                      "needsRCA",
                      "Needs Root Cause Analysis",
                      "Does this failure require a formal RCA?",
                      "select",
                      [
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" },
                        { value: "Maybe", label: "Maybe - Needs Review" },
                      ]
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
                    {renderFormField(
                      addForm,
                      "verifiedBy",
                      "Verified By",
                      "Who verified this record (if applicable)",
                      "text"
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Record</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Failure Records</CardTitle>
                <CardDescription>
                  {filteredRecords.length} records found
                </CardDescription>
              </div>
              <div>
                <Select
                  value={selectedAssetId || "_all_"}
                  onValueChange={(value) => setSelectedAssetId(value === "_all_" ? null : value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_">All Assets</SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id.toString()}>
                        {asset.assetNumber} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No failure records found</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {selectedAssetId
                    ? "There are no failure records for the selected asset."
                    : "No failure records have been added yet."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Record
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Install Date</TableHead>
                      <TableHead>Failure Date</TableHead>
                      <TableHead>Repair Date</TableHead>
                      <TableHead>Failure Mode</TableHead>
                      <TableHead>Failed Part</TableHead>
                      <TableHead>TTF/TBF (days)</TableHead>
                      <TableHead>Oper. Hours</TableHead>
                      <TableHead>Downtime (hrs)</TableHead>
                      <TableHead>Fail Mechanism</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => {
                      const asset = assets.find(a => a.id === record.assetId);
                      const failureMode = allFailureModes.find(m => m.id === record.failureModeId);
                      
                      // Determine if this is TTF or TBF based on data
                      // TTF when we have installation date but no last failure date
                      // TBF when we have a previous failure date
                      const timeLabel = record.lastFailureDate ? "TBF" : (record.installationDate ? "TTF" : "TBF");
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            {asset ? `${asset.assetNumber} - ${asset.name}` : `Asset ID ${record.assetId}`}
                          </TableCell>
                          <TableCell>
                            {record.workOrderNumber || "—"}
                          </TableCell>
                          <TableCell>
                            {record.installationDate ? format(new Date(record.installationDate), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            {record.failureDate ? format(new Date(record.failureDate), "MMM d, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell>
                            {record.repairCompleteDate ? format(new Date(record.repairCompleteDate), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            {failureMode ? failureMode.description : (record.failureModeId ? `Mode ID ${record.failureModeId}` : "N/A")}
                          </TableCell>
                          <TableCell>
                            {record.failedPart || "—"}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium">
                                  <Badge variant={timeLabel === "TTF" ? "secondary" : "outline"}>
                                    {timeLabel}
                                  </Badge>
                                  &nbsp;{record.tbfDays?.toFixed(1) || "—"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>
                                  {timeLabel === "TTF" ? 
                                    "Time To Failure: Days from installation date to first failure" : 
                                    "Time Between Failures: Days since previous failure date"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {record.operatingHoursAtFailure?.toFixed(1) || "—"}
                          </TableCell>
                          <TableCell>
                            {record.downtimeHours?.toFixed(1) || "—"}
                          </TableCell>
                          <TableCell>
                            {record.failureMechanism || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              record.failureClassification === "Catastrophic" ? "destructive" :
                              record.failureClassification === "Major" ? "destructive" :
                              record.failureClassification === "Minor" ? "outline" :
                              record.failureClassification === "Incipient" ? "secondary" :
                              "outline"
                            }>
                              {record.failureClassification || "Not classified"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(record.id)}
                              >
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                  <FormField
                    control={editForm.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              
                              // Update the current asset ID to filter failure modes
                              const assetId = parseInt(value);
                              setCurrentAssetId(assetId);
                              
                              // Find selected asset to update equipment class
                              const selectedAsset = assets.find(a => a.id === assetId);
                              if (selectedAsset) {
                                setCurrentEquipmentClass(selectedAsset.equipmentClass || null);
                              }
                              
                              // Reset failure mode when asset changes
                              editForm.setValue("failureModeId", "_empty_");
                            }}
                            value={field.value || "_empty_"}
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
                    editForm,
                    "workOrderNumber",
                    "Work Order Number",
                    "Reference WO number for this failure",
                    "text"
                  )}
                  {renderFormField(
                    editForm,
                    "failureModeId",
                    "Failure Mode",
                    "Select the failure mode that occurred (required)",
                    "select",
                    assetFailureModes.map((mode) => ({
                      value: mode.id.toString(),
                      label: mode.description,
                    }))
                  )}
                  
                  <h3 className="text-lg font-medium pt-4">Dates and Timing</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "installationDate",
                    "Installation Date",
                    "When the equipment was installed or last overhauled",
                    "date"
                  )}
                  {renderFormField(
                    editForm,
                    "lastFailureDate",
                    "Last Failure Date",
                    "When this equipment last failed (if applicable)",
                    "date"
                  )}
                  {renderFormField(
                    editForm,
                    "failureDate",
                    "Failure Date",
                    "When the current failure occurred",
                    "date"
                  )}
                  {renderFormField(
                    editForm,
                    "repairCompleteDate",
                    "Repair Complete Date",
                    "When repairs were completed",
                    "date"
                  )}
                  {renderFormField(
                    editForm,
                    "tbfDays",
                    "TTF/TBF (Days)",
                    "Time To First Failure (TTF) when installation date is provided but no last failure date. Time Between Failures (TBF) when last failure date is provided. Can be manually entered.",
                    "number"
                  )}
                  
                  <h3 className="text-lg font-medium pt-4">Duration Metrics</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "downtimeHours",
                    "Downtime Hours",
                    "Total hours the equipment was unavailable (calculated automatically from dates if not provided)",
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
                    "Running hours since installation or last overhaul",
                    "number"
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Classification</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "failureClassification",
                    "Failure Classification",
                    "Category of failure",
                    "select",
                    [
                      { value: "Catastrophic", label: "Catastrophic" },
                      { value: "Major", label: "Major" },
                      { value: "Minor", label: "Minor" },
                      { value: "Incipient", label: "Incipient" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "failureDetectionMethod",
                    "Failure Detection Method",
                    "How the failure was identified",
                    "select",
                    [
                      { value: "Alarm", label: "Alarm" },
                      { value: "Operator Observation", label: "Operator Observation" },
                      { value: "Condition Monitoring", label: "Condition Monitoring" },
                      { value: "Routine Inspection", label: "Routine Inspection" },
                      { value: "Performance Degradation", label: "Performance Degradation" },
                      { value: "Maintenance Check", label: "Maintenance Check" },
                      { value: "Functional Failure", label: "Functional Failure" },
                    ]
                  )}
                  
                  <h3 className="text-lg font-medium pt-4">Failure Details</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "failureDescription",
                    "Failure Description",
                    "What happened? Describe the failure symptoms and effects.",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "failureCause",
                    "Failure Cause",
                    "What caused the failure? Immediate technical reason",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "potentialRootCause",
                    "Potential Root Cause",
                    "Why did the failure occur? Underlying system or process issues.",
                    "textarea"
                  )}
                  {renderFormField(
                    editForm,
                    "failureMechanism",
                    "Failure Mechanism",
                    "How did it fail? Physical/chemical process",
                    "select",
                    [
                      { value: "Mechanical Wear", label: "Mechanical Wear" },
                      { value: "Fatigue", label: "Fatigue" },
                      { value: "Corrosion", label: "Corrosion" },
                      { value: "Erosion", label: "Erosion" },
                      { value: "Overload", label: "Overload" },
                      { value: "Electrical Failure", label: "Electrical Failure" },
                      { value: "Contamination", label: "Contamination" },
                      { value: "Human Error", label: "Human Error" },
                      { value: "Software/Control Fault", label: "Software/Control Fault" },
                      { value: "Unknown", label: "Unknown" },
                    ]
                  )}
                  {renderFormField(
                    editForm,
                    "failedPart",
                    "Failed Part",
                    "Specific component or part that failed",
                    "text"
                  )}
                  
                  <h3 className="text-lg font-medium pt-4">Equipment Status</h3>
                  <Separator />
                  {renderFormField(
                    editForm,
                    "equipmentStatus",
                    "Equipment Status",
                    "Condition or operating mode at time of failure",
                    "select",
                    [
                      { value: "Normal Operation", label: "Normal Operation" },
                      { value: "Startup", label: "Startup" },
                      { value: "Shutdown", label: "Shutdown" },
                      { value: "Standby", label: "Standby" },
                      { value: "Abnormal Operation", label: "Abnormal Operation" },
                      { value: "Overload", label: "Overload" },
                    ]
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Record</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this failure record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FailureHistory;