import { RepositoryForm } from "@/components/repository-form";
import { RepositoryList } from "@/components/repository-list";
import { useState } from "react";
import type { Repository } from "@shared/schema";

export default function Home() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Repository Processor</h1>
          <p className="text-muted-foreground">
            Enter a repository URL to process its structure and contents
          </p>
        </header>

        <RepositoryForm onSuccess={setSelectedRepo} />
        <RepositoryList />
      </div>
    </div>
  );
}