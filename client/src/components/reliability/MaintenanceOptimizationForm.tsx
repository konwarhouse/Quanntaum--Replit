import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, MaintenanceOptimizationParameters, MaintenanceOptimizationResponse } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const MaintenanceOptimizationForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MaintenanceOptimizationParameters>({
    beta: 2,
    eta: 1000,
    preventiveMaintenanceCost: 500,
    correctiveMaintenanceCost: 2000,
    targetReliabilityThreshold: 90,
    maximumAcceptableDowntime: 24,
    timeHorizon: 5000
  });
  const [results, setResults] = useState<MaintenanceOptimizationResponse | null>(null);
  
  // Fetch assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });
  
  // Optimization mutation
  const optimizationMutation = useMutation<MaintenanceOptimizationResponse, Error, MaintenanceOptimizationParameters>({
    mutationFn: (params: MaintenanceOptimizationParameters) => 
      apiRequest<MaintenanceOptimizationResponse>("POST", "/api/maintenance-optimization", params),
    onSuccess: (data) => {
      setResults(data);
      toast({ 
        title: "Optimization Complete", 
        description: "Maintenance interval optimization completed successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to perform maintenance optimization",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value)
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
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    optimizationMutation.mutate(formData);
  };

  // Get the selected asset's time unit
  const getTimeUnit = () => {
    if (!selectedAssetId || !assets) return "hours";
    const selectedAsset = assets.find((asset: Asset) => asset.id === selectedAssetId);
    return selectedAsset ? selectedAsset.timeUnit : "hours";
  };

  const formatTimeUnit = (unit: string) => {
    return unit.charAt(0).toUpperCase() + unit.slice(1);
  };

  const isRunToFailure = results && !isFinite(results.optimalInterval);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Inputs Form */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Maintenance Optimization Parameters</CardTitle>
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
            
            {/* Weibull Parameters */}
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
                β &lt; 1: Decreasing failure rate (Run-to-failure optimal)<br />
                β &gt; 1: Increasing failure rate (PM may be optimal)
              </p>
            </div>

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
                In {getTimeUnit()}
              </p>
            </div>

            {/* Cost Parameters */}
            <div className="space-y-2">
              <Label htmlFor="preventiveMaintenanceCost">Preventive Maintenance Cost ($)</Label>
              <Input
                id="preventiveMaintenanceCost"
                name="preventiveMaintenanceCost"
                type="number"
                step="1"
                min="1"
                value={formData.preventiveMaintenanceCost}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correctiveMaintenanceCost">Corrective Maintenance Cost ($)</Label>
              <Input
                id="correctiveMaintenanceCost"
                name="correctiveMaintenanceCost"
                type="number"
                step="1"
                min="1"
                value={formData.correctiveMaintenanceCost}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Usually higher than preventive maintenance cost
              </p>
            </div>
            
            {/* Reliability Threshold */}
            <div className="space-y-2">
              <Label htmlFor="targetReliabilityThreshold">Target Reliability (%)</Label>
              <Input
                id="targetReliabilityThreshold"
                name="targetReliabilityThreshold"
                type="number"
                step="1"
                min="1"
                max="100"
                value={formData.targetReliabilityThreshold}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Maximum Acceptable Downtime */}
            <div className="space-y-2">
              <Label htmlFor="maximumAcceptableDowntime">Maximum Acceptable Downtime</Label>
              <Input
                id="maximumAcceptableDowntime"
                name="maximumAcceptableDowntime"
                type="number"
                step="1"
                min="0"
                value={formData.maximumAcceptableDowntime}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                In {getTimeUnit()}
              </p>
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
                In {getTimeUnit()}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={optimizationMutation.isPending}
            >
              {optimizationMutation.isPending ? "Optimizing..." : "Optimize Maintenance Interval"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Optimization Results</CardTitle>
        </CardHeader>
        <CardContent>
          {optimizationMutation.isPending ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Finding optimal maintenance interval...</p>
            </div>
          ) : results ? (
            <div className="space-y-8">
              {/* Summary */}
              <div className="p-6 bg-muted rounded-md">
                <h3 className="text-xl font-bold mb-4">Recommended Strategy</h3>
                {isRunToFailure ? (
                  <div>
                    <div className="inline-block px-4 py-2 rounded-md border bg-red-100 text-red-800 border-red-300">
                      <span className="text-lg font-semibold">Run-to-Failure</span>
                    </div>
                    <p className="mt-4">
                      Based on your parameters, run-to-failure is the most cost-effective strategy.
                      This is typical when β ≤ 1 (decreasing or constant failure rate).
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="inline-block px-4 py-2 rounded-md border bg-green-100 text-green-800 border-green-300">
                      <span className="text-lg font-semibold">Preventive Maintenance</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Optimal Maintenance Interval:</p>
                        <p className="text-2xl font-bold">{results.optimalInterval.toFixed(2)} {getTimeUnit()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Cost (per {formData.timeHorizon} {getTimeUnit()}):</p>
                        <p className="text-2xl font-bold">${results.optimalCost.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Curve */}
              <div>
                <h3 className="font-medium mb-4">Cost vs. Maintenance Interval</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={results.costCurve}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="interval" 
                      label={{ value: `Maintenance Interval (${formatTimeLabel(getTimeUnit())})`, position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: 'Total Cost ($)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      labelFormatter={(value) => `Interval: ${value.toFixed(2)} ${getTimeUnit()}`}
                    />
                    <Legend />
                    {!isRunToFailure && (
                      <ReferenceLine
                        x={results.optimalInterval}
                        stroke="#4f46e5"
                        strokeDasharray="5 5"
                        label={{ value: "Optimal", position: "top" }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#22c55e" 
                      name="Total Cost" 
                      dot={false} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Interpretation */}
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold mb-2">Interpretation</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">•</span>
                    <span>
                      <strong>Optimal Interval:</strong> The maintenance interval that minimizes total cost, balancing preventive maintenance costs against failure costs.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">•</span>
                    <span>
                      <strong>Cost Curve:</strong> Shows how maintenance costs vary with different maintenance intervals.
                    </span>
                  </li>
                  {formData.beta <= 1 && (
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>
                        <strong>Run-to-Failure:</strong> With β ≤ 1, the failure rate is decreasing or constant, so preventive maintenance is not economically justified.
                      </span>
                    </li>
                  )}
                  {formData.beta > 1 && (
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>
                        <strong>Preventive Maintenance:</strong> With β {`>`} 1, the failure rate increases with time, making scheduled replacements economically beneficial.
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <p>Enter parameters and click "Optimize Maintenance Interval" to see results</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceOptimizationForm;