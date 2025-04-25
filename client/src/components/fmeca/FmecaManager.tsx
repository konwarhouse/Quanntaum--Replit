import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash, FileSpreadsheet } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { EditRowDialog, ExcelTools } from './FmecaEnhanced';

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

// Helper functions for RPN and risk level
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

interface FmecaManagerProps {
  rows: AssetFmecaRow[] | SystemFmecaRow[];
  onUpdateRows: (rows: AssetFmecaRow[] | SystemFmecaRow[]) => void;
  rowType: 'asset' | 'system';
  headerData?: any;
}

export const FmecaManager: React.FC<FmecaManagerProps> = ({
  rows,
  onUpdateRows,
  rowType,
  headerData
}) => {
  const [editingRow, setEditingRow] = useState<AssetFmecaRow | SystemFmecaRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const handleEditRow = (row: AssetFmecaRow | SystemFmecaRow) => {
    setEditingRow(row);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteRow = (id: string) => {
    if (window.confirm('Are you sure you want to delete this row?')) {
      const updatedRows = rows.filter(row => row.id !== id);
      onUpdateRows(updatedRows);
      
      toast({
        title: "Row Deleted",
        description: "FMECA row has been deleted"
      });
    }
  };
  
  const handleSaveEdit = (updatedRow: AssetFmecaRow | SystemFmecaRow) => {
    const updatedRows = rows.map(row => 
      row.id === updatedRow.id ? updatedRow : row
    );
    
    onUpdateRows(updatedRows as any);
    
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
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">Completed: {row.completionDate}</span>
                                </div>
                                {row.verifiedBy && (
                                  <div className="text-xs">
                                    <span className="font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded">By: {row.verifiedBy}</span>
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
                                className="flex items-center px-2 py-1"
                                onClick={() => handleEditRow(row)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                <span>Edit</span>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="flex items-center px-2 py-1"
                                onClick={() => handleDeleteRow(row.id)}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                <span>Delete</span>
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
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">Completed: {row.completionDate}</span>
                                </div>
                                {row.verifiedBy && (
                                  <div className="text-xs">
                                    <span className="font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded">By: {row.verifiedBy}</span>
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
                                className="flex items-center px-2 py-1"
                                onClick={() => handleEditRow(row)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                <span>Edit</span>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="flex items-center px-2 py-1"
                                onClick={() => handleDeleteRow(row.id)}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                <span>Delete</span>
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {rowType === 'asset' ? 'Asset-Level FMECA' : 'System-Level FMECA'}
        </h2>
        
        {/* Excel Import/Export Tools */}
        <ExcelTools
          rows={rows}
          rowType={rowType}
          onImport={handleImport}
          headerData={headerData}
        />
      </div>
      
      {/* FMECA Tables */}
      {renderTable()}
      
      {/* Edit Dialog */}
      {editingRow && (
        <EditRowDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          row={editingRow}
          rowType={rowType}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default FmecaManager;