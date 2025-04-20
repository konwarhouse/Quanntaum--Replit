import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeibullParameters, WeibullAnalysisResponse, Asset } from "@/lib/types";

// We'll use recharts for visualization
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const WeibullAnalysisForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WeibullParameters>({
    beta: 2,
    eta: 1000,
    timeUnits: 'hours',
    timeHorizon: 5000,
  });
  const [results, setResults] = useState<WeibullAnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState("reliability");
  
  // Fetch assets for dropdown
  const { data: assets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });
  
  // Weibull analysis mutation
  const analysisMutation = useMutation({
    mutationFn: (params: WeibullParameters) => 
      apiRequest("POST", "/api/weibull-analysis", params),
    onSuccess: (data) => {
      setResults(data);
      toast({ 
        title: "Analysis Complete", 
        description: "Weibull analysis results generated successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to perform analysis",
        variant: "destructive"
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timeHorizon' || name === 'beta' || name === 'eta' ? parseFloat(value) : value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAssetChange = (assetId: string) => {
    const id = parseInt(assetId);
    setSelectedAssetId(id);
    
    // Find the selected asset
    const selectedAsset = assets.find((asset: Asset) => asset.id === id);
    if (selectedAsset) {
      // Update form with asset's Weibull parameters
      setFormData(prev => ({
        ...prev,
        beta: selectedAsset.weibullBeta,
        eta: selectedAsset.weibullEta,
        timeUnits: selectedAsset.timeUnit as 'hours' | 'days' | 'months' | 'years',
      }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analysisMutation.mutate(formData);
  };
  
  const formatTimeUnit = (unit: string) => {
    return unit.charAt(0).toUpperCase() + unit.slice(1);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inputs Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Analysis Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Asset Selection */}
              {!isLoadingAssets && assets && assets.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="asset">Select Asset (Optional)</Label>
                  <Select
                    value={selectedAssetId?.toString() || ""}
                    onValueChange={handleAssetChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Shape Parameter (β) */}
              <div className="space-y-2">
                <Label htmlFor="beta">Shape Parameter (β)</Label>
                <Input
                  id="beta"
                  name="beta"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.beta}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.beta < 1 ? "Decreasing failure rate (infant mortality)" : 
                   formData.beta === 1 ? "Constant failure rate (random failures)" : 
                   formData.beta > 1 && formData.beta < 4 ? "Increasing failure rate (wear-out)" : 
                   "Rapidly increasing failure rate (severe wear-out)"}
                </p>
              </div>
              
              {/* Scale Parameter (η) */}
              <div className="space-y-2">
                <Label htmlFor="eta">Scale Parameter (η)</Label>
                <Input
                  id="eta"
                  name="eta"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.eta}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Characteristic life (time at which 63.2% of units fail)
                </p>
              </div>
              
              {/* Time Units */}
              <div className="space-y-2">
                <Label htmlFor="timeUnits">Time Units</Label>
                <Select
                  name="timeUnits"
                  value={formData.timeUnits}
                  onValueChange={(value) => handleSelectChange("timeUnits", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Time Horizon */}
              <div className="space-y-2">
                <Label htmlFor="timeHorizon">Time Horizon</Label>
                <Input
                  id="timeHorizon"
                  name="timeHorizon"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.timeHorizon}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time for analysis
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={analysisMutation.isPending}
              >
                {analysisMutation.isPending ? "Analyzing..." : "Run Analysis"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Results */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Running Weibull analysis...</p>
              </div>
            ) : results ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <p className="font-semibold">Mean Time Between Failures (MTBF):</p>
                  <p className="text-2xl font-bold">{results.mtbf.toFixed(2)} {formatTimeUnit(formData.timeUnits)}</p>
                </div>
                
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="reliability">Reliability Curve</TabsTrigger>
                    <TabsTrigger value="failure">Failure Rate</TabsTrigger>
                    <TabsTrigger value="cumulative">Failure Probability</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="reliability" className="pt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={results.reliabilityCurve}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          label={{ value: `Time (${formatTimeUnit(formData.timeUnits)})`, position: 'insideBottomRight', offset: -10 }} 
                        />
                        <YAxis 
                          label={{ value: 'Reliability R(t)', angle: -90, position: 'insideLeft' }} 
                          domain={[0, 1]} 
                        />
                        <Tooltip formatter={(value: number) => [value.toFixed(4), "Reliability"]} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="reliability" 
                          stroke="#8884d8" 
                          name="Reliability R(t)" 
                          dot={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="failure" className="pt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={results.failureRateCurve}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          label={{ value: `Time (${formatTimeUnit(formData.timeUnits)})`, position: 'insideBottomRight', offset: -10 }} 
                        />
                        <YAxis 
                          label={{ value: 'Failure Rate h(t)', angle: -90, position: 'insideLeft' }} 
                        />
                        <Tooltip formatter={(value: number) => [value.toExponential(4), "Failure Rate"]} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="failureRate" 
                          stroke="#82ca9d" 
                          name="Failure Rate h(t)" 
                          dot={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="cumulative" className="pt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={results.cumulativeFailureProbability}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          label={{ value: `Time (${formatTimeUnit(formData.timeUnits)})`, position: 'insideBottomRight', offset: -10 }} 
                        />
                        <YAxis 
                          label={{ value: 'Failure Probability F(t)', angle: -90, position: 'insideLeft' }} 
                          domain={[0, 1]} 
                        />
                        <Tooltip formatter={(value: number) => [(value * 100).toFixed(2) + '%', "Failure Probability"]} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="probability" 
                          stroke="#ff7300" 
                          name="Failure Probability F(t)" 
                          dot={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">At 25% of Characteristic Life:</p>
                    <p className="font-medium">
                      Time: {(formData.eta * 0.25).toFixed(2)} {formatTimeUnit(formData.timeUnits)}
                    </p>
                    <p className="font-medium">
                      Reliability: {results.reliabilityCurve.find(p => p.time >= formData.eta * 0.25)?.reliability.toFixed(4) || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">At 50% of Characteristic Life:</p>
                    <p className="font-medium">
                      Time: {(formData.eta * 0.5).toFixed(2)} {formatTimeUnit(formData.timeUnits)}
                    </p>
                    <p className="font-medium">
                      Reliability: {results.reliabilityCurve.find(p => p.time >= formData.eta * 0.5)?.reliability.toFixed(4) || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">Enter parameters and run analysis to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeibullAnalysisForm;