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
  const [editedRow, setEditedRow] = useState<any>(rowData);
  
  if (!rowData) return null;
  
  const handleChange = (field: string, value: any) => {
    setEditedRow({
      ...editedRow,
      [field]: value
    });
  };
  
  const handleRatingChange = (field: 'severity' | 'probability' | 'detection', value: number) => {
    setEditedRow({
      ...editedRow,
      [field]: value,
      rpn: field === 'severity' ? value * editedRow.probability * editedRow.detection :
           field === 'probability' ? editedRow.severity * value * editedRow.detection :
           editedRow.severity * editedRow.probability * value
    });
  };
  
  const handleSave = () => {
    onSave(editedRow);
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
          {rowType === 'asset' ? (
            <>
              <div className="col-span-2">
                <Label htmlFor="component" className="text-right">
                  Component
                </Label>
                <Input
                  id="component"
                  value={editedRow.component}
                  onChange={(e) => handleChange('component', e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <Label htmlFor="subsystem" className="text-right">
                  Subsystem
                </Label>
                <Input
                  id="subsystem"
                  value={editedRow.subsystem}
                  onChange={(e) => handleChange('subsystem', e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          )}
          
          <div className="col-span-2">
            <Label htmlFor="failureMode" className="text-right">
              Failure Mode
            </Label>
            <Input
              id="failureMode"
              value={editedRow.failureMode}
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
              value={editedRow.cause}
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
              value={editedRow.effect}
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
              value={editedRow.severity.toString()}
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
              value={editedRow.severityJustification}
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
              value={editedRow.probability.toString()}
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
              value={editedRow.probabilityJustification}
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
              value={editedRow.detection.toString()}
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
              value={editedRow.detectionJustification}
              onChange={(e) => handleChange('detectionJustification', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="rpn" className="text-right">
              RPN (Auto-calculated)
            </Label>
            <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
              <span id="calculated-rpn" className="font-bold">{editedRow.rpn}</span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="action" className="text-right">
              Action Required
            </Label>
            <Input
              id="action"
              value={editedRow.action}
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
              value={editedRow.responsibility}
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
              value={editedRow.targetDate}
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
              value={editedRow.completionDate || ''}
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
              value={editedRow.verifiedBy || ''}
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
              value={editedRow.effectivenessVerified || ''}
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
              value={editedRow.comments}
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
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
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
            description: "The uploaded file does not contain valid FMECA data",
            variant: "destructive"
          });
          return;
        }
        
        // Process imported data
        const processedData = jsonData.map((item: any) => {
          // Generate new IDs for imported items
          return {
            ...item,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            rpn: (item.severity || 5) * (item.probability || 5) * (item.detection || 5)
          };
        });
        
        onImport(processedData);
        
        toast({
          title: "Import Successful",
          description: `${processedData.length} FMECA rows imported`,
        });
        
        // Reset the file input
        event.target.value = '';
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
  };
  
  return (
    <div className="flex space-x-4 my-4">
      <Button variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        Export to Excel
      </Button>
      
      <div className="relative">
        <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Import from Excel
        </Button>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImport}
          onClick={(e) => (e.currentTarget.value = '')}
        />
      </div>
    </div>
  );
};