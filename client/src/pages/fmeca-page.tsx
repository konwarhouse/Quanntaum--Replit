import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, FileText, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface System {
  id: number;
  name: string;
  purpose?: string;
}

interface Asset {
  id: number;
  tagNumber: string;
  description: string;
  function: string;
}

interface Component {
  id: number;
  name: string;
  description?: string;
}

const FmecaPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState("asset-level");

  // Get all systems
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
        failure modes in a system and their effects.
      </p>
      
      <Tabs defaultValue="asset-level" className="w-full" onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asset-level" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Individual Asset-Level FMECA
          </TabsTrigger>
          <TabsTrigger value="system-level" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            System-Level FMECA
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="asset-level" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Asset-Level FMECA</CardTitle>
              <CardDescription>
                Analyze specific assets (e.g., pumps, motors) by breaking them down into components like mechanical seals, bearings, and shafts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>Structure:</strong> The asset-level FMECA begins with header information 
                (Tag Number, Asset Description, Function) followed by a detailed component breakdown.
              </p>
              <p className="text-sm">
                <strong>Example:</strong> For a centrifugal pump, components would include 
                Mechanical Seal, Bearing, Shaft, etc. with failure modes analyzed for each.
              </p>
            </CardContent>
          </Card>
          
          <div className="mt-6 p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-bold mb-4">Asset-Level FMECA Sheet (EXAMPLE)</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-sm text-blue-700 font-medium">
                This is an EXAMPLE of a filled out FMECA sheet. Your actual analysis will be based on your specific assets and components.
              </p>
            </div>
            
            {/* Asset Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
              <div>
                <label className="block text-sm font-medium mb-1">Tag Number:</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., Pump-101" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset Description:</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., Centrifugal Pump" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Function:</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., Delivers fluid to main system" />
              </div>
            </div>
            
            {/* FMECA Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-gray-300 p-2 text-left">Component</th>
                    <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                    <th className="border border-gray-300 p-2 text-left">Cause</th>
                    <th className="border border-gray-300 p-2 text-left">Effect</th>
                    <th className="border border-gray-300 p-2 text-left">Severity</th>
                    <th className="border border-gray-300 p-2 text-left">Probability</th>
                    <th className="border border-gray-300 p-2 text-left">Detection</th>
                    <th className="border border-gray-300 p-2 text-left">RPN</th>
                    <th className="border border-gray-300 p-2 text-left">Action Required</th>
                    <th className="border border-gray-300 p-2 text-left">Target Date</th>
                    <th className="border border-gray-300 p-2 text-left">Comments/Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">Mechanical Seal</td>
                    <td className="border border-gray-300 p-2">Leakage</td>
                    <td className="border border-gray-300 p-2">Wear and tear</td>
                    <td className="border border-gray-300 p-2">Fluid leakage, operational halt</td>
                    <td className="border border-gray-300 p-2">8</td>
                    <td className="border border-gray-300 p-2">6</td>
                    <td className="border border-gray-300 p-2">3</td>
                    <td className="border border-gray-300 p-2">144</td>
                    <td className="border border-gray-300 p-2">Replace seals periodically</td>
                    <td className="border border-gray-300 p-2">01-May-2025</td>
                    <td className="border border-gray-300 p-2">Monitor wear during inspections</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">Bearing</td>
                    <td className="border border-gray-300 p-2">Excessive vibration</td>
                    <td className="border border-gray-300 p-2">Misalignment</td>
                    <td className="border border-gray-300 p-2">Increased noise, overheating</td>
                    <td className="border border-gray-300 p-2">7</td>
                    <td className="border border-gray-300 p-2">5</td>
                    <td className="border border-gray-300 p-2">4</td>
                    <td className="border border-gray-300 p-2">140</td>
                    <td className="border border-gray-300 p-2">Align and lubricate bearings</td>
                    <td className="border border-gray-300 p-2">10-May-2025</td>
                    <td className="border border-gray-300 p-2">Use predictive maintenance</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">Shaft</td>
                    <td className="border border-gray-300 p-2">Cracking</td>
                    <td className="border border-gray-300 p-2">Material fatigue</td>
                    <td className="border border-gray-300 p-2">Total pump failure</td>
                    <td className="border border-gray-300 p-2">10</td>
                    <td className="border border-gray-300 p-2">3</td>
                    <td className="border border-gray-300 p-2">5</td>
                    <td className="border border-gray-300 p-2">150</td>
                    <td className="border border-gray-300 p-2">Conduct fatigue tests</td>
                    <td className="border border-gray-300 p-2">20-May-2025</td>
                    <td className="border border-gray-300 p-2">Analyze loading conditions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system-level" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System-Level FMECA</CardTitle>
              <CardDescription>
                Analyze entire systems (e.g., boiler systems, HVAC systems) by evaluating subsystems like burners, gas systems, and automation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>Structure:</strong> The system-level FMECA begins with header information
                (System Name, Description, Primary Function) followed by a subsystem analysis.
              </p>
              <p className="text-sm">
                <strong>Example:</strong> For a boiler system, subsystems would include 
                Burner, Gas System, Automation & Control, etc. with failure modes analyzed for each.
              </p>
            </CardContent>
          </Card>
          
          <div className="mt-6 p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-bold mb-4">System-Level FMECA Sheet (EXAMPLE)</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-sm text-blue-700 font-medium">
                This is an EXAMPLE of a filled out system-level FMECA sheet. Your actual analysis will be based on your specific systems and subsystems.
              </p>
            </div>
            
            {/* System Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
              <div>
                <label className="block text-sm font-medium mb-1">System Name:</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., Boiler System" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description:</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., Generates process steam" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Primary Function:</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g., Provides heat and steam" />
              </div>
            </div>
            
            {/* FMECA Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-gray-300 p-2 text-left">Subsystem</th>
                    <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                    <th className="border border-gray-300 p-2 text-left">Cause</th>
                    <th className="border border-gray-300 p-2 text-left">Effect</th>
                    <th className="border border-gray-300 p-2 text-left">Severity</th>
                    <th className="border border-gray-300 p-2 text-left">Probability</th>
                    <th className="border border-gray-300 p-2 text-left">Detection</th>
                    <th className="border border-gray-300 p-2 text-left">RPN</th>
                    <th className="border border-gray-300 p-2 text-left">Action Required</th>
                    <th className="border border-gray-300 p-2 text-left">Target Date</th>
                    <th className="border border-gray-300 p-2 text-left">Comments/Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">Burner</td>
                    <td className="border border-gray-300 p-2">Flame failure</td>
                    <td className="border border-gray-300 p-2">Blocked fuel nozzle</td>
                    <td className="border border-gray-300 p-2">Loss of heat generation</td>
                    <td className="border border-gray-300 p-2">9</td>
                    <td className="border border-gray-300 p-2">4</td>
                    <td className="border border-gray-300 p-2">3</td>
                    <td className="border border-gray-300 p-2">108</td>
                    <td className="border border-gray-300 p-2">Inspect and clean regularly</td>
                    <td className="border border-gray-300 p-2">01-Jun-2025</td>
                    <td className="border border-gray-300 p-2">Use automated flame monitoring</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">Gas System</td>
                    <td className="border border-gray-300 p-2">Gas leakage</td>
                    <td className="border border-gray-300 p-2">Valve seal degradation</td>
                    <td className="border border-gray-300 p-2">Risk of explosion, hazard</td>
                    <td className="border border-gray-300 p-2">10</td>
                    <td className="border border-gray-300 p-2">3</td>
                    <td className="border border-gray-300 p-2">5</td>
                    <td className="border border-gray-300 p-2">150</td>
                    <td className="border border-gray-300 p-2">Replace seals, add sensors</td>
                    <td className="border border-gray-300 p-2">15-Jun-2025</td>
                    <td className="border border-gray-300 p-2">Add auto shut-off for leaks</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">Automation & Control</td>
                    <td className="border border-gray-300 p-2">System malfunction</td>
                    <td className="border border-gray-300 p-2">Software bugs</td>
                    <td className="border border-gray-300 p-2">Incorrect boiler operation</td>
                    <td className="border border-gray-300 p-2">8</td>
                    <td className="border border-gray-300 p-2">5</td>
                    <td className="border border-gray-300 p-2">4</td>
                    <td className="border border-gray-300 p-2">160</td>
                    <td className="border border-gray-300 p-2">Update software regularly</td>
                    <td className="border border-gray-300 p-2">10-Jul-2025</td>
                    <td className="border border-gray-300 p-2">Perform regular validation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FmecaPage;