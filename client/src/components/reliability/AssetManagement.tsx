import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/lib/types";
import { Pencil, Trash2, PlusCircle } from "lucide-react";

const AssetManagement = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criticality: "Medium",
    weibullBeta: 2,
    weibullEta: 1000,
    timeUnit: "hours"
  });
  
  // Fetch assets
  const { data: assets, isLoading } = useQuery({
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
      
      {/* Asset List */}
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : assets && assets.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Shape (β)</TableHead>
              <TableHead>Scale (η)</TableHead>
              <TableHead>Time Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset: Asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>
                  <span className={`
                    px-2 py-1 rounded-full text-xs
                    ${asset.criticality === 'High' ? 'bg-red-100 text-red-800' : 
                      asset.criticality === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}
                  `}>
                    {asset.criticality}
                  </span>
                </TableCell>
                <TableCell>{asset.weibullBeta}</TableCell>
                <TableCell>{asset.weibullEta}</TableCell>
                <TableCell>{asset.timeUnit}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEditDialog(asset)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground mb-4">No assets found.</p>
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add your first asset
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetManagement;