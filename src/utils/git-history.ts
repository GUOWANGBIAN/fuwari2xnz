import { execSync } from "node:child_process";
import { gitHubEditConfig } from "../config";

export interface Commit {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export function getPostHistory(filePath: string): Commit[] {
  try {
    // Check if git is available
    try {
      execSync("git --version", { stdio: "ignore" });
    } catch (e) {
      console.warn("Git is not installed or not available in PATH.");
      return [];
    }

    // Get git log
    // --follow: Continue listing the history of a file beyond renames
    // --pretty=format: Custom format for easy parsing
    // %H: Commit hash
    // %ad: Author date (format specified by --date)
    // %s: Subject (commit message)
    // %an: Author name
    const output = execSync(
      `git log --follow --pretty=format:"%H|%ad|%s|%an" --date=iso -- "${filePath}"`,
      { encoding: "utf-8" }
    );

    if (!output) {
      return [];
    }

    return output
      .split("\n")
      .map((line) => {
        const [hash, date, message, author] = line.split("|");
        return { hash, date, message, author };
      })
      .filter((commit) => commit.hash && commit.date); // Filter out empty lines
  } catch (e) {
    console.error(`Failed to get git history for file: ${filePath}`, e);
    return [];
  }
}

export function getCommitUrl(hash: string): string {
  if (!gitHubEditConfig.enable || !gitHubEditConfig.baseUrl) {
    return "#";
  }

  // extract repo url from edit url
  // edit url example: https://github.com/afoim/fuwari/blob/main/src/content/posts
  // commit url: https://github.com/afoim/fuwari/commit/HASH
  
  // Try to find the repo root
  // This is a simple heuristic: remove /blob/...
  const blobIndex = gitHubEditConfig.baseUrl.indexOf("/blob/");
  if (blobIndex !== -1) {
    const repoRoot = gitHubEditConfig.baseUrl.substring(0, blobIndex);
    return `${repoRoot}/commit/${hash}`;
  }
  
  // If structure is different, might just append to base if it was a repo root (unlikely given config name)
  // Fallback: assume baseUrl is close to repo root or user can't use this feature fully without config tweak
  return `${gitHubEditConfig.baseUrl}/../../commit/${hash}`; // Very rough guess if parsing fails
}
