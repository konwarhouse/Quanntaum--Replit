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
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Types for RAM Analysis
interface RamMetrics {
  id: number;
  systemId: number;
  componentId?: number;
  mtbf?: number;
  mttr?: number;
  availability?: number;
  reliabilityTarget?: number;
  timeFrame?: number;
  timeUnit?: string;
  redundancyType?: string;
  redundancyLevel?: number;
  dateAdded?: string | Date;
  notes?: string;
}

interface Component {
  id: number;
  name: string;
  systemId: number;
  description?: string;
  function?: string;
  criticality?: string;
  parentId?: number;
}

interface System {
  id: number;
  name: string;
  purpose?: string;
  boundaries?: string;
  operatingContext?: string;
}

// Form schema for RAM metrics
const ramMetricsFormSchema = z.object({
  systemId: z.number({
    required_error: "System is required",
  }),
  componentId: z.number().optional(),
  mtbf: z.coerce.number().positive("MTBF must be positive").optional(),
  mttr: z.coerce.number().positive("MTTR must be positive").optional(),
  availability: z.coerce.number().min(0).max(100, "Availability must be between 0 and 100").optional(),
  reliabilityTarget: z.coerce.number().min(0).max(100, "Reliability target must be between 0 and 100").optional(),
  timeFrame: z.coerce.number().positive("Time frame must be positive").optional(),
  timeUnit: z.string().optional(),
  redundancyType: z.string().optional(),
  redundancyLevel: z.coerce.number().min(0).max(10, "Redundancy level must be between 0 and 10").optional(),
  notes: z.string().optional(),
});

type RamMetricsFormValues = z.infer<typeof ramMetricsFormSchema>;

interface RamAnalysisProps {
  systemId?: number;
}

export const RamAnalysis: React.FC<RamAnalysisProps> = ({ systemId }) => {
  const [selectedSystemId, setSelectedSystemId] = useState<number | undefined>(systemId);
  const [selectedMetricId, setSelectedMetricId] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const { toast } = useToast();

  // Get all systems
  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ["/api/rcm/systems"],
    queryFn: () => {
      return apiRequest("GET", `/api/rcm/systems`)
        .then(res => res.json());
    }
  });

  // Get all components for the selected system
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/rcm/components", selectedSystemId],
    queryFn: () => {
      if (!selectedSystemId) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/components?systemId=${selectedSystemId}`)
        .then(res => res.json());
    },
    enabled: !!selectedSystemId
  });

  // Get RAM metrics for the selected system
  const { data: ramMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/rcm/ram-metrics", selectedSystemId],
    queryFn: () => {
      if (!selectedSystemId) return Promise.resolve([]);
      return apiRequest("GET", `/api/rcm/ram-metrics?systemId=${selectedSystemId}`)
        .then(res => res.json());
    },
    enabled: !!selectedSystemId
  });

  // Form setup
  const form = useForm<RamMetricsFormValues>({
    resolver: zodResolver(ramMetricsFormSchema),
    defaultValues: {
      systemId: selectedSystemId,
      mtbf: 1000,
      mttr: 8,
      availability: 99.0,
      reliabilityTarget: 95.0,
      timeFrame: 8760,
      timeUnit: "Hours",
      redundancyType: "None",
      redundancyLevel: 0,
      notes: "",
    },
  });

  // Update form when system ID changes
  useEffect(() => {
    if (selectedSystemId) {
      form.setValue("systemId", selectedSystemId);
    }
  }, [selectedSystemId, form]);

  // Reset form when opening dialog for a new entry or editing existing one
  useEffect(() => {
    if (openDialog) {
      if (selectedMetricId) {
        const metric = ramMetrics?.find(m => m.id === selectedMetricId);
        if (metric) {
          form.reset({
            systemId: metric.systemId,
            componentId: metric.componentId,
            mtbf: metric.mtbf,
            mttr: metric.mttr,
            availability: metric.availability,
            reliabilityTarget: metric.reliabilityTarget,
            timeFrame: metric.timeFrame,
            timeUnit: metric.timeUnit,
            redundancyType: metric.redundancyType,
            redundancyLevel: metric.redundancyLevel,
            notes: metric.notes,
          });
        }
      } else {
        form.reset({
          systemId: selectedSystemId,
          componentId: undefined,
          mtbf: 1000,
          mttr: 8,
          availability: 99.0,
          reliabilityTarget: 95.0,
          timeFrame: 8760,
          timeUnit: "Hours",
          redundancyType: "None",
          redundancyLevel: 0,
          notes: "",
        });
      }
    }
  }, [openDialog, selectedMetricId, ramMetrics, selectedSystemId, form]);

  // Create or update RAM metrics
  const saveMetricsMutation = useMutation({
    mutationFn: async (data: RamMetricsFormValues) => {
      const url = selectedMetricId 
        ? `/api/rcm/ram-metrics/${selectedMetricId}` 
        : `/api/rcm/ram-metrics`;
      
      const method = selectedMetricId ? "PUT" : "POST";
      return apiRequest(method, url, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `RAM metrics ${selectedMetricId ? "updated" : "saved"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcm/ram-metrics"] });
      setOpenDialog(false);
      setSelectedMetricId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete RAM metrics
  const deleteMetricsMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/rcm/ram-metrics/${id}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "RAM metrics deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcm/ram-metrics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: RamMetricsFormValues) => {
    saveMetricsMutation.mutate(data);
  };

  // Calculate system-level availability
  const calculateSystemAvailability = () => {
    if (!ramMetrics || ramMetrics.length === 0) return null;
    
    const systemMetric = ramMetrics.find(m => !m.componentId);
    if (systemMetric?.availability) return systemMetric.availability;
    
    // If no system-level metric, calculate from components
    const componentMetrics = ramMetrics.filter(m => m.componentId);
    if (componentMetrics.length === 0) return null;
    
    // Simple series reliability calculation
    const availability = componentMetrics.reduce((acc, metric) => {
      return acc * (metric.availability ?? 100) / 100;
    }, 1) * 100;
    
    return availability;
  };

  if (systemsLoading || componentsLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading RAM data...</span>
      </div>
    );
  }

  const systemAvailability = calculateSystemAvailability();

  return (
    <div className="space-y-6">
      {/* Licensed Feature Notice */}
      <div className="p-6 border border-blue-200 bg-blue-50 rounded-md">
        <h3 className="text-lg font-semibold text-blue-700 flex items-center">
          <Badge variant="default" className="mr-2 bg-blue-500">LICENSED USERS ONLY</Badge>
          Advanced Module Under Development
        </h3>
        <p className="mt-2 text-blue-700">
          The RAM Analysis module is currently under development as part of a complete reliability engineering platform.
          The dedicated implementation will include advanced Weibull reliability modeling and comprehensive maintainability metrics.
        </p>
        <p className="mt-2 text-blue-700">
          Contact our support team for more information about licensing options and early access.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>RAM Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Reliability, Availability and Maintainability (RAM) analysis quantifies:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Mean Time Between Failures (MTBF)</li>
              <li>Mean Time To Repair (MTTR)</li>
              <li>System and component availability</li>
              <li>Reliability over a defined time frame</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>System Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedSystemId?.toString() || ""}
              onValueChange={(value) => setSelectedSystemId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select system" />
              </SelectTrigger>
              <SelectContent>
                {systems?.map((system) => (
                  <SelectItem key={system.id} value={system.id.toString()}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedSystemId && (
        <>
          {/* System Availability Card */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle>System Reliability Overview</CardTitle>
              <CardDescription>
                {systemAvailability ? 
                  `Current system availability: ${systemAvailability.toFixed(2)}%` : 
                  "No RAM data available for this system"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2">System Availability</div>
              <div className="space-y-2">
                <Progress value={systemAvailability || 0} className="h-2 w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <div>0%</div>
                  <div>50%</div>
                  <div>100%</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Target availability should be defined based on criticality and business requirements.
              </div>
            </CardContent>
          </Card>
          
          {/* RAM Metrics Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>RAM Metrics</CardTitle>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setSelectedMetricId(null)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add RAM Metrics
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedMetricId ? "Edit RAM Metrics" : "Add RAM Metrics"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="systemId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              defaultValue={field.value?.toString()}
                              disabled={true} // We pre-select the system
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select system" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {systems?.map((system) => (
                                  <SelectItem key={system.id} value={system.id.toString()}>
                                    {system.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="componentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Component (Optional)</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select component (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="_none">System Level (No Component)</SelectItem>
                                {components?.map((component) => (
                                  <SelectItem key={component.id} value={component.id.toString()}>
                                    {component.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Leave blank for system-level metrics
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="mtbf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MTBF</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Mean Time Between Failures
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="mttr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MTTR</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Mean Time To Repair
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="availability"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Availability (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Uptime percentage
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="reliabilityTarget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reliability Target (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Target reliability
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="timeFrame"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Frame</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="timeUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Unit</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select time unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Hours">Hours</SelectItem>
                                  <SelectItem value="Days">Days</SelectItem>
                                  <SelectItem value="Weeks">Weeks</SelectItem>
                                  <SelectItem value="Months">Months</SelectItem>
                                  <SelectItem value="Years">Years</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="redundancyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Redundancy Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select redundancy type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="None">None</SelectItem>
                                  <SelectItem value="Active">Active (N+M)</SelectItem>
                                  <SelectItem value="Standby">Standby/Passive</SelectItem>
                                  <SelectItem value="Load Sharing">Load Sharing</SelectItem>
                                  <SelectItem value="2oo3">2oo3 Voting</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="redundancyLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Redundancy Level</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={10}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Number of redundant units
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Additional notes about RAM metrics"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={saveMetricsMutation.isPending}>
                          {saveMetricsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {selectedMetricId ? "Update" : "Save"} Metrics
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
                    <TableHead>Level</TableHead>
                    <TableHead>MTBF</TableHead>
                    <TableHead>MTTR</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ramMetrics && ramMetrics.length > 0 ? (
                    ramMetrics.map((metric) => {
                      const component = components?.find(c => c.id === metric.componentId);
                      return (
                        <TableRow key={metric.id}>
                          <TableCell>
                            {metric.componentId ? (
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">Component</Badge>
                                {component?.name || `Component #${metric.componentId}`}
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Badge variant="secondary" className="mr-2">System</Badge>
                                {systems?.find(s => s.id === metric.systemId)?.name || `System #${metric.systemId}`}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{metric.mtbf} {metric.timeUnit}</TableCell>
                          <TableCell>{metric.mttr} {metric.timeUnit}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Progress 
                                value={metric.availability} 
                                className="h-2 w-16 mr-2" 
                              />
                              {metric.availability?.toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex space-x-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMetricId(metric.id);
                                  setOpenDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete these metrics?")) {
                                    deleteMetricsMutation.mutate(metric.id);
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No RAM metrics defined for this system
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};