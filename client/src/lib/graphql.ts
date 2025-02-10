const GITHUB_API = "https://api.github.com/graphql";

export interface FileNode {
  path: string;
  content: string;
  metadata: {
    size: number;
    extension: string;
    lastModified: string;
  };
}

export async function fetchRepositoryFiles(url: string): Promise<FileNode[]> {
  // Extract owner and name from URL
  const [owner, name] = url
    .replace("https://github.com/", "")
    .replace(".git", "")
    .split("/");

  const query = `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        object(expression: "HEAD:") {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Blob {
                  text
                  byteSize
                }
              }
            }
          }
        }
      }
    }
  `;

  if (!import.meta.env.VITE_GITHUB_TOKEN) {
    throw new Error("GitHub token is not configured");
  }

  const res = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `bearer ${import.meta.env.VITE_GITHUB_TOKEN}`
    },
    body: JSON.stringify({
      query,
      variables: { owner, name },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GitHub API error: ${error}`);
  }

  const data = await res.json();

  if (data.errors) {
    throw new Error(
      `GraphQL Error: ${data.errors.map((e: any) => e.message).join(", ")}`
    );
  }

  return processGraphQLResponse(data);
}

function processGraphQLResponse(data: any): FileNode[] {
  if (!data.data?.repository?.object?.entries) {
    return [];
  }

  const entries = data.data.repository.object.entries;
  return entries.map((entry: any) => ({
    path: entry.name,
    content: entry.object.text || "",
    metadata: {
      size: entry.object.byteSize,
      extension: entry.name.split(".").pop() || "",
      lastModified: new Date().toISOString(),
    },
  }));
}