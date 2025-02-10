import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export function RepositoryList() {
  const { data: repositories, isLoading } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processed Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!repositories?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processed Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No repositories have been processed yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processed Repositories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {repo.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : repo.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  )}
                  <h3 className="font-medium">{repo.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{repo.url}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Processed {formatDistanceToNow(new Date(repo.processedAt))} ago
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 