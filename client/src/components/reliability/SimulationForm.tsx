import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, SimulationParameters, SimulationResponse } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SimulationForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [usePM, setUsePM] = useState(true);
  
  const [formData, setFormData] = useState<SimulationParameters>({
    beta: 2,
    eta: 1000,
    numberOfRuns: 1000,
    timeHorizon: 5000,
    pmInterval: 500,
    pmCost: 100,
    failureCost: 500,
  });
  
  const [results, setResults] = useState<SimulationResponse | null>(null);

  // Fetch assets for dropdown
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // Simulation mutation
  const simulationMutation = useMutation<SimulationResponse, Error, SimulationParameters>({
    mutationFn: (params: SimulationParameters) => 
      apiRequest("POST", "/api/simulation", params),
    onSuccess: (data) => {
      setResults(data);
      toast({ 
        title: "Simulation Complete", 
        description: "Monte Carlo simulation completed successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to run simulation",
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

  const handleSwitchChange = (checked: boolean) => {
    setUsePM(checked);
    if (!checked) {
      // If not using PM, remove the PM interval
      const { pmInterval, ...rest } = formData;
      setFormData(rest);
    } else {
      // If using PM, add a default PM interval
      setFormData(prev => ({
        ...prev,
        pmInterval: 500,
      }));
    }
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
    simulationMutation.mutate(formData);
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
            <CardTitle>Simulation Parameters</CardTitle>
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

              {/* Simulation Parameters */}
              <div className="space-y-2">
                <Label htmlFor="numberOfRuns">Number of Simulation Runs</Label>
                <Input
                  id="numberOfRuns"
                  name="numberOfRuns"
                  type="number"
                  step="100"
                  min="100"
                  max="10000"
                  value={formData.numberOfRuns}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Higher values give more accurate results but take longer
                </p>
              </div>

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

              {/* Preventive Maintenance Options */}
              <div className="flex items-center space-x-2">
                <Switch 
                  id="usePM" 
                  checked={usePM}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="usePM">Include Preventive Maintenance</Label>
              </div>

              {usePM && (
                <div className="space-y-2">
                  <Label htmlFor="pmInterval">PM Interval</Label>
                  <Input
                    id="pmInterval"
                    name="pmInterval"
                    type="number"
                    step="1"
                    min="1"
                    value={formData.pmInterval}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    In {getTimeUnit()}
                  </p>
                </div>
              )}

              {/* Cost Parameters */}
              <div className="space-y-2">
                <Label htmlFor="pmCost">Preventive Maintenance Cost ($)</Label>
                <Input
                  id="pmCost"
                  name="pmCost"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.pmCost}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="failureCost">Failure Cost ($)</Label>
                <Input
                  id="failureCost"
                  name="failureCost"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.failureCost}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={simulationMutation.isPending}
              >
                {simulationMutation.isPending ? "Simulating..." : "Run Simulation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
          </CardHeader>
          <CardContent>
            {simulationMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Running Monte Carlo simulation...</p>
              </div>
            ) : results ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Total Cost:</p>
                    <p className="text-2xl font-bold">${results.totalCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Per {formData.timeHorizon} {getTimeUnit()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Number of Failures:</p>
                    <p className="text-2xl font-bold">{results.averageFailures.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Per {formData.timeHorizon} {getTimeUnit()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Failure Time Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={results.histogram}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="binStart"
                        tickFormatter={(value) => Math.round(value).toString()}
                        label={{ value: `Time (${formatTimeUnit(getTimeUnit())})`, position: 'insideBottomRight', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Number of Failures', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip 
                        labelFormatter={(value) => `Time: ${Math.round(value)}-${Math.round(results.histogram.find(h => h.binStart === value)?.binEnd || 0)} ${getTimeUnit()}`}
                        formatter={(value: number) => [value, "Failures"]} 
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Failures" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Simulation Summary</h3>
                  <ul className="space-y-2 text-sm">
                    <li><span className="font-semibold">Simulated Runs:</span> {formData.numberOfRuns}</li>
                    <li><span className="font-semibold">Time Horizon:</span> {formData.timeHorizon} {getTimeUnit()}</li>
                    <li>
                      <span className="font-semibold">Maintenance Strategy:</span> {
                        usePM 
                          ? `Preventive Maintenance (Interval: ${formData.pmInterval} ${getTimeUnit()})` 
                          : "Run to Failure"
                      }
                    </li>
                    <li><span className="font-semibold">Cost Per Failure:</span> ${formData.failureCost}</li>
                    {usePM && (
                      <li><span className="font-semibold">Cost Per PM:</span> ${formData.pmCost}</li>
                    )}
                    <li>
                      <span className="font-semibold">Mean Time Between Failures:</span> {
                        (formData.timeHorizon / results.averageFailures).toFixed(2)
                      } {getTimeUnit()}
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">Enter parameters and run simulation to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimulationForm;