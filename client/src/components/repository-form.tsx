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

interface RepositoryFormProps {
  onSuccess: (repository: Repository) => void;
}

export function RepositoryForm({ onSuccess }: RepositoryFormProps) {
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(insertRepositorySchema.extend({
      url: insertRepositorySchema.shape.url.url()
    })),
    defaultValues: {
      url: "",
      name: ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: { url: string, name: string }) => {
      const res = await apiRequest("POST", "/api/repositories", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Repository processing started",
        description: "We'll notify you once it's complete"
      });
      onSuccess(data);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
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

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Processing..." : "Process Repository"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
