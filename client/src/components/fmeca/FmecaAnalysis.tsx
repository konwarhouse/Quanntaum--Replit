import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
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
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define types for our component
interface Component {
  id: number;
  name: string;
  description?: string;
  systemId?: number;
  equipmentClass?: string;
}

interface FailureMode {
  id: number;
  name?: string;
  description: string;
  cause?: string;
  localEffect?: string;
  systemEffect?: string;
  endEffect?: string;
  componentId?: number;
  equipmentClass?: string;
}

interface FailureCriticality {
  id: number;
  failureModeId: number;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  criticalityIndex?: string;
  consequenceType?: string;
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

// Define form values type
type FmecaFormValues = z.infer<typeof fmecaFormSchema>;

interface FmecaAnalysisProps {
  systemId?: number;
  componentId?: number;
}

const FmecaAnalysis: React.FC<FmecaAnalysisProps> = ({ 
  systemId,
  componentId 
}) => {
  const [selectedComponent, setSelectedComponent] = useState<number | undefined>(componentId);
  const [selectedFailureMode, setSelectedFailureMode] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const { toast } = useToast();

  // Get all components for the selected system
  const { data: components, isLoading: componentsLoading } = useQuery<Component[]>({
    queryKey: ["/api/components", systemId],
    queryFn: () => {
      if (!systemId) return Promise.resolve([]);
      return apiRequest("GET", `/api/components?systemId=${systemId}`)
        .then(res => res.json());
    },
    enabled: !!systemId
  });

  // Get component's details to extract equipment class
  const { data: componentDetails } = useQuery<Component>({
    queryKey: ["/api/components/details", selectedComponent],
    queryFn: async () => {
      if (!selectedComponent) return null;
      
      try {
        const response = await apiRequest("GET", `/api/components/${selectedComponent}`);
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

  // Get failure modes for component or equipment class
  const { data: failureModes, isLoading: failureModesLoading } = useQuery<FailureMode[]>({
    queryKey: ["/api/fmeca/failure-modes", componentDetails?.equipmentClass, selectedComponent],
    queryFn: async () => {
      try {
        let url = "";
        
        // Try component-specific failure modes first
        if (selectedComponent) {
          url = `/api/fmeca/failure-modes?componentId=${selectedComponent}`;
        } 
        // Otherwise try equipment class if available
        else if (componentDetails?.equipmentClass) {
          url = `/api/fmeca/failure-modes?equipmentClass=${encodeURIComponent(componentDetails.equipmentClass)}`;
        }
        // Fallback to all failure modes by equipment class
        else {
          url = `/api/fmeca/failure-modes-by-class`;
        }
        
        const response = await apiRequest("GET", url);
        if (!response.ok) {
          throw new Error(`Failed to fetch failure modes: ${response.statusText}`);
        }
        
        return response.json();
      } catch (error) {
        console.error("Error fetching failure modes:", error);
        return [];
      }
    },
    enabled: !!selectedComponent || !!componentDetails?.equipmentClass
  });

  // Get criticality data for the failure modes
  const { data: criticalities, isLoading: criticalitiesLoading } = useQuery<FailureCriticality[]>({
    queryKey: ["/api/fmeca/criticalities", selectedComponent],
    queryFn: async () => {
      if (!selectedComponent) return [];
      
      try {
        const response = await apiRequest("GET", `/api/fmeca/criticalities?componentId=${selectedComponent}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch criticalities: ${response.statusText}`);
        }
        
        return response.json();
      } catch (error) {
        console.error("Error fetching criticalities:", error);
        return [];
      }
    },
    enabled: !!selectedComponent
  });

  // Form setup
  const form = useForm<FmecaFormValues>({
    resolver: zodResolver(fmecaFormSchema),
    defaultValues: {
      failureModeId: 0,
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

      return apiRequest("POST", `/api/fmeca/criticalities`, payload).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "FMECA analysis saved successfully",
      });
      // Invalidate criticalities query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/fmeca/criticalities"] });
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
      return apiRequest("DELETE", `/api/fmeca/criticalities/${id}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Criticality deleted successfully",
      });
      // Invalidate criticalities query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/fmeca/criticalities"] });
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
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a failure mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {failureModes?.map((mode) => (
                                <SelectItem key={mode.id} value={mode.id.toString()}>
                                  {mode.name || mode.description}
                                </SelectItem>
                              ))}
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
                            <FormLabel>Severity (S)</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              value={field.value.toString()}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                                  <SelectItem key={value} value={value.toString()}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Impact of the failure
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="occurrence"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occurrence (O)</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              value={field.value.toString()}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                                  <SelectItem key={value} value={value.toString()}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Frequency of failure
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="detection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Detection (D)</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              value={field.value.toString()}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                                  <SelectItem key={value} value={value.toString()}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Likelihood of detection
                            </FormDescription>
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
                            value={field.value || "Operational"}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Safety">Safety</SelectItem>
                              <SelectItem value="Operational">Operational</SelectItem>
                              <SelectItem value="Environmental">Environmental</SelectItem>
                              <SelectItem value="Economic">Economic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setOpenDialog(false)}
                      >
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
                {failureModes && criticalities && failureModes.length > 0 ? (
                  // Filter failure modes to only show those with criticality data
                  failureModes
                    .filter(mode => criticalities.some(c => c.failureModeId === mode.id))
                    .map((mode) => {
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
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">
                      {failureModes && failureModes.length > 0 ? 
                        "No FMECA analysis found. Click Add FMECA Analysis to create one." : 
                        "No failure modes found for this component"}
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