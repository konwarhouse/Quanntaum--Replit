import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, History, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { ensureSafeId } from "@/lib/idUtils";

// Types
interface AssetFmecaRecord {
  id: number | string;  // Support both number and string IDs
  tagNumber: string;
  assetDescription: string;
  assetFunction: string;
  component: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  severityJustification: string;
  probability: number;
  probabilityJustification: string;
  detection: number;
  detectionJustification: string;
  rpn: number;
  action: string;
  responsibility: string;
  targetDate: string;
  completionDate?: string;
  verifiedBy?: string;
  effectivenessVerified?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SystemFmecaRecord {
  id: number | string;  // Support both number and string IDs
  systemId: string;
  systemName: string;
  systemFunction: string;
  subsystem: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  severityJustification: string;
  probability: number;
  probabilityJustification: string;
  detection: number;
  detectionJustification: string;
  rpn: number;
  action: string;
  responsibility: string;
  targetDate: string;
  completionDate?: string;
  verifiedBy?: string;
  effectivenessVerified?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

type FmecaRecord = AssetFmecaRecord | SystemFmecaRecord;

// Get risk level based on RPN
const getRiskLevel = (rpn: number): string => {
  if (rpn >= 200) return 'High Risk';
  if (rpn >= 125) return 'Medium Risk';
  return 'Low Risk';
};

// Get background color for risk level
const getRiskBadgeClass = (rpn: number): string => {
  if (rpn >= 200) return 'bg-red-100 text-red-800';
  if (rpn >= 125) return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
};

interface FmecaRecordsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assetRecords: AssetFmecaRecord[];
  systemRecords: SystemFmecaRecord[];
  onEditRecord: (record: FmecaRecord) => void;
  onDeleteRecord: (id: number | string, type: 'asset' | 'system') => void;
  onViewHistory: (id: number | string, type: 'asset' | 'system') => void;
}

export function FmecaRecordsDialog({
  isOpen,
  onClose,
  assetRecords,
  systemRecords,
  onEditRecord,
  onDeleteRecord,
  onViewHistory
}: FmecaRecordsDialogProps) {
  const [activeTab, setActiveTab] = useState('asset');
  const { toast } = useToast();

  // Export asset records to Excel
  const exportAssetRecords = () => {
    if (assetRecords.length === 0) {
      toast({
        title: 'No Records',
        description: 'There are no asset records to export',
        variant: 'destructive'
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      
      // Convert records to worksheet format with all fields
      const exportData = assetRecords.map(record => ({
        'Tag Number': record.tagNumber,
        'Asset Description': record.assetDescription,
        'Asset Function': record.assetFunction,
        'Component': record.component,
        'Failure Mode': record.failureMode,
        'Cause': record.cause,
        'Effect': record.effect,
        'Severity (S)': record.severity,
        'Severity Justification': record.severityJustification,
        'Probability (P)': record.probability,
        'Probability Justification': record.probabilityJustification,
        'Detection (D)': record.detection,
        'Detection Justification': record.detectionJustification,
        'RPN': record.rpn,
        'Risk Level': getRiskLevel(record.rpn),
        'Action': record.action,
        'Responsibility': record.responsibility,
        'Target Date': record.targetDate,
        'Completion Date': record.completionDate || '',
        'Verified By': record.verifiedBy || '',
        'Effectiveness Verified': record.effectivenessVerified || '',
        'Comments': record.comments || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Asset FMECA Records');
      
      XLSX.writeFile(wb, 'Asset_FMECA_Records.xlsx');
      
      toast({
        title: 'Export Successful',
        description: `Exported ${assetRecords.length} asset records to Excel`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export records to Excel',
        variant: 'destructive'
      });
    }
  };
  
  // Export system records to Excel
  const exportSystemRecords = () => {
    if (systemRecords.length === 0) {
      toast({
        title: 'No Records',
        description: 'There are no system records to export',
        variant: 'destructive'
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      
      // Convert records to worksheet format with all fields
      const exportData = systemRecords.map(record => ({
        'System Name': record.systemName,
        'System ID': record.systemId,
        'System Function': record.systemFunction,
        'Subsystem': record.subsystem,
        'Failure Mode': record.failureMode,
        'Cause': record.cause,
        'Effect': record.effect,
        'Severity (S)': record.severity,
        'Severity Justification': record.severityJustification,
        'Probability (P)': record.probability,
        'Probability Justification': record.probabilityJustification,
        'Detection (D)': record.detection,
        'Detection Justification': record.detectionJustification,
        'RPN': record.rpn,
        'Risk Level': getRiskLevel(record.rpn),
        'Action': record.action,
        'Responsibility': record.responsibility,
        'Target Date': record.targetDate,
        'Completion Date': record.completionDate || '',
        'Verified By': record.verifiedBy || '',
        'Effectiveness Verified': record.effectivenessVerified || '',
        'Comments': record.comments || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'System FMECA Records');
      
      XLSX.writeFile(wb, 'System_FMECA_Records.xlsx');
      
      toast({
        title: 'Export Successful',
        description: `Exported ${systemRecords.length} system records to Excel`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export records to Excel',
        variant: 'destructive'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center mb-2">
            <DialogTitle>FMECA Records</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={activeTab === 'asset' ? exportAssetRecords : exportSystemRecords}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4 mr-1" />
                <span>Export All to Excel</span>
              </Button>
            </div>
          </div>
          <DialogDescription>
            View and manage all stored FMECA records
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="asset" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="asset">Asset FMECA Records</TabsTrigger>
            <TabsTrigger value="system">System FMECA Records</TabsTrigger>
          </TabsList>
          
          <TabsContent value="asset" className="border rounded-md overflow-x-auto">
            <div className="p-2 bg-blue-50 flex justify-between items-center border-b">
              <h3 className="font-medium text-blue-800">Asset FMECA Records</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAssetRecords}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4 mr-1" />
                <span>Export to Excel</span>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag Number</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Failure Mode</TableHead>
                  <TableHead>Cause</TableHead>
                  <TableHead>Effect</TableHead>
                  <TableHead className="text-center">S</TableHead>
                  <TableHead className="text-center">O</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">RPN</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetRecords.length > 0 ? (
                  assetRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.tagNumber}</TableCell>
                      <TableCell>{record.component}</TableCell>
                      <TableCell>{record.failureMode}</TableCell>
                      <TableCell>{record.cause}</TableCell>
                      <TableCell>{record.effect}</TableCell>
                      <TableCell className="text-center">{record.severity}</TableCell>
                      <TableCell className="text-center">{record.probability}</TableCell>
                      <TableCell className="text-center">{record.detection}</TableCell>
                      <TableCell className="text-center font-bold">{record.rpn}</TableCell>
                      <TableCell>
                        <Badge className={getRiskBadgeClass(record.rpn)}>
                          {getRiskLevel(record.rpn)}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.action}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onEditRecord(record)}
                            className="h-8 px-2 py-0"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            <span className="text-xs">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onViewHistory(record.id, 'asset')}
                            className="h-8 px-2 py-0"
                          >
                            <History className="h-3 w-3 mr-1" />
                            <span className="text-xs">History</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const wb = XLSX.utils.book_new();
                              
                              // Create a worksheet with this record's data
                              const exportData = {
                                'Tag Number': record.tagNumber,
                                'Asset Description': record.assetDescription,
                                'Asset Function': record.assetFunction,
                                'Component': record.component,
                                'Failure Mode': record.failureMode,
                                'Cause': record.cause,
                                'Effect': record.effect,
                                'Severity (S)': record.severity,
                                'Severity Justification': record.severityJustification,
                                'Probability (P)': record.probability,
                                'Probability Justification': record.probabilityJustification,
                                'Detection (D)': record.detection,
                                'Detection Justification': record.detectionJustification,
                                'RPN': record.rpn,
                                'Risk Level': getRiskLevel(record.rpn),
                                'Action': record.action,
                                'Responsibility': record.responsibility,
                                'Target Date': record.targetDate,
                                'Completion Date': record.completionDate || '',
                                'Verified By': record.verifiedBy || '',
                                'Effectiveness Verified': record.effectivenessVerified || '',
                                'Comments': record.comments || ''
                              };
                              
                              const ws = XLSX.utils.json_to_sheet([exportData]);
                              XLSX.utils.book_append_sheet(wb, ws, 'Asset_FMECA_Record');
                              
                              XLSX.writeFile(wb, `Asset_FMECA_${record.tagNumber}.xlsx`);
                              
                              toast({
                                title: 'Export Successful',
                                description: `Exported FMECA record for ${record.tagNumber}`,
                              });
                            }}
                            className="h-8 px-2 py-0"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            <span className="text-xs">Export</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4">
                      No asset FMECA records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="system" className="border rounded-md overflow-x-auto">
            <div className="p-2 bg-green-50 flex justify-between items-center border-b">
              <h3 className="font-medium text-green-800">System FMECA Records</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={exportSystemRecords}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4 mr-1" />
                <span>Export to Excel</span>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System Name</TableHead>
                  <TableHead>Subsystem</TableHead>
                  <TableHead>Failure Mode</TableHead>
                  <TableHead>Cause</TableHead>
                  <TableHead>Effect</TableHead>
                  <TableHead className="text-center">S</TableHead>
                  <TableHead className="text-center">O</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">RPN</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemRecords.length > 0 ? (
                  systemRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.systemName}</TableCell>
                      <TableCell>{record.subsystem}</TableCell>
                      <TableCell>{record.failureMode}</TableCell>
                      <TableCell>{record.cause}</TableCell>
                      <TableCell>{record.effect}</TableCell>
                      <TableCell className="text-center">{record.severity}</TableCell>
                      <TableCell className="text-center">{record.probability}</TableCell>
                      <TableCell className="text-center">{record.detection}</TableCell>
                      <TableCell className="text-center font-bold">{record.rpn}</TableCell>
                      <TableCell>
                        <Badge className={getRiskBadgeClass(record.rpn)}>
                          {getRiskLevel(record.rpn)}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.action}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onEditRecord(record)}
                            className="h-8 px-2 py-0"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            <span className="text-xs">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onViewHistory(record.id, 'system')}
                            className="h-8 px-2 py-0"
                          >
                            <History className="h-3 w-3 mr-1" />
                            <span className="text-xs">History</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const wb = XLSX.utils.book_new();
                              
                              // Create a worksheet with this record's data
                              const exportData = {
                                'System Name': record.systemName,
                                'System ID': record.systemId,
                                'System Function': record.systemFunction,
                                'Subsystem': record.subsystem,
                                'Failure Mode': record.failureMode,
                                'Cause': record.cause,
                                'Effect': record.effect,
                                'Severity (S)': record.severity,
                                'Severity Justification': record.severityJustification,
                                'Probability (P)': record.probability,
                                'Probability Justification': record.probabilityJustification,
                                'Detection (D)': record.detection,
                                'Detection Justification': record.detectionJustification,
                                'RPN': record.rpn,
                                'Risk Level': getRiskLevel(record.rpn),
                                'Action': record.action,
                                'Responsibility': record.responsibility,
                                'Target Date': record.targetDate,
                                'Completion Date': record.completionDate || '',
                                'Verified By': record.verifiedBy || '',
                                'Effectiveness Verified': record.effectivenessVerified || '',
                                'Comments': record.comments || ''
                              };
                              
                              const ws = XLSX.utils.json_to_sheet([exportData]);
                              XLSX.utils.book_append_sheet(wb, ws, 'System_FMECA_Record');
                              
                              XLSX.writeFile(wb, `System_FMECA_${record.systemName}.xlsx`);
                              
                              toast({
                                title: 'Export Successful',
                                description: `Exported FMECA record for ${record.systemName}`,
                              });
                            }}
                            className="h-8 px-2 py-0"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            <span className="text-xs">Export</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4">
                      No system FMECA records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}