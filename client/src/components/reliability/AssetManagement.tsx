import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset } from "@/lib/types";
import { Edit, PlusCircle, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface AssetFormData {
  name: string;
  description: string;
  criticality: string;
  installationDate?: string;
  weibullBeta: number;
  weibullEta: number;
  timeUnit: string;
}

const AssetManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<AssetFormData>({
    name: "",
    description: "",
    criticality: "Medium",
    weibullBeta: 2,
    weibullEta: 1000,
    timeUnit: "hours"
  });
  
  // Fetch assets
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });
  
  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: (asset: Omit<Asset, 'id'>) => 
      apiRequest("POST", "/api/assets", asset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({ 
        title: "Success", 
        description: "Asset created successfully" 
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create asset",
        variant: "destructive"
      });
    }
  });
  
  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: (asset: Asset) => 
      apiRequest("PUT", `/api/assets/${asset.id}`, asset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({ 
        title: "Success", 
        description: "Asset updated successfully" 
      });
      setIsEditDialogOpen(false);
      setSelectedAsset(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update asset",
        variant: "destructive"
      });
    }
  });
  
  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({ 
        title: "Success", 
        description: "Asset deleted successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete asset",
        variant: "destructive"
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'weibullBeta' || name === 'weibullEta' ? parseFloat(value) : value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      criticality: "Medium",
      weibullBeta: 2,
      weibullEta: 1000,
      timeUnit: "hours"
    });
  };
  
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    createAssetMutation.mutate(formData);
  };
  
  const handleEditAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsset) {
      updateAssetMutation.mutate({
        ...formData,
        id: selectedAsset.id
      });
    }
  };
  
  const handleDeleteAsset = (id: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(id);
    }
  };
  
  const openEditDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description || "",
      criticality: asset.criticality,
      installationDate: asset.installationDate || undefined,
      weibullBeta: asset.weibullBeta,
      weibullEta: asset.weibullEta,
      timeUnit: asset.timeUnit
    });
    setIsEditDialogOpen(true);
  };
  
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-medium">Asset List</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>
                Enter the asset details and Weibull parameters.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAsset}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Asset Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="criticality" className="text-right">Criticality</Label>
                  <Select
                    name="criticality"
                    value={formData.criticality}
                    onValueChange={(value) => handleSelectChange("criticality", value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select criticality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="weibullBeta" className="text-right">Shape (β)</Label>
                  <Input
                    id="weibullBeta"
                    name="weibullBeta"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.weibullBeta}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="weibullEta" className="text-right">Scale (η)</Label>
                  <Input
                    id="weibullEta"
                    name="weibullEta"
                    type="number"
                    step="1"
                    min="1"
                    value={formData.weibullEta}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="timeUnit" className="text-right">Time Unit</Label>
                  <Select
                    name="timeUnit"
                    value={formData.timeUnit}
                    onValueChange={(value) => handleSelectChange("timeUnit", value)}
                  >
                    <SelectTrigger className="col-span-3">
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
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createAssetMutation.isPending}
                >
                  {createAssetMutation.isPending ? "Adding..." : "Add Asset"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset details and Weibull parameters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAsset}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Asset Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-criticality" className="text-right">Criticality</Label>
                <Select
                  name="criticality"
                  value={formData.criticality}
                  onValueChange={(value) => handleSelectChange("criticality", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-weibullBeta" className="text-right">Shape (β)</Label>
                <Input
                  id="edit-weibullBeta"
                  name="weibullBeta"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.weibullBeta}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-weibullEta" className="text-right">Scale (η)</Label>
                <Input
                  id="edit-weibullEta"
                  name="weibullEta"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.weibullEta}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-timeUnit" className="text-right">Time Unit</Label>
                <Select
                  name="timeUnit"
                  value={formData.timeUnit}
                  onValueChange={(value) => handleSelectChange("timeUnit", value)}
                >
                  <SelectTrigger className="col-span-3">
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
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={updateAssetMutation.isPending}
              >
                {updateAssetMutation.isPending ? "Updating..." : "Update Asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : assets && assets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset: Asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">{asset.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEditDialog(asset)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteAsset(asset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                  asset.criticality === 'High' 
                    ? 'bg-red-100 text-red-800' 
                    : asset.criticality === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {asset.criticality} Criticality
                </div>
              </CardHeader>
              <CardContent>
                {asset.description && (
                  <p className="text-sm text-muted-foreground mb-2">{asset.description}</p>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weibull β:</span>
                    <span className="font-medium">{asset.weibullBeta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weibull η:</span>
                    <span className="font-medium">{asset.weibullEta} {asset.timeUnit}</span>
                  </div>
                  {asset.installationDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Installed:</span>
                      <span className="font-medium">{format(parseISO(asset.installationDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-md">
          <p className="text-muted-foreground">No assets added yet</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Asset
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;