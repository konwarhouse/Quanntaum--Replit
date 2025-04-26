import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FmecaRecord {
  id: number;
  // Common fields
  severity: number;
  severityJustification: string;
  probability: number;
  probabilityJustification: string;
  detection: number;
  detectionJustification: string;
  rpn: number;
  failureMode: string;
  cause: string;
  effect: string;
  action: string;
  responsibility: string;
  targetDate: string;
  completionDate?: string;
  verifiedBy?: string;
  effectivenessVerified?: 'yes' | 'no' | 'partial' | '';
  comments: string;
  createdAt: string;
  
  // Asset FMECA specific fields
  tagNumber?: string;
  assetDescription?: string;
  assetFunction?: string;
  component?: string;
  
  // System FMECA specific fields
  systemName?: string;
  systemFunction?: string;
  subsystem?: string;
}

interface FmecaRecordsTableProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FmecaRecordsTable({ isOpen, onClose }: FmecaRecordsTableProps) {
  const [activeTab, setActiveTab] = useState<'asset' | 'system'>('asset');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  
  // Fetch asset FMECA records
  const { 
    data: assetRecords, 
    isLoading: isLoadingAsset, 
    error: assetError 
  } = useQuery<FmecaRecord[]>({
    queryKey: ['/api/enhanced-fmeca/asset'],
    enabled: isOpen && activeTab === 'asset'
  });
  
  // Fetch system FMECA records
  const { 
    data: systemRecords, 
    isLoading: isLoadingSystem, 
    error: systemError 
  } = useQuery<FmecaRecord[]>({
    queryKey: ['/api/enhanced-fmeca/system'],
    enabled: isOpen && activeTab === 'system'
  });
  
  // Delete mutation for asset FMECA
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/enhanced-fmeca/asset/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete asset FMECA record');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-fmeca/asset'] });
      toast({
        title: 'Record deleted',
        description: 'FMECA record has been deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete record: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Delete mutation for system FMECA
  const deleteSystemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/enhanced-fmeca/system/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete system FMECA record');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-fmeca/system'] });
      toast({
        title: 'Record deleted',
        description: 'FMECA record has been deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete record: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleEditRecord = async (record: FmecaRecord) => {
    try {
      // Determine if it's an asset or system record based on fields
      const recordType = 'tagNumber' in record ? 'asset' : 'system';
      
      // Instead of trying to fetch data before edit, let's directly open the edit dialog
      // with the data we already have in the record
      setEditRow(recordType === 'asset' ? {
        // Asset FMECA data mapping
        id: record.id.toString(),
        tagNumber: record.tagNumber || '',
        assetDescription: record.assetDescription || '',
        assetFunction: record.assetFunction || '',
        component: record.component || '',
        failureMode: record.failureMode || '',
        cause: record.cause || '',
        effect: record.effect || '',
        severity: record.severity,
        severityJustification: record.severityJustification || '',
        probability: record.probability,
        probabilityJustification: record.probabilityJustification || '',
        detection: record.detection,
        detectionJustification: record.detectionJustification || '',
        rpn: record.rpn,
        action: record.action || '',
        responsibility: record.responsibility || '',
        targetDate: record.targetDate || '',
        completionDate: record.completionDate || '',
        verifiedBy: record.verifiedBy || '',
        effectivenessVerified: record.effectivenessVerified || '',
        comments: record.comments || ''
      } : {
        // System FMECA data mapping
        id: record.id.toString(),
        systemId: record.systemName || '',
        systemName: record.systemName || '',
        systemFunction: record.systemFunction || '',
        subsystem: record.subsystem || '',
        failureMode: record.failureMode || '',
        cause: record.cause || '',
        effect: record.effect || '',
        severity: record.severity,
        severityJustification: record.severityJustification || '',
        probability: record.probability,
        probabilityJustification: record.probabilityJustification || '',
        detection: record.detection,
        detectionJustification: record.detectionJustification || '',
        rpn: record.rpn,
        action: record.action || '',
        responsibility: record.responsibility || '',
        targetDate: record.targetDate || '',
        completionDate: record.completionDate || '',
        verifiedBy: record.verifiedBy || '',
        effectivenessVerified: record.effectivenessVerified || '',
        comments: record.comments || ''
      });
      
      setIsEditDialogOpen(true);
      
      // The dialog will be displayed instead of navigating away
      // No need to close the current dialog until the edit is complete
    } catch (error) {
      console.error('Error editing record:', error);
      toast({
        title: 'Error',
        description: `Failed to edit record: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteRecord = (id: number, type: 'asset' | 'system') => {
    if (window.confirm('Are you sure you want to delete this FMECA record?')) {
      if (type === 'asset') {
        deleteAssetMutation.mutate(id);
      } else {
        deleteSystemMutation.mutate(id);
      }
    }
  };
  
  const getRiskLevelBadge = (rpn: number) => {
    if (rpn >= 200) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">High Risk</Badge>;
    } else if (rpn >= 125) {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Low Risk</Badge>;
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>FMECA Records</DialogTitle>
            <DialogDescription>
              View and manage all stored FMECA records
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as 'asset' | 'system')} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="asset">Asset FMECA Records</TabsTrigger>
              <TabsTrigger value="system">System FMECA Records</TabsTrigger>
            </TabsList>
            
            <TabsContent value="asset" className="flex-1 h-full">
              {isLoadingAsset && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading asset records...</span>
                </div>
              )}
              
              {assetError && (
                <div className="flex items-center justify-center p-6 text-red-600">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  <span>Error loading asset records: {(assetError as Error).message}</span>
                </div>
              )}
              
              {!isLoadingAsset && assetRecords && assetRecords.length === 0 && (
                <div className="text-center p-6 text-gray-500">
                  No asset FMECA records found.
                </div>
              )}
              
              {!isLoadingAsset && assetRecords && assetRecords.length > 0 && (
                <ScrollArea className="h-[calc(80vh-12rem)]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Tag Number</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Failure Mode</TableHead>
                        <TableHead>RPN</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Date Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.tagNumber}</TableCell>
                          <TableCell>{record.component}</TableCell>
                          <TableCell>{record.failureMode}</TableCell>
                          <TableCell className="font-bold">{record.rpn}</TableCell>
                          <TableCell>{getRiskLevelBadge(record.rpn)}</TableCell>
                          <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditRecord(record)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteRecord(record.id, 'asset')}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="system" className="flex-1 h-full">
              {isLoadingSystem && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading system records...</span>
                </div>
              )}
              
              {systemError && (
                <div className="flex items-center justify-center p-6 text-red-600">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  <span>Error loading system records: {(systemError as Error).message}</span>
                </div>
              )}
              
              {!isLoadingSystem && systemRecords && systemRecords.length === 0 && (
                <div className="text-center p-6 text-gray-500">
                  No system FMECA records found.
                </div>
              )}
              
              {!isLoadingSystem && systemRecords && systemRecords.length > 0 && (
                <ScrollArea className="h-[calc(80vh-12rem)]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>System Name</TableHead>
                        <TableHead>Subsystem</TableHead>
                        <TableHead>Failure Mode</TableHead>
                        <TableHead>RPN</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Date Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.systemName}</TableCell>
                          <TableCell>{record.subsystem}</TableCell>
                          <TableCell>{record.failureMode}</TableCell>
                          <TableCell className="font-bold">{record.rpn}</TableCell>
                          <TableCell>{getRiskLevelBadge(record.rpn)}</TableCell>
                          <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditRecord(record)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteRecord(record.id, 'system')}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editRow && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit FMECA Record</DialogTitle>
              <DialogDescription>
                Edit the FMECA record details
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Add edit fields here based on editRow data */}
              <div className="col-span-2">
                <Label htmlFor="edit-failure-mode">Failure Mode</Label>
                <Input
                  id="edit-failure-mode"
                  value={editRow.failureMode}
                  onChange={(e) => setEditRow({ ...editRow, failureMode: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-cause">Cause</Label>
                <Input
                  id="edit-cause"
                  value={editRow.cause}
                  onChange={(e) => setEditRow({ ...editRow, cause: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-effect">Effect</Label>
                <Input
                  id="edit-effect"
                  value={editRow.effect}
                  onChange={(e) => setEditRow({ ...editRow, effect: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-action">Action</Label>
                <Input
                  id="edit-action"
                  value={editRow.action}
                  onChange={(e) => setEditRow({ ...editRow, action: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-responsibility">Responsibility</Label>
                <Input
                  id="edit-responsibility"
                  value={editRow.responsibility}
                  onChange={(e) => setEditRow({ ...editRow, responsibility: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-target-date">Target Date</Label>
                <Input
                  id="edit-target-date"
                  type="date"
                  value={editRow.targetDate}
                  onChange={(e) => setEditRow({ ...editRow, targetDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-completion-date">Completion Date</Label>
                <Input
                  id="edit-completion-date"
                  type="date"
                  value={editRow.completionDate || ''}
                  onChange={(e) => setEditRow({ ...editRow, completionDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-verified-by">Verified By</Label>
                <Input
                  id="edit-verified-by"
                  value={editRow.verifiedBy || ''}
                  onChange={(e) => setEditRow({ ...editRow, verifiedBy: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-effectiveness">Effectiveness</Label>
                <Select
                  value={editRow.effectivenessVerified || ''}
                  onValueChange={(value) => setEditRow({ ...editRow, effectivenessVerified: value })}
                >
                  <SelectTrigger id="edit-effectiveness">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not Verified</SelectItem>
                    <SelectItem value="yes">Fully Effective</SelectItem>
                    <SelectItem value="partial">Partially Effective</SelectItem>
                    <SelectItem value="no">Not Effective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-comments">Comments</Label>
                <Textarea
                  id="edit-comments"
                  value={editRow.comments || ''}
                  onChange={(e) => setEditRow({ ...editRow, comments: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  // Save the edited record
                  const recordType = 'tagNumber' in editRow ? 'asset' : 'system';
                  const endpoint = `/api/enhanced-fmeca/${recordType}/${editRow.id}`;
                  
                  fetch(endpoint, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(editRow),
                  })
                    .then(response => {
                      if (!response.ok) {
                        throw new Error('Failed to update record');
                      }
                      return response.json();
                    })
                    .then(() => {
                      // Success message
                      toast({
                        title: 'Record updated',
                        description: 'FMECA record has been updated successfully',
                      });
                      
                      // Refresh data
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/enhanced-fmeca/${recordType}`] 
                      });
                      
                      // Close dialog
                      setIsEditDialogOpen(false);
                    })
                    .catch(error => {
                      // Error message
                      toast({
                        title: 'Error',
                        description: `Failed to update record: ${error.message}`,
                        variant: 'destructive',
                      });
                    });
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}