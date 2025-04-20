import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, RCMParameters, RCMAnalysisResponse } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

const RCMAnalysisForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<RCMParameters>({
    assetCriticality: 'Medium',
    isPredictable: true,
    costOfFailure: 1000,
    failureModeDescriptions: [''],
    failureConsequences: [''],
    currentMaintenancePractices: '',
  });
  
  const [results, setResults] = useState<RCMAnalysisResponse | null>(null);

  // Fetch assets for dropdown
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // RCM analysis mutation
  const rcmMutation = useMutation<RCMAnalysisResponse, Error, RCMParameters>({
    mutationFn: (params: RCMParameters) => 
      apiRequest("POST", "/api/rcm-analysis", params),
    onSuccess: (data) => {
      setResults(data);
      toast({ 
        title: "Analysis Complete", 
        description: "RCM analysis completed successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to perform RCM analysis",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'costOfFailure' ? parseFloat(value) : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isPredictable: checked
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayInputChange = (index: number, field: 'failureModeDescriptions' | 'failureConsequences', value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const addArrayItem = (field: 'failureModeDescriptions' | 'failureConsequences') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (index: number, field: 'failureModeDescriptions' | 'failureConsequences') => {
    if (formData[field].length <= 1) return;
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const handleAssetChange = (assetId: string) => {
    const id = parseInt(assetId);
    setSelectedAssetId(id);
    
    // Find the selected asset
    const selectedAsset = assets.find((asset: Asset) => asset.id === id);
    if (selectedAsset) {
      // Update form with asset's criticality
      setFormData(prev => ({
        ...prev,
        assetCriticality: selectedAsset.criticality as 'High' | 'Medium' | 'Low',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rcmMutation.mutate(formData);
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'Predictive Maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Preventive Maintenance':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Run-to-Failure':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Redesign':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inputs Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>RCM Analysis Parameters</CardTitle>
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

              {/* Asset Criticality */}
              <div className="space-y-2">
                <Label htmlFor="assetCriticality">Asset Criticality</Label>
                <Select
                  name="assetCriticality"
                  value={formData.assetCriticality}
                  onValueChange={(value) => handleSelectChange("assetCriticality", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Failure Predictability */}
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isPredictable" 
                  checked={formData.isPredictable}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="isPredictable">Failures are predictable</Label>
              </div>

              {/* Cost of Failure */}
              <div className="space-y-2">
                <Label htmlFor="costOfFailure">Cost of Failure ($)</Label>
                <Input
                  id="costOfFailure"
                  name="costOfFailure"
                  type="number"
                  step="100"
                  min="0"
                  value={formData.costOfFailure}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Failure Modes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Failure Modes</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addArrayItem('failureModeDescriptions')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.failureModeDescriptions.map((description, index) => (
                  <div key={`mode-${index}`} className="flex space-x-2">
                    <Input
                      placeholder={`Failure mode ${index + 1}`}
                      value={description}
                      onChange={(e) => handleArrayInputChange(index, 'failureModeDescriptions', e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem(index, 'failureModeDescriptions')}
                      disabled={formData.failureModeDescriptions.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Failure Consequences */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Failure Consequences</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addArrayItem('failureConsequences')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.failureConsequences.map((consequence, index) => (
                  <div key={`consequence-${index}`} className="flex space-x-2">
                    <Input
                      placeholder={`Consequence ${index + 1}`}
                      value={consequence}
                      onChange={(e) => handleArrayInputChange(index, 'failureConsequences', e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem(index, 'failureConsequences')}
                      disabled={formData.failureConsequences.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Current Maintenance Practices */}
              <div className="space-y-2">
                <Label htmlFor="currentMaintenancePractices">Current Maintenance Practices</Label>
                <Textarea
                  id="currentMaintenancePractices"
                  name="currentMaintenancePractices"
                  placeholder="Describe current maintenance practices..."
                  value={formData.currentMaintenancePractices}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={rcmMutation.isPending}
              >
                {rcmMutation.isPending ? "Analyzing..." : "Perform RCM Analysis"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>RCM Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {rcmMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Performing RCM analysis...</p>
              </div>
            ) : results ? (
              <div className="space-y-6">
                <div className="p-6 border rounded-md">
                  <h3 className="text-xl font-bold mb-2">Recommended Maintenance Strategy</h3>
                  <div className={`inline-block px-4 py-2 rounded-md border ${getStrategyColor(results.maintenanceStrategy)}`}>
                    <span className="text-lg font-semibold">{results.maintenanceStrategy}</span>
                  </div>
                  
                  <h4 className="font-semibold mt-6 mb-2">Recommended Tasks</h4>
                  <ul className="space-y-2">
                    {results.taskRecommendations.map((task, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-primary">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 border rounded-md">
                  <h3 className="font-semibold mb-4">Analysis Factors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Asset Criticality</p>
                      <p className="font-medium">{results.analysisInputs.assetCriticality}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Failure Predictability</p>
                      <p className="font-medium">{results.analysisInputs.isPredictable ? "Predictable" : "Not Predictable"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Cost of Failure</p>
                      <p className="font-medium">${results.analysisInputs.costOfFailure.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border rounded-md">
                  <h3 className="font-semibold mb-4">Strategy Explanation</h3>
                  <p className="text-sm">
                    {results.maintenanceStrategy === 'Predictive Maintenance' && 
                      "Predictive Maintenance is recommended when failures are predictable and the asset is critical. This approach uses condition monitoring to detect early signs of failure, allowing maintenance to be performed just before failure occurs, maximizing asset life while preventing unexpected downtime."}
                    
                    {results.maintenanceStrategy === 'Preventive Maintenance' && 
                      "Preventive Maintenance is recommended when the cost of failure is high, regardless of criticality. This time-based approach replaces or refurbishes components at fixed intervals before they are likely to fail, reducing the risk of unexpected failures."}
                    
                    {results.maintenanceStrategy === 'Run-to-Failure' && 
                      "Run-to-Failure is appropriate for non-critical assets with relatively low failure costs. This approach allows assets to operate until they fail, then performs corrective maintenance. It minimizes maintenance costs but requires quick response capability when failures occur."}
                    
                    {results.maintenanceStrategy === 'Redesign' && 
                      "Redesign is recommended for highly critical assets with unpredictable failures. This approach focuses on engineering solutions to eliminate the failure mode entirely or make the system more fault-tolerant, often through redundancy or improved design."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">Enter parameters and perform analysis to see recommendations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RCMAnalysisForm;