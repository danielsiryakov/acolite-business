import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  addMessage,
  getMessages,
  getSession,
  upsertSession,
  type Message,
} from "./db";

const CONTAINER_IMAGE = "nanoclaw-agent:latest";
const CONTAINER_TIMEOUT = 300000; // 5 minutes
const GROUPS_DIR = path.join(process.cwd(), "nanoclaw-data", "groups");
const SESSIONS_DIR = path.join(process.cwd(), "nanoclaw-data", "sessions");

// Ensure directories exist
function ensureDirs(userId: string) {
  const groupDir = path.join(GROUPS_DIR, userId);
  const sessionDir = path.join(SESSIONS_DIR, userId, ".claude");
  const ipcDir = path.join(GROUPS_DIR, userId, "ipc");

  fs.mkdirSync(path.join(groupDir, "logs"), { recursive: true });
  fs.mkdirSync(path.join(ipcDir, "messages"), { recursive: true });
  fs.mkdirSync(path.join(ipcDir, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(ipcDir, "input"), { recursive: true });
  fs.mkdirSync(sessionDir, { recursive: true });

  // Create CLAUDE.md if it doesn't exist (agent memory)
  const claudeMd = path.join(groupDir, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) {
    fs.writeFileSync(
      claudeMd,
      `# NanoClaw Memory

This is your persistent memory file. You can write notes here to remember across conversations.

## User Preferences

(none yet)

## Important Context

(none yet)
`
    );
  }

  return { groupDir, sessionDir, ipcDir };
}

interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  assistantName: string;
}

interface ContainerOutput {
  status: "success" | "error";
  result?: string;
  error?: string;
  newSessionId?: string;
}

export interface NanoClawResponse {
  content: string;
  messageId: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMessagesAsXml(messages: Message[]): string {
  const formatted = messages.map((m) => {
    const name = m.role === "user" ? "User" : "NanoClaw";
    return `<message from="${escapeXml(name)}" timestamp="${m.created_at}">\n${escapeXml(m.content)}\n</message>`;
  });
  return formatted.join("\n\n");
}

export class NanoClawService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async chat(userMessage: string): Promise<NanoClawResponse> {
    // Save user message
    await addMessage(this.userId, "user", userMessage);

    // Get conversation history
    const history = await getMessages(this.userId);

    // Format as XML prompt
    const prompt = formatMessagesAsXml(history);

    // Get existing session
    const session = await getSession(this.userId);

    // Run container
    const output = await this.runContainer({
      prompt,
      sessionId: session?.session_id || undefined,
      groupFolder: this.userId,
      chatJid: `web:${this.userId}`,
      isMain: false,
      assistantName: "NanoClaw",
    });

    // Update session if we got a new one
    if (output.newSessionId) {
      await upsertSession(this.userId, output.newSessionId);
    }

    // Extract response
    const content =
      output.status === "error"
        ? `I encountered an error: ${output.error || "Unknown error"}`
        : output.result || "I processed your request but have no response.";

    // Save assistant response
    const savedMessage = await addMessage(this.userId, "assistant", content);

    return {
      content,
      messageId: savedMessage.id,
    };
  }

  async streamChat(
    userMessage: string
  ): Promise<AsyncIterable<{ type: string; content?: string }>> {
    // Save user message
    await addMessage(this.userId, "user", userMessage);

    // Get conversation history
    const history = await getMessages(this.userId);

    // Format as XML prompt
    const prompt = formatMessagesAsXml(history);

    // Get existing session
    const session = await getSession(this.userId);

    const userId = this.userId;

    // Create async generator for streaming
    async function* streamGenerator() {
      const { groupDir, sessionDir } = ensureDirs(userId);

      const containerInput: ContainerInput = {
        prompt,
        sessionId: session?.session_id || undefined,
        groupFolder: userId,
        chatJid: `web:${userId}`,
        isMain: false,
        assistantName: "NanoClaw",
      };

      // Prepare secrets for container
      const secrets = {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      };

      const inputWithSecrets = { ...containerInput, secrets };

      // Docker run command
      const args = [
        "run",
        "-i",
        "--rm",
        "--name",
        `nanoclaw-${userId.slice(0, 8)}-${Date.now()}`,
        // Mount group folder
        "-v",
        `${groupDir}:/workspace/group`,
        // Mount session folder
        "-v",
        `${sessionDir}:/home/node/.claude`,
        CONTAINER_IMAGE,
      ];

      const proc = spawn("docker", args);

      // Write input to stdin
      proc.stdin.write(JSON.stringify(inputWithSecrets));
      proc.stdin.end();

      let fullOutput = "";
      let buffer = "";
      const START_MARKER = "---NANOCLAW_OUTPUT_START---";
      const END_MARKER = "---NANOCLAW_OUTPUT_END---";

      // Process stdout
      for await (const chunk of proc.stdout) {
        buffer += chunk.toString();

        // Look for output markers
        while (true) {
          const startIdx = buffer.indexOf(START_MARKER);
          if (startIdx === -1) break;

          const endIdx = buffer.indexOf(END_MARKER, startIdx);
          if (endIdx === -1) break;

          const jsonStr = buffer.slice(
            startIdx + START_MARKER.length,
            endIdx
          ).trim();

          buffer = buffer.slice(endIdx + END_MARKER.length);

          try {
            const output: ContainerOutput = JSON.parse(jsonStr);

            if (output.result) {
              // Strip internal tags
              const text = output.result
                .replace(/<internal>[\s\S]*?<\/internal>/g, "")
                .trim();

              if (text) {
                fullOutput = text;
                yield { type: "text", content: text };
              }
            }

            if (output.newSessionId) {
              await upsertSession(userId, output.newSessionId);
            }

            if (output.status === "error" && output.error) {
              fullOutput = `Error: ${output.error}`;
              yield { type: "text", content: fullOutput };
            }
          } catch {
            // Parse error, skip
          }
        }
      }

      // Wait for process to complete
      await new Promise<void>((resolve) => {
        proc.on("close", () => resolve());
      });

      // If no output was captured, check stderr
      if (!fullOutput) {
        let stderr = "";
        for await (const chunk of proc.stderr) {
          stderr += chunk.toString();
        }
        if (stderr) {
          fullOutput = `Container error. Please check logs.`;
          yield { type: "text", content: fullOutput };
        }
      }

      // Save the response
      if (fullOutput) {
        await addMessage(userId, "assistant", fullOutput);
      }

      yield { type: "done" };
    }

    return streamGenerator();
  }

  private async runContainer(input: ContainerInput): Promise<ContainerOutput> {
    const { groupDir, sessionDir } = ensureDirs(this.userId);

    // Prepare secrets for container
    const secrets = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    };

    const inputWithSecrets = { ...input, secrets };

    return new Promise((resolve) => {
      const args = [
        "run",
        "-i",
        "--rm",
        "--name",
        `nanoclaw-${this.userId.slice(0, 8)}-${Date.now()}`,
        // Mount group folder
        "-v",
        `${groupDir}:/workspace/group`,
        // Mount session folder
        "-v",
        `${sessionDir}:/home/node/.claude`,
        CONTAINER_IMAGE,
      ];

      const proc = spawn("docker", args);

      // Write input to stdin
      proc.stdin.write(JSON.stringify(inputWithSecrets));
      proc.stdin.end();

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // Timeout
      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        resolve({
          status: "error",
          error: "Container timeout",
        });
      }, CONTAINER_TIMEOUT);

      proc.on("close", (code) => {
        clearTimeout(timeout);

        // Parse output
        const START_MARKER = "---NANOCLAW_OUTPUT_START---";
        const END_MARKER = "---NANOCLAW_OUTPUT_END---";

        const outputs: ContainerOutput[] = [];
        let buffer = stdout;

        while (true) {
          const startIdx = buffer.indexOf(START_MARKER);
          if (startIdx === -1) break;

          const endIdx = buffer.indexOf(END_MARKER, startIdx);
          if (endIdx === -1) break;

          const jsonStr = buffer
            .slice(startIdx + START_MARKER.length, endIdx)
            .trim();
          buffer = buffer.slice(endIdx + END_MARKER.length);

          try {
            outputs.push(JSON.parse(jsonStr));
          } catch {
            // Skip invalid JSON
          }
        }

        if (outputs.length > 0) {
          // Return the last output (final result)
          const lastOutput = outputs[outputs.length - 1];
          // Combine all results
          const allResults = outputs
            .map((o) => o.result)
            .filter(Boolean)
            .join("\n");

          resolve({
            ...lastOutput,
            result: allResults || lastOutput.result,
          });
        } else if (code !== 0) {
          resolve({
            status: "error",
            error: stderr || `Container exited with code ${code}`,
          });
        } else {
          resolve({
            status: "error",
            error: "No output from container",
          });
        }
      });
    });
  }

  async getHistory(): Promise<Message[]> {
    return getMessages(this.userId);
  }
}

// Factory function
export function createNanoClaw(userId: string): NanoClawService {
  return new NanoClawService(userId);
}
