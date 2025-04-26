import React from 'react';
import { Badge } from "@/components/ui/badge";

const KpiDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">KPI Dashboard</h1>
        <p className="text-muted-foreground">
          A comprehensive approach to maintenance strategy using FMECA, RCM, and RAM analysis.
        </p>
        
        {/* Premium Feature Badge */}
        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-md">
          <h3 className="text-lg font-semibold text-blue-700 flex items-center">
            <Badge variant="default" className="mr-2 bg-blue-500">LICENSED USERS ONLY</Badge>
            Advanced Module Under Development
          </h3>
          <p className="mt-2 text-blue-700">
            The KPI Dashboard module is currently under development as part of a complete reliability engineering platform.
            These advanced features will be available exclusively for licensed users with full access to Weibull modeling and 
            comprehensive maintenance strategy optimization.
          </p>
          <p className="mt-2 text-blue-700">
            Please contact our support team for licensing information and early access to these features.
          </p>
        </div>
      </div>

      {/* Licensed feature overlay */}
      <div className="relative min-h-[400px] border border-border rounded-lg">
        {/* Overlay */}
        <div className="absolute inset-0 bg-white bg-opacity-90 z-20 flex items-center justify-center">
          <div className="p-8 rounded-lg shadow-md text-center">
            <Badge variant="default" className="mb-4 px-3 py-1 text-base bg-blue-500">LICENSED USERS ONLY</Badge>
            <h2 className="text-2xl font-bold mb-2">Feature Restricted</h2>
            <p className="text-lg mb-4">This functionality is only available to licensed users.</p>
            <p className="text-muted-foreground">
              Please contact our support team for licensing information and early access.
            </p>
          </div>
        </div>

        {/* Greyed out content placeholder */}
        <div className="opacity-30 pointer-events-none filter grayscale p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-3"></div>
                <div className="h-20 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 border border-border rounded-lg p-6">
            <div className="h-6 w-1/4 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-60 bg-gray-200 rounded"></div>
              <div className="h-60 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiDashboardPage;