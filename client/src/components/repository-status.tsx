import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { Repository } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RepositoryStatusProps {
  status: Repository["status"] | undefined | null;
  repositoryId: number;
}

export function RepositoryStatus({ status, repositoryId }: RepositoryStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const generateEmbeddings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/repositories/${repositoryId}/generate-embeddings`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to generate embeddings");
      }
      // Only try to parse as JSON if we have a content-type header indicating JSON
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      }
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Embeddings Generation Started",
        description: "The repository content is being processed for embeddings.",
      });
      // Invalidate the repository query to get the latest status
      queryClient.invalidateQueries({ queryKey: ["/api/repositories", repositoryId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate embeddings",
        variant: "destructive",
      });
    },
  });

  if (!status) return null;

  if (status === "pending") {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Processing Repository</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={undefined} className="w-full" />
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Analyzing repository structure and contents...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (status === "ready_for_embedding") {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Ready for Embeddings</CardTitle>
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

  if (status === "completed") {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Processing Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Repository has been successfully processed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (status === "failed") {
    return (
      <Card className="mt-4">
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

  return null;
} 