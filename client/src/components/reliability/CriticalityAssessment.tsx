import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Asset } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRight, AlertTriangle, Check, RefreshCw } from "lucide-react";

// Define form schema for criticality assessment
const criticalityAssessmentSchema = z.object({
  assetId: z.string().min(1, "Please select an asset"),
  conditionReading: z.string().optional(),
  conditionStatus: z.string().min(1, "Please select current condition"),
  
  // Inherent risk assessment
  consequenceDescription: z.string().min(5, "Please describe the consequence of failure"),
  inherentConsequence: z.string().min(1, "Please select consequence level"),
  inherentLikelihood: z.string().min(1, "Please select likelihood level"),
  consequenceCategory: z.string().min(1, "Please select consequence category"),
  
  // Controls section
  controlsDescription: z.string().optional(),
  
  // Residual risk assessment
  residualConsequence: z.string().min(1, "Please select residual consequence level"),
  residualLikelihood: z.string().min(1, "Please select residual likelihood level"),
});

const CriticalityAssessment = () => {
  const { toast } = useToast();
  const [assessmentStep, setAssessmentStep] = useState<number>(1);
  const [riskLevel, setRiskLevel] = useState<number | null>(null);
  const [criticalityLevel, setCriticalityLevel] = useState<number | null>(null);
  const [residualRiskLevel, setResidualRiskLevel] = useState<number | null>(null);
  const [residualCriticalityLevel, setResidualCriticalityLevel] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("guide");
  
  // Add state for selected asset and whether assessments have been completed
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);

  // Fetch assets for the form
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // Initialize form
  const form = useForm<z.infer<typeof criticalityAssessmentSchema>>({
    resolver: zodResolver(criticalityAssessmentSchema),
    defaultValues: {
      assetId: "",
      conditionReading: "",
      conditionStatus: "",
      consequenceDescription: "",
      inherentConsequence: "",
      inherentLikelihood: "",
      consequenceCategory: "",
      controlsDescription: "",
      residualConsequence: "",
      residualLikelihood: "",
    },
  });

  // Calculate risk level based on consequence and likelihood
  const calculateRiskLevel = (consequence: string, likelihood: string) => {
    const consequenceMap: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 };
    const likelihoodMap: Record<string, number> = { "A": 5, "B": 4, "C": 3, "D": 2, "E": 1 };
    
    if (!consequence || !likelihood) return null;
    
    const consValue = consequenceMap[consequence] || 0;
    const likeValue = likelihoodMap[likelihood] || 0;
    
    return consValue * likeValue;
  };

  // Determine criticality level based on risk level
  const determineCriticalityLevel = (risk: number | null) => {
    if (risk === null) return null;
    if (risk >= 18) return 1; // Extreme risk -> Criticality 1
    if (risk >= 10) return 2; // High risk -> Criticality 2
    if (risk >= 6) return 3;  // Moderate risk -> Criticality 3
    return 4;                // Low risk -> Criticality 4
  };

  // Get color for criticality level
  const getCriticalityColor = (level: number | null) => {
    if (level === null) return "bg-gray-100 text-gray-800";
    if (level === 1) return "bg-red-100 text-red-800";
    if (level === 2) return "bg-orange-100 text-orange-800";
    if (level === 3) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  // Update risk and criticality levels when form values change
  form.watch((values) => {
    const inherentRisk = calculateRiskLevel(values.inherentConsequence || "", values.inherentLikelihood || "");
    setRiskLevel(inherentRisk);
    setCriticalityLevel(determineCriticalityLevel(inherentRisk));
    
    const residualRisk = calculateRiskLevel(values.residualConsequence || "", values.residualLikelihood || "");
    setResidualRiskLevel(residualRisk);
    setResidualCriticalityLevel(determineCriticalityLevel(residualRisk));
  });
  
  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (updateData: { 
      assetId: number, 
      criticality: string,
      inherentCriticality?: string, 
      residualRiskLevel?: number,
      inherentRiskLevel?: number
    }) => {
      const response = await fetch(`/api/assets/${updateData.assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criticality: updateData.criticality,
          // Store additional assessment data as part of the asset
          criticalityAssessment: {
            inherentCriticality: updateData.inherentCriticality,
            residualRiskLevel: updateData.residualRiskLevel,
            inherentRiskLevel: updateData.inherentRiskLevel,
            assessmentDate: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      setAssessmentCompleted(true);
      
      toast({
        title: "Criticality Assessment Applied",
        description: `The asset has been updated with the new criticality level.`,
      });
    },
    onError: (error) => {
      console.error('Error updating asset:', error);
      toast({
        title: 'Failed to update asset',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Update selected asset when asset ID changes
  useEffect(() => {
    const assetId = form.getValues('assetId');
    if (assetId) {
      const asset = assets.find(a => a.id.toString() === assetId);
      setSelectedAsset(asset || null);
    } else {
      setSelectedAsset(null);
    }
  }, [form.watch('assetId'), assets]);
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof criticalityAssessmentSchema>) => {
    // Convert asset ID to number
    const assetId = parseInt(data.assetId);
    
    // Map criticality levels to strings
    let criticalityString = "Medium"; // Default
    
    if (residualCriticalityLevel === 1) {
      criticalityString = "High";
    } else if (residualCriticalityLevel === 2) {
      criticalityString = "Medium";
    } else if (residualCriticalityLevel === 3 || residualCriticalityLevel === 4) {
      criticalityString = "Low";
    }
    
    // Map inherent criticality level to string
    let inherentCriticalityString = "Medium"; // Default
    
    if (criticalityLevel === 1) {
      inherentCriticalityString = "High";
    } else if (criticalityLevel === 2) {
      inherentCriticalityString = "Medium";
    } else if (criticalityLevel === 3 || criticalityLevel === 4) {
      inherentCriticalityString = "Low";
    }
    
    // Update the asset with the new criticality level
    updateAssetMutation.mutate({
      assetId,
      criticality: criticalityString,
      inherentCriticality: inherentCriticalityString,
      residualRiskLevel: residualRiskLevel || 0,
      inherentRiskLevel: riskLevel || 0
    });
  };

  // Move to next step in the assessment
  const nextStep = () => {
    if (assessmentStep < 4) {
      setAssessmentStep(assessmentStep + 1);
    }
  };

  // Move to previous step in the assessment
  const prevStep = () => {
    if (assessmentStep > 1) {
      setAssessmentStep(assessmentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Criticality Assessment</h2>
          <p className="text-muted-foreground">
            Assess the criticality of assets based on risk and determine appropriate controls
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guide">Assessment Guide</TabsTrigger>
            <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
          </TabsList>
          <TabsContent value="guide" className="p-4 border rounded-md mt-2">
            <h3 className="font-medium">Assessment Process</h3>
            <ol className="mt-2 text-sm space-y-1">
              <li>1. Record asset details and current condition</li>
              <li>2. Assess inherent risk of asset failure</li>
              <li>3. Determine inherent criticality level</li>
              <li>4. Define required controls and assess residual risk</li>
            </ol>
          </TabsContent>
          <TabsContent value="matrix" className="p-4 border rounded-md mt-2">
            <h3 className="font-medium">Risk Matrix</h3>
            <Table className="text-xs mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Likelihood ↓ / Consequence →</TableHead>
                  <TableHead className="text-center">1 - Minor</TableHead>
                  <TableHead className="text-center">2 - Moderate</TableHead>
                  <TableHead className="text-center">3 - Serious</TableHead>
                  <TableHead className="text-center">4 - Major</TableHead>
                  <TableHead className="text-center">5 - Catastrophic</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>A - Almost Certain</TableCell>
                  <TableCell className="bg-yellow-100 text-center">5</TableCell>
                  <TableCell className="bg-orange-100 text-center">10</TableCell>
                  <TableCell className="bg-red-100 text-center">15</TableCell>
                  <TableCell className="bg-red-200 text-center">20</TableCell>
                  <TableCell className="bg-red-300 text-center">25</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>B - Likely</TableCell>
                  <TableCell className="bg-green-100 text-center">4</TableCell>
                  <TableCell className="bg-yellow-100 text-center">8</TableCell>
                  <TableCell className="bg-orange-100 text-center">12</TableCell>
                  <TableCell className="bg-red-100 text-center">16</TableCell>
                  <TableCell className="bg-red-200 text-center">20</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>C - Possible</TableCell>
                  <TableCell className="bg-green-100 text-center">3</TableCell>
                  <TableCell className="bg-green-100 text-center">6</TableCell>
                  <TableCell className="bg-yellow-100 text-center">9</TableCell>
                  <TableCell className="bg-orange-100 text-center">12</TableCell>
                  <TableCell className="bg-red-100 text-center">15</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>D - Unlikely</TableCell>
                  <TableCell className="bg-green-100 text-center">2</TableCell>
                  <TableCell className="bg-green-100 text-center">4</TableCell>
                  <TableCell className="bg-green-100 text-center">6</TableCell>
                  <TableCell className="bg-yellow-100 text-center">8</TableCell>
                  <TableCell className="bg-orange-100 text-center">10</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>E - Rare</TableCell>
                  <TableCell className="bg-green-100 text-center">1</TableCell>
                  <TableCell className="bg-green-100 text-center">2</TableCell>
                  <TableCell className="bg-green-100 text-center">3</TableCell>
                  <TableCell className="bg-green-100 text-center">4</TableCell>
                  <TableCell className="bg-yellow-100 text-center">5</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      {assessmentCompleted ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Check className="h-6 w-6 text-green-600 mr-2" />
              Assessment Complete
            </CardTitle>
            <CardDescription>
              The asset criticality has been updated successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>Assessment applied</AlertTitle>
              <AlertDescription>
                The asset criticality rating has been updated based on your assessment. This will affect maintenance scheduling and resource allocation.
              </AlertDescription>
            </Alert>
            
            <div className="p-4 border rounded-md space-y-3">
              <h3 className="font-medium text-lg">Assessment Summary</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asset</p>
                  <p>{selectedAsset?.name} ({selectedAsset?.assetNumber})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inherent Criticality</p>
                  <Badge className={getCriticalityColor(criticalityLevel)}>
                    Level {criticalityLevel}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Residual Criticality</p>
                  <Badge className={getCriticalityColor(residualCriticalityLevel)}>
                    Level {residualCriticalityLevel}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applied Rating</p>
                  <Badge className={
                    residualCriticalityLevel === 1 ? "bg-red-100 text-red-800" :
                    residualCriticalityLevel === 2 ? "bg-orange-100 text-orange-800" :
                    "bg-green-100 text-green-800"
                  }>
                    {residualCriticalityLevel === 1 ? "High" : 
                     residualCriticalityLevel === 2 ? "Medium" : "Low"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => {
                form.reset();
                setAssessmentCompleted(false);
                setAssessmentStep(1);
              }}
            >
              Back to Asset List
            </Button>
            <Button 
              onClick={() => {
                form.reset();
                setAssessmentCompleted(false);
                setAssessmentStep(1);
              }}
            >
              Start New Assessment
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Asset Details and Condition */}
            {assessmentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Asset Details and Condition</CardTitle>
                  <CardDescription>Record general details and current condition of the asset</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        <FormDescription>
                          Select the asset to assess from the registered assets
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conditionReading"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours/km/tonnes/calendar</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 100,562 km" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the current usage reading of the asset
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conditionStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select current condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assess the current condition based on performance history
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button" onClick={nextStep}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 2: Inherent Risk Assessment */}
            {assessmentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Inherent Risk Assessment</CardTitle>
                  <CardDescription>
                    Assess the inherent risk associated with the failure of the asset (assuming no controls)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="consequenceDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consequence of Inherent Failure</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the most credible worst case scenario if this asset fails" 
                            {...field} 
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormDescription>
                          Consider consequences to people, environment, and business
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="inherentConsequence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inherent Consequence</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 - Minor</SelectItem>
                              <SelectItem value="2">2 - Moderate</SelectItem>
                              <SelectItem value="3">3 - Serious</SelectItem>
                              <SelectItem value="4">4 - Major</SelectItem>
                              <SelectItem value="5">5 - Catastrophic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inherentLikelihood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inherent Likelihood</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A">A - Almost Certain</SelectItem>
                              <SelectItem value="B">B - Likely</SelectItem>
                              <SelectItem value="C">C - Possible</SelectItem>
                              <SelectItem value="D">D - Unlikely</SelectItem>
                              <SelectItem value="E">E - Rare</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consequenceCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consequence Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="people">People (Health & Safety)</SelectItem>
                              <SelectItem value="environment">Environment</SelectItem>
                              <SelectItem value="business_financial">Business - Financial/Production</SelectItem>
                              <SelectItem value="business_reputation">Business - Reputation/Community</SelectItem>
                              <SelectItem value="business_regulatory">Business - Regulatory/Legal/Compliance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {riskLevel !== null && criticalityLevel !== null && (
                    <div className="mt-4 p-4 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Inherent Risk Assessment</h3>
                          <p className="text-sm text-muted-foreground">Without controls</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Risk Level: {riskLevel}</p>
                          <Badge className={getCriticalityColor(criticalityLevel)}>
                            Criticality Level {criticalityLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 3: Controls */}
            {assessmentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Control Measures</CardTitle>
                  <CardDescription>
                    Define the control measures that are or should be in place to reduce risk
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="controlsDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Control Measures</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the control measures that are or should be in place" 
                            {...field} 
                            className="min-h-[150px]"
                          />
                        </FormControl>
                        <FormDescription>
                          Consider engineering controls, maintenance strategies, monitoring, procedures, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 border rounded-md border-amber-200 bg-amber-50">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium">Control Types to Consider</h3>
                        <ul className="mt-2 text-sm space-y-1 list-disc ml-5">
                          <li><span className="font-medium">Engineering:</span> Physical barriers, fail-safes, redundancy</li>
                          <li><span className="font-medium">Maintenance:</span> Preventive tasks, condition monitoring</li>
                          <li><span className="font-medium">Administrative:</span> Procedures, training, certification</li>
                          <li><span className="font-medium">Mitigating:</span> Emergency response, containment</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 4: Residual Risk Assessment */}
            {assessmentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 4: Residual Risk Assessment</CardTitle>
                  <CardDescription>
                    Assess the residual risk with control measures implemented
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="residualConsequence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residual Consequence</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 - Minor</SelectItem>
                              <SelectItem value="2">2 - Moderate</SelectItem>
                              <SelectItem value="3">3 - Serious</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Should be less than inherent consequence
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residualLikelihood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residual Likelihood</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="B">B - Likely</SelectItem>
                              <SelectItem value="C">C - Possible</SelectItem>
                              <SelectItem value="D">D - Unlikely</SelectItem>
                              <SelectItem value="E">E - Rare</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Should be less than inherent likelihood
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {residualRiskLevel !== null && residualCriticalityLevel !== null && (
                    <div className="mt-4 p-4 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Residual Risk Assessment</h3>
                          <p className="text-sm text-muted-foreground">After implementing controls</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Risk Level: {residualRiskLevel}</p>
                          <Badge className={getCriticalityColor(residualCriticalityLevel)}>
                            Criticality Level {residualCriticalityLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                  {!updateAssetMutation.isPending ? (
                    <Button type="submit">
                      Complete Assessment
                    </Button>
                  ) : (
                    <Button disabled>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating Asset...
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}
          </form>
        </Form>
      )}
      
      {/* Criticality Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Criticality Levels Reference</CardTitle>
          <CardDescription>
            Reference guide for asset criticality levels and required actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk Level/Rating</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Required Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>18-25</TableCell>
                <TableCell>Extreme</TableCell>
                <TableCell>
                  <Badge className="bg-red-100 text-red-800">Level 1</Badge>
                </TableCell>
                <TableCell>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Maintenance Strategy Review (MSR)</li>
                    <li>Critical Spares Review</li>
                    <li>RCM Analysis</li>
                    <li>Contingency Planning</li>
                    <li>Enhanced Monitoring</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>10-17</TableCell>
                <TableCell>High</TableCell>
                <TableCell>
                  <Badge className="bg-orange-100 text-orange-800">Level 2</Badge>
                </TableCell>
                <TableCell>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Maintenance Strategy Review (MSR)</li>
                    <li>Critical Spares Review</li>
                    <li>Preventive Maintenance Optimization</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>6-9</TableCell>
                <TableCell>Moderate</TableCell>
                <TableCell>
                  <Badge className="bg-yellow-100 text-yellow-800">Level 3</Badge>
                </TableCell>
                <TableCell>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Standard maintenance practices</li>
                    <li>Regular monitoring</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>1-5</TableCell>
                <TableCell>Low</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Level 4</Badge>
                </TableCell>
                <TableCell>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Basic maintenance practices</li>
                    <li>Run-to-failure may be acceptable</li>
                  </ul>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CriticalityAssessment;