import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Asset } from "@shared/schema";
import { ExtendedWeibullAnalysisResponse, WeibullDataPoint } from "@/lib/types";
import { AlertCircle, Info } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";

interface WeibullFittingParams {
  assetId?: number;
  equipmentClass?: string;
  failureModeId?: number;
  useOperatingHours: boolean;
  timeHorizon: number;
  maxReliability: number;
  acceptableDowntime: number;
}

interface DataDrivenWeibullAnalysisProps {
  selectedAssetId: number | null;
  setSelectedAssetId: (id: number | null) => void;
  selectedEquipmentClass: string | null;
  setSelectedEquipmentClass: (className: string | null) => void;
  selectedFailureModeId: number | null;
  setSelectedFailureModeId: (id: number | null) => void;
  useOperatingHours: boolean;
  setUseOperatingHours: (value: boolean) => void;
}

const DataDrivenWeibullAnalysis = ({
  selectedAssetId,
  setSelectedAssetId,
  selectedEquipmentClass,
  setSelectedEquipmentClass,
  selectedFailureModeId,
  setSelectedFailureModeId,
  useOperatingHours,
  setUseOperatingHours
}: DataDrivenWeibullAnalysisProps) => {
  const { toast } = useToast();
  const [timeHorizon, setTimeHorizon] = useState(5000);
  const [maxReliability, setMaxReliability] = useState(90);
  const [acceptableDowntime, setAcceptableDowntime] = useState(24);
  const [activeTab, setActiveTab] = useState("results");
  const [results, setResults] = useState<ExtendedWeibullAnalysisResponse | null>(null);
  
  // Fetch assets and equipment classes
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  const { data: equipmentClasses = [], isLoading: isLoadingClasses } = useQuery<{id: number, name: string}[]>({
    queryKey: ['/api/equipment-classes'],
    staleTime: 5000,
  });
  
  // Fetch failure modes based on current selection
  const { data: failureModes = [], isLoading: isLoadingFailureModes } = useQuery({
    queryKey: ['/api/failure-modes', selectedAssetId, selectedEquipmentClass],
    queryFn: async () => {
      let url = '/api/failure-modes';
      if (selectedAssetId) {
        url += `/asset/${selectedAssetId}`;
      } else if (selectedEquipmentClass) {
        url += `/class/${selectedEquipmentClass}`;
      }
      const res = await fetch(url);
      return res.json();
    },
    staleTime: 5000,
    enabled: !!selectedAssetId || !!selectedEquipmentClass,
  });
  
  // Weibull analysis mutation
  const weibullMutation = useMutation({
    mutationFn: async (params: WeibullFittingParams): Promise<ExtendedWeibullAnalysisResponse> => {
      const res = await apiRequest("POST", "/api/weibull-analysis/fit", params);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to perform Weibull analysis");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Handle fallback MTBF calculation (when Weibull fit fails but we have a basic MTBF)
      if (data.fallbackCalculation) {
        console.log('Using fallback MTBF calculation instead of Weibull fit');
        // Create simplified results using only MTBF
        const simplifiedResults: ExtendedWeibullAnalysisResponse = {
          ...data,
          mtbf: data.mtbf || 0,
          reliabilityCurve: data.reliabilityCurve || [],
          failureRateCurve: data.failureRateCurve || [],
          cumulativeFailureProbability: data.cumulativeFailureProbability || [],
          // Set default values for fields normally provided by Weibull fit
          fittedParameters: {
            beta: 1, // Default to exponential distribution (beta=1)
            eta: data.mtbf || 0, // For exponential, eta = MTBF
            r2: 1 // Perfect fit since we're using the exact MTBF
          },
          failurePattern: 'random', // Exponential distribution implies random failures
          bLifeValues: {
            b10Life: data.mtbf ? data.mtbf * 0.10536 : 0, // -ln(0.9) * MTBF for exponential
            b50Life: data.mtbf ? data.mtbf * 0.69315 : 0  // -ln(0.5) * MTBF for exponential
          },
          dataPoints: [] // No data points for the fit
        };
        
        setResults(simplifiedResults);
        setActiveTab("results");
        toast({ 
          title: "Basic Analysis Complete", 
          description: `Basic MTBF analysis completed using ${data.failureCount} failure records. Detailed Weibull analysis requires at least 3 valid failure records.` 
        });
        return;
      }
      
      // Check if the fittedParameters property exists and has the required properties
      if (!data.fittedParameters || data.fittedParameters.beta === undefined || 
          data.fittedParameters.eta === undefined || data.fittedParameters.r2 === undefined) {
        toast({ 
          title: "Analysis Error", 
          description: "Unable to calculate reliable Weibull parameters from the available data.",
          variant: "destructive"
        });
        return;
      }
      
      setResults(data);
      setActiveTab("results");
      toast({ 
        title: "Analysis Complete", 
        description: `Weibull analysis completed using ${data.failureCount} failure records` 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to perform Weibull analysis",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    
    if (!isNaN(numValue) && numValue > 0) {
      if (name === 'timeHorizon') {
        setTimeHorizon(numValue);
      } else if (name === 'maxReliability') {
        setMaxReliability(Math.min(100, numValue));
      } else if (name === 'acceptableDowntime') {
        setAcceptableDowntime(numValue);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params: WeibullFittingParams = {
      useOperatingHours,
      timeHorizon,
      maxReliability,
      acceptableDowntime
    };
    
    if (selectedAssetId) {
      params.assetId = selectedAssetId;
    } else if (selectedEquipmentClass) {
      params.equipmentClass = selectedEquipmentClass;
    }
    
    if (selectedFailureModeId) {
      params.failureModeId = selectedFailureModeId;
    }
    
    weibullMutation.mutate(params);
  };

  const formatTimeLabel = () => {
    return useOperatingHours ? 'Hours' : 'Days';
  };

  const getFailurePatternDescription = (pattern: string | undefined) => {
    if (!pattern) return "";
    
    switch (pattern) {
      case 'early-life':
        return "Your data shows an early-life failure pattern (β < 1). This typically indicates infant mortality failures, possibly due to manufacturing defects, improper installation, or poor quality control.";
      case 'random':
        return "Your data shows a random failure pattern (β ≈ 1). This typically indicates failures occurring randomly over time, often due to external events or random shocks rather than wear.";
      case 'wear-out':
        return "Your data shows a wear-out failure pattern (β > 1). This typically indicates age-related degradation, where components are becoming more likely to fail as they age.";
      default:
        return "";
    }
  };

  const renderMechanismAnalysis = () => {
    if (!results?.mechanismAnalysis) return null;
    
    const mechanisms = Object.entries(results.mechanismAnalysis)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([mechanism, count]) => (
        <div key={mechanism} className="flex justify-between items-center py-1 border-b">
          <span>{mechanism}</span>
          <Badge variant="outline">{count}</Badge>
        </div>
      ));
    
    return (
      <div className="space-y-2 mt-4">
        <h4 className="font-medium">Common Failure Mechanisms</h4>
        <div className="space-y-1">
          {mechanisms.length > 0 ? mechanisms : <p>No failure mechanism data available</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Inputs Form */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Data-Driven Weibull Analysis</CardTitle>
          <CardDescription>
            Fit Weibull distribution to your actual failure data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-3 rounded-md mb-4 text-sm">
            <h3 className="font-medium text-sm mb-2">How This Analysis Works</h3>
            <p className="text-muted-foreground mb-2">
              This analysis uses your actual failure history data to calculate:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Time Between Failures (TBF) or Time To Failure (TTF)</li>
              <li>Failure patterns and trends over time</li>
              <li>Weibull distribution parameters (β, η) through regression</li>
              <li>Optimal maintenance intervals and warranty periods</li>
            </ul>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Asset Selection */}
            {!isLoadingAssets && assets && assets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="asset">Select Specific Asset (Optional)</Label>
                <Select
                  value={selectedAssetId?.toString() || "_all_"}
                  onValueChange={(value) => {
                    if (value === "_all_") {
                      setSelectedAssetId(null);
                    } else {
                      const id = parseInt(value);
                      setSelectedAssetId(id);
                      setSelectedEquipmentClass(null); // Clear equipment class when asset is selected
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All assets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_">All assets</SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id.toString()}>
                        {asset.assetNumber} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Equipment Class Selection */}
            {!isLoadingClasses && equipmentClasses && equipmentClasses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="equipmentClass">Or Filter by Equipment Class</Label>
                <Select
                  value={selectedEquipmentClass || "_all_classes_"}
                  onValueChange={(value) => {
                    if (value === "_all_classes_") {
                      setSelectedEquipmentClass(null);
                    } else {
                      setSelectedEquipmentClass(value);
                      setSelectedAssetId(null); // Clear asset when equipment class is selected
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All equipment classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_classes_">All equipment classes</SelectItem>
                    {equipmentClasses.map((eqClass) => (
                      <SelectItem key={eqClass.id} value={eqClass.name}>
                        {eqClass.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Failure Mode Selection */}
            {!isLoadingFailureModes && failureModes && failureModes.length > 0 && (
              <div className="space-y-2 pt-4">
                <Label htmlFor="failureMode">Analyze by Failure Mode (Optional)</Label>
                <Select
                  value={selectedFailureModeId?.toString() || "_all_modes_"}
                  onValueChange={(value) => {
                    if (value === "_all_modes_") {
                      setSelectedFailureModeId(null);
                    } else {
                      setSelectedFailureModeId(parseInt(value));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All failure modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_modes_">All failure modes</SelectItem>
                    {failureModes.map((mode: {id: number, description: string}) => (
                      <SelectItem key={mode.id} value={mode.id.toString()}>
                        {mode.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Filter by specific failure mechanisms (e.g., bearings, seals)
                </p>
              </div>
            )}

            {/* Use Operating Hours toggle */}
            <div className="flex items-center space-x-2 pt-4">
              <Switch
                id="useOperatingHours"
                checked={useOperatingHours}
                onCheckedChange={setUseOperatingHours}
              />
              <Label htmlFor="useOperatingHours">
                Use Operating Hours (instead of calendar days)
              </Label>
            </div>

            {/* Time Horizon */}
            <div className="space-y-2 pt-4">
              <Label htmlFor="timeHorizon">Time Horizon ({formatTimeLabel()})</Label>
              <Input
                id="timeHorizon"
                name="timeHorizon"
                type="number"
                step="1"
                min="1"
                value={timeHorizon}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum time period for analysis
              </p>
            </div>

            {/* Maximum Reliability */}
            <div className="space-y-2 pt-4">
              <Label htmlFor="maxReliability">Maximum Reliability (%)</Label>
              <Input
                id="maxReliability"
                name="maxReliability"
                type="number"
                step="1"
                min="1"
                max="100"
                value={maxReliability}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Target reliability percentage (e.g., 90%)
              </p>
            </div>

            {/* Acceptable Downtime */}
            <div className="space-y-2 pt-4">
              <Label htmlFor="acceptableDowntime">Acceptable Downtime ({formatTimeLabel()})</Label>
              <Input
                id="acceptableDowntime"
                name="acceptableDowntime"
                type="number"
                step="1"
                min="1"
                value={acceptableDowntime}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum acceptable downtime period
              </p>
            </div>
            

            <Button 
              type="submit" 
              className="w-full mt-4" 
              disabled={weibullMutation.isPending}
            >
              {weibullMutation.isPending ? "Analyzing..." : "Analyze Failure Data"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Weibull Analysis Results</CardTitle>
          {results && (
            <CardDescription className="space-y-1">
              {results.assetDetails && (
                <div className="text-sm font-medium">
                  {results.assetDetails.assetType === 'specific' ? (
                    <span className="text-primary">Asset: {results.assetDetails.label}</span>
                  ) : results.assetDetails.assetType === 'class' ? (
                    <span className="text-primary">Equipment Class: {results.assetDetails.label}</span>
                  ) : results.assetDetails.assetType === 'failureMode' ? (
                    <span className="text-primary">Failure Mode: {results.assetDetails.label}</span>
                  ) : (
                    <span className="text-primary">All Assets</span>
                  )}
                </div>
              )}
              {results && (
                <div>
                  {/* Basic information about records used */}
                  <div>Based on {results.failureCount || 0} failure records.</div>
                  
                  {/* Show calculation method for fallback MTBF */}
                  {results.fallbackCalculation && results.calculationMethodDisplay && (
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        {results.calculationMethodDisplay}
                      </Badge>
                      <span className="text-xs">calculation used due to limited data</span>
                    </div>
                  )}
                  
                  {/* Show fit quality for full Weibull analysis */}
                  {results.fittedParameters && typeof results.fittedParameters.r2 === 'number' && !results.fallbackCalculation && (
                    <div className="mt-1">Fit Quality (R²): {results.fittedParameters.r2.toFixed(4)}</div>
                  )}
                </div>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {weibullMutation.isPending ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Analyzing failure data and fitting Weibull distribution...</p>
            </div>
          ) : weibullMutation.isError ? (
            <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-medium mb-2">Analysis Error</h3>
              <p className="text-muted-foreground mb-4">
                {weibullMutation.error instanceof Error 
                  ? weibullMutation.error.message 
                  : "There was an error analyzing the failure data."}
              </p>
              <p className="text-sm bg-muted p-4 rounded-md max-w-md">
                For data-driven analysis to work, you need at least 3 failure records for the selected asset or equipment class. 
                If you have insufficient data, try using the Manual Parameters tab instead.
              </p>
            </div>
          ) : results ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="results">Summary</TabsTrigger>
                <TabsTrigger value="reliability">Reliability</TabsTrigger>
                <TabsTrigger value="failure-rate">Failure Rate</TabsTrigger>
                <TabsTrigger value="data-points">Data Points</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-6 py-4">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="text-sm font-medium mb-1">Shape Parameter (β)</h3>
                    <p className="text-3xl font-bold">
                      {results.fittedParameters && typeof results.fittedParameters.beta === 'number'
                        ? results.fittedParameters.beta.toFixed(2)
                        : results.mtbf && typeof results.mtbf === 'number'
                          ? results.mtbf.toFixed(2)
                          : 'N/A'}
                    </p>
                    <Badge className="mt-2" variant={
                      results.failurePattern === 'early-life' ? 'outline' :
                      results.failurePattern === 'random' ? 'secondary' : 
                      'default'
                    }>
                      {results.failurePattern || 'Unknown Pattern'}
                    </Badge>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="text-sm font-medium mb-1">Scale Parameter (η)</h3>
                    <p className="text-3xl font-bold">
                      {results.fittedParameters && typeof results.fittedParameters.eta === 'number'
                        ? results.fittedParameters.eta.toFixed(2)
                        : "N/A"} {formatTimeLabel()}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="text-sm font-medium mb-1">MTBF</h3>
                    <p className="text-3xl font-bold">
                      {results.mtbf !== undefined && results.mtbf !== null && typeof results.mtbf === 'number' 
                        ? results.mtbf.toFixed(2) 
                        : 'N/A'} {formatTimeLabel()}
                    </p>
                  </div>
                </div>
                
                {/* B-Life Values */}
                {results.bLifeValues && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 border rounded-md">
                      <h3 className="text-sm font-medium mb-1">B10 Life (10% Failure)</h3>
                      <p className="text-2xl font-bold">{results.bLifeValues && typeof results.bLifeValues.b10Life === 'number' ? results.bLifeValues.b10Life.toFixed(2) : 'N/A'} {formatTimeLabel()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Time at which 10% of units are expected to fail
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h3 className="text-sm font-medium mb-1">B50 Life (50% Failure)</h3>
                      <p className="text-2xl font-bold">{results.bLifeValues && typeof results.bLifeValues.b50Life === 'number' ? results.bLifeValues.b50Life.toFixed(2) : 'N/A'} {formatTimeLabel()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Time at which 50% of units are expected to fail
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Analysis Interpretation */}
                <div className="p-4 border rounded-md bg-card mt-4">
                  <h3 className="text-lg font-medium mb-3">Analysis Interpretation</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold">Failure Pattern:</h4>
                      <p>{getFailurePatternDescription(results.failurePattern)}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">Characteristic Life (η):</h4>
                      <p>
                        {results.fittedParameters && results.fittedParameters.eta !== undefined ? (
                          <>
                            The characteristic life of your equipment is {typeof results.fittedParameters.eta === 'number' ? results.fittedParameters.eta.toFixed(2) : 'N/A'} {formatTimeLabel()}. 
                            At this point, approximately 63.2% of units are expected to have failed.
                          </>
                        ) : (
                          <>
                            Characteristic life could not be determined from the available data.
                          </>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">MTBF Interpretation:</h4>
                      <p>
                        Your calculated Mean Time Between Failures is <strong>
                        {results.mtbf !== undefined && results.mtbf !== null && typeof results.mtbf === 'number'
                          ? results.mtbf.toFixed(2)
                          : 'N/A'} {formatTimeLabel()}</strong>. 
                        This represents the average time between failures for this equipment.
                      </p>
                      
                      {results.fallbackCalculation && (
                        <div className="mt-3 text-sm border p-3 rounded bg-muted/50">
                          <h5 className="font-medium mb-1 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Calculation Method Details
                          </h5>
                          <p className="text-xs">
                            {results.calculationMethodDisplay === 'Operating Hours' ? (
                              <>The MTBF was calculated using operating hours data from {results.mtbfDataPoints?.length || 0} records 
                              with values: {results.mtbfDataPoints?.map(v => Math.round(v)).join(', ')}.</>
                            ) : (
                              <>The MTBF was calculated using calendar days (TBF) from {results.mtbfDataPoints?.length || 0} records 
                              with values: {results.mtbfDataPoints?.map(v => Math.round(v)).join(', ')}.</>
                            )}
                          </p>
                          <p className="text-xs mt-1">
                            <strong>Formula used:</strong> MTBF = Sum of all time values / number of values = 
                            {results.mtbfDataPoints && results.mtbfDataPoints.length > 0 ? 
                              ` ${results.mtbfDataPoints.reduce((sum, val) => sum + val, 0).toFixed(1)} / ${results.mtbfDataPoints.length} = ${results.mtbf?.toFixed(2)}` : 
                              ' N/A'}
                          </p>
                        </div>
                      )}
                      
                      {!results.fallbackCalculation && results.verification && (
                        <div className="mt-3 text-sm border p-3 rounded bg-muted/50">
                          <h5 className="font-medium mb-1 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            MTBF Cross-Verification
                          </h5>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs font-medium">Weibull Formula: η · Γ(1 + 1/β)</p>
                              <p className="text-xs">
                                MTBF = {results.fittedParameters.eta.toFixed(2)} · 
                                Γ(1 + 1/{results.fittedParameters.beta.toFixed(2)}) = 
                                <span className="font-semibold"> {results.verification.weibullMTBF?.toFixed(2) || 'N/A'}</span>
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium">Simple Average Method</p>
                              <p className="text-xs">
                                MTBF = Sum of values / count = 
                                {results.verification.mtbfDataPoints && results.verification.mtbfDataPoints.length > 0 ? 
                                  <span> {results.verification.mtbfDataPoints.reduce((sum, val) => sum + val, 0).toFixed(1)} / 
                                  {results.verification.mtbfDataPoints.length} = 
                                  <span className="font-semibold"> {results.verification.simpleMTBF?.toFixed(2) || 'N/A'}</span></span> : 
                                  <span> N/A</span>}
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-xs mt-2 italic">
                            {results.verification.calculationMethodDisplay === 'Operating Hours' ? (
                              <>Using operating hours data from {results.verification.mtbfDataPoints?.length || 0} records.</>
                            ) : (
                              <>Using calendar days (TBF) data from {results.verification.mtbfDataPoints?.length || 0} records.</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Failure Mechanism Analysis */}
                <div className="p-4 border rounded-md bg-card">
                  <h3 className="text-lg font-medium mb-3">Failure Mechanism Analysis</h3>
                  {renderMechanismAnalysis()}
                </div>
                
                {/* Warranty Calculation */}
                {results.bLifeValues && (
                  <div className="p-4 border rounded-md bg-card mt-4">
                    <h3 className="text-lg font-medium mb-3">Warranty Planning</h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold">Recommended Warranty Period:</h4>
                        <p className="text-2xl font-bold mt-2">
                          {results.bLifeValues && typeof results.bLifeValues.b10Life === 'number' 
                            ? (results.bLifeValues.b10Life * 0.8).toFixed(0) 
                            : 'N/A'} {formatTimeLabel()}
                        </p>
                        <p className="mt-2">
                          This value is calculated as 80% of the B10 life ({results.bLifeValues && typeof results.bLifeValues.b10Life === 'number' 
                            ? results.bLifeValues.b10Life.toFixed(0) 
                            : 'N/A'} {formatTimeLabel()}), 
                          which provides approximately 90% reliability during the warranty period.
                        </p>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-md">
                        <h4 className="font-semibold mb-1">Data Used in Calculation:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Failure times between repairs (TBF) from maintenance records</li>
                          <li>Time to first failure (TTF) from installation date</li>
                          <li>Total operating hours or calendar days of service</li>
                          <li>Specific failure mechanisms when filtering by mode</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="p-4 border rounded-md bg-card mt-4">
                  <h3 className="text-lg font-medium mb-3">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm pl-2">
                    {results.failurePattern === 'early-life' && (
                      <>
                        <li>Investigate manufacturing or installation issues that may be causing early failures</li>
                        <li>Implement burn-in testing to eliminate weak components before installation</li>
                        <li>Focus on quality control during production and installation</li>
                        <li>Review supplier quality or installation procedures</li>
                      </>
                    )}
                    
                    {results.failurePattern === 'random' && (
                      <>
                        <li>Implement condition-based monitoring to detect random failures</li>
                        <li>Ensure adequate spare parts inventory for rapid replacement</li>
                        <li>Review environmental factors that might be causing random failures</li>
                        <li>For critical equipment, consider redundancy or backup systems</li>
                      </>
                    )}
                    
                    {results.failurePattern === 'wear-out' && (
                      <>
                        <li>Schedule preventive maintenance at approximately {(results.bLifeValues && typeof results.bLifeValues.b10Life === 'number') ? results.bLifeValues.b10Life.toFixed(0) : 'N/A'} {formatTimeLabel()} to catch failures before they impact operations</li>
                        <li>Consider reliability centered maintenance (RCM) approaches</li>
                        <li>Analyze wear patterns to extend equipment life</li>
                        <li>Monitor equipment approaching {(results.bLifeValues && typeof results.bLifeValues.b50Life === 'number') ? results.bLifeValues.b50Life.toFixed(0) : 'N/A'} {formatTimeLabel()} more frequently</li>
                      </>
                    )}
                  </ul>
                </div>
              </TabsContent>
              
              <TabsContent value="reliability">
                {/* Reliability Curve */}
                <div className="space-y-4 py-4">
                  <h3 className="font-medium">Reliability Function</h3>
                  <p className="text-sm text-muted-foreground">
                    The reliability function R(t) shows the probability that a component survives beyond time t
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={results.reliabilityCurve}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        label={{ value: `Time (${formatTimeLabel()})`, position: 'insideBottomRight', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Reliability', angle: -90, position: 'insideLeft' }} 
                        domain={[0, 1]} 
                        tickFormatter={(value) => value.toFixed(1)}
                      />
                      <Tooltip formatter={(value: number) => value.toFixed(4)} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="reliability" 
                        stroke="#4f46e5" 
                        name="Reliability R(t)" 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Cumulative Failure Probability */}
                  <h3 className="font-medium mt-8">Cumulative Failure Probability</h3>
                  <p className="text-sm text-muted-foreground">
                    The cumulative failure probability F(t) shows the probability of failure by time t
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={results.cumulativeFailureProbability}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        label={{ value: `Time (${formatTimeLabel()})`, position: 'insideBottomRight', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Failure Probability', angle: -90, position: 'insideLeft' }} 
                        domain={[0, 1]} 
                        tickFormatter={(value) => value.toFixed(1)}
                      />
                      <Tooltip formatter={(value: number) => value.toFixed(4)} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="probability" 
                        stroke="#ef4444" 
                        name="Failure Probability F(t)" 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="failure-rate">
                {/* Failure Rate Curve */}
                <div className="space-y-4 py-4">
                  <h3 className="font-medium">Failure Rate Function</h3>
                  <p className="text-sm text-muted-foreground">
                    The failure rate function h(t) shows the instantaneous rate of failure at time t
                  </p>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart
                      data={results.failureRateCurve}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        label={{ value: `Time (${formatTimeLabel()})`, position: 'insideBottomRight', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: `Failure Rate (per ${formatTimeLabel()})`, angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value: number) => value.toExponential(4)} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="failureRate" 
                        stroke="#ef4444" 
                        name="Failure Rate h(t)" 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="data-points">
                {/* Data Points Scatter Plot */}
                <div className="space-y-4 py-4">
                  <h3 className="font-medium">Weibull Probability Plot</h3>
                  <p className="text-sm text-muted-foreground">
                    This plot shows how well your data fits the Weibull distribution
                  </p>
                  
                  {results.dataPoints && results.dataPoints.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="time" 
                          name="Time" 
                          label={{ value: `Time (${formatTimeLabel()})`, position: 'insideBottomRight', offset: -10 }}
                          scale="log"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(value) => value.toFixed(0)}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="rank" 
                          name="Rank" 
                          label={{ value: 'Failure Probability', angle: -90, position: 'insideLeft' }}
                          scale="log"
                          domain={[0.01, 0.99]}
                          tickFormatter={(value) => value.toFixed(2)}
                        />
                        <ZAxis range={[60, 60]} />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'Time') return [value.toFixed(2), 'Time'];
                            if (name === 'Rank') return [(value * 100).toFixed(2) + '%', 'Probability'];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Scatter 
                          name="Failure Data Points" 
                          data={results.dataPoints} 
                          fill="#4f46e5" 
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="p-4 border rounded-md text-center">
                      <p>No data points available for plotting</p>
                    </div>
                  )}
                  
                  {/* Data points table */}
                  {results.dataPoints && results.dataPoints.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-medium mb-4">Raw Data Points</h3>
                      <div className="overflow-auto max-h-60 border rounded-md">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                Order
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                Time ({formatTimeLabel()})
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                Probability
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {results.dataPoints.map((point, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                                <td className="px-4 py-2 text-sm">{index + 1}</td>
                                <td className="px-4 py-2 text-sm">{typeof point.time === 'number' ? point.time.toFixed(2) : 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{typeof point.rank === 'number' ? (point.rank * 100).toFixed(2) : 'N/A'}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <p className="text-lg text-muted-foreground">
                Select parameters and run analysis to see results
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                This analysis will fit a Weibull distribution to your actual failure data, 
                giving you insights into failure patterns and optimal maintenance intervals.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataDrivenWeibullAnalysis;