import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import FmecaAnalysis from "@/components/fmeca/FmecaAnalysis";
import { Loader2 } from "lucide-react";

const FmecaPage: React.FC = () => {
  // Get all systems to select from
  const { data: systems, isLoading } = useQuery({
    queryKey: ["/api/fmeca/systems"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/fmeca/systems");
      if (!response.ok) {
        throw new Error("Failed to fetch systems");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading systems...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">FMECA Analysis</h1>
      <p className="text-muted-foreground">
        Failure Mode, Effects, and Criticality Analysis is a structured approach to identifying potential
        failure modes in a system and their effects. This analysis can be performed at both the system level
        and component/asset level.
      </p>
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Two Levels of FMECA Analysis:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded-md">
            <h3 className="font-medium text-md">System-Level FMECA</h3>
            <p className="text-sm text-muted-foreground">
              Focuses on subsystems like Burner, Gas System, Automation, Electrical.
              Provides broader operational risk analysis.
            </p>
          </div>
          <div className="p-3 border rounded-md">
            <h3 className="font-medium text-md">Asset-Level FMECA</h3>
            <p className="text-sm text-muted-foreground">
              Detailed component analysis (Mechanical Seal, Bearing, Shaft, Motor).
              Allows grouping similar assets with the same application or service.
            </p>
          </div>
        </div>
      </div>
      
      {systems && systems.length > 0 && (
        <FmecaAnalysis systemId={systems[0].id} />
      )}
    </div>
  );
};

export default FmecaPage;