import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, FileUpIcon, TableIcon } from "lucide-react";
import { Asset } from "@shared/schema";

interface ImportedEvent {
  failureDate: string;
  tbf: number;
  failedPart: string;
  failureDescription: string;
  downtime: number;
  repairCost: number;
  location: string;
  rootCause: string;
  maintenanceType: string;
  actionTaken: string;
  detectionMethod: string;
  recommendedTask: string;
  frequency: string;
}

interface PreparedEvent {
  assetId: number;
  eventType: string; // PM or CM
  eventDate: string;
  cost: number;
  downtime: number;
  description: string;
}

const MaintenanceImport = ({ assets }: { assets: Asset[] }) => {
  const queryClient = useQueryClient();
  const [importedData, setImportedData] = useState<ImportedEvent[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [fileUploadStep, setFileUploadStep] = useState<'upload' | 'map' | 'review' | 'complete'>('upload');
  const [mappedEvents, setMappedEvents] = useState<PreparedEvent[]>([]);

  // Add maintenance events mutation
  const batchAddEventsMutation = useMutation({
    mutationFn: (events: PreparedEvent[]) => 
      apiRequest("POST", "/api/maintenance-events/batch", events),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-events'] });
      setFileUploadStep('complete');
      toast({ 
        title: "Success", 
        description: `${mappedEvents.length} maintenance events imported successfully.` 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to import maintenance events",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Use Papa Parse to parse CSV
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        console.log("Parsed data:", results.data);
        // Transform parsed data to our format
        const transformedData = results.data.map((row: any) => ({
          failureDate: row["Failure Date"] || "",
          tbf: parseFloat(row["TBF (Days)"] || "0"),
          failedPart: row["Failed Part"] || "",
          failureDescription: row["Failure Description"] || "",
          downtime: parseFloat(row["Downtime (hrs)"] || "0"),
          repairCost: parseFloat(row["Repair Cost"] || "0"),
          location: row["Pump ID / Location"] || "",
          rootCause: row["Root Cause"] || "",
          maintenanceType: row["Maintenance Type"] || "",
          actionTaken: row["Action Taken"] || "",
          detectionMethod: row["Detection Method"] || "",
          recommendedTask: row["Recommended Task (PM/Pdm)"] || "",
          frequency: row["Frequency"] || ""
        })).filter((item: ImportedEvent) => item.failureDate);

        setImportedData(transformedData);
        setFileUploadStep('map');
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        toast({ 
          title: "Error", 
          description: "Failed to parse the CSV file. Please check the format.",
          variant: "destructive"
        });
      }
    });
  };

  const handleAssetSelect = (assetId: number) => {
    setSelectedAssetId(assetId);

    // Map the imported data to maintenance events for this asset
    const mappedData = importedData.map((item) => ({
      assetId,
      eventType: item.maintenanceType === "Preventive" ? "PM" : "CM",
      eventDate: convertDateFormat(item.failureDate),
      cost: item.repairCost,
      downtime: item.downtime,
      description: `${item.failureDescription} - ${item.failedPart} (${item.rootCause})`
    }));

    setMappedEvents(mappedData);
    setFileUploadStep('review');
  };

  const convertDateFormat = (dateStr: string) => {
    try {
      // Assuming input format like "13-Feb-00"
      const parts = dateStr.split("-");
      if (parts.length !== 3) return "";

      const day = parts[0];
      let month;
      
      switch(parts[1].toLowerCase()) {
        case 'jan': month = '01'; break;
        case 'feb': month = '02'; break;
        case 'mar': month = '03'; break;
        case 'apr': month = '04'; break;
        case 'may': month = '05'; break;
        case 'jun': month = '06'; break;
        case 'jul': month = '07'; break;
        case 'aug': month = '08'; break;
        case 'sep': month = '09'; break;
        case 'oct': month = '10'; break;
        case 'nov': month = '11'; break;
        case 'dec': month = '12'; break;
        default: month = '01';
      }
      
      let year = parts[2];
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        // Assuming 00-99 refers to 2000-2099
        year = `20${year}`;
      }
      
      return `${year}-${month}-${day.padStart(2, '0')}`;
    } catch (error) {
      console.error("Error converting date format:", error);
      return "";
    }
  };

  const handleImport = () => {
    if (mappedEvents.length > 0) {
      batchAddEventsMutation.mutate(mappedEvents);
    } else {
      toast({ 
        title: "Error", 
        description: "No maintenance events to import",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Maintenance Data</CardTitle>
        <CardDescription>
          Import maintenance events from CSV or Excel files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" value={fileUploadStep}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">1. Upload File</TabsTrigger>
            <TabsTrigger value="map">2. Map Asset</TabsTrigger>
            <TabsTrigger value="review">3. Review Data</TabsTrigger>
            <TabsTrigger value="complete">4. Complete</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="py-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <FileUpIcon className="w-12 h-12 mb-4 text-gray-400" />
              <p className="mb-4 text-sm text-gray-500">Upload a CSV file containing maintenance events</p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="max-w-xs"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="map" className="py-4">
            <Alert className="mb-4">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Select an asset</AlertTitle>
              <AlertDescription>
                Choose which asset these maintenance events belong to
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {assets.map((asset) => (
                <Card 
                  key={asset.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${selectedAssetId === asset.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleAssetSelect(asset.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                    <CardDescription>ID: {asset.assetNumber}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      {asset.equipmentClass ? asset.equipmentClass : 'No equipment class'}
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="review" className="py-4">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Review Maintenance Events</h3>
              <div>
                <span className="text-sm text-muted-foreground mr-2">
                  {mappedEvents.length} events found
                </span>
                <Button onClick={handleImport} disabled={batchAddEventsMutation.isPending}>
                  {batchAddEventsMutation.isPending ? "Importing..." : "Import Events"}
                </Button>
              </div>
            </div>
            
            <div className="border rounded-md max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Downtime (hrs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedEvents.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell>{event.eventDate}</TableCell>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell className="max-w-md truncate">{event.description}</TableCell>
                      <TableCell>${event.cost.toFixed(2)}</TableCell>
                      <TableCell>{event.downtime.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="complete" className="py-4">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6 text-green-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Import Complete</h3>
              <p className="text-muted-foreground mb-4">
                {mappedEvents.length} maintenance events have been imported successfully
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFileUploadStep('upload');
                  setImportedData([]);
                  setSelectedAssetId(null);
                  setMappedEvents([]);
                }}
              >
                Import More Data
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MaintenanceImport;