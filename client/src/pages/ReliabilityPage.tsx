import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import WeibullAnalysisForm from "@/components/reliability/WeibullAnalysisForm";
import MaintenanceOptimizationForm from "@/components/reliability/MaintenanceOptimizationForm";
import RCMAnalysisForm from "@/components/reliability/RCMAnalysisForm";
import SimulationForm from "@/components/reliability/SimulationForm";
import AssetManagement from "@/components/reliability/AssetManagement";

const ReliabilityPage = () => {
  const [activeTab, setActiveTab] = useState("assets");

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-background border-b p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reliability Analysis Dashboard</h1>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 overflow-auto">
        <div className="bg-card rounded-lg border shadow-sm mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Asset Reliability Toolkit</h2>
            <p className="text-muted-foreground mb-6">
              A comprehensive suite of tools for reliability-centered maintenance (RCM) analysis and Weibull-based reliability modeling.
            </p>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8">
                <TabsTrigger value="assets">Asset Management</TabsTrigger>
                <TabsTrigger value="weibull">Weibull Analysis</TabsTrigger>
                <TabsTrigger value="optimization">Maintenance Optimization</TabsTrigger>
                <TabsTrigger value="rcm">RCM Analysis</TabsTrigger>
                <TabsTrigger value="simulation">Simulation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="assets" className="space-y-4">
                <div className="bg-muted p-4 rounded-md mb-4">
                  <h3 className="text-lg font-medium mb-2">Asset Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your assets and assign Weibull parameters based on historical failure data.
                    These assets will be available for analysis in the other tools.
                  </p>
                </div>
                <AssetManagement />
              </TabsContent>
              
              <TabsContent value="weibull" className="space-y-4">
                <div className="bg-muted p-4 rounded-md mb-4">
                  <h3 className="text-lg font-medium mb-2">Weibull Reliability Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyze asset reliability using the Weibull distribution. 
                    View reliability curves, failure rates, and mean time between failures.
                  </p>
                </div>
                <WeibullAnalysisForm />
              </TabsContent>
              
              <TabsContent value="optimization" className="space-y-4">
                <div className="bg-muted p-4 rounded-md mb-4">
                  <h3 className="text-lg font-medium mb-2">Maintenance Optimization</h3>
                  <p className="text-sm text-muted-foreground">
                    Find the optimal preventive maintenance interval based on cost parameters 
                    and reliability requirements to minimize total maintenance costs.
                  </p>
                </div>
                <MaintenanceOptimizationForm />
              </TabsContent>
              
              <TabsContent value="rcm" className="space-y-4">
                <div className="bg-muted p-4 rounded-md mb-4">
                  <h3 className="text-lg font-medium mb-2">Reliability-Centered Maintenance (RCM) Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Apply RCM principles to determine the most effective maintenance strategy
                    based on failure modes, consequences, and criticality analysis.
                  </p>
                </div>
                <RCMAnalysisForm />
              </TabsContent>
              
              <TabsContent value="simulation" className="space-y-4">
                <div className="bg-muted p-4 rounded-md mb-4">
                  <h3 className="text-lg font-medium mb-2">Monte Carlo Simulation</h3>
                  <p className="text-sm text-muted-foreground">
                    Run simulations to estimate failure patterns and maintenance costs
                    over time using Weibull-based reliability models.
                  </p>
                </div>
                <SimulationForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <footer className="bg-muted py-4 px-6 border-t">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Reliability Analysis Dashboard
            </p>
            <p className="text-xs text-muted-foreground">
              Based on Weibull reliability modeling and RCM principles
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReliabilityPage;