import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, Repository } from "@shared/schema";
import { FileIcon, FolderIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface RepositoryViewProps {
  repository: Repository;
}

export function RepositoryView({ repository }: RepositoryViewProps) {
  const { toast } = useToast();

  const generateEmbeddings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/repositories/${repository.id}/generate-embeddings`
      );
      if (!res.ok) {
        throw new Error("Failed to generate embeddings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Embeddings Generation Started",
        description: "The repository content is being processed for embeddings.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate embeddings",
        variant: "destructive",
      });
    },
  });

  // Query for repository status
  const { data: repositoryStatus, refetch } = useQuery<Repository>({
    queryKey: ["/api/repositories", repository.id],
    refetchInterval: false, // We'll manage refetching manually
  });

  // Get the current status, preferring the latest from the query
  const currentStatus = repositoryStatus?.status || repository.status;

  // Set up polling when status is pending
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (currentStatus === "pending") {
      pollInterval = setInterval(() => {
        refetch();
      }, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentStatus, refetch]);

  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: ["/api/repositories", repository.id, "files"],
    enabled: repositoryStatus?.status === "completed" || repositoryStatus?.status === "ready_for_embedding",
  });

  console.log("Repository View - Current Status:", currentStatus); // Debug log

  if (currentStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Repository</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={undefined} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Analyzing repository structure and contents...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (currentStatus === "failed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              There was an error processing the repository. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (currentStatus === "ready_for_embedding") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Ready for Embeddings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Repository files have been processed. Would you like to generate embeddings now?
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => generateEmbeddings.mutate()}
            disabled={generateEmbeddings.isPending}
          >
            {generateEmbeddings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Embeddings...
              </>
            ) : (
              "Generate Embeddings"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>Repository Structure</CardTitle>
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Repository has been successfully processed and indexed.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="space-y-2">
            {files?.map((file) => (
              <div key={file.id} className="flex items-center gap-2">
                {file.path.includes("/") ? (
                  <FolderIcon className="h-4 w-4 text-blue-500" />
                ) : (
                  <FileIcon className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm">{file.path}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}