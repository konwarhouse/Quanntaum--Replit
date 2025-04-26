import React from 'react';
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { FmecaHistoryDialog } from './FmecaHistory';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Simple button that just shows the FMECA history dialog
 */
export const AddHistoryButton = ({
  recordId,
  recordType,
}: {
  recordId: number;
  recordType: 'asset' | 'system';
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
        variant="outline" 
        size="sm" 
        onClick={handleOpenHistory}
      >
        <History className="h-4 w-4" />
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