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
import { Slider } from "@/components/ui/slider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const MaintenanceOptimizationForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MaintenanceOptimizationParameters>({
    beta: 2,
    eta: 1000,
    preventiveMaintenanceCost: 100,
    correctiveMaintenanceCost: 500,
    targetReliabilityThreshold: 90,
    maximumAcceptableDowntime: 24,
    timeHorizon: 5000,
  });
  const [results, setResults] = useState<MaintenanceOptimizationResponse | null>(null);

  // Fetch assets for dropdown
  const { data: assets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // Optimization mutation
  const optimizationMutation = useMutation({
    mutationFn: (params: MaintenanceOptimizationParameters) => 
      apiRequest("POST", "/api/maintenance-optimization", params),
    onSuccess: (data) => {
      setResults(data);
      toast({ 
        title: "Optimization Complete", 
        description: "Maintenance optimization results generated successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to perform optimization",
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

  const handleSliderChange = (name: string, value: number[]) => {
    setFormData(prev => ({
      ...prev,
      [name]: value[0]
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inputs Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Optimization Parameters</CardTitle>
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
                <Label htmlFor="preventiveMaintenanceCost">Preventive Maintenance Cost</Label>
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
                <Label htmlFor="correctiveMaintenanceCost">Corrective Maintenance Cost</Label>
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
              </div>

              {/* Target Reliability Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="targetReliabilityThreshold">Target Reliability (%)</Label>
                  <span>{formData.targetReliabilityThreshold}%</span>
                </div>
                <Slider
                  id="targetReliabilityThreshold"
                  name="targetReliabilityThreshold"
                  min={50}
                  max={99}
                  step={1}
                  value={[formData.targetReliabilityThreshold]}
                  onValueChange={(value) => handleSliderChange("targetReliabilityThreshold", value)}
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
                  min="1"
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
                {optimizationMutation.isPending ? "Optimizing..." : "Find Optimal Interval"}
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
                <p className="mt-4 text-muted-foreground">Calculating optimal maintenance interval...</p>
              </div>
            ) : results ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">Optimal Maintenance Interval:</p>
                    <p className="text-2xl font-bold">{results.optimalInterval.toFixed(2)} {formatTimeUnit(getTimeUnit())}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Total Cost:</p>
                    <p className="text-2xl font-bold">${results.optimalCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Per {formData.timeHorizon} {getTimeUnit()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Cost vs. Maintenance Interval</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={results.costCurve}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="interval" 
                        label={{ value: `Maintenance Interval (${formatTimeUnit(getTimeUnit())})`, position: 'insideBottomRight', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Total Cost ($)', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Total Cost"]} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#8884d8" 
                        name="Total Cost" 
                        dot={false} 
                      />
                      <ReferenceLine 
                        x={results.optimalInterval} 
                        stroke="red" 
                        strokeDasharray="3 3"
                        label={{ value: 'Optimal', position: 'top' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Optimization Summary</h3>
                  <ul className="space-y-2 text-sm">
                    <li><span className="font-semibold">Preventive Maintenance Cost:</span> ${formData.preventiveMaintenanceCost}</li>
                    <li><span className="font-semibold">Corrective Maintenance Cost:</span> ${formData.correctiveMaintenanceCost}</li>
                    <li><span className="font-semibold">Cost Ratio (CM:PM):</span> {(formData.correctiveMaintenanceCost / formData.preventiveMaintenanceCost).toFixed(1)}:1</li>
                    <li><span className="font-semibold">Recommended Strategy:</span> {
                      formData.beta <= 1 
                        ? "Run to Failure (decreasing failure rate)" 
                        : results.optimalInterval < formData.eta * 0.2
                          ? "Frequent Preventive Maintenance"
                          : "Periodic Preventive Maintenance"
                    }</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">Enter parameters and run optimization to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MaintenanceOptimizationForm;