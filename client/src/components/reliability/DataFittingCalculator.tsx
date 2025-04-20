import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, TableIcon, Clipboard, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from "papaparse";
import { Asset, MaintenanceEvent } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FailureDataPoint {
  time: number;   // Time to failure or time between failures
  type: 'failure' | 'suspension'; // Whether this is a failure or a censored/suspended observation
}

interface FittedResult {
  beta: number;
  eta: number;
  r2: number; // R-squared value for goodness of fit
  mtbf: number;
}

const DataFittingCalculator = () => {
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [failureData, setFailureData] = useState<FailureDataPoint[]>([]);
  const [fittedResult, setFittedResult] = useState<FittedResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [manualTimes, setManualTimes] = useState<string>("");
  const [timeUnit, setTimeUnit] = useState<string>("days");

  // Fetch assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // Fetch maintenance events for selected asset
  const { data: maintenanceEvents = [], isLoading: isLoadingEvents } = useQuery<MaintenanceEvent[]>({
    queryKey: ['/api/maintenance-events', selectedAssetId],
    staleTime: 5000,
    enabled: !!selectedAssetId,
  });

  // Handle asset selection
  const handleAssetSelect = (assetId: number) => {
    setSelectedAssetId(assetId);
    setFailureData([]);
    setFittedResult(null);
  };

  // Process maintenance events to extract failure data
  const processMaintenenanceEvents = () => {
    if (!maintenanceEvents.length) {
      toast({
        title: "No data available",
        description: "There are no maintenance events for this asset",
        variant: "destructive"
      });
      return;
    }

    // Sort events by date
    const sortedEvents = [...maintenanceEvents].sort((a, b) => 
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

    // Extract failure data (only consider CM events as failures)
    const failurePoints: FailureDataPoint[] = [];
    let lastEventDate: Date | null = null;
    
    for (const event of sortedEvents) {
      const eventDate = new Date(event.eventDate);
      
      if (lastEventDate) {
        // Calculate time difference in days
        const timeDiff = (eventDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Consider corrective maintenance (CM) events as failures
        if (event.eventType === 'CM') {
          failurePoints.push({
            time: timeDiff,
            type: 'failure'
          });
        } else {
          // Consider preventive maintenance (PM) events as suspensions (censored data)
          failurePoints.push({
            time: timeDiff,
            type: 'suspension'
          });
        }
      }
      
      lastEventDate = eventDate;
    }

    if (failurePoints.length === 0) {
      toast({
        title: "No failure data",
        description: "Could not extract failure data from maintenance events",
        variant: "destructive"
      });
      return;
    }

    setFailureData(failurePoints);
    fitWeibullDistribution(failurePoints);
  };

  // Handle manual time entry
  const handleManualTimeEntry = () => {
    try {
      // Parse the manual times entry
      const times = manualTimes
        .split(/[\n,]/)
        .map(t => parseFloat(t.trim()))
        .filter(t => !isNaN(t) && t > 0);

      if (times.length === 0) {
        toast({
          title: "Invalid input",
          description: "Please enter valid time values",
          variant: "destructive"
        });
        return;
      }

      // Convert all times to days based on selected unit
      let conversionFactor = 1;
      switch (timeUnit) {
        case 'hours': conversionFactor = 1/24; break;
        case 'days': conversionFactor = 1; break;
        case 'months': conversionFactor = 30; break;
        case 'years': conversionFactor = 365; break;
      }

      const convertedTimes = times.map(t => t * conversionFactor);
      
      // Create failure data points (all assumed to be failures, not suspensions)
      const manualFailureData: FailureDataPoint[] = convertedTimes.map(time => ({
        time,
        type: 'failure'
      }));

      setFailureData(manualFailureData);
      fitWeibullDistribution(manualFailureData);
    } catch (error) {
      toast({
        title: "Error processing input",
        description: "An error occurred while processing the input data",
        variant: "destructive"
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        try {
          // Extract time values from CSV
          const timeValues: number[] = [];
          
          results.data.forEach((row: any) => {
            // Try to extract time value from row (could be in various formats)
            const timeValue = parseFloat(
              row['Time'] || row['time'] || row['TBF'] || row['tbf'] || 
              row['Days'] || row['days'] || row[0] || ''
            );
            
            if (!isNaN(timeValue) && timeValue > 0) {
              timeValues.push(timeValue);
            }
          });

          if (timeValues.length === 0) {
            toast({
              title: "No valid data",
              description: "No valid time values found in the file",
              variant: "destructive"
            });
            return;
          }

          // Create failure data points
          const fileFailureData: FailureDataPoint[] = timeValues.map(time => ({
            time,
            type: 'failure'
          }));

          setFailureData(fileFailureData);
          fitWeibullDistribution(fileFailureData);
        } catch (error) {
          toast({
            title: "Error processing file",
            description: "An error occurred while processing the file",
            variant: "destructive"
          });
        }
      },
      error: () => {
        toast({
          title: "Error parsing file",
          description: "Failed to parse the CSV file",
          variant: "destructive"
        });
      }
    });
  };

  // Fit Weibull distribution to failure data using rank regression
  const fitWeibullDistribution = (data: FailureDataPoint[]) => {
    try {
      // Extract only failure times (ignore suspensions for simplicity)
      const failureTimes = data
        .filter(d => d.type === 'failure')
        .map(d => d.time)
        .sort((a, b) => a - b);
      
      if (failureTimes.length < 2) {
        toast({
          title: "Insufficient data",
          description: "Need at least 2 failure points to fit a Weibull distribution",
          variant: "destructive"
        });
        return;
      }

      // Calculate median ranks
      const medianRanks = failureTimes.map((_, i) => {
        // Bernard's approximation for median ranks
        return (i + 1 - 0.3) / (failureTimes.length + 0.4);
      });

      // Transform data for linear regression
      const xValues = failureTimes.map(t => Math.log(t));
      const yValues = medianRanks.map(r => Math.log(-Math.log(1 - r)));

      // Linear regression
      const n = xValues.length;
      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = yValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
      const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calculate Weibull parameters
      const beta = slope; // Shape parameter
      const eta = Math.exp(-intercept / beta); // Scale parameter

      // Calculate R-squared
      const yMean = sumY / n;
      const ssTotal = sumY2 - n * yMean * yMean;
      const ssResidual = yValues.reduce((sum, y, i) => {
        const yPred = slope * xValues[i] + intercept;
        return sum + (y - yPred) * (y - yPred);
      }, 0);
      const r2 = 1 - ssResidual / ssTotal;

      // Calculate MTBF
      const gamma = 1 + 1/beta;
      // Approximate the gamma function for the MTBF calculation
      const gammaValue = approximateGamma(gamma);
      const mtbf = eta * gammaValue;

      setFittedResult({
        beta,
        eta,
        r2,
        mtbf
      });

      toast({
        title: "Analysis complete",
        description: "Weibull parameters have been calculated"
      });
    } catch (error) {
      console.error("Error fitting Weibull distribution:", error);
      toast({
        title: "Analysis error",
        description: "An error occurred during the analysis",
        variant: "destructive"
      });
    }
  };

  // Approximation of the gamma function
  const approximateGamma = (x: number): number => {
    // Lanczos approximation for the gamma function
    if (x < 0.5) {
      return Math.PI / (Math.sin(Math.PI * x) * approximateGamma(1 - x));
    }
    
    x -= 1;
    const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
               771.32342877765313, -176.61502916214059, 12.507343278686905,
               -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    
    let result = p[0];
    for (let i = 1; i < p.length; i++) {
      result += p[i] / (x + i);
    }
    
    const t = x + p.length - 1.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * result;
  };

  // Calculate optimal PM interval
  const calculateOptimalInterval = () => {
    if (!fittedResult) return null;
    
    const { beta, eta } = fittedResult;
    
    // Formula for optimal PM interval: t = η * (1 - (1/β)^(1/β))
    // This is valid when β > 1 (increasing failure rate)
    if (beta <= 1) {
      return {
        interval: null,
        recommendation: "Run to failure (no PM)",
        reason: "Beta ≤ 1 indicates decreasing or constant failure rate. PM is not effective."
      };
    }
    
    // Calculate optimal interval
    const term = Math.pow(1/beta, 1/beta);
    const optimalInterval = eta * (1 - term);
    
    // Convert back to original time unit
    let conversionFactor = 1;
    let unitLabel = "days";
    switch (timeUnit) {
      case 'hours': 
        conversionFactor = 24;
        unitLabel = "hours";
        break;
      case 'days': 
        conversionFactor = 1;
        unitLabel = "days";
        break;
      case 'months': 
        conversionFactor = 1/30;
        unitLabel = "months";
        break;
      case 'years': 
        conversionFactor = 1/365;
        unitLabel = "years";
        break;
    }
    
    return {
      interval: optimalInterval * conversionFactor,
      unit: unitLabel,
      recommendation: `Perform PM every ${Math.round(optimalInterval * conversionFactor)} ${unitLabel}`,
      reason: "Based on Weibull analysis of failure data"
    };
  };

  const optimalInterval = fittedResult ? calculateOptimalInterval() : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weibull Parameter Estimation</CardTitle>
          <CardDescription>
            Estimate Weibull parameters (β, η) from failure data to determine optimal maintenance intervals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
              <TabsTrigger value="assets">From Asset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeUnit">Time Unit</Label>
                  <Select value={timeUnit} onValueChange={setTimeUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="times">Time Between Failures (TBF)</Label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <textarea
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={`Enter time between failures (TBF), one per line or comma-separated\nExample:\n213\n28\n56\n134\n...`}
                        value={manualTimes}
                        onChange={(e) => setManualTimes(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="mt-0" 
                      onClick={handleManualTimeEntry}
                    >
                      Calculate
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the time between failures, one value per line or separated by commas
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="file" className="mt-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <TableIcon className="w-12 h-12 mb-4 text-gray-400" />
                <p className="mb-4 text-sm text-gray-500">
                  Upload a CSV file with time between failures (TBF) data
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="assets" className="mt-4 space-y-4">
              <Alert className="mb-4">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Select an asset</AlertTitle>
                <AlertDescription>
                  Choose an asset to calculate Weibull parameters from its maintenance history
                </AlertDescription>
              </Alert>
              
              {isLoadingAssets ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {assets.map((asset) => (
                      <Card 
                        key={asset.id} 
                        className={`cursor-pointer hover:shadow-md transition-shadow ${selectedAssetId === asset.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => handleAssetSelect(asset.id)}
                      >
                        <CardHeader className="py-3">
                          <CardTitle className="text-md">{asset.name}</CardTitle>
                          <CardDescription>
                            {asset.equipmentClass && <span>Class: {asset.equipmentClass}</span>}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                  
                  {selectedAssetId && (
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={processMaintenenanceEvents}
                        disabled={isLoadingEvents}
                      >
                        {isLoadingEvents ? "Loading..." : "Analyze Maintenance History"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results Section */}
      {fittedResult && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Estimated Weibull parameters and reliability metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Shape Parameter (β)</p>
                <p className="text-2xl font-bold">{fittedResult.beta.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {fittedResult.beta > 1 
                    ? "β > 1: Wear-out failures" 
                    : fittedResult.beta === 1 
                      ? "β = 1: Random failures" 
                      : "β < 1: Early-life failures"}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Scale Parameter (η)</p>
                <p className="text-2xl font-bold">{fittedResult.eta.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  Characteristic life (63.2% probability of failure)
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">MTBF</p>
                <p className="text-2xl font-bold">{fittedResult.mtbf.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  Mean Time Between Failures
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">R² Value</p>
                <p className="text-2xl font-bold">{(fittedResult.r2 * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  Coefficient of determination (fit quality)
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Optimal Maintenance Strategy</h3>
              {optimalInterval && (
                <div className="space-y-4">
                  <Alert className={optimalInterval.interval === null ? "bg-yellow-50" : "bg-green-50"}>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      <AlertTitle>Recommendation</AlertTitle>
                    </div>
                    <AlertDescription className="mt-2 font-medium">
                      {optimalInterval.recommendation}
                    </AlertDescription>
                    <AlertDescription className="mt-1 text-sm">
                      {optimalInterval.reason}
                    </AlertDescription>
                  </Alert>
                  
                  {optimalInterval.interval !== null && (
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Estimated Parameters</p>
                      <code className="text-xs block bg-muted p-2 rounded">
                        const beta = {fittedResult.beta.toFixed(4)};<br />
                        const eta = {fittedResult.eta.toFixed(4)};<br />
                        <br />
                        // You can use these parameters in Weibull reliability calculations<br />
                        // R(t) = e^-(t/η)^β
                      </code>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `beta: ${fittedResult.beta.toFixed(4)}, eta: ${fittedResult.eta.toFixed(4)}`
                          );
                          toast({
                            title: "Copied to clipboard",
                            description: "Weibull parameters copied to clipboard"
                          });
                        }}
                      >
                        <Clipboard className="h-3 w-3 mr-1" />
                        Copy Parameters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {failureData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Failure Data</h3>
                <ScrollArea className="h-64 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No.</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failureData.map((data, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{data.time.toFixed(2)}</TableCell>
                          <TableCell>
                            {data.type === 'failure' ? 'Failure' : 'Suspension'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFailureData([]);
                setFittedResult(null);
                setManualTimes("");
                setSelectedAssetId(null);
              }}
            >
              Clear Results
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default DataFittingCalculator;