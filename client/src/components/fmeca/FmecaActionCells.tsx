import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { AddHistoryButton } from './AddFmecaHistory';

interface FmecaActionCellProps {
  row: { id: string };
  recordType: 'asset' | 'system';
  handleEditRow: (row: any) => void;
  handleDeleteRow: (id: string) => void;
}

/**
 * Component to render action cells for FMECA tables with history button
 */
export const FmecaActionCell: React.FC<FmecaActionCellProps> = ({
  row,
  recordType,
  handleEditRow,
  handleDeleteRow
}) => {
  return (
    <td className="border border-gray-300 p-2 text-center">
      <div className="flex space-x-2 justify-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleEditRow(row)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AddHistoryButton 
          recordId={parseInt(row.id)} 
          recordType={recordType}
        />
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => handleDeleteRow(row.id)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </td>
  );
};