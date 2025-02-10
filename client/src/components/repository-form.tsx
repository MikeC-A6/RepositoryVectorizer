import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRepositorySchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Repository } from "@shared/schema";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useRepositoryProcessing } from "@/hooks/use-repository-processing";
import { RepositoryStatus } from "./repository-status";

interface RepositoryFormProps {
  onSuccess: (repository: Repository) => void;
}

interface CheckRepositoryResponse {
  exists: boolean;
  repository?: Repository;
}

export function RepositoryForm({ onSuccess }: RepositoryFormProps) {
  const { toast } = useToast();
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showNameUpdateDialog, setShowNameUpdateDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<{ url: string; name: string } | null>(null);
  const [existingRepository, setExistingRepository] = useState<Repository | null>(null);
  
  const {
    startProcessing,
    clearProcessing,
    isProcessing,
    repositoryStatus,
    processingRepository
  } = useRepositoryProcessing({
    onComplete: () => {
      // Reset form state when processing completes
      setPendingValues(null);
      setExistingRepository(null);
    }
  });

  const form = useForm({
    resolver: zodResolver(insertRepositorySchema.extend({
      url: insertRepositorySchema.shape.url.url()
    })),
    defaultValues: {
      url: "",
      name: ""
    }
  });

  const checkRepository = async (url: string): Promise<CheckRepositoryResponse> => {
    const res = await apiRequest("GET", `/api/repositories/check?url=${encodeURIComponent(url)}`);
    return res.json();
  };

  const mutation = useMutation({
    mutationFn: async (values: { url: string, name: string }) => {
      const res = await apiRequest("POST", "/api/repositories", values);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to process repository");
      }
      return data as Repository;
    },
    onSuccess: (data) => {
      toast({
        title: "Processing Started",
        description: "Repository processing has begun. You'll see the progress below.",
      });
      startProcessing(data);
      onSuccess(data);
      form.reset();
      setShowOverwriteDialog(false);
      setShowNameUpdateDialog(false);
      setPendingValues(null);
      setExistingRepository(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (values: { url: string; name: string }) => {
    // Clear any existing processing state
    clearProcessing();

    try {
      const result = await checkRepository(values.url);
      if (result.exists && result.repository) {
        setPendingValues(values);
        setExistingRepository(result.repository);
        if (result.repository.name !== values.name) {
          setShowNameUpdateDialog(true);
        } else {
          setShowOverwriteDialog(true);
        }
      } else if (result.exists) {
        // Handle the case where exists is true but repository data is missing
        toast({
          title: "Error",
          description: "Repository exists but data is missing. Please try again.",
          variant: "destructive"
        });
      } else {
        await mutation.mutateAsync(values);
      }
    } catch (error) {
      console.error("Error checking repository:", error);
      clearProcessing();
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred checking the repository",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setPendingValues(null);
    setShowOverwriteDialog(false);
    setShowNameUpdateDialog(false);
    setExistingRepository(null);
    clearProcessing();
  };

  const currentStatus = repositoryStatus?.status ?? processingRepository?.status;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/user/repo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Repository" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={mutation.isPending || isProcessing}>
                {mutation.isPending || isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Repository...
                  </>
                ) : (
                  "Process Repository"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {currentStatus && <RepositoryStatus status={currentStatus} />}

      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Repository Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              This repository has already been processed. Would you like to process it again?
              This will delete all existing data and reprocess the repository from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (pendingValues) {
                  try {
                    await mutation.mutateAsync(pendingValues);
                  } catch (error) {
                    // Error will be handled by mutation error handler
                  }
                }
              }}
            >
              Delete and Reprocess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showNameUpdateDialog} onOpenChange={setShowNameUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Repository Name</AlertDialogTitle>
            <AlertDialogDescription>
              This repository already exists with a different name. Would you like to update the name and process it again?
              This will delete all existing data, update the name from "{existingRepository?.name}" to "{pendingValues?.name}", and reprocess the repository from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (pendingValues) {
                  try {
                    await mutation.mutateAsync(pendingValues);
                  } catch (error) {
                    // Error will be handled by mutation error handler
                  }
                }
              }}
            >
              Update Name and Reprocess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
