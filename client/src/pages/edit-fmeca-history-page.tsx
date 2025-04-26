import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Define record types
interface BaseHistory {
  id: number;
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

interface AssetFmecaHistory extends BaseHistory {
  assetFmecaId: number;
  tagNumber: string;
  assetDescription: string;
  assetFunction: string;
  component: string;
}

interface SystemFmecaHistory extends BaseHistory {
  systemFmecaId: number;
  systemName: string;
  systemDescription: string;
  systemFunction: string;
  subSystem: string;
}

type FmecaHistory = AssetFmecaHistory | SystemFmecaHistory;

const EditFmecaHistoryPage = () => {
  const { recordType, historyId } = useParams<{ recordType: 'asset' | 'system'; historyId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FmecaHistory | null>(null);

  // Query to fetch the history record
  const { data: historyRecord, isLoading, error } = useQuery({
    queryKey: [`/api/enhanced-fmeca/${recordType}/${0}/history/${historyId}`], // The 0 is a placeholder since we have the historyId
    queryFn: async () => {
      const response = await fetch(`/api/enhanced-fmeca/${recordType}/history/${historyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch history record');
      }
      return await response.json();
    },
    enabled: !!historyId,
  });

  // Update form data when history record loads
  useEffect(() => {
    if (historyRecord) {
      setFormData(historyRecord);
    }
  }, [historyRecord]);

  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    if (!formData) return;
    
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Calculate RPN whenever severity, probability, or detection changes
  useEffect(() => {
    if (!formData) return;
    
    const newRpn = formData.severity * formData.probability * formData.detection;
    setFormData({
      ...formData,
      rpn: newRpn
    });
  }, [formData?.severity, formData?.probability, formData?.detection]);

  // Mutation to update the history record
  const updateMutation = useMutation({
    mutationFn: async (data: FmecaHistory) => {
      const response = await fetch(`/api/enhanced-fmeca/${recordType}/history/${historyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update FMECA history record');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'History Record Updated',
        description: 'FMECA history record has been updated successfully',
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: [`/api/enhanced-fmeca/${recordType}/${0}/history/${historyId}`],
      });
      
      // Go back to the main page
      setTimeout(() => {
        window.close();
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update history record',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;
    
    updateMutation.mutate(formData);
  };

  // Handle going back
  const handleBack = () => {
    window.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading record...</span>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/20 p-4 rounded-md text-center">
          <h2 className="text-lg font-medium text-destructive">Error</h2>
          <p>{error instanceof Error ? error.message : 'Failed to load history record'}</p>
          <Button 
            variant="outline" 
            onClick={handleBack} 
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  const isAssetRecord = 'tagNumber' in formData;

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Edit FMECA History Record</CardTitle>
          <CardDescription>
            {isAssetRecord 
              ? `Asset: ${(formData as AssetFmecaHistory).tagNumber} (Version ${formData.version})` 
              : `System: ${(formData as SystemFmecaHistory).systemName} (Version ${formData.version})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Asset/System specific fields */}
            {isAssetRecord ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tagNumber">Tag Number</Label>
                    <Input
                      id="tagNumber"
                      value={(formData as AssetFmecaHistory).tagNumber}
                      onChange={(e) => handleChange('tagNumber', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="component">Component</Label>
                    <Input
                      id="component"
                      value={(formData as AssetFmecaHistory).component}
                      onChange={(e) => handleChange('component', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assetDescription">Asset Description</Label>
                    <Input
                      id="assetDescription"
                      value={(formData as AssetFmecaHistory).assetDescription}
                      onChange={(e) => handleChange('assetDescription', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="assetFunction">Asset Function</Label>
                    <Input
                      id="assetFunction"
                      value={(formData as AssetFmecaHistory).assetFunction}
                      onChange={(e) => handleChange('assetFunction', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="systemName">System Name</Label>
                    <Input
                      id="systemName"
                      value={(formData as SystemFmecaHistory).systemName}
                      onChange={(e) => handleChange('systemName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subSystem">Subsystem</Label>
                    <Input
                      id="subSystem"
                      value={(formData as SystemFmecaHistory).subSystem}
                      onChange={(e) => handleChange('subSystem', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="systemDescription">System Description</Label>
                    <Input
                      id="systemDescription"
                      value={(formData as SystemFmecaHistory).systemDescription}
                      onChange={(e) => handleChange('systemDescription', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="systemFunction">System Function</Label>
                    <Input
                      id="systemFunction"
                      value={(formData as SystemFmecaHistory).systemFunction}
                      onChange={(e) => handleChange('systemFunction', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Common fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="failureMode">Failure Mode</Label>
                  <Input
                    id="failureMode"
                    value={formData.failureMode}
                    onChange={(e) => handleChange('failureMode', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cause">Cause</Label>
                  <Input
                    id="cause"
                    value={formData.cause}
                    onChange={(e) => handleChange('cause', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="effect">Effect</Label>
                <Input
                  id="effect"
                  value={formData.effect}
                  onChange={(e) => handleChange('effect', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="severity">Severity (1-10)</Label>
                  <Input
                    id="severity"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.severity}
                    onChange={(e) => handleChange('severity', parseInt(e.target.value, 10))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="probability">Probability (1-10)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.probability}
                    onChange={(e) => handleChange('probability', parseInt(e.target.value, 10))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="detection">Detection (1-10)</Label>
                  <Input
                    id="detection"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.detection}
                    onChange={(e) => handleChange('detection', parseInt(e.target.value, 10))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="severityJustification">Severity Justification</Label>
                  <Textarea
                    id="severityJustification"
                    value={formData.severityJustification}
                    onChange={(e) => handleChange('severityJustification', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="probabilityJustification">Probability Justification</Label>
                  <Textarea
                    id="probabilityJustification"
                    value={formData.probabilityJustification}
                    onChange={(e) => handleChange('probabilityJustification', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="detectionJustification">Detection Justification</Label>
                  <Textarea
                    id="detectionJustification"
                    value={formData.detectionJustification}
                    onChange={(e) => handleChange('detectionJustification', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rpn" className="flex justify-between">
                    <span>RPN</span>
                    <span className={
                      formData.rpn >= 200 ? "text-red-500 font-bold" :
                      formData.rpn >= 125 ? "text-amber-500 font-bold" :
                      "text-green-500 font-bold"
                    }>
                      {formData.rpn >= 200 ? "High Risk" : 
                       formData.rpn >= 125 ? "Medium Risk" : "Low Risk"}
                    </span>
                  </Label>
                  <Input
                    id="rpn"
                    value={formData.rpn}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Input
                    id="action"
                    value={formData.action}
                    onChange={(e) => handleChange('action', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="responsibility">Responsibility</Label>
                  <Input
                    id="responsibility"
                    value={formData.responsibility}
                    onChange={(e) => handleChange('responsibility', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="targetDate">Target Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => handleChange('targetDate', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="completionDate">Completion Date</Label>
                  <Input
                    id="completionDate"
                    type="date"
                    value={formData.completionDate || ''}
                    onChange={(e) => handleChange('completionDate', e.target.value || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="verifiedBy">Verified By</Label>
                  <Input
                    id="verifiedBy"
                    value={formData.verifiedBy || ''}
                    onChange={(e) => handleChange('verifiedBy', e.target.value || null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effectivenessVerified">Effectiveness Verified</Label>
                  <Select
                    value={formData.effectivenessVerified || 'none'}
                    onValueChange={(value) => handleChange('effectivenessVerified', value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="historyReason">History Reason</Label>
                  <Input
                    id="historyReason"
                    value={formData.historyReason}
                    onChange={(e) => handleChange('historyReason', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments || ''}
                  onChange={(e) => handleChange('comments', e.target.value || null)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button 
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={updateMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditFmecaHistoryPage;