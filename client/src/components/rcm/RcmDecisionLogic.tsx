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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// Types for RCM Logic
interface FailureMode {
  id: number;
  name: string;
  description: string;
  cause: string;
  localEffect: string;
  systemEffect: string;
  endEffect: string;
  currentControl: string;
  detectMethod: string;
  consequences: string;
  componentId?: number;
  functionalFailureId?: number;
}

interface RcmConsequence {
  id: number;
  failureModeId: number;
  safetyImpact: boolean;
  environmentalImpact: boolean;
  operationalImpact: boolean;
  economicImpact: boolean;
  hiddenFailure: boolean;
  acceptableRisk: boolean;
  notes: string;
}

interface MaintenanceTask {
  id: number;
  failureModeId: number;
  taskType: string;
  taskDescription: string;
  taskFrequency: number;
  taskFrequencyUnit: string;
  effectivenessRating: number;
  costEffectiveness: string;
  implementationNotes: string;
}

// Form schema for RCM consequence analysis
const rcmConsequenceFormSchema = z.object({
  failureModeId: z.number({
    required_error: "Please select a failure mode",
  }),
  safetyImpact: z.boolean().default(false),
  environmentalImpact: z.boolean().default(false),
  operationalImpact: z.boolean().default(false),
  economicImpact: z.boolean().default(false),
  hiddenFailure: z.boolean().default(false),
  acceptableRisk: z.boolean().default(false),
  notes: z.string().optional(),
});

type RcmConsequenceFormValues = z.infer<typeof rcmConsequenceFormSchema>;

// Form schema for maintenance task
const maintenanceTaskFormSchema = z.object({
  failureModeId: z.number({
    required_error: "Please select a failure mode",
  }),
  taskType: z.string({
    required_error: "Please select a task type",
  }),
  taskDescription: z.string().min(5, "Description must be at least 5 characters"),
  taskFrequency: z.number().min(1, "Frequency must be at least 1"),
  taskFrequencyUnit: z.string(),
  effectivenessRating: z.number().min(1).max(10),
  costEffectiveness: z.string(),
  implementationNotes: z.string().optional(),
});

type MaintenanceTaskFormValues = z.infer<typeof maintenanceTaskFormSchema>;

interface RcmDecisionLogicProps {
  systemId?: number;
  componentId?: number;
}

export const RcmDecisionLogic: React.FC<RcmDecisionLogicProps> = ({ 
  systemId,
  componentId 
}) => {
  const [selectedComponent, setSelectedComponent] = useState<number | undefined>(componentId);
  const [selectedFailureMode, setSelectedFailureMode] = useState<number | null>(null);
  const [openConsequenceDialog, setOpenConsequenceDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);

  const { toast } = useToast();

  // Get all components for the selected system
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/rcm/components", systemId],
    queryFn: () => {
      if (!systemId) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/components?systemId=${systemId}`)
        .then(res => res.json());
    },
    enabled: !!systemId
  });

  // Get all failure modes for the selected component
  const { data: failureModes, isLoading: failureModesLoading } = useQuery({
    queryKey: ["/api/rcm/failure-modes", selectedComponent],
    queryFn: () => {
      if (!selectedComponent) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/failure-modes?componentId=${selectedComponent}`)
        .then(res => res.json());
    },
    enabled: !!selectedComponent
  });

  // Get RCM consequences for the failure modes
  const { data: consequences, isLoading: consequencesLoading } = useQuery({
    queryKey: ["/api/rcm/rcm-consequences", selectedComponent],
    queryFn: () => {
      if (!selectedComponent) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/rcm-consequences?componentId=${selectedComponent}`)
        .then(res => res.json());
    },
    enabled: !!selectedComponent
  });

  // Get maintenance tasks for the failure modes
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/rcm/maintenance-tasks", selectedComponent],
    queryFn: () => {
      if (!selectedComponent) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/maintenance-tasks?componentId=${selectedComponent}`)
        .then(res => res.json());
    },
    enabled: !!selectedComponent
  });

  // Consequence form setup
  const consequenceForm = useForm<RcmConsequenceFormValues>({
    resolver: zodResolver(rcmConsequenceFormSchema),
    defaultValues: {
      safetyImpact: false,
      environmentalImpact: false,
      operationalImpact: false,
      economicImpact: false,
      hiddenFailure: false,
      acceptableRisk: false,
      notes: "",
    },
  });

  // Task form setup
  const taskForm = useForm<MaintenanceTaskFormValues>({
    resolver: zodResolver(maintenanceTaskFormSchema),
    defaultValues: {
      taskType: "Condition-based",
      taskDescription: "",
      taskFrequency: 1,
      taskFrequencyUnit: "Months",
      effectivenessRating: 5,
      costEffectiveness: "Medium",
      implementationNotes: "",
    },
  });

  // Reset consequence form when opening dialog
  useEffect(() => {
    if (openConsequenceDialog && selectedFailureMode) {
      const failureMode = failureModes?.find(fm => fm.id === selectedFailureMode);
      if (failureMode) {
        // Find existing consequence if it exists
        const existingConsequence = consequences?.find(c => c.failureModeId === failureMode.id);
        
        if (existingConsequence) {
          consequenceForm.reset({
            failureModeId: failureMode.id,
            safetyImpact: existingConsequence.safetyImpact,
            environmentalImpact: existingConsequence.environmentalImpact,
            operationalImpact: existingConsequence.operationalImpact,
            economicImpact: existingConsequence.economicImpact,
            hiddenFailure: existingConsequence.hiddenFailure,
            acceptableRisk: existingConsequence.acceptableRisk,
            notes: existingConsequence.notes,
          });
        } else {
          consequenceForm.reset({
            failureModeId: failureMode.id,
            safetyImpact: false,
            environmentalImpact: false,
            operationalImpact: false,
            economicImpact: false,
            hiddenFailure: false,
            acceptableRisk: false,
            notes: "",
          });
        }
      }
    }
  }, [openConsequenceDialog, selectedFailureMode, failureModes, consequences, consequenceForm]);

  // Reset task form when opening dialog
  useEffect(() => {
    if (openTaskDialog && selectedFailureMode) {
      const failureMode = failureModes?.find(fm => fm.id === selectedFailureMode);
      if (failureMode) {
        taskForm.reset({
          failureModeId: failureMode.id,
          taskType: "Condition-based",
          taskDescription: "",
          taskFrequency: 1,
          taskFrequencyUnit: "Months",
          effectivenessRating: 5,
          costEffectiveness: "Medium",
          implementationNotes: "",
        });
      }
    }
  }, [openTaskDialog, selectedFailureMode, failureModes, taskForm]);

  // Create or update RCM consequence
  const saveConsequenceMutation = useMutation({
    mutationFn: async (data: RcmConsequenceFormValues) => {
      const url = `/api/rcm/rcm-consequences`;
      return apiRequest("POST", url, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "RCM consequence analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcm/rcm-consequences"] });
      setOpenConsequenceDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Create or update maintenance task
  const saveTaskMutation = useMutation({
    mutationFn: async (data: MaintenanceTaskFormValues) => {
      const url = `/api/rcm/maintenance-tasks`;
      return apiRequest("POST", url, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance task saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcm/maintenance-tasks"] });
      setOpenTaskDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle forms submission
  const onConsequenceSubmit = (data: RcmConsequenceFormValues) => {
    saveConsequenceMutation.mutate(data);
  };

  const onTaskSubmit = (data: MaintenanceTaskFormValues) => {
    saveTaskMutation.mutate(data);
  };

  if (componentsLoading || failureModesLoading || consequencesLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading RCM data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Licensed Feature Notice */}
      <div className="p-6 border border-blue-200 bg-blue-50 rounded-md">
        <h3 className="text-lg font-semibold text-blue-700 flex items-center">
          <Badge variant="default" className="mr-2 bg-blue-500">LICENSED USERS ONLY</Badge>
          Advanced Module Under Development
        </h3>
        <p className="mt-2 text-blue-700">
          The RCM Decision Logic module is currently under development as part of a complete reliability engineering platform.
          This dedicated implementation will provide comprehensive analysis capabilities with a specialized interface.
        </p>
        <p className="mt-2 text-blue-700">
          Contact our support team for more information about licensing options and early access.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>RCM Decision Logic</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              RCM Decision Logic helps determine the most appropriate maintenance strategy based on:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Failure consequences (safety, environmental, operational, economic)</li>
              <li>Type of failure (hidden vs. evident)</li>
              <li>Risk acceptability</li>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consequence Analysis Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Failure Consequences</CardTitle>
              <Dialog open={openConsequenceDialog} onOpenChange={setOpenConsequenceDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Consequence Analysis
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>RCM Consequence Analysis</DialogTitle>
                  </DialogHeader>
                  <Form {...consequenceForm}>
                    <form onSubmit={consequenceForm.handleSubmit(onConsequenceSubmit)} className="space-y-4">
                      <FormField
                        control={consequenceForm.control}
                        name="failureModeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Failure Mode</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select failure mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {failureModes?.map((mode) => (
                                  <SelectItem key={mode.id} value={mode.id.toString()}>
                                    {mode.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <FormField
                          control={consequenceForm.control}
                          name="safetyImpact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Safety Impact</FormLabel>
                                <FormDescription>
                                  Failure can cause harm to people
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={consequenceForm.control}
                          name="environmentalImpact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Environmental Impact</FormLabel>
                                <FormDescription>
                                  Failure can harm the environment
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={consequenceForm.control}
                          name="operationalImpact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Operational Impact</FormLabel>
                                <FormDescription>
                                  Failure affects operations/production
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={consequenceForm.control}
                          name="economicImpact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Economic Impact</FormLabel>
                                <FormDescription>
                                  Failure has significant cost implications
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={consequenceForm.control}
                          name="hiddenFailure"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Hidden Failure</FormLabel>
                                <FormDescription>
                                  Failure is not evident during normal operation
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={consequenceForm.control}
                          name="acceptableRisk"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Acceptable Risk</FormLabel>
                                <FormDescription>
                                  Consequences are acceptable without mitigation
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={consequenceForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional notes about failure consequences"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={saveConsequenceMutation.isPending}>
                          {saveConsequenceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Consequence Analysis
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {(!failureModes || failureModes.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No failure modes found for this component.</p>
                  <p className="text-sm mt-2">Define failure modes in the FMECA analysis first.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Failure Mode</TableHead>
                      <TableHead>Consequences</TableHead>
                      <TableHead>Hidden/Evident</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failureModes.map((mode) => {
                      const modeConsequence = consequences?.find(c => c.failureModeId === mode.id);
                      return (
                        <TableRow key={mode.id}>
                          <TableCell className="font-medium">{mode.name}</TableCell>
                          <TableCell>
                            {modeConsequence ? (
                              <div className="flex flex-wrap gap-1">
                                {modeConsequence.safetyImpact && <Badge variant="destructive">Safety</Badge>}
                                {modeConsequence.environmentalImpact && <Badge variant="destructive">Environmental</Badge>}
                                {modeConsequence.operationalImpact && <Badge>Operational</Badge>}
                                {modeConsequence.economicImpact && <Badge>Economic</Badge>}
                                {!modeConsequence.safetyImpact && 
                                 !modeConsequence.environmentalImpact && 
                                 !modeConsequence.operationalImpact && 
                                 !modeConsequence.economicImpact && 
                                 <span className="text-muted-foreground">None defined</span>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not assessed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {modeConsequence ? (
                              modeConsequence.hiddenFailure ? 
                                <Badge variant="outline">Hidden</Badge> : 
                                <Badge variant="secondary">Evident</Badge>
                            ) : (
                              <span className="text-muted-foreground">Not assessed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedFailureMode(mode.id);
                                setOpenConsequenceDialog(true);
                              }}
                            >
                              {modeConsequence ? "Edit" : "Assess"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Tasks Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance Tasks</CardTitle>
              <Dialog open={openTaskDialog} onOpenChange={setOpenTaskDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Maintenance Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Define Maintenance Task</DialogTitle>
                  </DialogHeader>
                  <Form {...taskForm}>
                    <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
                      <FormField
                        control={taskForm.control}
                        name="failureModeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Failure Mode</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select failure mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {failureModes?.map((mode) => (
                                  <SelectItem key={mode.id} value={mode.id.toString()}>
                                    {mode.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={taskForm.control}
                        name="taskType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select task type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Condition-based">Condition-based Monitoring</SelectItem>
                                <SelectItem value="Time-based">Time-based Replacement</SelectItem>
                                <SelectItem value="Failure-finding">Failure-finding Task</SelectItem>
                                <SelectItem value="Run-to-failure">Run-to-failure</SelectItem>
                                <SelectItem value="Redesign">Redesign/Modification</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The type of maintenance strategy for this failure mode
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={taskForm.control}
                        name="taskDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detailed description of the maintenance task"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={taskForm.control}
                          name="taskFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={taskForm.control}
                          name="taskFrequencyUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency Unit</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Hours">Hours</SelectItem>
                                  <SelectItem value="Days">Days</SelectItem>
                                  <SelectItem value="Weeks">Weeks</SelectItem>
                                  <SelectItem value="Months">Months</SelectItem>
                                  <SelectItem value="Years">Years</SelectItem>
                                  <SelectItem value="Cycles">Cycles</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={taskForm.control}
                        name="effectivenessRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Effectiveness Rating (1-10)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How effective is this task at preventing the failure mode (1=Low, 10=High)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={taskForm.control}
                        name="costEffectiveness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost Effectiveness</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cost effectiveness" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The cost-benefit ratio of implementing this task
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={taskForm.control}
                        name="implementationNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Implementation Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Notes on implementation requirements or special considerations"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={saveTaskMutation.isPending}>
                          {saveTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Maintenance Task
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {(!failureModes || failureModes.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No failure modes found for this component.</p>
                  <p className="text-sm mt-2">Define failure modes in the FMECA analysis first.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Failure Mode</TableHead>
                      <TableHead>Maintenance Strategy</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failureModes.map((mode) => {
                      const modeTasks = tasks?.filter(t => t.failureModeId === mode.id) || [];
                      return (
                        <TableRow key={mode.id}>
                          <TableCell className="font-medium">{mode.name}</TableCell>
                          <TableCell>
                            {modeTasks.length > 0 ? (
                              <div className="space-y-1">
                                {modeTasks.map((task, index) => (
                                  <div key={index}>
                                    <Badge
                                      variant={
                                        task.taskType === "Condition-based" ? "default" :
                                        task.taskType === "Time-based" ? "secondary" :
                                        task.taskType === "Failure-finding" ? "outline" :
                                        task.taskType === "Run-to-failure" ? "destructive" :
                                        "default"
                                      }
                                    >
                                      {task.taskType}
                                    </Badge>
                                    <span className="text-xs ml-2 text-muted-foreground">
                                      {task.taskDescription.substring(0, 30)}
                                      {task.taskDescription.length > 30 ? "..." : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No tasks defined</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {modeTasks.length > 0 ? (
                              <div className="space-y-1">
                                {modeTasks.map((task, index) => (
                                  <div key={index} className="text-sm">
                                    {task.taskFrequency} {task.taskFrequencyUnit}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedFailureMode(mode.id);
                                setOpenTaskDialog(true);
                              }}
                            >
                              Add Task
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};