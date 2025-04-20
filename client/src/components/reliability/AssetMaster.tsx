import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Asset } from '@shared/schema';
import * as XLSX from 'xlsx';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarIcon, MoreHorizontal, Plus, Search, Download, Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AssetImport from './AssetImport';

const AssetMaster = () => {
  const { toast } = useToast();
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importMode, setImportMode] = useState(false);
  
  // Form state
  const [newAsset, setNewAsset] = useState({
    name: '',
    assetNumber: '',
    equipmentClass: '',
    description: '',
    criticality: 'Medium',
    installationDate: '',
    weibullBeta: 2.0,
    weibullEta: 5000,
    timeUnit: 'hours'
  });
  
  // Individual state variables for better control
  const [name, setName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [equipmentClass, setEquipmentClass] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Equipment classes based on ISO 14224
  const equipmentClasses = [
    "Air Compressor", 
    "Blower", 
    "Centrifugal Pump", 
    "Conveyor", 
    "Cooling Tower", 
    "Diesel Engine", 
    "Electric Generator", 
    "Electric Motor", 
    "Gearbox", 
    "Heat Exchanger",
    "Hydraulic Pump",
    "Mixer",
    "Positive Displacement Pump",
    "Pressure Vessel",
    "Process Valve",
    "Storage Tank",
    "Transformer",
    "Turbine",
    "Vacuum Pump",
    "Ventilation Fan"
  ];
  
  // Fetch assets
  const { data: assets = [], isLoading, isError } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000, // 5 seconds
  });
  
  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (asset: Omit<Asset, 'id'>) => {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: 'Asset created',
        description: 'The asset has been successfully created.'
      });
      handleResetForm();
      setIsNewAssetOpen(false);
    },
    onError: (error) => {
      console.error('Error creating asset:', error);
      toast({
        title: 'Failed to create asset',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (asset: Asset) => {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: 'Asset updated',
        description: 'The asset has been successfully updated.'
      });
      setIsEditAssetOpen(false);
    },
    onError: (error) => {
      console.error('Error updating asset:', error);
      toast({
        title: 'Failed to update asset',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: 'Asset deleted',
        description: 'The asset has been successfully deleted.'
      });
    },
    onError: (error) => {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Failed to delete asset',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  const handleResetForm = () => {
    setNewAsset({
      name: '',
      assetNumber: '',
      equipmentClass: '',
      description: '',
      criticality: 'Medium',
      installationDate: '',
      weibullBeta: 2.0,
      weibullEta: 5000,
      timeUnit: 'hours'
    });
    
    setName('');
    setAssetNumber('');
    setEquipmentClass('');
    setDescription('');
    setDate(undefined);
  };
  
  const handleCreateAsset = () => {
    const installationDate = date ? format(date, 'yyyy-MM-dd') : '';
    
    // Validate
    if (!name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Asset name is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!assetNumber.trim()) {
      toast({
        title: 'Validation error',
        description: 'Asset number is required',
        variant: 'destructive'
      });
      return;
    }
    
    // Create asset object
    const asset = {
      ...newAsset,
      name,
      assetNumber,
      equipmentClass,
      description,
      installationDate
    };
    
    createAssetMutation.mutate(asset);
  };
  
  const handleUpdateAsset = () => {
    if (!selectedAsset) return;
    
    const installationDate = date ? format(date, 'yyyy-MM-dd') : '';
    
    // Validate
    if (!name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Asset name is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!assetNumber.trim()) {
      toast({
        title: 'Validation error',
        description: 'Asset number is required',
        variant: 'destructive'
      });
      return;
    }
    
    // Create updated asset object
    const updatedAsset = {
      ...selectedAsset,
      ...newAsset,
      name,
      assetNumber,
      equipmentClass,
      description,
      installationDate
    };
    
    updateAssetMutation.mutate(updatedAsset);
  };
  
  const handleDeleteAsset = (assetId: number) => {
    deleteAssetMutation.mutate(assetId);
  };
  
  const handleEditClick = (asset: Asset) => {
    setSelectedAsset(asset);
    
    // Update individual state variables
    setName(asset.name);
    setAssetNumber(asset.assetNumber || '');
    setEquipmentClass(asset.equipmentClass || '');
    setDescription(asset.description || '');
    
    // Update main form state object
    setNewAsset({
      name: asset.name,
      assetNumber: asset.assetNumber || '',
      equipmentClass: asset.equipmentClass || '',
      description: asset.description || '',
      criticality: asset.criticality,
      installationDate: asset.installationDate || '',
      weibullBeta: asset.weibullBeta,
      weibullEta: asset.weibullEta,
      timeUnit: asset.timeUnit
    });
    
    // Update date state
    if (asset.installationDate) {
      setDate(new Date(asset.installationDate));
    } else {
      setDate(undefined);
    }
    
    setIsEditAssetOpen(true);
  };

  // Export assets to Excel
  const handleExportAssets = () => {
    if (assets.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'There are no assets to export.',
        variant: 'destructive'
      });
      return;
    }

    // Format date for file name
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    
    // Prepare data for export
    const exportData = assets.map(asset => ({
      'Asset ID': asset.assetNumber,
      'Name': asset.name,
      'Equipment Class': asset.equipmentClass || '',
      'Description': asset.description || '',
      'Criticality': asset.criticality,
      'Installation Date': asset.installationDate || '',
      'Beta Value': asset.weibullBeta,
      'Eta Value': asset.weibullEta,
      'Time Unit': asset.timeUnit
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `Asset_Master_${dateStr}.xlsx`);
    
    toast({
      title: 'Export successful',
      description: 'Asset data has been exported to Excel.',
    });
  };
  
  // Asset card
  const AssetCard = ({ asset }: { asset: Asset }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{asset.name}</CardTitle>
        <CardDescription>
          ID: {asset.assetNumber}<br />
          {asset.equipmentClass && <span>Class: {asset.equipmentClass}<br /></span>}
          Installed: {asset.installationDate ? format(new Date(asset.installationDate), 'MMM d, yyyy') : 'Unknown'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="font-medium">Criticality</div>
            <div className={cn(
              "mt-1 py-1 px-2 rounded-md text-xs w-fit",
              asset.criticality === 'High' ? 'bg-red-100 text-red-800' :
              asset.criticality === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            )}>
              {asset.criticality}
            </div>
          </div>
          
          <div>
            <div className="font-medium">Weibull Parameters</div>
            <div className="text-sm text-muted-foreground mt-1">
              β: {asset.weibullBeta.toFixed(2)}<br />
              η: {asset.weibullEta.toFixed(0)} {asset.timeUnit}
            </div>
          </div>
        </div>
        
        {asset.description && (
          <div>
            <div className="font-medium text-sm">Description</div>
            <div className="text-sm text-muted-foreground mt-1">
              {asset.description}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-3 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Asset Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEditClick(asset)}>
              Edit Asset
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Delete Asset
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the asset "{asset.name}" and all associated failure modes and maintenance events.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
  
  // Filter assets based on search term
  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (asset.equipmentClass && asset.equipmentClass.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Master</h2>
          <p className="text-muted-foreground">
            Manage equipment master data following ISO 14224 classification
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setImportMode(!importMode)}>
            {importMode ? "View Assets" : "Batch Import"}
          </Button>
          {!importMode && (
            <>
              <Button variant="outline" onClick={handleExportAssets}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
              <Dialog open={isNewAssetOpen} onOpenChange={setIsNewAssetOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Asset
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new asset
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="assetNumber">Asset Number*</Label>
                    <Input
                      id="assetNumber"
                      placeholder="e.g., PUMP-001"
                      value={assetNumber}
                      onChange={(e) => {
                        setAssetNumber(e.target.value);
                        setNewAsset({...newAsset, assetNumber: e.target.value});
                      }}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="name">Asset Name*</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Cooling Water Pump"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNewAsset({...newAsset, name: e.target.value});
                      }}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="equipmentClass">Equipment Class</Label>
                    <Select 
                      value={equipmentClass} 
                      onValueChange={(value) => {
                        setEquipmentClass(value);
                        setNewAsset({...newAsset, equipmentClass: value});
                      }}
                    >
                      <SelectTrigger id="equipmentClass">
                        <SelectValue placeholder="Select equipment class" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the asset..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setNewAsset({...newAsset, description: e.target.value});
                      }}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="criticality">Criticality</Label>
                    <Select 
                      value={newAsset.criticality} 
                      onValueChange={(value) => {
                        setNewAsset({...newAsset, criticality: value});
                      }}
                    >
                      <SelectTrigger id="criticality">
                        <SelectValue placeholder="Select criticality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Installation Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="weibullBeta">Weibull β (Shape)</Label>
                      <Input
                        id="weibullBeta"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={newAsset.weibullBeta}
                        onChange={(e) => {
                          setNewAsset({...newAsset, weibullBeta: parseFloat(e.target.value) || 1.0});
                        }}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="weibullEta">Weibull η (Scale)</Label>
                      <Input
                        id="weibullEta"
                        type="number"
                        step="100"
                        min="1"
                        value={newAsset.weibullEta}
                        onChange={(e) => {
                          setNewAsset({...newAsset, weibullEta: parseFloat(e.target.value) || 1000});
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="timeUnit">Time Unit</Label>
                    <Select 
                      value={newAsset.timeUnit} 
                      onValueChange={(value) => {
                        setNewAsset({...newAsset, timeUnit: value});
                      }}
                    >
                      <SelectTrigger id="timeUnit">
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
                  <Button type="button" variant="outline" onClick={() => setIsNewAssetOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleCreateAsset}>
                    Create Asset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>
      
      {importMode ? (
        <AssetImport />
      ) : (
        <>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-10">Loading assets...</div>
          ) : isError ? (
            <div className="flex justify-center py-10 text-red-500">Error loading assets</div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">No assets found</p>
              <Button onClick={() => setIsNewAssetOpen(true)}>Add your first asset</Button>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Equipment Class</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Installation Date</TableHead>
                    <TableHead>Weibull Parameters</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.assetNumber}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.equipmentClass || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            asset.criticality === "High" 
                              ? "bg-red-100 text-red-800 hover:bg-red-100" 
                              : asset.criticality === "Medium"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              : "bg-green-100 text-green-800 hover:bg-green-100"
                          }
                        >
                          {asset.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>{asset.installationDate ? format(new Date(asset.installationDate), 'MMM d, yyyy') : "Unknown"}</TableCell>
                      <TableCell>
                        β: {asset.weibullBeta.toFixed(2)}, η: {asset.weibullEta.toFixed(0)} {asset.timeUnit}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(asset)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the asset "{asset.name}" and all associated failure modes and maintenance events.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteAsset(asset.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      
      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the details for this asset
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-assetNumber">Asset Number*</Label>
              <Input
                id="edit-assetNumber"
                placeholder="e.g., PUMP-001"
                value={assetNumber}
                onChange={(e) => {
                  setAssetNumber(e.target.value);
                  setNewAsset({...newAsset, assetNumber: e.target.value});
                }}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Asset Name*</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Cooling Water Pump"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNewAsset({...newAsset, name: e.target.value});
                }}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-equipmentClass">Equipment Class</Label>
              <Select 
                value={equipmentClass} 
                onValueChange={(value) => {
                  setEquipmentClass(value);
                  setNewAsset({...newAsset, equipmentClass: value});
                }}
              >
                <SelectTrigger id="edit-equipmentClass">
                  <SelectValue placeholder="Select equipment class" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe the asset..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setNewAsset({...newAsset, description: e.target.value});
                }}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-criticality">Criticality</Label>
              <Select 
                value={newAsset.criticality} 
                onValueChange={(value) => {
                  setNewAsset({...newAsset, criticality: value});
                }}
              >
                <SelectTrigger id="edit-criticality">
                  <SelectValue placeholder="Select criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Installation Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-weibullBeta">Weibull β (Shape)</Label>
                <Input
                  id="edit-weibullBeta"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={newAsset.weibullBeta}
                  onChange={(e) => {
                    setNewAsset({...newAsset, weibullBeta: parseFloat(e.target.value) || 1.0});
                  }}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-weibullEta">Weibull η (Scale)</Label>
                <Input
                  id="edit-weibullEta"
                  type="number"
                  step="100"
                  min="1"
                  value={newAsset.weibullEta}
                  onChange={(e) => {
                    setNewAsset({...newAsset, weibullEta: parseFloat(e.target.value) || 1000});
                  }}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-timeUnit">Time Unit</Label>
              <Select 
                value={newAsset.timeUnit} 
                onValueChange={(value) => {
                  setNewAsset({...newAsset, timeUnit: value});
                }}
              >
                <SelectTrigger id="edit-timeUnit">
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
            <Button type="button" variant="outline" onClick={() => setIsEditAssetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateAsset}>
              Update Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetMaster;