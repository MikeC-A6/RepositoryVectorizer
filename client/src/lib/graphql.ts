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

  const res = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { owner, name },
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch repository data");
  }

  const data = await res.json();
  return processGraphQLResponse(data);
}

function processGraphQLResponse(data: any): FileNode[] {
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
