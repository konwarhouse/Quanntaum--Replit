import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Clock, FileSpreadsheet, Pencil, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// Interfaces for asset and system FMECA history
interface AssetFmecaHistory {
  id: number;
  assetFmecaId: number;
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
  completionDate: string | null;
  verifiedBy: string | null;
  effectivenessVerified: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  status: string;
  historyReason: string;
  version: number;
}

interface SystemFmecaHistory {
  id: number;
  systemFmecaId: number;
  systemName: string;
  systemDescription: string;
  subSystem: string;
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
  completionDate: string | null;
  verifiedBy: string | null;
  effectivenessVerified: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  status: string;
  historyReason: string;
  version: number;
}

interface FmecaHistoryDialogProps {
  recordId: number;
  recordType: 'asset' | 'system';
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
  } catch (e) {
    return 'Invalid date';
  }
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  
  switch (status.toLowerCase()) {
    case 'active':
      variant = "default";
      break;
    case 'superseded':
      variant = "secondary";
      break;
    case 'archived':
      variant = "destructive";
      break;
    case 'draft':
      variant = "outline";
      break;
  }
  
  return <Badge variant={variant}>{status}</Badge>;
};

// Main FMECA History Dialog Component
export const FmecaHistoryDialog: React.FC<FmecaHistoryDialogProps> = ({ 
  recordId, 
  recordType, 
  isOpen, 
  onClose 
}) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Function to export a single history record to Excel
  const exportSingleRecordToExcel = (record: AssetFmecaHistory | SystemFmecaHistory) => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Convert the record to a format suitable for Excel
      const exportData = recordType === 'asset' 
        ? {
            'Tag Number': (record as AssetFmecaHistory).tagNumber,
            'Asset Description': (record as AssetFmecaHistory).assetDescription,
            'Asset Function': (record as AssetFmecaHistory).assetFunction,
            'Component': (record as AssetFmecaHistory).component,
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
            'Action': record.action,
            'Responsibility': record.responsibility,
            'Target Date': record.targetDate,
            'Completion Date': record.completionDate || '',
            'Verified By': record.verifiedBy || '',
            'Effectiveness Verified': record.effectivenessVerified || '',
            'Comments': record.comments || '',
            'Created At': formatDate(record.createdAt),
            'Updated At': formatDate(record.updatedAt),
            'Status': record.status,
            'History Reason': record.historyReason,
            'Version': record.version
          }
        : {
            'System Name': (record as SystemFmecaHistory).systemName,
            'System Description': (record as SystemFmecaHistory).systemDescription,
            'Subsystem': (record as SystemFmecaHistory).subSystem,
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
            'Action': record.action,
            'Responsibility': record.responsibility,
            'Target Date': record.targetDate,
            'Completion Date': record.completionDate || '',
            'Verified By': record.verifiedBy || '',
            'Effectiveness Verified': record.effectivenessVerified || '',
            'Comments': record.comments || '',
            'Created At': formatDate(record.createdAt),
            'Updated At': formatDate(record.updatedAt),
            'Status': record.status,
            'History Reason': record.historyReason,
            'Version': record.version
          };
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet([exportData]);
      
      // Add the worksheet to the workbook
      const sheetName = recordType === 'asset' 
        ? `Asset_${(record as AssetFmecaHistory).tagNumber}_v${record.version}` 
        : `System_${(record as SystemFmecaHistory).systemName}_v${record.version}`;
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate Excel file and trigger download
      const fileName = recordType === 'asset' 
        ? `FMECA_Asset_${(record as AssetFmecaHistory).tagNumber}_v${record.version}.xlsx` 
        : `FMECA_System_${(record as SystemFmecaHistory).systemName}_v${record.version}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: 'Export Successful',
        description: `History record exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export history record to Excel',
        variant: 'destructive'
      });
    }
  };
  
  // Function to export all history records to Excel
  const exportAllHistoryToExcel = () => {
    if (!historyRecords || historyRecords.length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No history records to export',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Convert all records to a format suitable for Excel
      const exportData = historyRecords.map((record) => {
        return recordType === 'asset' 
          ? {
              'Version': record.version,
              'Tag Number': (record as AssetFmecaHistory).tagNumber,
              'Asset Description': (record as AssetFmecaHistory).assetDescription,
              'Asset Function': (record as AssetFmecaHistory).assetFunction,
              'Component': (record as AssetFmecaHistory).component,
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
              'Action': record.action,
              'Responsibility': record.responsibility,
              'Target Date': record.targetDate,
              'Completion Date': record.completionDate || '',
              'Verified By': record.verifiedBy || '',
              'Effectiveness Verified': record.effectivenessVerified || '',
              'Comments': record.comments || '',
              'Created At': formatDate(record.createdAt),
              'Status': record.status,
              'History Reason': record.historyReason
            }
          : {
              'Version': record.version,
              'System Name': (record as SystemFmecaHistory).systemName,
              'System Description': (record as SystemFmecaHistory).systemDescription,
              'Subsystem': (record as SystemFmecaHistory).subSystem,
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
              'Action': record.action,
              'Responsibility': record.responsibility,
              'Target Date': record.targetDate,
              'Completion Date': record.completionDate || '',
              'Verified By': record.verifiedBy || '',
              'Effectiveness Verified': record.effectivenessVerified || '',
              'Comments': record.comments || '',
              'Created At': formatDate(record.createdAt),
              'Status': record.status,
              'History Reason': record.historyReason
            };
      });
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Add the worksheet to the workbook
      const entityName = recordType === 'asset' 
        ? historyRecords.length > 0 ? (historyRecords[0] as AssetFmecaHistory).tagNumber : 'Unknown'
        : historyRecords.length > 0 ? (historyRecords[0] as SystemFmecaHistory).systemName : 'Unknown';
        
      const sheetName = `FMECA_History_${recordType}_${entityName}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate Excel file and trigger download
      const fileName = `FMECA_History_${recordType}_${entityName}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: 'Export Successful',
        description: `All history records exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export history records to Excel',
        variant: 'destructive'
      });
    }
  };
  
  // Query to fetch the history records
  const { 
    data: historyRecords, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [`/api/enhanced-fmeca/${recordType}/${recordId}/history`],
    queryFn: async () => {
      const response = await fetch(`/api/enhanced-fmeca/${recordType}/${recordId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch history records');
      }
      return await response.json();
    },
    enabled: isOpen && recordId > 0
  });
  
  // Query to fetch a specific version
  const { 
    data: versionDetail, 
    isLoading: isVersionLoading 
  } = useQuery({
    queryKey: [`/api/enhanced-fmeca/${recordType}/${recordId}/history/${selectedVersion}`],
    queryFn: async () => {
      if (!selectedVersion) return null;
      const response = await fetch(`/api/enhanced-fmeca/${recordType}/${recordId}/history/${selectedVersion}`);
      if (!response.ok) {
        throw new Error('Failed to fetch version details');
      }
      return await response.json();
    },
    enabled: isOpen && selectedVersion !== null
  });
  
  // Reset selected version when dialog opens/closes or record changes
  useEffect(() => {
    setSelectedVersion(null);
  }, [isOpen, recordId, recordType]);
  
  // When history records load, select the latest version by default
  useEffect(() => {
    if (historyRecords && historyRecords.length > 0) {
      // Find the highest version
      const latestVersion = historyRecords.reduce(
        (max: number, record: AssetFmecaHistory | SystemFmecaHistory) => (record.version > max ? record.version : max),
        0
      );
      // Find the record with the highest version
      const latestRecord = historyRecords.find((record: AssetFmecaHistory | SystemFmecaHistory) => record.version === latestVersion);
      if (latestRecord) {
        setSelectedVersion(latestRecord.id);
      }
    }
  }, [historyRecords]);
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <span>FMECA Version History</span>
            </div>
          </DialogTitle>
          <DialogDescription>
            View and compare different versions of this FMECA record
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading history records...</span>
          </div>
        ) : error ? (
          <div className="text-destructive p-4 text-center border rounded-md">
            Error loading history records. Please try again.
          </div>
        ) : historyRecords && historyRecords.length > 0 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Select Version</h3>
              <Select
                value={selectedVersion?.toString() || ''}
                onValueChange={(value) => setSelectedVersion(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version..." />
                </SelectTrigger>
                <SelectContent>
                  {historyRecords
                    .sort((a: AssetFmecaHistory | SystemFmecaHistory, b: AssetFmecaHistory | SystemFmecaHistory) => b.version - a.version) // Sort by version descending
                    .map((record: AssetFmecaHistory | SystemFmecaHistory) => (
                      <SelectItem key={record.id} value={record.id.toString()}>
                        Version {record.version} - {formatDate(record.createdAt)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {isVersionLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading version details...</span>
              </div>
            ) : versionDetail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Created: {formatDate(versionDetail.createdAt)}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <StatusBadge status={versionDetail.status} />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // Open edit dialog for the current history record
                        const historyId = selectedVersion;
                        if (historyId) {
                          window.open(`/edit-fmeca-history/${recordType}/${historyId}`, '_blank');
                        }
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit Record
                    </Button>
                  </div>
                </div>
                
                <div className="p-2 bg-muted/50 rounded-md">
                  <h4 className="font-medium mb-1">History Reason</h4>
                  <p className="text-sm">{versionDetail.historyReason || 'No reason provided'}</p>
                </div>
                
                <Table>
                  <TableCaption>
                    Version {versionDetail.version} - 
                    {recordType === 'asset' 
                      ? `Asset: ${(versionDetail as AssetFmecaHistory).tagNumber}` 
                      : `System: ${(versionDetail as SystemFmecaHistory).systemName}`}
                  </TableCaption>
                  <TableBody>
                    {recordType === 'asset' ? (
                      <>
                        <TableRow>
                          <TableCell className="font-medium">Tag Number</TableCell>
                          <TableCell>{(versionDetail as AssetFmecaHistory).tagNumber}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Asset Description</TableCell>
                          <TableCell>{(versionDetail as AssetFmecaHistory).assetDescription}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Asset Function</TableCell>
                          <TableCell>{(versionDetail as AssetFmecaHistory).assetFunction}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Component</TableCell>
                          <TableCell>{(versionDetail as AssetFmecaHistory).component}</TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <>
                        <TableRow>
                          <TableCell className="font-medium">System Name</TableCell>
                          <TableCell>{(versionDetail as SystemFmecaHistory).systemName}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">System Description</TableCell>
                          <TableCell>{(versionDetail as SystemFmecaHistory).systemDescription}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Subsystem</TableCell>
                          <TableCell>{(versionDetail as SystemFmecaHistory).subSystem}</TableCell>
                        </TableRow>
                      </>
                    )}
                    
                    {/* Common fields for both types */}
                    <TableRow>
                      <TableCell className="font-medium">Failure Mode</TableCell>
                      <TableCell>{versionDetail.failureMode}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Cause</TableCell>
                      <TableCell>{versionDetail.cause}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Effect</TableCell>
                      <TableCell>{versionDetail.effect}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Severity (S)</TableCell>
                      <TableCell>{versionDetail.severity} - {versionDetail.severityJustification}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Probability (P)</TableCell>
                      <TableCell>{versionDetail.probability} - {versionDetail.probabilityJustification}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Detection (D)</TableCell>
                      <TableCell>{versionDetail.detection} - {versionDetail.detectionJustification}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">RPN</TableCell>
                      <TableCell className="font-bold">{versionDetail.rpn}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Action</TableCell>
                      <TableCell>{versionDetail.action}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Responsibility</TableCell>
                      <TableCell>{versionDetail.responsibility}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Target Date</TableCell>
                      <TableCell>{versionDetail.targetDate}</TableCell>
                    </TableRow>
                    
                    {/* Verification fields with highlight if populated */}
                    <TableRow>
                      <TableCell className="font-medium">Completion Date</TableCell>
                      <TableCell className={versionDetail.completionDate ? "bg-green-50" : ""}>
                        {versionDetail.completionDate || 'Not completed'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Verified By</TableCell>
                      <TableCell className={versionDetail.verifiedBy ? "bg-green-50" : ""}>
                        {versionDetail.verifiedBy || 'Not verified'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Effectiveness Verified</TableCell>
                      <TableCell className={versionDetail.effectivenessVerified ? "bg-green-50" : ""}>
                        {versionDetail.effectivenessVerified || 'Not verified'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Comments</TableCell>
                      <TableCell>{versionDetail.comments || 'No comments'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-4 border rounded-md">
                Select a version to view details
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-4 border rounded-md">
            No history records found for this FMECA record
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// History button component to show the history dialog
interface FmecaHistoryButtonProps {
  recordId: number;
  recordType: 'asset' | 'system';
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  iconOnly?: boolean;
}

export const FmecaHistoryButton: React.FC<FmecaHistoryButtonProps> = ({ 
  recordId, 
  recordType,
  variant = "outline",
  iconOnly = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const handleOpenHistory = () => {
    if (recordId <= 0) {
      toast({
        title: "Cannot view history",
        description: "This record must be saved first before viewing history.",
        variant: "destructive"
      });
      return;
    }
    setIsDialogOpen(true);
  };
  
  return (
    <>
      <Button 
        variant={variant} 
        size="sm" 
        onClick={handleOpenHistory}
        className={iconOnly ? "" : "gap-1"}
      >
        <History className="h-4 w-4" />
        {!iconOnly && <span>History</span>}
      </Button>
      
      {isDialogOpen && (
        <FmecaHistoryDialog
          recordId={recordId}
          recordType={recordType}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
};