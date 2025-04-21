import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, WeibullParameters, WeibullAnalysisResponse } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const WeibullAnalysisForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WeibullParameters>({
    beta: 2,
    eta: 1000,
    timeUnits: 'hours',
    timeHorizon: 5000
  });
  const [results, setResults] = useState<WeibullAnalysisResponse | null>(null);
  
  // Fetch assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });
  
  // Weibull analysis mutation
  const weibullMutation = useMutation({
    mutationFn: async (params: WeibullParameters): Promise<WeibullAnalysisResponse> => {
      const res = await apiRequest("POST", "/api/weibull-analysis", params);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to perform Weibull analysis");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({ 
        title: "Analysis Complete", 
        description: "Weibull analysis completed successfully" 
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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timeHorizon' || name === 'beta' || name === 'eta' 
        ? parseFloat(value) 
        : value
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
        timeUnits: selectedAsset.timeUnit as 'hours' | 'days' | 'months' | 'years'
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    weibullMutation.mutate(formData);
  };

  const formatTimeLabel = (unit: string) => {
    return unit.charAt(0).toUpperCase() + unit.slice(1);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Inputs Form */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Weibull Analysis Parameters</CardTitle>
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

            {/* Beta (Shape) Parameter */}
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
                β &lt; 1: Decreasing failure rate<br />
                β = 1: Constant failure rate<br />
                β &gt; 1: Increasing failure rate
              </p>
            </div>

            {/* Eta (Scale) Parameter */}
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
                Characteristic life (63.2% probability of failure)
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
                Maximum time period for analysis
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={weibullMutation.isPending}
            >
              {weibullMutation.isPending ? "Analyzing..." : "Perform Analysis"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Weibull Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          {weibullMutation.isPending ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Calculating Weibull reliability parameters...</p>
            </div>
          ) : results ? (
            <div className="space-y-8">
              {/* Summary */}
              <div className="p-4 bg-muted rounded-md">
                <h3 className="text-lg font-medium mb-2">MTBF (Mean Time Between Failures)</h3>
                <p className="text-3xl font-bold">{results.mtbf.toFixed(2)} {formData.timeUnits}</p>
              </div>
              
              {/* Analysis Interpretation */}
              <div className="p-4 border rounded-md bg-card">
                <h3 className="text-lg font-medium mb-3">Analysis Interpretation</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold">MTBF Interpretation:</h4>
                    <p>Your calculated Mean Time Between Failures is <strong>{results.mtbf.toFixed(2)} {formData.timeUnits}</strong>. 
                    This represents the average time between failures for this equipment. 
                    {results.mtbf > 5000 
                      ? " This is a relatively high MTBF, indicating good reliability." 
                      : results.mtbf > 2000 
                        ? " This MTBF indicates moderate reliability." 
                        : " This MTBF suggests potential reliability concerns that may need to be addressed."}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">Weibull Shape Parameter (β) Analysis:</h4>
                    <p>
                      {formData.beta < 1 
                        ? "Your β value is less than 1, indicating decreasing failure rate over time (often seen with early failures or 'infant mortality')." 
                        : formData.beta === 1 
                          ? "Your β value is approximately 1, indicating a constant failure rate (random failures independent of age)." 
                          : formData.beta > 1 && formData.beta < 2 
                            ? "Your β value is between 1 and 2, indicating increasing failure rate (beginning of wear-out)." 
                            : formData.beta >= 2 && formData.beta < 4 
                              ? "Your β value is between 2 and 4, indicating accelerated wear-out phase." 
                              : "Your β value is greater than 4, indicating rapid wear-out or fatigue failures."}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Recommendations */}
              <div className="p-4 border rounded-md bg-card">
                <h3 className="text-lg font-medium mb-3">Recommendations</h3>
                <ul className="list-disc list-inside space-y-2 text-sm pl-2">
                  {formData.beta < 1 && (
                    <>
                      <li>Consider investigating early life failures and manufacturing processes</li>
                      <li>Implement burn-in testing to eliminate weak components before installation</li>
                      <li>Focus on quality control during production and installation</li>
                    </>
                  )}
                  
                  {formData.beta >= 0.95 && formData.beta <= 1.05 && (
                    <>
                      <li>Implement condition-based monitoring to detect random failures</li>
                      <li>Ensure adequate spare parts inventory for rapid replacement</li>
                      <li>Review environmental factors that might be causing random failures</li>
                    </>
                  )}
                  
                  {formData.beta > 1 && (
                    <>
                      <li>Schedule preventive maintenance at approximately {(results.mtbf * 0.63).toFixed(0)} {formData.timeUnits}</li>
                      <li>Consider reliability centered maintenance (RCM) approaches</li>
                      <li>Analyze wear patterns to extend equipment life</li>
                    </>
                  )}
                  
                  {formData.beta > 3 && (
                    <>
                      <li>Urgent action required: accelerated wear-out indicates potential design issues</li>
                      <li>Consider equipment redesign or material upgrades</li>
                    </>
                  )}
                  
                  <li>Optimal maintenance interval should be scheduled before {(results.mtbf * 0.75).toFixed(0)} {formData.timeUnits} for best reliability/cost ratio</li>
                </ul>
              </div>

              {/* Reliability Curve */}
              <div>
                <h3 className="font-medium mb-4">Reliability Function</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={results.reliabilityCurve}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: `Time (${formatTimeLabel(formData.timeUnits)})`, position: 'insideBottomRight', offset: -10 }} 
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
              </div>

              {/* Failure Rate Curve */}
              <div>
                <h3 className="font-medium mb-4">Failure Rate Function</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={results.failureRateCurve}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: `Time (${formatTimeLabel(formData.timeUnits)})`, position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: `Failure Rate (per ${formData.timeUnits})`, angle: -90, position: 'insideLeft' }} 
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

              {/* Cumulative Failure Probability */}
              <div>
                <h3 className="font-medium mb-4">Cumulative Failure Probability</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={results.cumulativeFailureProbability}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: `Time (${formatTimeLabel(formData.timeUnits)})`, position: 'insideBottomRight', offset: -10 }} 
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
                      stroke="#22c55e" 
                      name="Failure Probability F(t)" 
                      dot={false} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <p>Enter Weibull parameters and click "Perform Analysis" to see results</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeibullAnalysisForm;