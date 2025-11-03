import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, FileText, CheckCircle } from "lucide-react";
import { useCanvasAssignments, useCanvasCalendar, useCanvasFiles } from "@/hooks/useCanvasData";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";

const CanvasSync = () => {
  const { 
    data: assignmentsData, 
    refetch: refetchAssignments, 
    isFetching: isFetchingAssignments,
    dataUpdatedAt: assignmentsUpdatedAt 
  } = useCanvasAssignments();

  const { 
    data: calendarData, 
    refetch: refetchCalendar, 
    isFetching: isFetchingCalendar,
    dataUpdatedAt: calendarUpdatedAt 
  } = useCanvasCalendar();

  const { 
    data: filesData, 
    refetch: refetchFiles, 
    isFetching: isFetchingFiles,
    dataUpdatedAt: filesUpdatedAt 
  } = useCanvasFiles();

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchAssignments(),
      refetchCalendar(),
      refetchFiles()
    ]);
    toast({
      title: "Canvas data refreshed",
      description: "All Canvas data has been updated successfully.",
    });
  };

  const groupFilesByFolder = (files: any[]) => {
    const grouped = new Map<string, any[]>();
    const uncategorized: any[] = [];

    files.forEach(file => {
      if (file.folder?.full_name) {
        const folderName = file.folder.full_name;
        if (!grouped.has(folderName)) {
          grouped.set(folderName, []);
        }
        grouped.get(folderName)?.push(file);
      } else {
        uncategorized.push(file);
      }
    });

    return { grouped, uncategorized };
  };

  const isFetching = isFetchingAssignments || isFetchingCalendar || isFetchingFiles;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Canvas Integration</h2>
        <Button
          onClick={handleRefreshAll}
          disabled={isFetching}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Canvas Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Canvas Assignments
            </CardTitle>
            {assignmentsUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(assignmentsUpdatedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {assignmentsData?.assignments?.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Showing {assignmentsData.assignments.length} assignments
                </p>
                {assignmentsData.assignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{assignment.name}</h4>
                        {assignment.due_at && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(assignment.due_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {assignment.html_url && (
                        <a
                          href={assignment.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No assignments found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Canvas Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Canvas Calendar
            </CardTitle>
            {calendarUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(calendarUpdatedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {calendarData?.events?.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Showing {calendarData.events.length} events
                </p>
                {calendarData.events.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        {event.start_at && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.start_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {event.html_url && (
                        <a
                          href={event.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No events found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Canvas Files */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Canvas Files
            </CardTitle>
            {filesUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(filesUpdatedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            {filesData?.files?.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Showing {filesData.files.length} files
                </p>
                <Accordion type="single" collapsible className="w-full">
                  {(() => {
                    const { grouped, uncategorized } = groupFilesByFolder(filesData.files);
                    return (
                      <>
                        {Array.from(grouped.entries()).map(([folderName, files]) => (
                          <AccordionItem key={folderName} value={folderName}>
                            <AccordionTrigger className="text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {folderName} ({files.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-6">
                                {files.map((file: any) => (
                                  <div
                                    key={file.id}
                                    className="p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">{file.display_name}</span>
                                      {file.url && (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary text-xs hover:underline"
                                        >
                                          Download
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                        {uncategorized.length > 0 && (
                          <AccordionItem value="uncategorized">
                            <AccordionTrigger className="text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Uncategorized ({uncategorized.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-6">
                                {uncategorized.map((file: any) => (
                                  <div
                                    key={file.id}
                                    className="p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">{file.display_name}</span>
                                      {file.url && (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary text-xs hover:underline"
                                        >
                                          Download
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </>
                    );
                  })()}
                </Accordion>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No files found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CanvasSync;
