import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import WeibullAnalysisForm from "@/components/reliability/WeibullAnalysisForm";
import MaintenanceOptimizationForm from "@/components/reliability/MaintenanceOptimizationForm";
import RCMAnalysisForm from "@/components/reliability/RCMAnalysisForm";
import SimulationForm from "@/components/reliability/SimulationForm";
import AssetManagement from "@/components/reliability/AssetManagement";

const ReliabilityPage = () => {
  const [activeTab, setActiveTab] = useState("assets");

  return (
    <div className="container p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reliability Analysis Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Analyze asset reliability, optimize maintenance, and implement RCM strategies
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Chat</Button>
        </Link>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full mb-6">
          <TabsTrigger value="assets">Asset Management</TabsTrigger>
          <TabsTrigger value="weibull">Weibull Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Optimization</TabsTrigger>
          <TabsTrigger value="rcm">RCM Analysis</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Management</CardTitle>
              <CardDescription>
                Add, edit, and manage your assets and their Weibull parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="weibull" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weibull Reliability Analysis</CardTitle>
              <CardDescription>
                Analyze asset reliability using Weibull distribution parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeibullAnalysisForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Optimization</CardTitle>
              <CardDescription>
                Determine optimal maintenance intervals and cost trade-offs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceOptimizationForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rcm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RCM Analysis</CardTitle>
              <CardDescription>
                Reliability Centered Maintenance decision support framework
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RCMAnalysisForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monte Carlo Simulation</CardTitle>
              <CardDescription>
                Simulate failure patterns and analyze maintenance cost scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimulationForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReliabilityPage;