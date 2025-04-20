import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeibullAnalysisForm from "@/components/reliability/WeibullAnalysisForm";
import MaintenanceOptimizationForm from "@/components/reliability/MaintenanceOptimizationForm";
import RCMAnalysisForm from "@/components/reliability/RCMAnalysisForm";
import SimulationForm from "@/components/reliability/SimulationForm";
import AssetManagement from "@/components/reliability/AssetManagement";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";

const ReliabilityPage = () => {
  const [activeTab, setActiveTab] = useState("assets");
  
  // Fetch assets for maintenance import
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    staleTime: 5000,
  });

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col">
        <h1 className="text-4xl font-bold tracking-tight">Reliability Engineering</h1>
        <p className="text-muted-foreground mt-2">
          Analyze and optimize equipment reliability using advanced statistical methods and RCM principles
        </p>
      </div>

      <Tabs
        defaultValue="assets"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="assets">Asset Management</TabsTrigger>
          <TabsTrigger value="weibull">Weibull Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Optimization</TabsTrigger>
          <TabsTrigger value="rcm">RCM Analysis</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="assets" className="focus-visible:outline-none focus-visible:ring-0">
            <AssetManagement />
          </TabsContent>

          <TabsContent value="weibull" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Weibull Reliability Analysis</h2>
              <p className="text-muted-foreground">
                Analyze equipment failure patterns using the Weibull distribution to predict reliability
              </p>
            </div>
            <WeibullAnalysisForm />
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