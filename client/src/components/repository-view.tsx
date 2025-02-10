import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, Repository } from "@shared/schema";
import { FileIcon, FolderIcon } from "lucide-react";

interface RepositoryViewProps {
  repository: Repository;
}

export function RepositoryView({ repository }: RepositoryViewProps) {
  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: ["/api/repositories", repository.id, "files"],
  });

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
      <CardHeader>
        <CardTitle>Repository Structure</CardTitle>
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
