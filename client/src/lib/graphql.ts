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

export async function fetchRepositoryFiles(url: string, token: string): Promise<FileNode[]> {
  // Extract owner and name from URL
  const [owner, name] = url
    .replace("https://github.com/", "")
    .replace(".git", "")
    .split("/");

  console.log(`Fetching repository data for ${owner}/${name}`);

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

  if (!token) {
    throw new Error("GitHub token is required");
  }

  console.log(`Making GraphQL request to GitHub API`);
  const res = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: { owner, name },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`GitHub API error response:`, error);
    throw new Error(`GitHub API error: ${error}`);
  }

  const data = await res.json();
  console.log(`Received GraphQL response:`, JSON.stringify(data, null, 2));

  if (data.errors) {
    console.error(`GraphQL errors:`, data.errors);
    throw new Error(
      `GraphQL Error: ${data.errors.map((e: any) => e.message).join(", ")}`
    );
  }

  const files = processGraphQLResponse(data);
  console.log(`Processed ${files.length} files from GraphQL response`);
  return files;
}

function processGraphQLResponse(data: any): FileNode[] {
  if (!data.data?.repository?.object?.entries) {
    console.warn("No entries found in GraphQL response");
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