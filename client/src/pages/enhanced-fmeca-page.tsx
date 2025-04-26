import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  FileText, 
  Database, 
  Plus, 
  Trash, 
  Pencil, 
  CheckCircle2,
  Upload,
  Download,
  History
} from "lucide-react";
import { FmecaHistoryButton } from "@/components/fmeca/FmecaHistory";
import { FmecaActionButtons } from "@/components/fmeca/FmecaWithHistoryButtons";
import { AddHistoryButton } from "@/components/fmeca/AddFmecaHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from 'xlsx';

// FMECA Component Types
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

// Helper functions for RPN classification
const getRiskLevelByRpn = (rpn: number): string => {
  if (rpn >= 200) return 'High Risk';
  if (rpn >= 125) return 'Medium Risk';
  return 'Low Risk';
};

const getColorClassByRpn = (rpn: number): string => {
  if (rpn >= 200) return 'bg-red-100 text-red-800 hover:bg-red-200';
  if (rpn >= 125) return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
  return 'bg-green-100 text-green-800 hover:bg-green-200';
};

const getButtonColorByRpn = (rpn: number): string => {
  if (rpn >= 200) return 'bg-red-500 hover:bg-red-600';
  if (rpn >= 125) return 'bg-amber-500 hover:bg-amber-600';
  return 'bg-green-500 hover:bg-green-600';
};

const getColorByRpn = (rpn: number): string => {
  if (rpn >= 200) return 'text-red-600';
  if (rpn >= 125) return 'text-amber-600';
  return 'text-green-600';
};

const getEffectivenessColor = (effectiveness?: string): string => {
  if (!effectiveness) return 'bg-gray-100 text-gray-800';
  if (effectiveness === 'yes') return 'bg-green-100 text-green-800';
  if (effectiveness === 'partial') return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
};

const getEffectivenessText = (effectiveness?: string): string => {
  if (!effectiveness) return 'Not Verified';
  if (effectiveness === 'yes') return 'Fully Effective';
  if (effectiveness === 'partial') return 'Partially Effective';
  return 'Not Effective';
};

// Edit Dialog Component
interface EditRowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: AssetFmecaRow | SystemFmecaRow | null;
  onSave: (updatedRow: AssetFmecaRow | SystemFmecaRow) => void;
  rowType: 'asset' | 'system';
}

const EditRowDialog: React.FC<EditRowDialogProps> = ({ 
  isOpen, 
  onClose, 
  rowData, 
  onSave,
  rowType 
}) => {
  const [editedRow, setEditedRow] = useState<AssetFmecaRow | SystemFmecaRow | null>(null);
  
  // Update editedRow whenever rowData changes or dialog opens
  useEffect(() => {
    if (rowData) {
      setEditedRow(JSON.parse(JSON.stringify(rowData)));
    }
  }, [rowData, isOpen]);
  
  if (!editedRow) return null;
  
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
                  value={'component' in editedRow ? editedRow.component : ''}
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
                  value={'subsystem' in editedRow ? editedRow.subsystem : ''}
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
                <SelectItem value="none">Not Verified</SelectItem>
                <SelectItem value="yes">Yes - Fully Effective</SelectItem>
                <SelectItem value="partial">Partial - Requires Additional Actions</SelectItem>
                <SelectItem value="no">No - Action Was Not Effective</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-2">
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

// Excel Import/Export Tools
interface ExcelToolsProps {
  rows: AssetFmecaRow[] | SystemFmecaRow[];
  onImport: (rows: any[]) => void;
  rowType: 'asset' | 'system';
  headerData?: any;
}

const ExcelTools: React.FC<ExcelToolsProps> = ({ 
  rows, 
  onImport,
  rowType,
  headerData
}) => {
  const { toast } = useToast();
  
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
        <Button variant="outline" onClick={() => document.getElementById(`file-upload-${rowType}`)?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Import from Excel
        </Button>
        <input
          id={`file-upload-${rowType}`}
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

// Main FMECA Manager Component 
interface FmecaManagerProps {
  rows: AssetFmecaRow[] | SystemFmecaRow[];
  onUpdateRows: (rows: AssetFmecaRow[] | SystemFmecaRow[]) => void;
  rowType: 'asset' | 'system';
  headerData?: any;
  onAddRow?: () => void;
}

const FmecaManager: React.FC<FmecaManagerProps> = ({
  rows,
  onUpdateRows,
  rowType,
  headerData,
  onAddRow
}) => {
  const [editingRow, setEditingRow] = useState<AssetFmecaRow | SystemFmecaRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const handleEditRow = (row: AssetFmecaRow | SystemFmecaRow) => {
    // Create a deep copy of the row to prevent reference issues
    console.log('Editing row:', row);
    setEditingRow(JSON.parse(JSON.stringify(row)));
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteRow = (id: string) => {
    if (window.confirm('Are you sure you want to delete this row?')) {
      const updatedRows = rows.filter(row => row.id !== id);
      if (rowType === 'asset') {
        onUpdateRows(updatedRows as AssetFmecaRow[]);
      } else {
        onUpdateRows(updatedRows as SystemFmecaRow[]);
      }
      
      toast({
        title: "Row Deleted",
        description: "FMECA row has been deleted"
      });
    }
  };
  
  const handleSaveEdit = (updatedRow: AssetFmecaRow | SystemFmecaRow) => {
    let updatedRows;
    if (rowType === 'asset') {
      updatedRows = (rows as AssetFmecaRow[]).map(row => 
        row.id === updatedRow.id ? updatedRow as AssetFmecaRow : row
      );
      onUpdateRows(updatedRows);
    } else {
      updatedRows = (rows as SystemFmecaRow[]).map(row => 
        row.id === updatedRow.id ? updatedRow as SystemFmecaRow : row
      );
      onUpdateRows(updatedRows);
    }
    
    toast({
      title: "Row Updated",
      description: "FMECA row has been updated successfully"
    });
  };
  
  const handleImport = (importedRows: any[]) => {
    if (rowType === 'asset') {
      // If we're handling asset rows
      onUpdateRows([...rows, ...importedRows] as AssetFmecaRow[]);
    } else {
      // If we're handling system rows
      onUpdateRows([...rows, ...importedRows] as SystemFmecaRow[]);
    }
  };
  
  // Render enhanced table for either asset or system FMECA
  const renderTable = () => {
    if (rowType === 'asset') {
      const assetRows = rows as AssetFmecaRow[];
      
      return (
        <div className="space-y-6">
          {Array.from(new Set(assetRows.map(row => row.tagNumber))).map(tagNumber => {
            const assetRowsForTag = assetRows.filter(row => row.tagNumber === tagNumber);
            const firstRow = assetRowsForTag[0];
            
            return (
              <div key={tagNumber} className="border rounded-md overflow-hidden">
                {/* Asset Information Header */}
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-medium text-blue-800">Tag Number:</h3>
                      <p className="font-bold">{firstRow.tagNumber}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-800">Asset Description:</h3>
                      <p>{firstRow.assetDescription}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-800">Function:</h3>
                      <p>{firstRow.assetFunction}</p>
                    </div>
                  </div>
                </div>
                
                {/* Asset Components Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-gray-300 p-2 text-left">Component</th>
                        <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                        <th className="border border-gray-300 p-2 text-left">Cause</th>
                        <th className="border border-gray-300 p-2 text-left">Effect</th>
                        <th className="border border-gray-300 p-2 text-left">RPN</th>
                        <th className="border border-gray-300 p-2 text-left">Risk Level</th>
                        <th className="border border-gray-300 p-2 text-left">Action</th>
                        <th className="border border-gray-300 p-2 text-left">Responsibility</th>
                        <th className="border border-gray-300 p-2 text-left">Status</th>
                        <th className="border border-gray-300 p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetRowsForTag.map((row) => (
                        <tr key={row.id}>
                          <td className="border border-gray-300 p-2">{row.component}</td>
                          <td className="border border-gray-300 p-2">{row.failureMode}</td>
                          <td className="border border-gray-300 p-2">{row.cause}</td>
                          <td className="border border-gray-300 p-2">{row.effect}</td>
                          <td className="border border-gray-300 p-2">
                            <span className={`font-bold ${getColorByRpn(row.rpn)}`}>
                              {row.rpn}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge className={getColorClassByRpn(row.rpn)}>
                              {getRiskLevelByRpn(row.rpn)}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 p-2">{row.action}</td>
                          <td className="border border-gray-300 p-2">{row.responsibility}</td>
                          <td className="border border-gray-300 p-2">
                            {row.completionDate ? (
                              <div className="space-y-1">
                                <div>
                                  <span className="text-xs font-medium">Completed:</span> {row.completionDate}
                                </div>
                                {row.verifiedBy && (
                                  <div>
                                    <span className="text-xs font-medium">By:</span> {row.verifiedBy}
                                  </div>
                                )}
                                <Badge className={getEffectivenessColor(row.effectivenessVerified)}>
                                  {getEffectivenessText(row.effectivenessVerified)}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <div className="flex space-x-2 justify-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditRow(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteRow(row.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      // System FMECA Table
      const systemRows = rows as SystemFmecaRow[];
      
      return (
        <div className="space-y-6">
          {Array.from(new Set(systemRows.map(row => row.systemName))).map(systemName => {
            const systemRowsForName = systemRows.filter(row => row.systemName === systemName);
            const firstRow = systemRowsForName[0];
            
            return (
              <div key={systemName} className="border rounded-md overflow-hidden">
                {/* System Information Header */}
                <div className="p-4 bg-green-50 border-b border-green-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-green-800">System Name:</h3>
                      <p className="font-bold">{firstRow.systemName}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-green-800">Function:</h3>
                      <p>{firstRow.systemFunction}</p>
                    </div>
                  </div>
                </div>
                
                {/* System Components Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-gray-300 p-2 text-left">Subsystem</th>
                        <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                        <th className="border border-gray-300 p-2 text-left">Cause</th>
                        <th className="border border-gray-300 p-2 text-left">Effect</th>
                        <th className="border border-gray-300 p-2 text-left">RPN</th>
                        <th className="border border-gray-300 p-2 text-left">Risk Level</th>
                        <th className="border border-gray-300 p-2 text-left">Action</th>
                        <th className="border border-gray-300 p-2 text-left">Responsibility</th>
                        <th className="border border-gray-300 p-2 text-left">Status</th>
                        <th className="border border-gray-300 p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemRowsForName.map((row) => (
                        <tr key={row.id}>
                          <td className="border border-gray-300 p-2">{row.subsystem}</td>
                          <td className="border border-gray-300 p-2">{row.failureMode}</td>
                          <td className="border border-gray-300 p-2">{row.cause}</td>
                          <td className="border border-gray-300 p-2">{row.effect}</td>
                          <td className="border border-gray-300 p-2">
                            <span className={`font-bold ${getColorByRpn(row.rpn)}`}>
                              {row.rpn}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge className={getColorClassByRpn(row.rpn)}>
                              {getRiskLevelByRpn(row.rpn)}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 p-2">{row.action}</td>
                          <td className="border border-gray-300 p-2">{row.responsibility}</td>
                          <td className="border border-gray-300 p-2">
                            {row.completionDate ? (
                              <div className="space-y-1">
                                <div>
                                  <span className="text-xs font-medium">Completed:</span> {row.completionDate}
                                </div>
                                {row.verifiedBy && (
                                  <div>
                                    <span className="text-xs font-medium">By:</span> {row.verifiedBy}
                                  </div>
                                )}
                                <Badge className={getEffectivenessColor(row.effectivenessVerified)}>
                                  {getEffectivenessText(row.effectivenessVerified)}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <div className="flex space-x-2 justify-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditRow(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteRow(row.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  };
  
  return (
    <div>
      {/* Excel Import/Export Tools */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">FMECA Data Tools</h3>
          {onAddRow && (
            <Button onClick={onAddRow}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Row
            </Button>
          )}
        </div>
        <ExcelTools 
          rows={rows}
          onImport={handleImport}
          rowType={rowType}
          headerData={headerData}
        />
      </div>
      
      {/* FMECA Table */}
      {rows.length > 0 ? (
        renderTable()
      ) : (
        <div className="text-center p-8 border border-dashed rounded-md">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No FMECA Rows</h3>
          <p className="text-muted-foreground">
            Add rows or import from Excel to get started.
          </p>
        </div>
      )}
      
      {/* Edit Dialog */}
      <EditRowDialog 
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        rowData={editingRow}
        onSave={handleSaveEdit}
        rowType={rowType}
      />
    </div>
  );
};

// Add New Row Dialog Component
interface AddRowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRow: (newRow: AssetFmecaRow | SystemFmecaRow) => void;
  rowType: 'asset' | 'system';
  assetInfo?: {
    tagNumber: string;
    description: string;
    function: string;
  };
  systemInfo?: {
    name: string;
    function: string;
  };
}

const AddRowDialog: React.FC<AddRowDialogProps> = ({
  isOpen,
  onClose,
  onAddRow,
  rowType,
  assetInfo,
  systemInfo
}) => {
  const { toast } = useToast();
  
  // Form state
  const [component, setComponent] = useState("");
  const [subsystem, setSubsystem] = useState("");
  const [failureMode, setFailureMode] = useState("");
  const [cause, setCause] = useState("");
  const [effect, setEffect] = useState("");
  
  const [severity, setSeverity] = useState<number>(5);
  const [severityJustification, setSeverityJustification] = useState("");
  const [probability, setProbability] = useState<number>(5);
  const [probabilityJustification, setProbabilityJustification] = useState("");
  const [detection, setDetection] = useState<number>(5);
  const [detectionJustification, setDetectionJustification] = useState("");
  
  const [action, setAction] = useState("");
  const [responsibility, setResponsibility] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [comments, setComments] = useState("");
  
  const calculateRpn = (): number => {
    return severity * probability * detection;
  };
  
  const handleSubmit = () => {
    // Validate required fields
    if (rowType === 'asset' && !component) {
      toast({
        title: "Component Required",
        description: "Please enter the component name",
        variant: "destructive"
      });
      return;
    }
    
    if (rowType === 'system' && !subsystem) {
      toast({
        title: "Subsystem Required",
        description: "Please enter the subsystem name",
        variant: "destructive"
      });
      return;
    }
    
    if (!failureMode) {
      toast({
        title: "Failure Mode Required",
        description: "Please enter the failure mode",
        variant: "destructive"
      });
      return;
    }
    
    // Validate justification fields
    if (!severityJustification || !probabilityJustification || !detectionJustification) {
      toast({
        title: "Justification Required",
        description: "Please provide justification for all severity, probability, and detection ratings",
        variant: "destructive"
      });
      return;
    }
    
    // Create new row
    if (rowType === 'asset' && assetInfo) {
      const newRow: AssetFmecaRow = {
        id: Date.now().toString(),
        tagNumber: assetInfo.tagNumber,
        assetDescription: assetInfo.description,
        assetFunction: assetInfo.function,
        component,
        failureMode,
        cause,
        effect,
        severity,
        severityJustification,
        probability,
        probabilityJustification,
        detection,
        detectionJustification,
        rpn: calculateRpn(),
        action,
        responsibility,
        targetDate,
        comments
      };
      
      onAddRow(newRow);
    } else if (rowType === 'system' && systemInfo) {
      const newRow: SystemFmecaRow = {
        id: Date.now().toString(),
        systemId: Date.now().toString(),
        systemName: systemInfo.name,
        systemFunction: systemInfo.function,
        subsystem,
        failureMode,
        cause,
        effect,
        severity,
        severityJustification,
        probability,
        probabilityJustification,
        detection,
        detectionJustification,
        rpn: calculateRpn(),
        action,
        responsibility,
        targetDate,
        comments
      };
      
      onAddRow(newRow);
    }
    
    // Reset form
    resetForm();
    onClose();
  };
  
  const resetForm = () => {
    setComponent("");
    setSubsystem("");
    setFailureMode("");
    setCause("");
    setEffect("");
    setSeverity(5);
    setSeverityJustification("");
    setProbability(5);
    setProbabilityJustification("");
    setDetection(5);
    setDetectionJustification("");
    setAction("");
    setResponsibility("");
    setTargetDate("");
    setComments("");
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New FMECA Row</DialogTitle>
          <DialogDescription>
            Add a new failure mode to your FMECA analysis
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {rowType === 'asset' ? (
            <div className="col-span-2">
              <Label htmlFor="add-component">Component</Label>
              <Input
                id="add-component"
                placeholder="e.g., Impeller, Shaft, Bearing"
                value={component}
                onChange={(e) => setComponent(e.target.value)}
              />
            </div>
          ) : (
            <div className="col-span-2">
              <Label htmlFor="add-subsystem">Subsystem</Label>
              <Input
                id="add-subsystem"
                placeholder="e.g., Pump Circuit, Heat Exchanger"
                value={subsystem}
                onChange={(e) => setSubsystem(e.target.value)}
              />
            </div>
          )}
          
          <div className="col-span-2">
            <Label htmlFor="add-failure-mode">Failure Mode</Label>
            <Input
              id="add-failure-mode"
              placeholder="e.g., Wear, Fracture, Corrosion"
              value={failureMode}
              onChange={(e) => setFailureMode(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-cause">Cause</Label>
            <Input
              id="add-cause"
              placeholder="e.g., Misalignment, Overload"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-effect">Effect</Label>
            <Input
              id="add-effect"
              placeholder="e.g., Reduced flow, Vibration"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-severity">Severity (S)</Label>
            <Select 
              value={severity.toString()} 
              onValueChange={(value) => setSeverity(parseInt(value))}
            >
              <SelectTrigger>
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
            
            <Label htmlFor="add-severity-justification" className="mt-2">
              Severity Justification
            </Label>
            <Textarea
              id="add-severity-justification"
              placeholder="Justify your severity rating"
              value={severityJustification}
              onChange={(e) => setSeverityJustification(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-probability">Probability (P)</Label>
            <Select 
              value={probability.toString()} 
              onValueChange={(value) => setProbability(parseInt(value))}
            >
              <SelectTrigger>
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
            
            <Label htmlFor="add-probability-justification" className="mt-2">
              Probability Justification
            </Label>
            <Textarea
              id="add-probability-justification"
              placeholder="Justify your probability rating"
              value={probabilityJustification}
              onChange={(e) => setProbabilityJustification(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-detection">Detection (D)</Label>
            <Select 
              value={detection.toString()} 
              onValueChange={(value) => setDetection(parseInt(value))}
            >
              <SelectTrigger>
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
            
            <Label htmlFor="add-detection-justification" className="mt-2">
              Detection Justification
            </Label>
            <Textarea
              id="add-detection-justification"
              placeholder="Justify your detection rating"
              value={detectionJustification}
              onChange={(e) => setDetectionJustification(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="calculated-add-rpn">RPN (Auto-calculated)</Label>
            <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
              <span id="calculated-add-rpn" className={`font-bold ${getColorByRpn(calculateRpn())}`}>
                {calculateRpn()} - {getRiskLevelByRpn(calculateRpn())}
              </span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="add-action">Action Required</Label>
            <Input
              id="add-action"
              placeholder="e.g., Replace component, Implement inspection"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-responsibility">Responsibility</Label>
            <Input
              id="add-responsibility"
              placeholder="e.g., Maintenance Manager, Reliability Engineer"
              value={responsibility}
              onChange={(e) => setResponsibility(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-target-date">Target Date</Label>
            <Input
              id="add-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="add-comments">Comments</Label>
            <Input
              id="add-comments"
              placeholder="Additional notes or comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className={getButtonColorByRpn(calculateRpn())}
            onClick={handleSubmit}
          >
            Add FMECA Row
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main FMECA Page Component
const EnhancedFmecaPage = () => {
  const [selectedTab, setSelectedTab] = useState("asset-level");
  const { toast } = useToast();
  
  // Asset-level FMECA form state
  const [assetTagNumber, setAssetTagNumber] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetFunction, setAssetFunction] = useState("");
  const [assetRows, setAssetRows] = useState<AssetFmecaRow[]>([]);
  
  // System-level FMECA form state
  const [systemName, setSystemName] = useState("");
  const [systemDescription, setSystemDescription] = useState("");
  const [systemFunction, setSystemFunction] = useState("");
  const [systemRows, setSystemRows] = useState<SystemFmecaRow[]>([]);
  
  // Dialog control
  const [isAddAssetRowDialogOpen, setIsAddAssetRowDialogOpen] = useState(false);
  const [isAddSystemRowDialogOpen, setIsAddSystemRowDialogOpen] = useState(false);
  
  // Example data for quick testing
  const useAssetExample = () => {
    setAssetTagNumber("PMP-101");
    setAssetDescription("Centrifugal Pump");
    setAssetFunction("Transfer fluid from tank A to B");
  };
  
  const useSystemExample = () => {
    setSystemName("Cooling Water System");
    setSystemDescription("Secondary cooling circuit");
    setSystemFunction("Remove heat from process equipment");
  };
  
  // Handlers for adding rows
  const handleAddAssetRow = (newRow: AssetFmecaRow | SystemFmecaRow) => {
    // Type guard to ensure we're working with AssetFmecaRow
    if ('tagNumber' in newRow) {
      setAssetRows([...assetRows, newRow as AssetFmecaRow]);
      
      toast({
        title: "Success",
        description: "Asset FMECA row added successfully"
      });
    }
  };
  
  const handleAddSystemRow = (newRow: AssetFmecaRow | SystemFmecaRow) => {
    // Type guard to ensure we're working with SystemFmecaRow
    if ('systemName' in newRow) {
      setSystemRows([...systemRows, newRow as SystemFmecaRow]);
      
      toast({
        title: "Success",
        description: "System FMECA row added successfully"
      });
    }
  };
  
  // Handler for saving FMECA
  const handleSaveFmeca = () => {
    if (selectedTab === "asset-level" && assetRows.length === 0) {
      toast({
        title: "Empty FMECA",
        description: "Please add at least one row before saving",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedTab === "system-level" && systemRows.length === 0) {
      toast({
        title: "Empty System FMECA",
        description: "Please add at least one row before saving",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "FMECA Saved",
      description: `Your ${selectedTab === "asset-level" ? "Asset" : "System"} FMECA analysis has been saved successfully`
    });
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Enhanced FMECA Analysis</h1>
      <p className="text-muted-foreground">
        Failure Mode, Effects, and Criticality Analysis (FMECA) is a methodology for analyzing potential failure modes 
        within a system to classify by severity and likelihood of failure.
      </p>
      
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asset-level">Asset-Level FMECA</TabsTrigger>
          <TabsTrigger value="system-level">System-Level FMECA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="asset-level">
          <Card>
            <CardHeader>
              <CardTitle>Asset-Level FMECA</CardTitle>
              <CardDescription>
                Analyze failure modes at the individual asset level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* RPN Guide Section */}
              <div className="mb-6 rounded-md bg-blue-50 border border-blue-100">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-blue-800 mb-2">RPN (Risk Priority Number) Guide</h3>
                  <p className="text-sm text-blue-700 mb-2">RPN = Severity × Probability × Detection (Range: 1-1000)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="bg-red-100 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-red-800">High Risk (RPN ≥ 200)</h4>
                      <p className="text-xs text-red-700">Immediate action required. Critical priority for risk mitigation.</p>
                    </div>
                    
                    <div className="bg-amber-100 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-amber-800">Medium Risk (125-200)</h4>
                      <p className="text-xs text-amber-700">Action needed soon. Secondary priority for risk mitigation.</p>
                    </div>
                    
                    <div className="bg-green-100 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-green-800">Low Risk (under 125)</h4>
                      <p className="text-xs text-green-700">Monitor and address during routine maintenance.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Asset Information Section */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-medium">Asset Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="asset-tag-number">Asset Tag Number</Label>
                    <Input 
                      id="asset-tag-number" 
                      placeholder="e.g., PMP-101" 
                      value={assetTagNumber}
                      onChange={(e) => setAssetTagNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-description">Asset Description</Label>
                    <Input 
                      id="asset-description" 
                      placeholder="e.g., Centrifugal Pump" 
                      value={assetDescription}
                      onChange={(e) => setAssetDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-function">Asset Function</Label>
                    <Input 
                      id="asset-function" 
                      placeholder="e.g., Transfer fluid from tank A to B" 
                      value={assetFunction}
                      onChange={(e) => setAssetFunction(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={useAssetExample}
                  >
                    Use Example Asset
                  </Button>
                </div>
              </div>
              
              <div className="p-4 rounded-md border border-blue-200 bg-blue-50 mb-6">
                <div className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Enhanced Editor Features</h4>
                    <ul className="list-disc list-inside text-sm mt-1 text-blue-700 space-y-1">
                      <li>Edit any row with popup editor</li>
                      <li>Track completion date, verification, and effectiveness</li>
                      <li>Export to Excel for reporting and collaboration</li>
                      <li>Import from Excel to quickly add multiple items</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {assetTagNumber ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">FMECA Analysis</h3>
                    <Button 
                      onClick={() => setIsAddAssetRowDialogOpen(true)}
                      className="mb-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Failure Mode
                    </Button>
                  </div>
                  
                  <FmecaManager
                    rows={assetRows}
                    onUpdateRows={(updatedRows) => setAssetRows(updatedRows as AssetFmecaRow[])}
                    rowType="asset"
                    headerData={{
                      tagNumber: assetTagNumber,
                      description: assetDescription,
                      function: assetFunction
                    }}
                  />
                  
                  {assetRows.length > 0 && (
                    <div className="flex justify-end mt-6">
                      <Button 
                        onClick={handleSaveFmeca}
                        className="ml-auto"
                      >
                        Save FMECA Analysis
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed rounded-md">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">Asset Information Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Please enter the Asset Tag Number and details above before starting FMECA analysis.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={useAssetExample}
                  >
                    Use Example Asset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system-level">
          <Card>
            <CardHeader>
              <CardTitle>System-Level FMECA</CardTitle>
              <CardDescription>
                Analyze failure modes at the system and subsystem level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* RPN Guide Section */}
              <div className="mb-6 rounded-md bg-blue-50 border border-blue-100">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-blue-800 mb-2">RPN (Risk Priority Number) Guide</h3>
                  <p className="text-sm text-blue-700 mb-2">RPN = Severity × Probability × Detection (Range: 1-1000)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="bg-red-100 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-red-800">High Risk (RPN ≥ 200)</h4>
                      <p className="text-xs text-red-700">Immediate action required. Critical priority for risk mitigation.</p>
                    </div>
                    
                    <div className="bg-amber-100 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-amber-800">Medium Risk (125-200)</h4>
                      <p className="text-xs text-amber-700">Action needed soon. Secondary priority for risk mitigation.</p>
                    </div>
                    
                    <div className="bg-green-100 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-green-800">Low Risk (under 125)</h4>
                      <p className="text-xs text-green-700">Monitor and address during routine maintenance.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Information Section */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-medium">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="system-name">System Name</Label>
                    <Input 
                      id="system-name" 
                      placeholder="e.g., Cooling Water System" 
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="system-description">System Description</Label>
                    <Input 
                      id="system-description" 
                      placeholder="e.g., Secondary cooling circuit" 
                      value={systemDescription}
                      onChange={(e) => setSystemDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="system-function">System Function</Label>
                    <Input 
                      id="system-function" 
                      placeholder="e.g., Remove heat from process equipment" 
                      value={systemFunction}
                      onChange={(e) => setSystemFunction(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={useSystemExample}
                  >
                    Use Example System
                  </Button>
                </div>
              </div>
              
              <div className="p-4 rounded-md border border-green-200 bg-green-50 mb-6">
                <div className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Enhanced Editor Features</h4>
                    <ul className="list-disc list-inside text-sm mt-1 text-green-700 space-y-1">
                      <li>Edit any row with popup editor</li>
                      <li>Track completion date, verification, and effectiveness</li>
                      <li>Export to Excel for reporting and collaboration</li>
                      <li>Import from Excel to quickly add multiple items</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {systemName ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">System FMECA Analysis</h3>
                    <Button 
                      onClick={() => setIsAddSystemRowDialogOpen(true)}
                      className="mb-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Failure Mode
                    </Button>
                  </div>
                  
                  <FmecaManager
                    rows={systemRows}
                    onUpdateRows={(updatedRows) => setSystemRows(updatedRows as SystemFmecaRow[])}
                    rowType="system"
                    headerData={{
                      name: systemName,
                      description: systemDescription,
                      function: systemFunction
                    }}
                  />
                  
                  {systemRows.length > 0 && (
                    <div className="flex justify-end mt-6">
                      <Button 
                        onClick={handleSaveFmeca}
                        className="ml-auto"
                      >
                        Save System FMECA Analysis
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed rounded-md">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">System Information Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Please enter the System Name and details above before starting FMECA analysis.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={useSystemExample}
                  >
                    Use Example System
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Row Dialogs */}
      <AddRowDialog
        isOpen={isAddAssetRowDialogOpen}
        onClose={() => setIsAddAssetRowDialogOpen(false)}
        onAddRow={handleAddAssetRow}
        rowType="asset"
        assetInfo={{
          tagNumber: assetTagNumber,
          description: assetDescription,
          function: assetFunction
        }}
      />
      
      <AddRowDialog
        isOpen={isAddSystemRowDialogOpen}
        onClose={() => setIsAddSystemRowDialogOpen(false)}
        onAddRow={handleAddSystemRow}
        rowType="system"
        systemInfo={{
          name: systemName,
          function: systemFunction
        }}
      />
    </div>
  );
};

export default EnhancedFmecaPage;