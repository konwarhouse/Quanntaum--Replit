import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SystemManager from '@/components/rcm/SystemManager';
import ComponentManager from '@/components/rcm/ComponentManager';
import { Loader2 } from 'lucide-react';

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reliability Centered Maintenance</h1>
        <p className="text-muted-foreground">
          A comprehensive approach to maintenance strategy using FMECA, RCM, and RAM analysis.
        </p>
      </div>

      <Tabs defaultValue="systems" className="w-full">
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
          
          <SystemManager onSystemSelect={(id: number) => setSelectedSystemId(id)} />
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
          <Card>
            <CardHeader>
              <CardTitle>RCM Analysis</CardTitle>
              <CardDescription>
                Perform comprehensive RCM analysis including FMECA, RCM decision logic, and RAM analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-12">
                <p className="text-muted-foreground">Analysis functionality coming soon.</p>
                <p className="text-sm mt-4">
                  The analysis module will provide tools for FMECA (Failure Mode, Effects and Criticality Analysis), 
                  RCM decision logic, and RAM (Reliability, Availability, Maintainability) analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RcmPage;