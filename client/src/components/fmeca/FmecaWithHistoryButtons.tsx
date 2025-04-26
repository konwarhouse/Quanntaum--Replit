import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { FmecaHistoryButton } from './FmecaHistory';

/**
 * Component to render action buttons including edit, history and delete
 * for FMECA tables
 */
export const FmecaActionButtons: React.FC<{
  recordId: string;
  recordType: 'asset' | 'system';
  onEdit: (row: any) => void;
  onDelete: (id: string) => void;
  row: any;
}> = ({ recordId, recordType, onEdit, onDelete, row }) => {
  return (
    <div className="flex space-x-2 justify-center">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <FmecaHistoryButton 
        recordId={parseInt(recordId)} 
        recordType={recordType}
        variant="outline"
        iconOnly={true}
      />
      <Button 
        variant="destructive" 
        size="sm"
        onClick={() => onDelete(recordId)}
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
};