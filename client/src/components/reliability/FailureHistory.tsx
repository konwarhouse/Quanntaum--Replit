import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { CalendarIcon, Trash2, FileUp, Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MaintenanceEvent, Asset } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Form schema for maintenance event
const maintenanceEventSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  eventType: z.string().min(1, "Event type is required"),
  eventDate: z.date({
    required_error: "Event date is required",
  }),
  cost: z.coerce.number().min(0, "Cost must be a positive number"),
  downtime: z.coerce.number().min(0, "Downtime must be a positive number"),
  description: z.string().min(5, "Description is required and must be at least 5 characters"),
});

// Type for form values
type MaintenanceEventFormValues = z.infer<typeof maintenanceEventSchema>;

const FailureHistory = () => {
  const { toast } = useToast();
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [filterAssetId, setFilterAssetId] = useState<string>("");
  const [filterEventType, setFilterEventType] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all assets for the dropdown
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // Fetch all maintenance events
  const { data: allEvents = [], isLoading: isLoadingEvents } = useQuery<MaintenanceEvent[]>({
    queryKey: ['/api/maintenance-events'],
    staleTime: 5000,
  });

  // Filter events based on selected filters
  const filteredEvents = allEvents.filter(event => {
    // Filter by asset ID if selected
    if (filterAssetId && event.assetId.toString() !== filterAssetId) {
      return false;
    }
    
    // Filter by event type if selected
    if (filterEventType && event.eventType !== filterEventType) {
      return false;
    }
    
    // Filter by date range if selected
    if (filterDateFrom && new Date(event.eventDate) < filterDateFrom) {
      return false;
    }
    
    if (filterDateTo) {
      // Add one day to include the end date in the range
      const endDate = new Date(filterDateTo);
      endDate.setDate(endDate.getDate() + 1);
      
      if (new Date(event.eventDate) > endDate) {
        return false;
      }
    }
    
    return true;
  });

  // Mutation to add a new maintenance event
  const addEventMutation = useMutation({
    mutationFn: async (data: MaintenanceEventFormValues) => {
      const response = await fetch('/api/maintenance-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: parseInt(data.assetId),
          eventType: data.eventType,
          eventDate: data.eventDate,
          cost: data.cost,
          downtime: data.downtime,
          description: data.description,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add maintenance event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the events query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-events'] });
      toast({
        title: "Success",
        description: "Maintenance event has been added",
      });
      setIsAddEventOpen(false);
    },
    onError: (error) => {
      console.error("Error adding maintenance event:", error);
      toast({
        title: "Error",
        description: "Failed to add maintenance event",
        variant: "destructive",
      });
    },
  });

  // Delete maintenance event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/maintenance-events/${eventId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete maintenance event');
      }
      
      return true;
    },
    onSuccess: () => {
      // Invalidate the events query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-events'] });
      toast({
        title: "Success",
        description: "Maintenance event has been deleted",
      });
    },
    onError: (error) => {
      console.error("Error deleting maintenance event:", error);
      toast({
        title: "Error",
        description: "Failed to delete maintenance event",
        variant: "destructive",
      });
    },
  });

  // Form for adding new maintenance event
  const form = useForm<MaintenanceEventFormValues>({
    resolver: zodResolver(maintenanceEventSchema),
    defaultValues: {
      assetId: "",
      eventType: "",
      cost: 0,
      downtime: 0,
      description: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isAddEventOpen) {
      form.reset({
        assetId: "",
        eventType: "",
        cost: 0,
        downtime: 0,
        description: "",
      });
    }
  }, [isAddEventOpen, form]);

  // Handle form submission
  const onSubmit = (data: MaintenanceEventFormValues) => {
    addEventMutation.mutate(data);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterAssetId("");
    setFilterEventType("");
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  // Get asset name by ID
  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? `${asset.assetNumber} - ${asset.name}` : `Asset ID: ${assetId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Failure History</h2>
          <p className="text-muted-foreground">
            Track and analyze equipment failures and maintenance events
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Maintenance Event</DialogTitle>
                <DialogDescription>
                  Record details of a maintenance event or failure for an asset
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id.toString()}>
                                {asset.assetNumber} - {asset.name}
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
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PM">Preventive Maintenance (PM)</SelectItem>
                            <SelectItem value="CM">Corrective Maintenance (CM)</SelectItem>
                            <SelectItem value="FF">Functional Failure</SelectItem>
                            <SelectItem value="PF">Potential Failure</SelectItem>
                            <SelectItem value="I">Inspection</SelectItem>
                            <SelectItem value="O">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Event Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={
                                  "pl-3 text-left font-normal flex justify-between"
                                }
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Select a date</span>
                                )}
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormDescription>Cost in local currency</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="downtime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Downtime (hours)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.1" {...field} />
                          </FormControl>
                          <FormDescription>Duration in hours</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the maintenance event or failure in detail"
                            className="resize-none min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include root cause, parts replaced, and any relevant observations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      type="submit" 
                      disabled={addEventMutation.isPending}
                    >
                      {addEventMutation.isPending ? "Saving..." : "Save Event"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Filters section */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filter Events</CardTitle>
            <CardDescription>
              Narrow down maintenance events by specific criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Asset</label>
                <Select value={filterAssetId} onValueChange={setFilterAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Assets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Assets</SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id.toString()}>
                        {asset.assetNumber} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Event Type</label>
                <Select value={filterEventType} onValueChange={setFilterEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="PM">Preventive Maintenance (PM)</SelectItem>
                    <SelectItem value="CM">Corrective Maintenance (CM)</SelectItem>
                    <SelectItem value="FF">Functional Failure</SelectItem>
                    <SelectItem value="PF">Potential Failure</SelectItem>
                    <SelectItem value="I">Inspection</SelectItem>
                    <SelectItem value="O">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={"w-full pl-3 text-left font-normal flex justify-between"}
                    >
                      {filterDateFrom ? (
                        format(filterDateFrom, "PP")
                      ) : (
                        <span>Select start date</span>
                      )}
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filterDateFrom}
                      onSelect={setFilterDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={"w-full pl-3 text-left font-normal flex justify-between"}
                    >
                      {filterDateTo ? (
                        format(filterDateTo, "PP")
                      ) : (
                        <span>Select end date</span>
                      )}
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filterDateTo}
                      onSelect={setFilterDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-3 flex justify-between">
            <div>
              <span className="text-sm text-muted-foreground">
                {filteredEvents.length} events found
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Events table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableCaption>
              {isLoadingEvents 
                ? "Loading maintenance history..." 
                : filteredEvents.length 
                  ? `Showing ${filteredEvents.length} maintenance events` 
                  : "No maintenance events found"
              }
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Downtime (hrs)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEvents ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    Loading maintenance history...
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    No maintenance events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {getAssetName(event.assetId)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          event.eventType === "PM" 
                            ? "bg-green-100 text-green-800" 
                            : event.eventType === "CM" 
                            ? "bg-orange-100 text-orange-800"
                            : event.eventType === "FF"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {event.eventType === "PM" 
                          ? "Preventive" 
                          : event.eventType === "CM" 
                          ? "Corrective"
                          : event.eventType === "FF"
                          ? "Functional Failure"
                          : event.eventType === "PF"
                          ? "Potential Failure"
                          : event.eventType === "I"
                          ? "Inspection"
                          : "Other"
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(event.eventDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>${event.cost.toFixed(2)}</TableCell>
                    <TableCell>{event.downtime.toFixed(1)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {event.description}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this event?")) {
                            deleteEventMutation.mutate(event.id);
                          }
                        }}
                        disabled={deleteEventMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Data Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Failure History</CardTitle>
          <CardDescription>
            Import maintenance history from CSV or Excel files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-10">
            <div className="space-y-2 text-center">
              <FileUp className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-medium">Upload maintenance history file</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload CSV or Excel files with maintenance history data
              </p>
              <Button variant="outline" className="mt-2">
                Select File
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Data must include asset ID, event type, date, and other required fields
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-3">
          <p className="text-sm text-muted-foreground">
            Need a template? <Button variant="link" className="p-0 h-auto">Download sample file</Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FailureHistory;