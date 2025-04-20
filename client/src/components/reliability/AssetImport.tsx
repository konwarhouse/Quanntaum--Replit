import { useState, useRef, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { read, utils, write } from "xlsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { InsertAsset } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check, X, Upload, FileText, Copy, AlertTriangle } from "lucide-react";

// Define the schema for asset validation
const assetImportSchema = z.object({
  assets: z.array(
    z.object({
      assetNumber: z.string().min(1, "Asset number is required"),
      name: z.string().min(1, "Name is required"),
      equipmentClass: z.string().optional(),
      description: z.string().default(""),
      criticality: z.enum(["High", "Medium", "Low"]).default("Medium"),
      installationDate: z.string().optional(),
      weibullBeta: z.coerce.number().positive().default(2.0),
      weibullEta: z.coerce.number().positive().default(5000),
      timeUnit: z.enum(["hours", "days", "months", "years"]).default("hours"),
    })
  ),
});

type AssetImportFormValues = z.infer<typeof assetImportSchema>;

// Expected column headers for Excel/CSV import
const expectedHeaders = [
  "assetNumber",
  "name", 
  "equipmentClass", 
  "description", 
  "criticality", 
  "installationDate", 
  "weibullBeta", 
  "weibullEta", 
  "timeUnit"
];

// Example template data for download
const templateData = [
  {
    assetNumber: "PUMP-001",
    name: "Cooling Water Pump",
    equipmentClass: "Pump",
    description: "Primary cooling water pump for main process",
    criticality: "High",
    installationDate: "2023-01-15",
    weibullBeta: 2.1,
    weibullEta: 5000,
    timeUnit: "hours",
  },
  {
    assetNumber: "MOT-002",
    name: "Conveyor Drive Motor",
    equipmentClass: "Motor",
    description: "Main drive for primary conveyor belt",
    criticality: "Medium",
    installationDate: "2023-02-20",
    weibullBeta: 1.8,
    weibullEta: 8000,
    timeUnit: "hours",
  },
];

const AssetImport = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("excel");
  const [parsedAssets, setParsedAssets] = useState<any[]>([]);
  const [pasteContent, setPasteContent] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form
  const form = useForm<AssetImportFormValues>({
    resolver: zodResolver(assetImportSchema),
    defaultValues: {
      assets: [],
    },
  });

  // Mutation for batch creating assets
  const importAssetsMutation = useMutation({
    mutationFn: async (assets: any[]) => {
      const response = await fetch('/api/assets/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assets),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import assets');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Assets imported successfully",
        description: `Imported ${data.imported} out of ${data.total} assets`,
      });
      setParsedAssets([]);
      setShowPreview(false);
      form.reset();
      setPasteContent("");
    },
    onError: (error) => {
      console.error("Error importing assets:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Handler for Excel file upload
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        
        // Assume first sheet contains the data
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = utils.sheet_to_json(worksheet);
        
        // Process and validate data
        processImportData(jsonData);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          title: "Error parsing file",
          description: "The file format is incorrect or corrupted",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsBinaryString(file);
    
    // Reset the input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler for paste input
  const handlePasteContent = () => {
    try {
      // Try to parse as TSV (tab-separated) or CSV (comma-separated)
      const lines = pasteContent.trim().split('\n');
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      
      const headers = lines[0].split(delimiter).map(h => h.trim());
      
      const jsonData = lines.slice(1).map(line => {
        const values = line.split(delimiter);
        return headers.reduce((obj, header, index) => {
          // Map header names to our expected format
          let mappedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Handle common variations
          if (mappedHeader.includes('asset') && mappedHeader.includes('number')) mappedHeader = 'assetNumber';
          if (mappedHeader.includes('equipment') && mappedHeader.includes('class')) mappedHeader = 'equipmentClass';
          if (mappedHeader === 'beta' || mappedHeader.includes('weibull') && mappedHeader.includes('beta')) mappedHeader = 'weibullBeta';
          if (mappedHeader === 'eta' || mappedHeader.includes('weibull') && mappedHeader.includes('eta')) mappedHeader = 'weibullEta';
          if (mappedHeader.includes('install') && mappedHeader.includes('date')) mappedHeader = 'installationDate';
          if (mappedHeader.includes('time') && mappedHeader.includes('unit')) mappedHeader = 'timeUnit';
          
          obj[mappedHeader] = values[index]?.trim() || '';
          return obj;
        }, {} as Record<string, any>);
      });
      
      processImportData(jsonData);
    } catch (error) {
      console.error("Error parsing pasted content:", error);
      toast({
        title: "Error parsing pasted content",
        description: "The format is incorrect. Please ensure data is properly formatted as TSV or CSV.",
        variant: "destructive",
      });
    }
  };

  // Process and validate imported data
  const processImportData = (data: any[]) => {
    if (!data.length) {
      toast({
        title: "No data found",
        description: "The file or pasted content contains no valid data",
        variant: "destructive",
      });
      return;
    }
    
    // Validation checks
    const errors: Record<string, string[]> = {};
    
    // Processed assets with validation
    const processedAssets = data.map((item, index) => {
      const rowErrors: string[] = [];
      
      // Check required fields
      if (!item.assetNumber) rowErrors.push("Asset number is required");
      if (!item.name) rowErrors.push("Asset name is required");
      
      // Set defaults for optional fields if missing
      const asset = {
        assetNumber: item.assetNumber || "",
        name: item.name || "",
        equipmentClass: item.equipmentClass || "",
        description: item.description || "",
        criticality: item.criticality || "Medium",
        installationDate: item.installationDate || null,
        weibullBeta: parseFloat(item.weibullBeta || "2.0"),
        weibullEta: parseFloat(item.weibullEta || "5000"),
        timeUnit: item.timeUnit || "hours",
      };
      
      // Validate numeric fields
      if (isNaN(asset.weibullBeta) || asset.weibullBeta <= 0) {
        rowErrors.push("Weibull Beta must be a positive number");
        asset.weibullBeta = 2.0;
      }
      
      if (isNaN(asset.weibullEta) || asset.weibullEta <= 0) {
        rowErrors.push("Weibull Eta must be a positive number");
        asset.weibullEta = 5000;
      }
      
      // Validate criticality
      if (!["High", "Medium", "Low"].includes(asset.criticality)) {
        rowErrors.push("Criticality must be High, Medium, or Low");
        asset.criticality = "Medium";
      }
      
      // Validate time unit
      if (!["hours", "days", "months", "years"].includes(asset.timeUnit)) {
        rowErrors.push("Time unit must be hours, days, months, or years");
        asset.timeUnit = "hours";
      }
      
      // Validate installation date
      if (asset.installationDate) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(asset.installationDate)) {
          rowErrors.push("Installation date must be in YYYY-MM-DD format");
        }
      }
      
      // Store errors for this row
      if (rowErrors.length > 0) {
        errors[index] = rowErrors;
      }
      
      return asset;
    });
    
    setParsedAssets(processedAssets);
    setValidationErrors(errors);
    setShowPreview(true);
    
    // Set form value for submission
    form.setValue('assets', processedAssets);
  };

  // Handle form submission
  const onSubmit = (data: AssetImportFormValues) => {
    importAssetsMutation.mutate(data.assets);
  };

  // Generate and download template
  const downloadTemplate = () => {
    const worksheet = utils.json_to_sheet(templateData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Assets");
    
    // Generate Excel file
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create Blob and download link
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_import_template.xlsx';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Export table data to clipboard
  const copyTemplateToClipboard = () => {
    // Create TSV format
    const headers = Object.keys(templateData[0]).join('\t');
    const rows = templateData.map(row => Object.values(row).join('\t')).join('\n');
    const tsvContent = `${headers}\n${rows}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(tsvContent)
      .then(() => {
        toast({
          title: "Template copied to clipboard",
          description: "You can now paste it into a spreadsheet or text editor",
        });
      })
      .catch(err => {
        console.error("Failed to copy template:", err);
        toast({
          title: "Failed to copy template",
          description: "Please try again or download the Excel template",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Import</h2>
          <p className="text-muted-foreground">
            Import multiple assets from Excel or copy-paste
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Import Assets</CardTitle>
          <CardDescription>
            Upload an Excel file or paste data to import multiple assets at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="excel">
                <FileText className="h-4 w-4 mr-2" />
                Excel Upload
              </TabsTrigger>
              <TabsTrigger value="paste">
                <Copy className="h-4 w-4 mr-2" />
                Copy & Paste
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="excel" className="mt-4 space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload Excel File</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Drag and drop an Excel file here or click to browse
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="max-w-sm"
                  onChange={handleFileUpload}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Need a template? 
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyTemplateToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="paste" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paste-area">Paste Data (Tab or Comma Separated)</Label>
                <Textarea
                  id="paste-area"
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder={`assetNumber\tname\tequipmentClass\tdescription\tcriticality\tinstallationDate\tweibullBeta\tweibullEta\ttimeUnit\nPUMP-001\tCooling Water Pump\tPump\tPrimary cooling pump\tHigh\t2023-01-15\t2.1\t5000\thours`}
                />
                <Button 
                  className="mt-2" 
                  onClick={handlePasteContent}
                  disabled={!pasteContent.trim()}
                >
                  Process Pasted Data
                </Button>
              </div>
              
              <div className="text-sm space-y-2 border rounded-md p-4 bg-muted/30">
                <h4 className="font-medium">Required Format:</h4>
                <ul className="space-y-1 list-disc pl-5">
                  <li>First row should contain column headers</li>
                  <li>Data can be tab-separated or comma-separated</li>
                  <li>Required columns: assetNumber, name</li>
                  <li>Optional columns: equipmentClass, description, criticality, installationDate, weibullBeta, weibullEta, timeUnit</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {showPreview && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Preview & Validate</CardTitle>
                <CardDescription>
                  Review the imported data before saving to the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(validationErrors).length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
                      <div>
                        <h3 className="font-medium text-amber-800">Validation Warnings</h3>
                        <p className="text-sm text-amber-700">
                          Some records have validation issues. Defaults will be applied where possible.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Asset Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Equipment Class</TableHead>
                        <TableHead>Criticality</TableHead>
                        <TableHead>Installation Date</TableHead>
                        <TableHead>Weibull β</TableHead>
                        <TableHead>Weibull η</TableHead>
                        <TableHead>Time Unit</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedAssets.map((asset, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{asset.assetNumber}</TableCell>
                          <TableCell>{asset.name}</TableCell>
                          <TableCell>{asset.equipmentClass || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                asset.criticality === "High" 
                                  ? "bg-red-100 text-red-800 hover:bg-red-100" 
                                  : asset.criticality === "Medium"
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              }
                            >
                              {asset.criticality}
                            </Badge>
                          </TableCell>
                          <TableCell>{asset.installationDate || "-"}</TableCell>
                          <TableCell>{asset.weibullBeta}</TableCell>
                          <TableCell>{asset.weibullEta}</TableCell>
                          <TableCell>{asset.timeUnit}</TableCell>
                          <TableCell>
                            {validationErrors[index] ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-amber-500">
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Validation Issues</DialogTitle>
                                    <DialogDescription>
                                      The following issues were found with this asset:
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {validationErrors[index].map((error, i) => (
                                      <li key={i} className="text-sm">{error}</li>
                                    ))}
                                  </ul>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Check className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>
                      Found {parsedAssets.length} assets, with {Object.keys(validationErrors).length} having validation issues
                    </TableCaption>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false);
                    setParsedAssets([]);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={parsedAssets.length === 0 || importAssetsMutation.isPending}
                >
                  {importAssetsMutation.isPending ? "Importing..." : "Import Assets"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
};

export default AssetImport;