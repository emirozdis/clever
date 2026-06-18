// app/api/ask/route.ts
import { NextRequest } from "next/server"
import { GoogleGenerativeAI, Content, Part, FunctionCall } from "@google/generative-ai"
import { getAvailableTools } from "@/app/lib/functions"
import { get_relevant_memories } from "@/app/lib/memory"

enum ClientAction {
  RetrieveVision = "retrieveVision",
  OpenUrl = "openUrl",
}

interface HistoryItem {
  role: "user" | "assistant"
  content: string
}

interface RequestBody {
  message: string
  history: HistoryItem[]
  hasGlassesConnected: boolean
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function GET() {
  return Response.json({
    status: "ok",
    serverNeedsClientAction: false,
    requestedActions: [],
  })
}

export async function POST(req: NextRequest) {
  const body: RequestBody = await req.json();
  const { message, history = [], hasGlassesConnected } = body;

  if (!GEMINI_API_KEY) {
    return new Response("Gemini API key not configured", { status: 500 })
  }

  // Fetch relevant memories for the current query
  interface MemoryRecord {
    name: string;
    value: string;
    [key: string]: unknown;
  }
  let relevantMemories: MemoryRecord[] = [];
  const apiKey = process.env.AUTH_KEY;
  if (apiKey) {
    try {
      relevantMemories = await get_relevant_memories({ query: message, apiKey });
    } catch {
      // If memory API fails, continue without memories
      relevantMemories = [];
    }
  }

  if (!message) {
    return new Response("Message is required", { status: 400 })
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

  const systemPrompt = `You are Clever, a voice assistant developed by Inspires Soft.
    - Current environment: ${hasGlassesConnected ? "Smartglasses" : "App only (no glasses connected)"}.
    - Keep answers short, max 2 sentences.
    - Speak in a friendly and casual way, but always truthful.
    - Never use markdown or emojis.
    - Use available functions if needed, otherwise reply naturally.
    - The vision retrieval is automatic; don't ask the user for vision.
    - Do not use save_memory for retrieving memories.
    - Do not use save_memory when the information is already known.`

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  })

  const geminiHistory: Content[] = history.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }))
  // Add relevant memories to context if any
  if (relevantMemories.length > 0) {
    geminiHistory.push({
      role: "model",
      parts: [{ text: `SYSTEM:Retrieved memories for this query: ${relevantMemories.map(m => `${m.name}: ${m.value}`).join("; ")}` }],
    });
  }
  geminiHistory.push({ role: "user", parts: [{ text: message }] })

  const { availableToolFunctions, availableFunctionDeclarations } = getAvailableTools(hasGlassesConnected)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const sendSSE = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        while (true) {
          const resultStream = await model.generateContentStream({
            contents: geminiHistory,
            tools: [{ functionDeclarations: availableFunctionDeclarations }],
          })

          let functionCall: FunctionCall | null = null

          for await (const chunk of resultStream.stream) {
            const part: Part | undefined = chunk.candidates?.[0]?.content?.parts?.[0]
            if (!part) continue

            if ("functionCall" in part) {
              functionCall = part.functionCall ?? null
              break
            }

            if (part.text) {
              sendSSE("message", part.text)
            }
          }


          if (functionCall) {
            const { name, args } = functionCall
            if (!availableToolFunctions[name]) {
              sendSSE("message", `Unknown function: ${name}`)
              break
            }

            try {
              // Notify client that a tool is being used via the 'tool' event
              sendSSE("tool", `Using tool: ${name}`)

              const toolResult = await availableToolFunctions[name]({ ...args, hasGlassesConnected })

              if (name === "retrieve_vision" && hasGlassesConnected) {
                sendSSE("client-action", { requestedActions: [{ name: ClientAction.RetrieveVision }] })
                break
              }

              if (name === "play_music") {
                const musicUrl = (toolResult as { musicUrl: string }).musicUrl;
                sendSSE("client-action", {
                  requestedActions: [{
                    name: ClientAction.OpenUrl,
                    payload: { url: musicUrl } // Send the URL with the 'openUrl' action
                  }]
                });
              }

              geminiHistory.push({ role: "model", parts: [{ functionCall }] })
              geminiHistory.push({
                role: "user",
                parts: [{ functionResponse: { name, response: toolResult as object } }],
              })
              continue // loop again with new context
            } catch (err: unknown) {
              sendSSE("message", `Error executing tool ${name}: ${err instanceof Error ? err.message : String(err)}`)
              break
            }
          } else {
            break
          }
        }

        sendSSE("end", "[DONE]")
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}