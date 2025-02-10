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
  // Extract owner, name and path from URL
  const urlPath = url
    .replace("https://github.com/", "")
    .replace(".git", "");

  const [owner, name, ...pathParts] = urlPath.split("/");
  // Remove 'tree' and 'blob' segments and branch name from path
  const dirPath = pathParts
    .filter(part => part !== "tree" && part !== "blob")
    .slice(1)
    .join("/");

  console.log(`Fetching repository data for ${owner}/${name}, path: ${dirPath}`);

  const query = `
    query ($owner: String!, $name: String!, $expression: String!) {
      repository(owner: $owner, name: $name) {
        object(expression: $expression) {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Tree {
                  entries {
                    name
                    type
                    object {
                      ... on Blob {
                        text
                        byteSize
                      }
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

  console.log(`Making GraphQL request to GitHub API for path: ${dirPath}`);
  const res = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: { 
        owner, 
        name,
        expression: `HEAD:${dirPath}`
      },
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

  const files = processGraphQLResponse(data, dirPath);
  console.log(`Processed ${files.length} files from GraphQL response`);
  return files;
}

function processGraphQLResponse(data: any, basePath: string): FileNode[] {
  if (!data.data?.repository?.object?.entries) {
    console.warn("No entries found in GraphQL response");
    return [];
  }

  const files: FileNode[] = [];
  const processEntries = (entries: any[], currentPath: string) => {
    for (const entry of entries) {
      const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.type === "blob" && entry.object?.text !== undefined) {
        files.push({
          path,
          content: entry.object.text || "",
          metadata: {
            size: entry.object.byteSize,
            extension: entry.name.split(".").pop() || "",
            lastModified: new Date().toISOString(),
          },
        });
      } else if (entry.type === "tree" && entry.object?.entries) {
        processEntries(entry.object.entries, path);
      }
    }
  };

  processEntries(data.data.repository.object.entries, basePath);
  return files;
}