import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Repository } from "@shared/schema";

interface UseRepositoryProcessingProps {
  onComplete?: () => void;
}

interface ApiError {
  message: string;
  status: number;
}

export function useRepositoryProcessing({ onComplete }: UseRepositoryProcessingProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingRepository, setProcessingRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const processingTimeoutRef = useRef<number | null>(null);

  const cleanupProcessing = useCallback((repositoryId?: number) => {
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    if (repositoryId) {
      queryClient.invalidateQueries({ 
        queryKey: ['repository-status', repositoryId] 
      });
    }
  }, [queryClient]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      cleanupProcessing();
    };
  }, [cleanupProcessing]);

  const { data: repositoryStatus, error: queryError } = useQuery<Repository, Error | ApiError>({
    queryKey: ['repository-status', processingRepository?.id],
    queryFn: async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/repositories/${processingRepository?.id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw {
            message: errorData.message || "Failed to fetch repository status",
            status: res.status
          } as ApiError;
        }
        return res.json();
      } finally {
        setIsLoading(false);
      }
    },
    refetchInterval: 2000,
    enabled: !!processingRepository?.id && 
             processingRepository.status === "pending" && 
             !processingTimeoutRef.current,
    gcTime: 0,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (queryError) {
      toast({
        title: "Error",
        description: queryError.message || "Failed to fetch repository status",
        variant: "destructive",
      });
      cleanupProcessing(processingRepository?.id);
      setProcessingRepository(null);
    }
  }, [queryError, toast, cleanupProcessing, processingRepository?.id]);

  useEffect(() => {
    if (!repositoryStatus || !processingRepository) return;

    // Only update if we have a non-pending status
    if (repositoryStatus.status !== "pending") {
      if (repositoryStatus.status === "completed") {
        toast({
          title: "Success!",
          description: "Repository has been successfully processed.",
          variant: "default",
        });
        // Clear processing state after a short delay to show the success state
        processingTimeoutRef.current = window.setTimeout(() => {
          setProcessingRepository(null);
          queryClient.invalidateQueries({ 
            queryKey: ['repository-status', processingRepository.id] 
          });
          onComplete?.();
        }, 3000);
      } else if (repositoryStatus.status === "failed") {
        toast({
          title: "Processing Failed",
          description: "There was an error processing the repository. Please try again.",
          variant: "destructive",
        });
        setProcessingRepository(null);
        queryClient.invalidateQueries({ 
          queryKey: ['repository-status', processingRepository.id] 
        });
      }
    }
  }, [repositoryStatus, processingRepository, toast, queryClient, onComplete]);

  const startProcessing = (repository: Repository) => {
    cleanupProcessing(processingRepository?.id);
    setProcessingRepository(repository);
  };

  const clearProcessing = () => {
    cleanupProcessing(processingRepository?.id);
    setProcessingRepository(null);
  };

  return {
    processingRepository,
    repositoryStatus,
    startProcessing,
    clearProcessing,
    isProcessing: isLoading || !!processingRepository || repositoryStatus?.status === "pending",
    isLoading
  };
} 