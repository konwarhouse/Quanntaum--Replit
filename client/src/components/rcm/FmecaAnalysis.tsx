import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Import types from types.ts
import { Component, FailureMode, FailureCriticality as ImportedFailureCriticality } from "./types";

// Use a type alias to avoid conflicts
type FailureCriticality = ImportedFailureCriticality;

interface FunctionalFailure {
  id: number;
  componentId: number;
  description: string;
}

// Form schema for FMECA
const fmecaFormSchema = z.object({
  failureModeId: z.number({
    required_error: "Please select a failure mode",
  }).refine(value => value >= 0, {
    message: "Please select a valid failure mode"
  }),
  severity: z.number().min(1).max(10),
  occurrence: z.number().min(1).max(10),
  detection: z.number().min(1).max(10),
  consequenceType: z.string().optional(),
});

// Define local form values type to avoid conflicts with imported type
type FmecaFormValues = z.infer<typeof fmecaFormSchema>;

interface FmecaAnalysisProps {
  systemId?: number;
  componentId?: number;
}

export const FmecaAnalysis: React.FC<FmecaAnalysisProps> = ({ 
  systemId,
  componentId 
}) => {
  const [selectedComponent, setSelectedComponent] = useState<number | undefined>(componentId);
  const [selectedFailureMode, setSelectedFailureMode] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const { toast } = useToast();

  // Get all components for the selected system
  const { data: components, isLoading: componentsLoading } = useQuery<Component[]>({
    queryKey: ["/api/rcm/components", systemId],
    queryFn: () => {
      if (!systemId) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/components?systemId=${systemId}`)
        .then(res => res.json());
    },
    enabled: !!systemId
  });

  // Get component's details first to extract equipment class
  const { data: componentDetails } = useQuery<Component>({
    queryKey: ["/api/rcm/component-details", selectedComponent],
    queryFn: async () => {
      if (!selectedComponent) return null;
      
      try {
        const response = await apiRequest("GET", `/api/rcm/components/${selectedComponent}`);
        if (!response.ok) {
          console.error("Failed to fetch component details");
          return null;
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching component details:", error);
        return null;
      }
    },
    enabled: !!selectedComponent
  });

  // Now get failure modes filtered by equipment class when possible
  const { data: failureModes, isLoading: failureModesLoading } = useQuery<FailureMode[]>({
    queryKey: ["/api/failure-modes", componentDetails?.equipmentClass, selectedComponent],
    queryFn: async () => {
      try {
        // If we have component details and an equipment class, filter by it
        if (componentDetails?.equipmentClass) {
          console.log(`Fetching failure modes for equipment class: ${componentDetails.equipmentClass}`);
          
          // First try the RCM API with equipment class filter
          const response = await apiRequest("GET", `/api/rcm/failure-modes?equipmentClass=${encodeURIComponent(componentDetails.equipmentClass)}`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch from RCM failure modes endpoint");
          }
          
          const data = await response.json();
          console.log(`Found ${data.length} failure modes for equipment class ${componentDetails.equipmentClass}`);
          
          if (data && data.length > 0) {
            return data;
          }
        }
        
        // If we have a selected component but no equipment class-specific modes were found,
        // try to get component-specific modes
        if (selectedComponent) {
          console.log(`Fetching failure modes for component ID: ${selectedComponent}`);
          const componentResponse = await apiRequest("GET", `/api/rcm/failure-modes?componentId=${selectedComponent}`);
          
          if (componentResponse.ok) {
            const componentData = await componentResponse.json();
            console.log(`Found ${componentData.length} component-specific failure modes`);
            
            if (componentData && componentData.length > 0) {
              return componentData;
            }
          }
        }
        
        // As a fallback, get all failure modes but only if we must
        console.log("No specific failure modes found, fetching all available failure modes");
        const allResponse = await apiRequest("GET", `/api/failure-modes`);
        const allData = await allResponse.json();
        console.log(`Found ${allData.length} total failure modes`);
        
        return allData;
      } catch (error) {
        console.error("Error fetching failure modes:", error);
        // Final fallback - try main API
        try {
          const fallbackResponse = await apiRequest("GET", `/api/failure-modes`);
          const fallbackData = await fallbackResponse.json();
          return fallbackData || [];
        } catch (fallbackError) {
          console.error("Final fallback error:", fallbackError);
          return [];
        }
      }
    },
    enabled: true, // Always enabled but will use componentDetails when available
    staleTime: 10000 // Cache for 10 seconds to avoid too many refetches
  });

  // Get criticality data for the failure modes - only those relevant to the selected component
  const { data: criticalities, isLoading: criticalitiesLoading } = useQuery<FailureCriticality[]>({
    queryKey: ["/api/rcm/criticalities", selectedComponent, failureModes],
    queryFn: async () => {
      if (!selectedComponent) return Promise.resolve([]);
      
      if (!failureModes?.length) {
        console.log("No failure modes available to get criticalities for");
        return Promise.resolve([]);
      }
      
      console.log(`Getting criticalities for component ID ${selectedComponent}`);
      
      // First try to get component-specific criticalities
      try {
        const componentResponse = await apiRequest("GET", `/api/rcm/criticalities?componentId=${selectedComponent}`);
        const componentCriticalities = await componentResponse.json();
        
        if (componentCriticalities && componentCriticalities.length > 0) {
          console.log(`Found ${componentCriticalities.length} criticalities for component ID ${selectedComponent}`);
          return componentCriticalities;
        }
        
        // If no component-specific criticalities, get for all failure modes
        console.log("No component-specific criticalities found, fetching by failure modes");
        const failureModeIds = failureModes.map(mode => mode.id);
        const response = await apiRequest("GET", `/api/rcm/criticalities?failureModeIds=${JSON.stringify(failureModeIds)}`);
        const allCriticalities = await response.json();
        
        console.log(`Found ${allCriticalities.length} criticalities across all failure modes`);
        return allCriticalities;
      } catch (error) {
        console.error("Error fetching criticalities:", error);
        return [];
      }
    },
    enabled: !!selectedComponent && !!failureModes?.length
  });

  // Form setup
  const form = useForm<FmecaFormValues>({
    resolver: zodResolver(fmecaFormSchema),
    defaultValues: {
      failureModeId: 0, // Initialize with a default value
      severity: 5,
      occurrence: 5,
      detection: 5,
      consequenceType: "Operational",
    },
  });

  // Reset form when opening dialog for a new entry
  useEffect(() => {
    if (openDialog && selectedFailureMode) {
      const failureMode = failureModes?.find(fm => fm.id === selectedFailureMode);
      if (failureMode) {
        // Find existing criticality if it exists
        const existingCriticality = criticalities?.find(c => c.failureModeId === failureMode.id);
        
        if (existingCriticality) {
          form.reset({
            failureModeId: failureMode.id,
            severity: existingCriticality.severity,
            occurrence: existingCriticality.occurrence,
            detection: existingCriticality.detection,
            consequenceType: existingCriticality.consequenceType,
          });
        } else {
          form.reset({
            failureModeId: failureMode.id,
            severity: 5,
            occurrence: 5,
            detection: 5,
            consequenceType: "Operational",
          });
        }
      }
    } else if (openDialog) {
      form.reset({
        failureModeId: 0,
        severity: 5,
        occurrence: 5,
        detection: 5,
        consequenceType: "Operational",
      });
    }
  }, [openDialog, selectedFailureMode, failureModes, criticalities, form]);

  // Create or update criticality
  const saveMutation = useMutation({
    mutationFn: async (data: FmecaFormValues) => {
      // Calculate RPN
      const rpn = data.severity * data.occurrence * data.detection;
      
      // Determine criticality index based on RPN
      let criticalityIndex = "Low";
      if (rpn >= 200) criticalityIndex = "High";
      else if (rpn >= 125) criticalityIndex = "Medium";
      
      const payload = {
        ...data,
        rpn,
        criticalityIndex
      };

      const url = `/api/rcm/criticalities`;
      return apiRequest("POST", url, payload).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "FMECA analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcm/criticalities"] });
      setOpenDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: FmecaFormValues) => {
    saveMutation.mutate(data);
  };

  // Delete criticality
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/rcm/criticalities/${id}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Criticality deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcm/criticalities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Get criticality color based on index
  const getCriticalityColor = (index: string) => {
    switch (index?.toLowerCase()) {
      case 'high':
        return 'bg-red-500 hover:bg-red-600';
      case 'medium':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Get RPN color based on value
  const getRpnColor = (rpn: number) => {
    if (rpn >= 200) return 'text-red-500 font-bold';
    if (rpn >= 125) return 'text-yellow-500 font-bold';
    return 'text-green-500 font-bold';
  };

  if (componentsLoading || failureModesLoading || criticalitiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading FMECA data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>FMECA Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Failure Mode, Effects, and Criticality Analysis (FMECA) is a methodology to identify and analyze:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Potential failure modes</li>
              <li>Their causes and effects</li>
              <li>Risk Priority Number (RPN) = Severity × Occurrence × Detection</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Component Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedComponent?.toString() || ""}
              onValueChange={(value) => setSelectedComponent(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                {components?.map((component) => (
                  <SelectItem key={component.id} value={component.id.toString()}>
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedComponent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Failure Mode Criticality Analysis</CardTitle>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add FMECA Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>FMECA Analysis</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="failureModeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Failure Mode</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              console.log(`Selected failure mode value: ${value}`);
                              field.onChange(Number(value));
                            }}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select failure mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {failureModes && failureModes.length > 0 ? (
                                failureModes.map((mode) => (
                                  <SelectItem key={mode.id} value={mode.id.toString()}>
                                    {mode.name || mode.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem disabled value="none">No failure modes available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity (1-10)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Impact of failure</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="occurrence"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occurrence (1-10)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Frequency of failure</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="detection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Detection (1-10)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Ability to detect</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="consequenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consequence Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select consequence type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Safety">Safety</SelectItem>
                              <SelectItem value="Environmental">Environmental</SelectItem>
                              <SelectItem value="Operational">Operational</SelectItem>
                              <SelectItem value="Economic">Economic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveMutation.isPending}>
                        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>FMECA Analysis Results</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Failure Mode</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cause</TableHead>
                  <TableHead>Effects</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Occurrence</TableHead>
                  <TableHead>Detection</TableHead>
                  <TableHead>RPN</TableHead>
                  <TableHead>Criticality</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failureModes && criticalities && failureModes.map((mode) => {
                  const criticality = criticalities.find(c => c.failureModeId === mode.id);
                  return (
                    <TableRow key={mode.id}>
                      <TableCell className="font-medium">{mode.name || mode.description}</TableCell>
                      <TableCell>{mode.description}</TableCell>
                      <TableCell>{mode.cause || "N/A"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div><span className="font-semibold">Local:</span> {mode.localEffect || "N/A"}</div>
                          <div><span className="font-semibold">System:</span> {mode.systemEffect || "N/A"}</div>
                          <div><span className="font-semibold">End:</span> {mode.endEffect || "N/A"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{criticality?.severity || "N/A"}</TableCell>
                      <TableCell>{criticality?.occurrence || "N/A"}</TableCell>
                      <TableCell>{criticality?.detection || "N/A"}</TableCell>
                      <TableCell className={criticality ? getRpnColor(criticality.rpn) : ""}>
                        {criticality?.rpn || "N/A"}
                      </TableCell>
                      <TableCell>
                        {criticality?.criticalityIndex ? (
                          <Badge className={getCriticalityColor(criticality.criticalityIndex)}>
                            {criticality.criticalityIndex}
                          </Badge>
                        ) : (
                          "Not Assessed"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedFailureMode(mode.id);
                              setOpenDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {criticality && (
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this criticality analysis?")) {
                                  deleteMutation.mutate(criticality.id);
                                }
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!failureModes || failureModes.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">
                      No failure modes found for this component
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {!selectedComponent && (
        <div className="flex items-center justify-center h-64 border rounded-md p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Component Selected</h3>
            <p className="text-muted-foreground mt-2">
              Please select a component to perform FMECA analysis
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FmecaAnalysis;