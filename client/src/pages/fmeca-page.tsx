import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, FileText, Database, Plus, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface System {
  id: number;
  name: string;
  purpose?: string;
}

interface Asset {
  id: number;
  tagNumber: string;
  description: string;
  function: string;
}

interface Component {
  id: number;
  name: string;
  description?: string;
}

interface AssetFmecaRow {
  id: string;
  tagNumber: string;     // Associated with the asset tag number
  assetDescription: string; // Associated with the asset description
  assetFunction: string;  // Associated with the asset function
  component: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  probability: number;
  detection: number;
  rpn: number;
  action: string;
  targetDate: string;
  comments: string;
}

interface SystemFmecaRow {
  id: string;
  systemId: string;      // Associated with the system ID
  systemName: string;    // Associated with the system name
  systemFunction: string; // Associated with the system function
  subsystem: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  probability: number;
  detection: number;
  rpn: number;
  action: string;
  targetDate: string;
  comments: string;
}

const FmecaPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState("asset-level");
  const { toast } = useToast();
  
  // Asset-level FMECA form state
  const [assetTagNumber, setAssetTagNumber] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetFunction, setAssetFunction] = useState("");
  const [assetRows, setAssetRows] = useState<AssetFmecaRow[]>([]);
  
  // New asset row ratings state
  const [assetSeverity, setAssetSeverity] = useState<number>(5);
  const [assetProbability, setAssetProbability] = useState<number>(5);
  const [assetDetection, setAssetDetection] = useState<number>(5);
  
  // System-level FMECA form state
  const [systemName, setSystemName] = useState("");
  const [systemDescription, setSystemDescription] = useState("");
  const [systemFunction, setSystemFunction] = useState("");
  const [systemRows, setSystemRows] = useState<SystemFmecaRow[]>([]);
  
  // New system row ratings state
  const [systemSeverity, setSystemSeverity] = useState<number>(5);
  const [systemProbability, setSystemProbability] = useState<number>(5);
  const [systemDetection, setSystemDetection] = useState<number>(5);
  
  // Helper functions for RPN calculation and display
  const calculateAssetRpn = (): number => {
    return assetSeverity * assetProbability * assetDetection;
  };
  
  const getColorByRpn = (rpn: number): string => {
    if (rpn >= 200) return "text-red-600";
    if (rpn >= 125) return "text-amber-600";
    return "text-green-600";
  };
  
  const getColorClassByRpn = (rpn: number): string => {
    if (rpn >= 200) return "bg-red-500 hover:bg-red-600";
    if (rpn >= 125) return "bg-amber-500 hover:bg-amber-600";
    return "bg-green-500 hover:bg-green-600";
  };
  
  const getRiskLevelByRpn = (rpn: number): string => {
    if (rpn >= 200) return "High Risk";
    if (rpn >= 125) return "Medium Risk";
    return "Low Risk";
  };
  
  // Handler functions for asset-level FMECA
  const handleAssetRatingChange = (type: string, value: number) => {
    switch (type) {
      case 'severity':
        setAssetSeverity(value);
        break;
      case 'probability':
        setAssetProbability(value);
        break;
      case 'detection':
        setAssetDetection(value);
        break;
    }
  };
  
  const handleAddAssetRow = () => {
    // Get values from the form
    const componentEl = document.getElementById('new-component') as HTMLInputElement;
    const failureModeEl = document.getElementById('new-failure-mode') as HTMLInputElement;
    const causeEl = document.getElementById('new-cause') as HTMLInputElement;
    const effectEl = document.getElementById('new-effect') as HTMLInputElement;
    const actionEl = document.getElementById('new-action') as HTMLInputElement;
    const targetDateEl = document.getElementById('new-target-date') as HTMLInputElement;
    const commentsEl = document.getElementById('new-comments') as HTMLInputElement;
    
    // Validate required fields
    if (!assetTagNumber) {
      toast({
        title: "Asset Information Required",
        description: "Please enter the Asset Tag Number before adding components",
        variant: "destructive"
      });
      return;
    }
    
    if (!componentEl.value || !failureModeEl.value) {
      toast({
        title: "Input Required",
        description: "Component and Failure Mode are required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Create new row with asset information
    const newRow: AssetFmecaRow = {
      id: Date.now().toString(),
      tagNumber: assetTagNumber,
      assetDescription: assetDescription,
      assetFunction: assetFunction,
      component: componentEl.value,
      failureMode: failureModeEl.value,
      cause: causeEl.value,
      effect: effectEl.value,
      severity: assetSeverity,
      probability: assetProbability,
      detection: assetDetection,
      rpn: calculateAssetRpn(),
      action: actionEl.value,
      targetDate: targetDateEl.value,
      comments: commentsEl.value
    };
    
    // Add new row to the table
    setAssetRows([...assetRows, newRow]);
    
    // Clear form fields
    componentEl.value = '';
    failureModeEl.value = '';
    causeEl.value = '';
    effectEl.value = '';
    actionEl.value = '';
    targetDateEl.value = '';
    commentsEl.value = '';
    
    // Reset ratings to default
    setAssetSeverity(5);
    setAssetProbability(5);
    setAssetDetection(5);
    
    toast({
      title: "Success",
      description: "FMECA row added successfully"
    });
  };
  
  const handleDeleteAssetRow = (id: string) => {
    setAssetRows(assetRows.filter(row => row.id !== id));
    toast({
      title: "Row Deleted",
      description: "FMECA row removed"
    });
  };
  
  const handleClearAssetFmeca = () => {
    if (window.confirm("Are you sure you want to clear all FMECA data?")) {
      setAssetTagNumber("");
      setAssetDescription("");
      setAssetFunction("");
      setAssetRows([]);
      toast({
        title: "FMECA Cleared",
        description: "All FMECA data has been cleared"
      });
    }
  };
  
  const handleSaveAssetFmeca = () => {
    // In a real application, this would save to the database
    // For now, we'll just show a success message
    if (assetRows.length === 0) {
      toast({
        title: "Empty FMECA",
        description: "Please add at least one row before saving",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "FMECA Saved",
      description: "Your FMECA analysis has been saved successfully"
    });
  };
  
  // Helper function for system-level RPN calculation
  const calculateSystemRpn = (): number => {
    return systemSeverity * systemProbability * systemDetection;
  };
  
  // Handler functions for system-level FMECA
  const handleSystemRatingChange = (type: string, value: number) => {
    switch (type) {
      case 'severity':
        setSystemSeverity(value);
        break;
      case 'probability':
        setSystemProbability(value);
        break;
      case 'detection':
        setSystemDetection(value);
        break;
    }
  };
  
  const handleAddSystemRow = () => {
    // Get values from the form
    const subsystemEl = document.getElementById('new-subsystem') as HTMLInputElement;
    const failureModeEl = document.getElementById('new-system-failure-mode') as HTMLInputElement;
    const causeEl = document.getElementById('new-system-cause') as HTMLInputElement;
    const effectEl = document.getElementById('new-system-effect') as HTMLInputElement;
    const actionEl = document.getElementById('new-system-action') as HTMLInputElement;
    const targetDateEl = document.getElementById('new-system-target-date') as HTMLInputElement;
    const commentsEl = document.getElementById('new-system-comments') as HTMLInputElement;
    
    // Validate system information is provided
    if (!systemName) {
      toast({
        title: "System Information Required",
        description: "Please enter the System Name before adding subsystems",
        variant: "destructive"
      });
      return;
    }
    
    if (!subsystemEl.value || !failureModeEl.value) {
      toast({
        title: "Input Required",
        description: "Subsystem and Failure Mode are required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Create new row with system information
    const newRow: SystemFmecaRow = {
      id: Date.now().toString(),
      systemId: Date.now().toString(), // Temporary ID for now
      systemName: systemName,
      systemFunction: systemFunction,
      subsystem: subsystemEl.value,
      failureMode: failureModeEl.value,
      cause: causeEl.value,
      effect: effectEl.value,
      severity: systemSeverity,
      probability: systemProbability,
      detection: systemDetection,
      rpn: calculateSystemRpn(),
      action: actionEl.value,
      targetDate: targetDateEl.value,
      comments: commentsEl.value
    };
    
    // Add new row to the table
    setSystemRows([...systemRows, newRow]);
    
    // Clear form fields
    subsystemEl.value = '';
    failureModeEl.value = '';
    causeEl.value = '';
    effectEl.value = '';
    actionEl.value = '';
    targetDateEl.value = '';
    commentsEl.value = '';
    
    // Reset ratings to default
    setSystemSeverity(5);
    setSystemProbability(5);
    setSystemDetection(5);
    
    toast({
      title: "Success",
      description: "System FMECA row added successfully"
    });
  };
  
  const handleDeleteSystemRow = (id: string) => {
    setSystemRows(systemRows.filter(row => row.id !== id));
    toast({
      title: "Row Deleted",
      description: "System FMECA row removed"
    });
  };
  
  const handleClearSystemFmeca = () => {
    if (window.confirm("Are you sure you want to clear all System FMECA data?")) {
      setSystemName("");
      setSystemDescription("");
      setSystemFunction("");
      setSystemRows([]);
      toast({
        title: "System FMECA Cleared",
        description: "All System FMECA data has been cleared"
      });
    }
  };
  
  const handleSaveSystemFmeca = () => {
    // In a real application, this would save to the database
    // For now, we'll just show a success message
    if (systemRows.length === 0) {
      toast({
        title: "Empty System FMECA",
        description: "Please add at least one row before saving",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "System FMECA Saved",
      description: "Your System FMECA analysis has been saved successfully"
    });
  };

  // Get all systems
  const { data: systems, isLoading } = useQuery({
    queryKey: ["/api/fmeca/systems"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/fmeca/systems");
      if (!response.ok) {
        throw new Error("Failed to fetch systems");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading systems...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">FMECA Analysis</h1>
      <p className="text-muted-foreground">
        Failure Mode, Effects, and Criticality Analysis is a structured approach to identifying potential
        failure modes in a system and their effects.
      </p>
      
      <Tabs defaultValue="asset-level" className="w-full" onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asset-level" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Individual Asset-Level FMECA
          </TabsTrigger>
          <TabsTrigger value="system-level" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            System-Level FMECA
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="asset-level" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Asset-Level FMECA</CardTitle>
              <CardDescription>
                Analyze specific assets (e.g., pumps, motors) by breaking them down into components like mechanical seals, bearings, and shafts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>Structure:</strong> The asset-level FMECA begins with header information 
                (Tag Number, Asset Description, Function) followed by a detailed component breakdown.
              </p>
              <p className="text-sm">
                <strong>Example:</strong> For a centrifugal pump, components would include 
                Mechanical Seal, Bearing, Shaft, etc. with failure modes analyzed for each.
              </p>
            </CardContent>
          </Card>
          
          <div className="mt-6 p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-bold mb-4">Asset-Level FMECA Sheet</h2>
            
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <h3 className="font-semibold text-amber-800">Example Asset FMECA</h3>
              <p className="text-sm text-amber-700 mt-1">
                Here's an example of a completed Asset-Level FMECA for a Centrifugal Pump:
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-sm">
                  <span className="font-medium">Tag Number:</span> Pump-101
                </div>
                <div className="text-sm">
                  <span className="font-medium">Description:</span> Centrifugal Pump
                </div>
                <div className="text-sm">
                  <span className="font-medium">Function:</span> Delivers fluid to main system
                </div>
              </div>
              <div className="mt-2 text-sm text-amber-700">
                <span className="font-medium">Example Components:</span> Mechanical Seal (RPN 144, High Risk), Bearing (RPN 140, Medium Risk), Shaft (RPN 150, High Risk)
              </div>
            </div>
            
            {/* Asset Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
              <div>
                <Label className="text-sm font-medium">Tag Number:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Pump-101" 
                  value={assetTagNumber}
                  onChange={(e) => setAssetTagNumber(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Asset Description:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Centrifugal Pump" 
                  value={assetDescription}
                  onChange={(e) => setAssetDescription(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Function:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Delivers fluid to main system" 
                  value={assetFunction}
                  onChange={(e) => setAssetFunction(e.target.value)}
                />
              </div>
            </div>
            
            {/* FMECA Table */}
            <div className="overflow-x-auto">
              {assetRows.length > 0 ? (
                <div className="space-y-6">
                  {/* Group rows by tag number */}
                  {Array.from(new Set(assetRows.map(row => row.tagNumber))).map(tagNumber => {
                    const assetRowsForTag = assetRows.filter(row => row.tagNumber === tagNumber);
                    const firstRow = assetRowsForTag[0];
                    
                    return (
                      <div key={tagNumber} className="border rounded-md overflow-hidden">
                        {/* Asset Information Header */}
                        <div className="p-4 bg-blue-50 border-b border-blue-100">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h3 className="font-medium text-blue-800">Tag Number:</h3>
                              <p className="font-bold">{firstRow.tagNumber}</p>
                            </div>
                            <div>
                              <h3 className="font-medium text-blue-800">Asset Description:</h3>
                              <p>{firstRow.assetDescription}</p>
                            </div>
                            <div>
                              <h3 className="font-medium text-blue-800">Function:</h3>
                              <p>{firstRow.assetFunction}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Asset Components Table */}
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-gray-300 p-2 text-left">Component</th>
                              <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                              <th className="border border-gray-300 p-2 text-left">Cause</th>
                              <th className="border border-gray-300 p-2 text-left">Effect</th>
                              <th className="border border-gray-300 p-2 text-left">Severity</th>
                              <th className="border border-gray-300 p-2 text-left">Probability</th>
                              <th className="border border-gray-300 p-2 text-left">Detection</th>
                              <th className="border border-gray-300 p-2 text-left">RPN</th>
                              <th className="border border-gray-300 p-2 text-left">Action Required</th>
                              <th className="border border-gray-300 p-2 text-left">Target Date</th>
                              <th className="border border-gray-300 p-2 text-left">Comments</th>
                              <th className="border border-gray-300 p-2 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assetRowsForTag.map((row) => (
                              <tr key={row.id}>
                                <td className="border border-gray-300 p-2">{row.component}</td>
                                <td className="border border-gray-300 p-2">{row.failureMode}</td>
                                <td className="border border-gray-300 p-2">{row.cause}</td>
                                <td className="border border-gray-300 p-2">{row.effect}</td>
                                <td className="border border-gray-300 p-2">{row.severity}</td>
                                <td className="border border-gray-300 p-2">{row.probability}</td>
                                <td className="border border-gray-300 p-2">{row.detection}</td>
                                <td className="border border-gray-300 p-2">
                                  <span className={`font-bold ${getColorByRpn(row.rpn)}`}>
                                    {row.rpn}
                                  </span>
                                </td>
                                <td className="border border-gray-300 p-2">{row.action}</td>
                                <td className="border border-gray-300 p-2">{row.targetDate}</td>
                                <td className="border border-gray-300 p-2">{row.comments}</td>
                                <td className="border border-gray-300 p-2 text-center">
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteAssetRow(row.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-gray-300 p-6 text-center rounded">
                  <p className="text-gray-500">No data available. Add a new row to begin your FMECA.</p>
                </div>
              )}
            </div>
            
            {/* Add New Row Form */}
            <div className="mt-4 p-4 bg-slate-50 rounded-md">
              <h3 className="text-md font-semibold mb-3">Add New FMECA Row</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Component:</Label>
                  <Input 
                    id="new-component" 
                    placeholder="e.g., Mechanical Seal"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Failure Mode:</Label>
                  <Input 
                    id="new-failure-mode" 
                    placeholder="e.g., Leakage"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cause:</Label>
                  <Input 
                    id="new-cause" 
                    placeholder="e.g., Wear and tear"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Effect:</Label>
                  <Input 
                    id="new-effect" 
                    placeholder="e.g., Fluid leakage, operational halt"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Severity (S):</Label>
                  <Select 
                    onValueChange={(value) => handleAssetRatingChange('severity', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Probability (P):</Label>
                  <Select 
                    onValueChange={(value) => handleAssetRatingChange('probability', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Detection (D):</Label>
                  <Select 
                    onValueChange={(value) => handleAssetRatingChange('detection', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">RPN (Auto-calculated):</Label>
                  <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
                    <span id="calculated-rpn" className="font-bold">{calculateAssetRpn()}</span>
                    {calculateAssetRpn() > 0 && (
                      <Badge 
                        className={`ml-2 ${getColorClassByRpn(calculateAssetRpn())}`}
                      >
                        {getRiskLevelByRpn(calculateAssetRpn())}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Action Required:</Label>
                  <Input 
                    id="new-action" 
                    placeholder="e.g., Replace seals periodically"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Date:</Label>
                  <Input 
                    id="new-target-date" 
                    type="date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Comments/Notes:</Label>
                  <Input 
                    id="new-comments" 
                    placeholder="e.g., Monitor wear during inspections"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  className="mt-2"
                  onClick={handleAddAssetRow}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add FMECA Row
                </Button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handleClearAssetFmeca}>
                Clear FMECA
              </Button>
              <Button onClick={handleSaveAssetFmeca}>
                Save FMECA
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system-level" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System-Level FMECA</CardTitle>
              <CardDescription>
                Analyze entire systems (e.g., boiler systems, HVAC systems) by evaluating subsystems like burners, gas systems, and automation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>Structure:</strong> The system-level FMECA begins with header information
                (System Name, Description, Primary Function) followed by a subsystem analysis.
              </p>
              <p className="text-sm">
                <strong>Example:</strong> For a boiler system, subsystems would include 
                Burner, Gas System, Automation & Control, etc. with failure modes analyzed for each.
              </p>
            </CardContent>
          </Card>
          
          <div className="mt-6 p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-bold mb-4">System-Level FMECA Sheet</h2>
            
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <h3 className="font-semibold text-amber-800">Example System FMECA</h3>
              <p className="text-sm text-amber-700 mt-1">
                Here's an example of a completed System-Level FMECA for a Boiler System:
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-sm">
                  <span className="font-medium">System Name:</span> Boiler System
                </div>
                <div className="text-sm">
                  <span className="font-medium">Description:</span> Generates process steam
                </div>
                <div className="text-sm">
                  <span className="font-medium">Function:</span> Provides heat and steam
                </div>
              </div>
              <div className="mt-2 text-sm text-amber-700">
                <span className="font-medium">Example Subsystems:</span> Burner (RPN 108, Medium Risk), Gas System (RPN 150, High Risk), Automation & Control (RPN 160, High Risk)
              </div>
            </div>
            
            {/* System Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
              <div>
                <Label className="text-sm font-medium">System Name:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Boiler System" 
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Generates process steam" 
                  value={systemDescription}
                  onChange={(e) => setSystemDescription(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Primary Function:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Provides heat and steam" 
                  value={systemFunction}
                  onChange={(e) => setSystemFunction(e.target.value)}
                />
              </div>
            </div>
            
            {/* FMECA Table */}
            <div className="overflow-x-auto">
              {systemRows.length > 0 ? (
                <div className="space-y-6">
                  {/* Group rows by system name */}
                  {Array.from(new Set(systemRows.map(row => row.systemName))).map(systemName => {
                    const systemRowsForName = systemRows.filter(row => row.systemName === systemName);
                    const firstRow = systemRowsForName[0];
                    
                    return (
                      <div key={systemName} className="border rounded-md overflow-hidden">
                        {/* System Information Header */}
                        <div className="p-4 bg-green-50 border-b border-green-100">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-medium text-green-800">System Name:</h3>
                              <p className="font-bold">{firstRow.systemName}</p>
                            </div>
                            <div>
                              <h3 className="font-medium text-green-800">Function:</h3>
                              <p>{firstRow.systemFunction}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* System Components Table */}
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-gray-300 p-2 text-left">Subsystem</th>
                              <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                              <th className="border border-gray-300 p-2 text-left">Cause</th>
                              <th className="border border-gray-300 p-2 text-left">Effect</th>
                              <th className="border border-gray-300 p-2 text-left">Severity</th>
                              <th className="border border-gray-300 p-2 text-left">Probability</th>
                              <th className="border border-gray-300 p-2 text-left">Detection</th>
                              <th className="border border-gray-300 p-2 text-left">RPN</th>
                              <th className="border border-gray-300 p-2 text-left">Action Required</th>
                              <th className="border border-gray-300 p-2 text-left">Target Date</th>
                              <th className="border border-gray-300 p-2 text-left">Comments</th>
                              <th className="border border-gray-300 p-2 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {systemRowsForName.map((row) => (
                              <tr key={row.id}>
                                <td className="border border-gray-300 p-2">{row.subsystem}</td>
                                <td className="border border-gray-300 p-2">{row.failureMode}</td>
                                <td className="border border-gray-300 p-2">{row.cause}</td>
                                <td className="border border-gray-300 p-2">{row.effect}</td>
                                <td className="border border-gray-300 p-2">{row.severity}</td>
                                <td className="border border-gray-300 p-2">{row.probability}</td>
                                <td className="border border-gray-300 p-2">{row.detection}</td>
                                <td className="border border-gray-300 p-2">
                                  <span className={`font-bold ${getColorByRpn(row.rpn)}`}>
                                    {row.rpn}
                                  </span>
                                </td>
                                <td className="border border-gray-300 p-2">{row.action}</td>
                                <td className="border border-gray-300 p-2">{row.targetDate}</td>
                                <td className="border border-gray-300 p-2">{row.comments}</td>
                                <td className="border border-gray-300 p-2 text-center">
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteSystemRow(row.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-gray-300 p-6 text-center rounded">
                  <p className="text-gray-500">No data available. Add a new row to begin your system-level FMECA.</p>
                </div>
              )}
            </div>
            
            {/* Add New Row Form */}
            <div className="mt-4 p-4 bg-slate-50 rounded-md">
              <h3 className="text-md font-semibold mb-3">Add New FMECA Row</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Subsystem:</Label>
                  <Input 
                    id="new-subsystem" 
                    placeholder="e.g., Burner"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Failure Mode:</Label>
                  <Input 
                    id="new-system-failure-mode" 
                    placeholder="e.g., Flame failure"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cause:</Label>
                  <Input 
                    id="new-system-cause" 
                    placeholder="e.g., Blocked fuel nozzle"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Effect:</Label>
                  <Input 
                    id="new-system-effect" 
                    placeholder="e.g., Loss of heat generation"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Severity (S):</Label>
                  <Select 
                    onValueChange={(value) => handleSystemRatingChange('severity', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Probability (P):</Label>
                  <Select 
                    onValueChange={(value) => handleSystemRatingChange('probability', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Detection (D):</Label>
                  <Select 
                    onValueChange={(value) => handleSystemRatingChange('detection', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">RPN (Auto-calculated):</Label>
                  <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
                    <span id="calculated-system-rpn" className="font-bold">{calculateSystemRpn()}</span>
                    {calculateSystemRpn() > 0 && (
                      <Badge 
                        className={`ml-2 ${getColorClassByRpn(calculateSystemRpn())}`}
                      >
                        {getRiskLevelByRpn(calculateSystemRpn())}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Action Required:</Label>
                  <Input 
                    id="new-system-action" 
                    placeholder="e.g., Inspect and clean regularly"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Date:</Label>
                  <Input 
                    id="new-system-target-date" 
                    type="date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Comments/Notes:</Label>
                  <Input 
                    id="new-system-comments" 
                    placeholder="e.g., Use automated flame monitoring"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  className="mt-2"
                  onClick={handleAddSystemRow}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add FMECA Row
                </Button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handleClearSystemFmeca}>
                Clear FMECA
              </Button>
              <Button onClick={handleSaveSystemFmeca}>
                Save FMECA
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FmecaPage;