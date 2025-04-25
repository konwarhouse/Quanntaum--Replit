import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Download, Upload, Pencil } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

// Define component props and interfaces
interface EditRowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: AssetFmecaRow | SystemFmecaRow | null;
  onSave: (updatedRow: AssetFmecaRow | SystemFmecaRow) => void;
  rowType: 'asset' | 'system';
}

interface AssetFmecaRow {
  id: string;
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
  effectivenessVerified?: 'yes' | 'no' | 'partial' | '';
  comments: string;
}

interface SystemFmecaRow {
  id: string;
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
  effectivenessVerified?: 'yes' | 'no' | 'partial' | '';
  comments: string;
}

export const EditRowDialog: React.FC<EditRowDialogProps> = ({ 
  isOpen, 
  onClose, 
  rowData, 
  onSave,
  rowType 
}) => {
  // Use separate state values for each type to avoid type casting errors
  const [assetRow, setAssetRow] = useState<AssetFmecaRow | null>(null);
  const [systemRow, setSystemRow] = useState<SystemFmecaRow | null>(null);
  
  // Initialize appropriate state based on rowType when component opens or rowData changes
  React.useEffect(() => {
    if (!rowData || !isOpen) return;
    
    if (rowType === 'asset') {
      setAssetRow(rowData as AssetFmecaRow);
    } else {
      setSystemRow(rowData as SystemFmecaRow);
    }
  }, [rowData, rowType, isOpen]);
  
  // Return null if we don't have data yet or dialog is not open
  if (!rowData || (rowType === 'asset' && !assetRow) || (rowType === 'system' && !systemRow)) {
    return null;
  }
  
  // Generic change handler for both types
  const handleChange = (field: string, value: any) => {
    if (rowType === 'asset' && assetRow) {
      setAssetRow({
        ...assetRow,
        [field]: value
      });
    } else if (rowType === 'system' && systemRow) {
      setSystemRow({
        ...systemRow,
        [field]: value
      });
    }
  };
  
  // Rating change handler that recalculates RPN
  const handleRatingChange = (field: 'severity' | 'probability' | 'detection', value: number) => {
    if (rowType === 'asset' && assetRow) {
      setAssetRow({
        ...assetRow,
        [field]: value,
        rpn: field === 'severity' ? value * assetRow.probability * assetRow.detection :
             field === 'probability' ? assetRow.severity * value * assetRow.detection :
             assetRow.severity * assetRow.probability * value
      });
    } else if (rowType === 'system' && systemRow) {
      setSystemRow({
        ...systemRow,
        [field]: value,
        rpn: field === 'severity' ? value * systemRow.probability * systemRow.detection :
             field === 'probability' ? systemRow.severity * value * systemRow.detection :
             systemRow.severity * systemRow.probability * value
      });
    }
  };
  
  // Save handler that passes the correct type back
  const handleSave = () => {
    if (rowType === 'asset' && assetRow) {
      onSave(assetRow);
    } else if (rowType === 'system' && systemRow) {
      onSave(systemRow);
    }
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit FMECA Row</DialogTitle>
          <DialogDescription>
            Make changes to the FMECA row. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {rowType === 'asset' && assetRow ? (
            <>
              <div className="col-span-2">
                <Label htmlFor="component" className="text-right">
                  Component
                </Label>
                <Input
                  id="component"
                  value={assetRow.component}
                  onChange={(e) => handleChange('component', e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          ) : systemRow ? (
            <>
              <div className="col-span-2">
                <Label htmlFor="subsystem" className="text-right">
                  Subsystem
                </Label>
                <Input
                  id="subsystem"
                  value={systemRow.subsystem}
                  onChange={(e) => handleChange('subsystem', e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          ) : null}
          
          <div className="col-span-2">
            <Label htmlFor="failureMode" className="text-right">
              Failure Mode
            </Label>
            <Input
              id="failureMode"
              value={rowType === 'asset' && assetRow ? assetRow.failureMode : systemRow?.failureMode || ''}
              onChange={(e) => handleChange('failureMode', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="col-span-1">
            <Label htmlFor="cause" className="text-right">
              Cause
            </Label>
            <Input
              id="cause"
              value={rowType === 'asset' && assetRow ? assetRow.cause : systemRow?.cause || ''}
              onChange={(e) => handleChange('cause', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="col-span-1">
            <Label htmlFor="effect" className="text-right">
              Effect
            </Label>
            <Input
              id="effect"
              value={rowType === 'asset' && assetRow ? assetRow.effect : systemRow?.effect || ''}
              onChange={(e) => handleChange('effect', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="severity" className="text-right">
              Severity (S)
            </Label>
            <Select 
              onValueChange={(value) => handleRatingChange('severity', parseInt(value))}
              value={(rowType === 'asset' && assetRow ? assetRow.severity : systemRow?.severity || 1).toString()}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value} - {value < 3 ? 'Minor' : value < 6 ? 'Moderate' : value < 9 ? 'Significant' : 'Critical'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Label htmlFor="severityJustification" className="text-right mt-2">
              Severity Justification
            </Label>
            <Textarea
              id="severityJustification"
              value={rowType === 'asset' && assetRow ? assetRow.severityJustification : systemRow?.severityJustification || ''}
              onChange={(e) => handleChange('severityJustification', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="probability" className="text-right">
              Probability (P)
            </Label>
            <Select 
              onValueChange={(value) => handleRatingChange('probability', parseInt(value))}
              value={(rowType === 'asset' && assetRow ? assetRow.probability : systemRow?.probability || 1).toString()}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value} - {value < 3 ? 'Remote' : value < 6 ? 'Occasional' : value < 9 ? 'Likely' : 'Almost Certain'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Label htmlFor="probabilityJustification" className="text-right mt-2">
              Probability Justification
            </Label>
            <Textarea
              id="probabilityJustification"
              value={rowType === 'asset' && assetRow ? assetRow.probabilityJustification : systemRow?.probabilityJustification || ''}
              onChange={(e) => handleChange('probabilityJustification', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="detection" className="text-right">
              Detection (D)
            </Label>
            <Select 
              onValueChange={(value) => handleRatingChange('detection', parseInt(value))}
              value={(rowType === 'asset' && assetRow ? assetRow.detection : systemRow?.detection || 1).toString()}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value} - {value < 3 ? 'Almost Certain' : value < 6 ? 'High' : value < 9 ? 'Low' : 'Almost Impossible'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Label htmlFor="detectionJustification" className="text-right mt-2">
              Detection Justification
            </Label>
            <Textarea
              id="detectionJustification"
              value={rowType === 'asset' && assetRow ? assetRow.detectionJustification : systemRow?.detectionJustification || ''}
              onChange={(e) => handleChange('detectionJustification', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="rpn" className="text-right">
              RPN (Auto-calculated)
            </Label>
            <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
              <span id="calculated-rpn" className="font-bold">
                {rowType === 'asset' && assetRow ? assetRow.rpn : systemRow?.rpn || 0}
              </span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="action" className="text-right">
              Action Required
            </Label>
            <Input
              id="action"
              value={rowType === 'asset' && assetRow ? assetRow.action : systemRow?.action || ''}
              onChange={(e) => handleChange('action', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="responsibility" className="text-right">
              Responsibility
            </Label>
            <Input
              id="responsibility"
              value={rowType === 'asset' && assetRow ? assetRow.responsibility : systemRow?.responsibility || ''}
              onChange={(e) => handleChange('responsibility', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="targetDate" className="text-right">
              Target Date
            </Label>
            <Input
              id="targetDate"
              type="date"
              value={rowType === 'asset' && assetRow ? assetRow.targetDate : systemRow?.targetDate || ''}
              onChange={(e) => handleChange('targetDate', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="completionDate" className="text-right">
              Completion Date
            </Label>
            <Input
              id="completionDate"
              type="date"
              value={(rowType === 'asset' && assetRow ? assetRow.completionDate : systemRow?.completionDate) || ''}
              onChange={(e) => handleChange('completionDate', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="verifiedBy" className="text-right">
              Verified By
            </Label>
            <Input
              id="verifiedBy"
              value={(rowType === 'asset' && assetRow ? assetRow.verifiedBy : systemRow?.verifiedBy) || ''}
              onChange={(e) => handleChange('verifiedBy', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="effectivenessVerified" className="text-right">
              Effectiveness Verified
            </Label>
            <Select 
              onValueChange={(value) => handleChange('effectivenessVerified', value)}
              value={(rowType === 'asset' && assetRow ? assetRow.effectivenessVerified : systemRow?.effectivenessVerified) || ''}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not Verified</SelectItem>
                <SelectItem value="yes">Yes - Fully Effective</SelectItem>
                <SelectItem value="partial">Partial - Requires Additional Actions</SelectItem>
                <SelectItem value="no">No - Action Was Not Effective</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className={rowType === 'asset' ? "col-span-2" : ""}>
            <Label htmlFor="comments" className="text-right">
              Comments
            </Label>
            <Input
              id="comments"
              value={rowType === 'asset' && assetRow ? assetRow.comments : systemRow?.comments || ''}
              onChange={(e) => handleChange('comments', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Excel Export/Import Component
interface ExcelToolsProps {
  rows: AssetFmecaRow[] | SystemFmecaRow[];
  onImport: (rows: any[]) => void;
  rowType: 'asset' | 'system';
  headerData?: any;
}

export const ExcelTools: React.FC<ExcelToolsProps> = ({ 
  rows, 
  onImport,
  rowType,
  headerData
}) => {
  
  const handleExport = () => {
    try {
      let worksheet;
      const workbook = XLSX.utils.book_new();
      
      // Create a template with headers if there are no rows
      if (rows.length === 0) {
        const headers = rowType === 'asset' ? 
          {
            tagNumber: headerData?.tagNumber || '',
            assetDescription: headerData?.description || '',
            assetFunction: headerData?.function || '',
            component: '',
            failureMode: '',
            cause: '',
            effect: '',
            severity: '',
            severityJustification: '',
            probability: '',
            probabilityJustification: '',
            detection: '',
            detectionJustification: '',
            rpn: '',
            action: '',
            responsibility: '',
            targetDate: '',
            completionDate: '',
            verifiedBy: '',
            effectivenessVerified: '',
            comments: ''
          } :
          {
            systemName: headerData?.name || '',
            systemFunction: headerData?.function || '',
            subsystem: '',
            failureMode: '',
            cause: '',
            effect: '',
            severity: '',
            severityJustification: '',
            probability: '',
            probabilityJustification: '',
            detection: '',
            detectionJustification: '',
            rpn: '',
            action: '',
            responsibility: '',
            targetDate: '',
            completionDate: '',
            verifiedBy: '',
            effectivenessVerified: '',
            comments: ''
          };
        
        // Create a worksheet with just the headers
        worksheet = XLSX.utils.json_to_sheet([headers]);
      } else {
        // Normal case - export existing data
        worksheet = XLSX.utils.json_to_sheet(rows);
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, `${rowType}-fmeca`);
      
      // Generate file name with timestamp
      const fileName = `${rowType}-fmeca-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Export to file
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Export Successful",
        description: `FMECA data exported to ${fileName}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting data",
        variant: "destructive"
      });
    }
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate imported data
        const isValidData = jsonData.every((item: any) => {
          if (rowType === 'asset') {
            return item.component && item.failureMode;
          } else {
            return item.subsystem && item.failureMode;
          }
        });
        
        if (!isValidData) {
          toast({
            title: "Import Failed",
            description: "The imported file does not contain valid FMECA data",
            variant: "destructive"
          });
          return;
        }
        
        // Process the imported data
        const processedData = jsonData.map((item: any) => {
          if (rowType === 'asset') {
            return {
              id: crypto.randomUUID(),
              tagNumber: headerData?.tagNumber || item.tagNumber || '',
              assetDescription: headerData?.description || item.assetDescription || '',
              assetFunction: headerData?.function || item.assetFunction || '',
              component: item.component || '',
              failureMode: item.failureMode || '',
              cause: item.cause || '',
              effect: item.effect || '',
              severity: Number(item.severity) || 1,
              severityJustification: item.severityJustification || '',
              probability: Number(item.probability) || 1,
              probabilityJustification: item.probabilityJustification || '',
              detection: Number(item.detection) || 1,
              detectionJustification: item.detectionJustification || '',
              rpn: Number(item.rpn) || 1,
              action: item.action || '',
              responsibility: item.responsibility || '',
              targetDate: item.targetDate || new Date().toISOString().split('T')[0],
              completionDate: item.completionDate || '',
              verifiedBy: item.verifiedBy || '',
              effectivenessVerified: item.effectivenessVerified || '',
              comments: item.comments || ''
            };
          } else {
            return {
              id: crypto.randomUUID(),
              systemId: headerData?.systemId || item.systemId || '',
              systemName: headerData?.name || item.systemName || '',
              systemFunction: headerData?.function || item.systemFunction || '',
              subsystem: item.subsystem || '',
              failureMode: item.failureMode || '',
              cause: item.cause || '',
              effect: item.effect || '',
              severity: Number(item.severity) || 1,
              severityJustification: item.severityJustification || '',
              probability: Number(item.probability) || 1,
              probabilityJustification: item.probabilityJustification || '',
              detection: Number(item.detection) || 1,
              detectionJustification: item.detectionJustification || '',
              rpn: Number(item.rpn) || 1,
              action: item.action || '',
              responsibility: item.responsibility || '',
              targetDate: item.targetDate || new Date().toISOString().split('T')[0],
              completionDate: item.completionDate || '',
              verifiedBy: item.verifiedBy || '',
              effectivenessVerified: item.effectivenessVerified || '',
              comments: item.comments || ''
            };
          }
        });
        
        onImport(processedData);
        
        toast({
          title: "Import Successful",
          description: `${processedData.length} FMECA rows imported successfully`,
        });
      } catch (error) {
        console.error("Import error:", error);
        toast({
          title: "Import Failed",
          description: "An error occurred while importing data",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
    
    // Reset the input
    event.target.value = '';
  };
  
  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={handleExport}
        className="flex items-center"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Excel
      </Button>
      
      <div className="relative">
        <Input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleImport}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
        <Button
          variant="outline"
          className="flex items-center"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
        </Button>
      </div>
    </div>
  );
};