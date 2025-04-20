import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const AssetManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    assetNumber: '',
    description: '',
    criticality: 'Medium',
    installationDate: '',
    weibullBeta: 2.0,
    weibullEta: 1000.0,
    timeUnit: 'hours'
  });
  
  // Use separate state for input values to prevent focus issues
  const [name, setName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Fetch assets
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  // Add asset mutation
  const addAssetMutation = useMutation({
    mutationFn: (assetData: any) => apiRequest("POST", "/api/assets", assetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      setIsAddAssetOpen(false);
      resetForm();
      toast({ 
        title: "Success", 
        description: "Asset added successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to add asset",
        variant: "destructive"
      });
    }
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PUT", `/api/assets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      setIsEditAssetOpen(false);
      setSelectedAsset(null);
      toast({ 
        title: "Success", 
        description: "Asset updated successfully" 
      });
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
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      setSelectedAsset(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Update individual state variables to prevent focus issues
    if (name === 'name') {
      setName(value);
    } else if (name === 'assetNumber') {
      setAssetNumber(value);
    } else if (name === 'description') {
      setDescription(value);
    }
    
    // Also update the newAsset object for form submission
    setNewAsset(prev => ({
      ...prev,
      [name]: name === 'weibullBeta' || name === 'weibullEta' ? parseFloat(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewAsset(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setNewAsset(prev => ({
        ...prev,
        installationDate: format(selectedDate, 'yyyy-MM-dd')
      }));
    } else {
      setNewAsset(prev => ({
        ...prev,
        installationDate: ''
      }));
    }
  };

  const resetForm = () => {
    setNewAsset({
      name: '',
      assetNumber: '',
      description: '',
      criticality: 'Medium',
      installationDate: '',
      weibullBeta: 2.0,
      weibullEta: 1000.0,
      timeUnit: 'hours'
    });
    setDate(undefined);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    // Create a copy of the asset data
    const assetData = {...newAsset};
    
    // If installation date is empty, make sure it's handled properly on the server
    // We'll keep an empty string which signals to the server this is a null/undefined date
    
    addAssetMutation.mutate(assetData);
  };

  const handleEditAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsset) {
      // Create a copy of the asset data
      const assetData = {...newAsset};
      
      // If installation date is empty, we'll keep it as empty string
      // The server will handle this properly
      
      updateAssetMutation.mutate({ 
        id: selectedAsset.id, 
        data: assetData 
      });
    }
  };

  const handleDeleteAsset = () => {
    if (selectedAsset) {
      deleteAssetMutation.mutate(selectedAsset.id);
    }
  };

  const handleEditClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setNewAsset({
      name: asset.name,
      assetNumber: asset.assetNumber || '',
      description: asset.description || '',
      criticality: asset.criticality,
      installationDate: asset.installationDate || '',
      weibullBeta: asset.weibullBeta,
      weibullEta: asset.weibullEta,
      timeUnit: asset.timeUnit
    });
    if (asset.installationDate) {
      setDate(new Date(asset.installationDate));
    } else {
      setDate(undefined);
    }
    setIsEditAssetOpen(true);
  };

  // Asset card
  const AssetCard = ({ asset }: { asset: Asset }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{asset.name}</CardTitle>
        <CardDescription>
          ID: {asset.assetNumber}<br />
          Installed: {asset.installationDate ? format(new Date(asset.installationDate), 'MMM d, yyyy') : 'Unknown'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="font-medium">Criticality</div>
            <div className={cn(
              "mt-1 py-1 px-2 rounded-md text-xs w-fit",
              asset.criticality === 'High' 
                ? "bg-red-100 text-red-800" 
                : asset.criticality === 'Medium' 
                  ? "bg-amber-100 text-amber-800" 
                  : "bg-green-100 text-green-800"
            )}>
              {asset.criticality}
            </div>
          </div>
          <div>
            <div className="font-medium">Weibull Parameters</div>
            <div className="text-xs text-muted-foreground mt-1">
              β = {asset.weibullBeta.toFixed(2)}, η = {asset.weibullEta.toFixed(2)} {asset.timeUnit}
            </div>
          </div>
        </div>
        <div>
          <div className="font-medium">Description</div>
          <div className="text-sm text-muted-foreground mt-1">
            {asset.description || "No description available"}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditClick(asset)}
        >
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
            >
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the asset and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setSelectedAsset(asset);
                handleDeleteAsset();
              }}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );

  // Asset form
  const AssetForm = ({ 
    onSubmit, 
    title, 
    submitText,
    isLoading 
  }: { 
    onSubmit: (e: React.FormEvent) => void, 
    title: string, 
    submitText: string,
    isLoading: boolean
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Asset Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={handleInputChange}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="assetNumber">Asset Number</Label>
        <Input
          id="assetNumber"
          name="assetNumber"
          value={assetNumber}
          onChange={handleInputChange}
          placeholder="e.g., ABC-2024-001"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={handleInputChange}
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="criticality">Criticality</Label>
        <Select
          value={newAsset.criticality}
          onValueChange={(value) => handleSelectChange("criticality", value)}
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
      
      <div className="space-y-2">
        <Label>Installation Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weibullBeta">Weibull β (Shape)</Label>
          <Input
            id="weibullBeta"
            name="weibullBeta"
            type="number"
            step="0.1"
            min="0.1"
            value={newAsset.weibullBeta}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="weibullEta">Weibull η (Scale)</Label>
          <Input
            id="weibullEta"
            name="weibullEta"
            type="number"
            step="1"
            min="1"
            value={newAsset.weibullEta}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeUnit">Time Unit</Label>
        <Select
          value={newAsset.timeUnit}
          onValueChange={(value) => handleSelectChange("timeUnit", value)}
        >
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
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : submitText}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Asset Management</h2>
        <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
          <DialogTrigger asChild>
            <Button>Add New Asset</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>
                Enter the details of the asset to add it to your inventory.
              </DialogDescription>
            </DialogHeader>
            <AssetForm 
              onSubmit={handleAddAsset} 
              title="Add New Asset" 
              submitText="Add Asset"
              isLoading={addAssetMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">No assets found</p>
            <Button onClick={() => setIsAddAssetOpen(true)}>Add Your First Asset</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the details of your asset.
            </DialogDescription>
          </DialogHeader>
          <AssetForm 
            onSubmit={handleEditAsset} 
            title="Edit Asset" 
            submitText="Save Changes"
            isLoading={updateAssetMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetManagement;