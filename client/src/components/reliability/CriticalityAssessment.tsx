import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, ArrowRight, AlertTriangle } from "lucide-react";

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

  // Handle form submission
  const onSubmit = (data: z.infer<typeof criticalityAssessmentSchema>) => {
    // In a real application, this would submit the assessment to the server
    console.log("Assessment data:", data);
    console.log("Inherent Risk Level:", riskLevel);
    console.log("Inherent Criticality Level:", criticalityLevel);
    console.log("Residual Risk Level:", residualRiskLevel);
    console.log("Residual Criticality Level:", residualCriticalityLevel);
    
    toast({
      title: "Criticality Assessment Completed",
      description: `Asset criticality assessment has been saved. Inherent Criticality: ${criticalityLevel}, Residual Criticality: ${residualCriticalityLevel}`,
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
                        <h3 className="font-medium">Assessment Results</h3>
                        <p className="text-sm text-muted-foreground">Based on your selections</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Inherent Risk Level</p>
                          <Badge variant="outline" className="mt-1">{riskLevel}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Inherent Criticality</p>
                          <Badge className={`mt-1 ${getCriticalityColor(criticalityLevel)}`}>
                            Level {criticalityLevel}
                          </Badge>
                        </div>
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
                <CardTitle>Step 3: Required Controls</CardTitle>
                <CardDescription>
                  Define the controls required to achieve an acceptable residual risk level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {criticalityLevel !== null && criticalityLevel <= 2 ? (
                  <>
                    <div className="p-4 border rounded-md bg-amber-50 flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-amber-800">High Criticality Asset</h3>
                        <p className="text-sm text-amber-800">
                          This is a Level {criticalityLevel} criticality asset which requires additional controls and careful management
                        </p>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Required Controls</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <p className="font-medium">Maintenance Strategy Review (MSR)</p>
                            <p className="text-muted-foreground">Complete review of maintenance strategy and update as needed</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <p className="font-medium">Critical Spares Review</p>
                            <p className="text-muted-foreground">Identify and maintain critical spare parts for this asset</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <p className="font-medium">Reliability Centered Maintenance (RCM)</p>
                            <p className="text-muted-foreground">Conduct detailed RCM analysis for this asset</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <p className="font-medium">Contingency Planning</p>
                            <p className="text-muted-foreground">Develop specific contingency plans for failure scenarios</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 border rounded-md bg-green-50 flex items-start space-x-3">
                    <Info className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-800">Lower Criticality Asset</h3>
                      <p className="text-sm text-green-800">
                        This asset has been assessed as Level {criticalityLevel || 3} criticality. Standard maintenance practices are usually sufficient.
                      </p>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="controlsDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Controls</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe any additional controls needed to mitigate the risk of failure" 
                          {...field} 
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Include any specific controls not covered by standard procedures
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  Assess the residual risk after implementing the controls
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
                        <h3 className="font-medium">Assessment Results</h3>
                        <p className="text-sm text-muted-foreground">After implementing controls</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Residual Risk Level</p>
                          <Badge variant="outline" className="mt-1">{residualRiskLevel}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Residual Criticality</p>
                          <Badge className={`mt-1 ${getCriticalityColor(residualCriticalityLevel)}`}>
                            Level {residualCriticalityLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {residualCriticalityLevel !== null && residualCriticalityLevel <= 2 && (
                  <div className="p-4 border rounded-md bg-red-50 flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-red-800">Insufficient Risk Reduction</h3>
                      <p className="text-sm text-red-800">
                        The controls defined are not sufficient to reduce the criticality level to an acceptable level (3 or 4).
                        Review and strengthen the controls to further mitigate the risk.
                      </p>
                    </div>
                  </div>
                )}

                {residualRiskLevel !== null && riskLevel !== null && residualRiskLevel >= riskLevel && (
                  <div className="p-4 border rounded-md bg-red-50 flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-red-800">No Risk Reduction</h3>
                      <p className="text-sm text-red-800">
                        The residual risk is not lower than the inherent risk.
                        The controls are not effective in reducing the risk.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button type="submit" 
                        disabled={residualCriticalityLevel !== null && residualCriticalityLevel <= 2}>
                  Complete Assessment
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
      
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