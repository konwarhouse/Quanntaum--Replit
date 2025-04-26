import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
          <TabsTrigger value="rcm" className="relative">
            RCM Analysis
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white font-bold" title="Licensed Users Only">PRO</span>
          </TabsTrigger>
          <TabsTrigger value="simulation" className="relative">
            Simulation
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white font-bold" title="Licensed Users Only">PRO</span>
          </TabsTrigger>
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
            <div className="p-6 border border-blue-200 bg-blue-50 rounded-md mb-4">
              <h3 className="text-lg font-semibold text-blue-700 flex items-center">
                <span className="mr-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md font-semibold">LICENSED USERS ONLY</span>
                Advanced Module Under Development
              </h3>
              <p className="mt-2 text-blue-700">
                The RCM Analysis module is currently under development as part of a complete reliability engineering platform.
                This advanced feature will be available exclusively for licensed users with full access to Weibull modeling and 
                comprehensive maintenance strategy optimization.
              </p>
              <p className="mt-2 text-blue-700">
                Please contact our support team for licensing information and early access to these features.
              </p>
            </div>
            <div className="opacity-50 pointer-events-none filter grayscale relative">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="bg-white bg-opacity-75 p-6 rounded-lg shadow-lg">
                  <span className="text-lg font-semibold">Licensed Users Only</span>
                </div>
              </div>
              <RCMAnalysisForm />
            </div>
          </TabsContent>

          <TabsContent value="simulation" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Monte Carlo Simulation</h2>
              <p className="text-muted-foreground">
                Simulate equipment failures and maintenance interventions to analyze costs and reliability
              </p>
            </div>
            <div className="p-6 border border-blue-200 bg-blue-50 rounded-md mb-4">
              <h3 className="text-lg font-semibold text-blue-700 flex items-center">
                <span className="mr-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md font-semibold">LICENSED USERS ONLY</span>
                Advanced Module Under Development
              </h3>
              <p className="mt-2 text-blue-700">
                The Simulation module is currently under development as part of a complete reliability engineering platform.
                This advanced feature will provide Monte Carlo simulation capabilities to model equipment lifecycle, 
                maintenance interventions, and failure events to optimize reliability strategies.
              </p>
              <p className="mt-2 text-blue-700">
                Please contact our support team for licensing information and early access to these features.
              </p>
            </div>
            <div className="opacity-50 pointer-events-none filter grayscale relative">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="bg-white bg-opacity-75 p-6 rounded-lg shadow-lg">
                  <span className="text-lg font-semibold">Licensed Users Only</span>
                </div>
              </div>
              <SimulationForm />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReliabilityPage;