import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeibullAnalysisForm from "@/components/reliability/WeibullAnalysisForm";
import DataDrivenWeibullAnalysis from "@/components/reliability/DataDrivenWeibullAnalysis";
import MaintenanceOptimizationForm from "@/components/reliability/MaintenanceOptimizationForm";
import RCMAnalysisForm from "@/components/reliability/RCMAnalysisForm";
import SimulationForm from "@/components/reliability/SimulationForm";
import AssetMaster from "@/components/reliability/AssetMaster";
import CriticalityAssessment from "@/components/reliability/CriticalityAssessment";
import FailureHistory from "@/components/reliability/FailureHistory";
import FailureModeManager from "@/components/reliability/FailureModeManager";
import EquipmentClassManager from "@/components/reliability/EquipmentClassManager";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { UserRole } from "@shared/auth";

const ReliabilityPage = () => {
  const [activeTab, setActiveTab] = useState("assets");
  // Store selected asset/class/failure mode at this level so it persists between tab switches
  const [selectedWeibullAssetId, setSelectedWeibullAssetId] = useState<number | null>(null);
  const [selectedWeibullEquipmentClass, setSelectedWeibullEquipmentClass] = useState<string | null>(null);
  const [selectedWeibullFailureModeId, setSelectedWeibullFailureModeId] = useState<number | null>(null);
  const [useOperatingHours, setUseOperatingHours] = useState(true);
  
  // Set default user role to Admin for development purposes
  // In a production app, this would come from an auth context
  const currentUserRole = UserRole.ADMIN;
  
  // Fetch assets for maintenance import
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col">
        <h1 className="text-4xl font-bold tracking-tight">Quanntaum Predict</h1>
        <p className="text-muted-foreground mt-2">
          Smarter reliability engineering with AI-powered predictive maintenance, failure analysis, and asset performance optimization
        </p>
      </div>

      <Tabs
        defaultValue="assets"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">
          <TabsTrigger value="assets">Asset Master</TabsTrigger>
          <TabsTrigger value="criticality">Criticality</TabsTrigger>
          <TabsTrigger value="failures">Failure History</TabsTrigger>
          <TabsTrigger value="failureModes">Failure Modes</TabsTrigger>
          <TabsTrigger value="equipmentClasses">Equipment Classes</TabsTrigger>
          <TabsTrigger value="weibull">Weibull Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Optimization</TabsTrigger>
          <TabsTrigger value="rcm">RCM Analysis</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="assets" className="focus-visible:outline-none focus-visible:ring-0">
            <AssetMaster />
          </TabsContent>

          <TabsContent value="failures" className="focus-visible:outline-none focus-visible:ring-0">
            <FailureHistory />
          </TabsContent>

          <TabsContent value="criticality" className="focus-visible:outline-none focus-visible:ring-0">
            <CriticalityAssessment />
          </TabsContent>
          
          <TabsContent value="failureModes" className="focus-visible:outline-none focus-visible:ring-0">
            <FailureModeManager currentUserRole={currentUserRole} />
          </TabsContent>
          
          <TabsContent value="equipmentClasses" className="focus-visible:outline-none focus-visible:ring-0">
            <EquipmentClassManager currentUserRole={currentUserRole} />
          </TabsContent>

          <TabsContent value="weibull" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Weibull Reliability Analysis</h2>
              <p className="text-muted-foreground">
                Analyze equipment failure patterns using the Weibull distribution to predict reliability
              </p>
            </div>
            
            <Tabs defaultValue="data-driven">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data-driven">Data-Driven Analysis</TabsTrigger>
                <TabsTrigger value="manual">Manual Parameters</TabsTrigger>
              </TabsList>
              <TabsContent value="data-driven" className="py-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Data-Driven Weibull Analysis</h3>
                  <p className="text-muted-foreground text-sm">
                    Fit Weibull parameters to your actual failure history data for precise reliability modeling
                  </p>
                </div>
                <DataDrivenWeibullAnalysis 
                  selectedAssetId={selectedWeibullAssetId}
                  setSelectedAssetId={setSelectedWeibullAssetId}
                  selectedEquipmentClass={selectedWeibullEquipmentClass}
                  setSelectedEquipmentClass={setSelectedWeibullEquipmentClass}
                  selectedFailureModeId={selectedWeibullFailureModeId}
                  setSelectedFailureModeId={setSelectedWeibullFailureModeId}
                  useOperatingHours={useOperatingHours}
                  setUseOperatingHours={setUseOperatingHours}
                />
              </TabsContent>
              <TabsContent value="manual" className="py-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Manual Weibull Parameters</h3>
                  <p className="text-muted-foreground text-sm">
                    Input your own Weibull parameters for reliability analysis
                  </p>
                </div>
                <WeibullAnalysisForm 
                  selectedAssetId={selectedWeibullAssetId}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="maintenance" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Maintenance Interval Optimization</h2>
              <p className="text-muted-foreground">
                Find the optimal maintenance interval to minimize total costs
              </p>
            </div>
            <MaintenanceOptimizationForm />
          </TabsContent>

          <TabsContent value="rcm" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Reliability-Centered Maintenance</h2>
              <p className="text-muted-foreground">
                Determine the most appropriate maintenance strategy based on asset criticality and failure modes
              </p>
            </div>
            <RCMAnalysisForm />
          </TabsContent>

          <TabsContent value="simulation" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Monte Carlo Simulation</h2>
              <p className="text-muted-foreground">
                Simulate equipment failures and maintenance interventions to analyze costs and reliability
              </p>
            </div>
            <SimulationForm />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReliabilityPage;