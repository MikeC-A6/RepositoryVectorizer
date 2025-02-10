import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { Repository } from "@shared/schema";

interface RepositoryStatusProps {
  status: Repository["status"] | undefined | null;
}

export function RepositoryStatus({ status }: RepositoryStatusProps) {
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