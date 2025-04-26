import React from 'react';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Pencil } from "lucide-react";
import { StatusBadge } from './FmecaHistory';
import { format } from 'date-fns';

// Simplified interfaces for the props
interface AssetFmecaHistory {
  id: number;
  version: number;
  tagNumber: string;
  component: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  probability: number;
  detection: number;
  rpn: number;
  action: string;
  responsibility: string;
  targetDate: string;
  status: string;
  createdAt: string;
}

interface SystemFmecaHistory {
  id: number;
  version: number;
  systemName: string;
  subSystem: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  probability: number;
  detection: number;
  rpn: number;
  action: string;
  responsibility: string;
  targetDate: string;
  status: string;
  createdAt: string;
}

interface FmecaTableViewProps {
  historyRecords: (AssetFmecaHistory | SystemFmecaHistory)[];
  recordType: 'asset' | 'system';
  onViewDetails: (id: number) => void;
  onExport: (record: AssetFmecaHistory | SystemFmecaHistory) => void;
  exportAllRecords: () => void;
}

export const FmecaTableView: React.FC<FmecaTableViewProps> = ({
  historyRecords,
  recordType,
  onViewDetails,
  onExport,
  exportAllRecords
}) => {
  return (
    <div className="border rounded-md overflow-x-auto">
      <div className="p-3 flex justify-between items-center bg-slate-50 border-b">
        <h3 className="font-medium text-blue-800">Complete FMECA History (All Versions)</h3>
        <Button
          variant="default"
          size="sm"
          onClick={exportAllRecords}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4 mr-1" />
          <span>Export All to Excel</span>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Version</TableHead>
            <TableHead>{recordType === 'asset' ? 'Tag Number' : 'System Name'}</TableHead>
            <TableHead>{recordType === 'asset' ? 'Component' : 'Subsystem'}</TableHead>
            <TableHead>Failure Mode</TableHead>
            <TableHead>Cause</TableHead>
            <TableHead>Effect</TableHead>
            <TableHead className="text-center">S</TableHead>
            <TableHead className="text-center">O</TableHead>
            <TableHead className="text-center">D</TableHead>
            <TableHead className="text-center">RPN</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Responsibility</TableHead>
            <TableHead>Target Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historyRecords
            .sort((a, b) => b.version - a.version)
            .map((record) => (
              <TableRow key={record.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{record.version}</TableCell>
                <TableCell>
                  {recordType === 'asset' 
                    ? (record as AssetFmecaHistory).tagNumber
                    : (record as SystemFmecaHistory).systemName}
                </TableCell>
                <TableCell>
                  {recordType === 'asset' 
                    ? (record as AssetFmecaHistory).component
                    : (record as SystemFmecaHistory).subSystem}
                </TableCell>
                <TableCell>{record.failureMode}</TableCell>
                <TableCell>{record.cause}</TableCell>
                <TableCell>{record.effect}</TableCell>
                <TableCell className="text-center">{record.severity}</TableCell>
                <TableCell className="text-center">{record.probability}</TableCell>
                <TableCell className="text-center">{record.detection}</TableCell>
                <TableCell className="text-center font-bold">{record.rpn}</TableCell>
                <TableCell>{record.action}</TableCell>
                <TableCell>{record.responsibility}</TableCell>
                <TableCell>{record.targetDate}</TableCell>
                <TableCell>
                  <StatusBadge status={record.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewDetails(record.id)}
                      title="View complete details"
                      className="px-2 py-0 h-7"
                    >
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      <span className="text-xs">Details</span>
                    </Button>
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => onExport(record)}
                      title="Export this version to Excel"
                      className="px-2 py-0 h-7"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      <span className="text-xs">Export</span>
                    </Button>
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/edit-fmeca-history/${recordType}/${record.id}`, '_blank')}
                      title="Edit this version"
                      className="px-2 py-0 h-7"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      <span className="text-xs">Edit</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};