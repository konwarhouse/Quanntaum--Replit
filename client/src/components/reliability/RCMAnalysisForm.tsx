import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Asset, RCMParameters, RCMAnalysisResponse } from "@/lib/types";

const RCMAnalysisForm = () => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RCMParameters>({
    assetCriticality: 'Medium',
    isPredictable: true,
    costOfFailure: 5000,
    failureModeDescriptions: [''],
    failureConsequences: [''],
    currentMaintenancePractices: ''
  });
  const [results, setResults] = useState<RCMAnalysisResponse | null>(null);
  
  // Fetch assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });
  
  // RCM analysis mutation
  const rcmMutation = useMutation<RCMAnalysisResponse, Error, RCMParameters>({
    mutationFn: (params: RCMParameters) => 
      apiRequest<RCMAnalysisResponse>("POST", "/api/rcm-analysis", params),
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

  const handleArrayInputChange = (index: number, field: 'failureModeDescriptions' | 'failureConsequences', value: string) => {
    setFormData(prev => {
      const updatedArray = [...prev[field]];
      updatedArray[index] = value;
      return {
        ...prev,
        [field]: updatedArray
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
    if (index === 0 && formData[field].length === 1) {
      // Don't remove the last item, just clear it
      handleArrayInputChange(0, field, '');
      return;
    }
    
    setFormData(prev => {
      const updatedArray = [...prev[field]];
      updatedArray.splice(index, 1);
      return {
        ...prev,
        [field]: updatedArray
      };
    });
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      assetCriticality: value as 'High' | 'Medium' | 'Low'
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isPredictable: checked
    }));
  };

  const handleAssetChange = (assetId: string) => {
    const id = parseInt(assetId);
    setSelectedAssetId(id);
    
    // Find the selected asset
    const selectedAsset = assets.find((asset: Asset) => asset.id === id);
    if (selectedAsset) {
      // Update form with asset's data
      setFormData(prev => ({
        ...prev,
        assetCriticality: selectedAsset.criticality as 'High' | 'Medium' | 'Low',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out any empty strings in the arrays
    const cleanedData = {
      ...formData,
      failureModeDescriptions: formData.failureModeDescriptions.filter(item => item.trim() !== ''),
      failureConsequences: formData.failureConsequences.filter(item => item.trim() !== '')
    };
    
    // If arrays are empty, add a default item
    if (cleanedData.failureModeDescriptions.length === 0) {
      cleanedData.failureModeDescriptions = ['General wear and tear'];
    }
    if (cleanedData.failureConsequences.length === 0) {
      cleanedData.failureConsequences = ['Equipment downtime'];
    }

    rcmMutation.mutate(cleanedData);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Inputs Form */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>RCM Analysis Parameters</CardTitle>
          <CardDescription>
            Reliability-Centered Maintenance analysis helps determine the optimal maintenance strategy based on asset criticality and failure consequences.
          </CardDescription>
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
                value={formData.assetCriticality}
                onValueChange={handleSelectChange}
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
              <p className="text-xs text-muted-foreground">
                How critical is the asset to operations?
              </p>
            </div>

            {/* Is Predictable */}
            <div className="flex items-center space-x-2">
              <Switch 
                id="isPredictable" 
                checked={formData.isPredictable}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="isPredictable">Failures are Predictable</Label>
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
              <p className="text-xs text-muted-foreground">
                Include direct repair costs, lost production, and other consequences
              </p>
            </div>

            {/* Failure Mode Descriptions */}
            <div className="space-y-2">
              <Label>Failure Modes</Label>
              {formData.failureModeDescriptions.map((mode, index) => (
                <div key={`mode-${index}`} className="flex gap-2 items-start">
                  <Textarea
                    placeholder="Describe how the asset might fail"
                    value={mode}
                    onChange={(e) => handleArrayInputChange(index, 'failureModeDescriptions', e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem(index, 'failureModeDescriptions')}
                    className="flex-none"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('failureModeDescriptions')}
                className="w-full"
              >
                Add Failure Mode
              </Button>
            </div>

            {/* Failure Consequences */}
            <div className="space-y-2">
              <Label>Failure Consequences</Label>
              {formData.failureConsequences.map((consequence, index) => (
                <div key={`consequence-${index}`} className="flex gap-2 items-start">
                  <Textarea
                    placeholder="Describe the consequences of failure"
                    value={consequence}
                    onChange={(e) => handleArrayInputChange(index, 'failureConsequences', e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem(index, 'failureConsequences')}
                    className="flex-none"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('failureConsequences')}
                className="w-full"
              >
                Add Consequence
              </Button>
            </div>

            {/* Current Maintenance Practices */}
            <div className="space-y-2">
              <Label htmlFor="currentMaintenancePractices">Current Maintenance Practices</Label>
              <Textarea
                id="currentMaintenancePractices"
                name="currentMaintenancePractices"
                placeholder="Describe current maintenance approach for this asset"
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
              <p className="mt-4 text-muted-foreground">Analyzing maintenance strategies...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Recommended Strategy */}
              <div className="p-6 bg-muted rounded-lg">
                <h3 className="text-xl font-bold mb-4">Recommended Maintenance Strategy</h3>
                <div className="inline-block px-4 py-2 rounded-md border mb-4" style={{
                  backgroundColor: 
                    results.maintenanceStrategy === 'Predictive Maintenance' ? 'rgba(79, 70, 229, 0.1)' :
                    results.maintenanceStrategy === 'Preventive Maintenance' ? 'rgba(34, 197, 94, 0.1)' :
                    results.maintenanceStrategy === 'Run-to-Failure' ? 'rgba(239, 68, 68, 0.1)' : 
                    'rgba(251, 146, 60, 0.1)',
                  borderColor: 
                    results.maintenanceStrategy === 'Predictive Maintenance' ? 'rgba(79, 70, 229, 0.5)' :
                    results.maintenanceStrategy === 'Preventive Maintenance' ? 'rgba(34, 197, 94, 0.5)' :
                    results.maintenanceStrategy === 'Run-to-Failure' ? 'rgba(239, 68, 68, 0.5)' : 
                    'rgba(251, 146, 60, 0.5)',
                  color: 
                    results.maintenanceStrategy === 'Predictive Maintenance' ? 'rgb(79, 70, 229)' :
                    results.maintenanceStrategy === 'Preventive Maintenance' ? 'rgb(34, 197, 94)' :
                    results.maintenanceStrategy === 'Run-to-Failure' ? 'rgb(239, 68, 68)' : 
                    'rgb(251, 146, 60)'
                }}>
                  <span className="text-lg font-semibold">{results.maintenanceStrategy}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-3 border rounded-md">
                    <p className="text-sm font-medium mb-1">Asset Criticality</p>
                    <p className="text-base">{results.analysisInputs.assetCriticality}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-sm font-medium mb-1">Failure Predictability</p>
                    <p className="text-base">{results.analysisInputs.isPredictable ? "Predictable" : "Not Predictable"}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-sm font-medium mb-1">Cost of Failure</p>
                    <p className="text-base">${results.analysisInputs.costOfFailure}</p>
                  </div>
                </div>
              </div>

              {/* Task Recommendations */}
              <div>
                <h3 className="text-lg font-medium mb-4">Recommended Tasks</h3>
                <ul className="space-y-2 pl-2">
                  {results.taskRecommendations.map((task, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Strategy Explanation */}
              <div className="border p-4 rounded-md">
                <h3 className="font-medium mb-2">Strategy Explanation</h3>
                <div className="text-sm space-y-2">
                  {results.maintenanceStrategy === 'Predictive Maintenance' && (
                    <>
                      <p>Predictive Maintenance is recommended when:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Asset is highly critical or moderately critical</li>
                        <li>Failures are predictable (give warning signs)</li>
                        <li>Failure costs are typically high</li>
                      </ul>
                      <p className="mt-2">This approach uses condition monitoring and advanced techniques to detect early signs of failure, allowing maintenance to be scheduled before failure occurs.</p>
                    </>
                  )}
                  
                  {results.maintenanceStrategy === 'Preventive Maintenance' && (
                    <>
                      <p>Preventive Maintenance is recommended when:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Asset has medium to high criticality</li>
                        <li>Failure patterns are somewhat predictable</li>
                        <li>Failure costs are significant</li>
                      </ul>
                      <p className="mt-2">This approach involves scheduled maintenance actions based on time or usage, regardless of the asset's condition.</p>
                    </>
                  )}
                  
                  {results.maintenanceStrategy === 'Run-to-Failure' && (
                    <>
                      <p>Run-to-Failure is recommended when:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Asset has low criticality</li>
                        <li>Failures have minimal operational impact</li>
                        <li>Cost of failure is lower than preventive maintenance costs</li>
                      </ul>
                      <p className="mt-2">This approach allows the asset to operate until failure occurs before taking maintenance action.</p>
                    </>
                  )}
                  
                  {results.maintenanceStrategy === 'Redesign' && (
                    <>
                      <p>Redesign is recommended when:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Asset has very high criticality</li>
                        <li>Current design cannot meet reliability requirements</li>
                        <li>Failure costs are extremely high</li>
                      </ul>
                      <p className="mt-2">This approach suggests that the asset or component should be redesigned to improve reliability, as maintenance strategies alone are insufficient.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <p>Enter parameters and click "Perform RCM Analysis" to see recommended maintenance strategy</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RCMAnalysisForm;