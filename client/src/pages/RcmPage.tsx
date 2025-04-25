import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from 'lucide-react';
import SystemManager from '@/components/rcm/SystemManager';
import ComponentManager from '@/components/rcm/ComponentManager';
import { FmecaAnalysis } from '@/components/rcm/FmecaAnalysis';
import { Component } from '@shared/rcm-schema';

// Component to display components for a selected system
const SystemComponentsList: React.FC<{ systemId: number }> = ({ systemId }) => {
  const { data: components, isLoading, error } = useQuery({
    queryKey: [`/api/rcm/components?systemId=${systemId}`],
    queryFn: ({ signal }) => 
      fetch(`/api/rcm/components?systemId=${systemId}`, { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch components');
          return res.json();
        }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 border border-red-200 bg-red-50 rounded-md text-red-800 text-sm">
        <AlertTriangle className="h-4 w-4 mr-2" />
        Error loading components: {error.message}
      </div>
    );
  }

  if (!components || components.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No components found for this system.</p>
        <p className="text-sm mt-2">Add components in the Components tab first.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableCaption>Components available for RCM analysis</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Function</TableHead>
          <TableHead>Criticality</TableHead>
          <TableHead>Parent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {components.map((component: Component) => (
          <TableRow key={component.id}>
            <TableCell className="font-medium">{component.name}</TableCell>
            <TableCell>{component.function}</TableCell>
            <TableCell>
              <Badge variant={
                component.criticality === 'High' 
                ? 'destructive' 
                : component.criticality === 'Medium' 
                  ? 'outline' 
                  : 'secondary'
              }>
                {component.criticality}
              </Badge>
            </TableCell>
            <TableCell>
              {component.parentId 
                ? components.find((c: { id: number }) => c.id === component.parentId)?.name || 'Unknown'
                : 'None'
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const RcmPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [selectedSystemId, setSelectedSystemId] = useState<number | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Authentication Required</h2>
        <p className="mt-2 text-muted-foreground">Please log in to access the RCM module.</p>
      </div>
    );
  }

  // Use localStorage to persist selected system when page reloads
  React.useEffect(() => {
    // Check if we have a stored system ID in localStorage
    const storedSystemId = localStorage.getItem('rcm-selected-system-id');
    if (storedSystemId) {
      setSelectedSystemId(parseInt(storedSystemId, 10));
    }
  }, []);

  // Save selected system ID to localStorage when it changes
  React.useEffect(() => {
    if (selectedSystemId) {
      localStorage.setItem('rcm-selected-system-id', selectedSystemId.toString());
    } else {
      localStorage.removeItem('rcm-selected-system-id');
    }
  }, [selectedSystemId]);

  // Function to handle system selection and force tab change
  const handleSystemSelect = (id: number) => {
    setSelectedSystemId(id);
    // Optional: Auto-switch to components tab when system is selected
    // setActiveTab("components");
  };

  // Track active main tab
  const [activeTab, setActiveTab] = useState<string>("systems");
  
  // Track active analysis sub-tab
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<string>("fmeca");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reliability Centered Maintenance</h1>
        <p className="text-muted-foreground">
          A comprehensive approach to maintenance strategy using FMECA, RCM, and RAM analysis.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-3">
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="systems" className="space-y-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>RCM Systems</CardTitle>
              <CardDescription>
                Define the systems you want to analyze using the RCM methodology. 
                A system is a collection of components working together to achieve a specific function.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Each system should have a clear scope, operating context, and boundaries defined. 
                Start by creating a system before adding components and performing analysis.
              </p>
            </CardContent>
          </Card>
          
          <SystemManager onSystemSelect={handleSystemSelect} />
        </TabsContent>
        
        <TabsContent value="components" className="space-y-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>System Components</CardTitle>
              <CardDescription>
                Define the components that make up your systems. Components can have parent-child relationships
                and serve specific functions within the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Components are the building blocks of your system. Each component has a specific function and 
                can be assigned a criticality level. This information will be used in the RCM analysis.
              </p>
              {!selectedSystemId && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-800 text-sm">
                  Please select a system from the Systems tab first to manage its components.
                </div>
              )}
            </CardContent>
          </Card>
          
          <ComponentManager systemId={selectedSystemId} />
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>RCM Analysis</CardTitle>
              <CardDescription>
                Perform comprehensive RCM analysis including FMECA, RCM decision logic, and RAM analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSystemId ? (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-800 text-sm mb-6">
                  Please select a system from the Systems tab first to perform analysis.
                </div>
              ) : (
                <div className="p-4 border border-green-200 bg-green-50 rounded-md text-green-800 text-sm mb-6">
                  System selected: System ID #{selectedSystemId}. Now you can analyze components for this system.
                </div>
              )}
              
              {/* Analysis Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">FMECA Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Failure Mode, Effects and Criticality Analysis identifies potential failure modes and their impacts.
                    </p>
                    <Button 
                      disabled={!selectedSystemId} 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveAnalysisTab("fmeca")}
                    >
                      Start FMECA Analysis
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">RCM Decision Logic</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Evaluate maintenance strategies based on failure consequences and criticality.
                    </p>
                    <Button 
                      disabled={!selectedSystemId} 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveAnalysisTab("rcm")}
                    >
                      Start RCM Analysis
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">RAM Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Reliability, Availability, and Maintainability metrics for system performance.
                    </p>
                    <Button 
                      disabled={!selectedSystemId} 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveAnalysisTab("ram")}
                    >
                      Start RAM Analysis
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Analysis Content */}
              <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab} className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-3">
                  <TabsTrigger value="fmeca">FMECA</TabsTrigger>
                  <TabsTrigger value="rcm">RCM Logic</TabsTrigger>
                  <TabsTrigger value="ram">RAM Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="fmeca">
                  <FmecaAnalysis systemId={selectedSystemId} />
                </TabsContent>
                
                <TabsContent value="rcm">
                  <Card>
                    <CardHeader>
                      <CardTitle>RCM Decision Logic</CardTitle>
                      <CardDescription>
                        Determine maintenance strategies based on failure consequences
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        This module is coming soon. It will include SAE JA1011 compliant RCM decision logic.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ram">
                  <Card>
                    <CardHeader>
                      <CardTitle>RAM Analysis</CardTitle>
                      <CardDescription>
                        Reliability, Availability, and Maintainability analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        This module is coming soon. It will include system reliability modeling and availability calculations.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* System Component List */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">System Components</CardTitle>
                  <CardDescription>
                    Components in selected system available for analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedSystemId ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Please select a system first</p>
                    </div>
                  ) : (
                    <SystemComponentsList systemId={selectedSystemId} />
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RcmPage;