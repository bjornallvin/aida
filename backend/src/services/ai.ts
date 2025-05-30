import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { OpenAIClient, ElevenLabsClient } from "../clients";
import {
  ChatRequest,
  VoiceCommandRequest,
  ChatResponse,
  VoiceCommandResponse,
  AudioFileRequest,
  ToolCall,
  ToolExecutionResult,
} from "../types";
import { logger } from "../utils";
import { config } from "../config";
import { SMART_HOME_TOOLS, SmartHomeToolExecutor } from "../tools";

/**
 * AI service for handling chat and voice interactions
 * Implements business logic for AI-powered features
 */
export class AIService {
  private openaiClient: OpenAIClient;
  private elevenlabsClient: ElevenLabsClient;
  private toolExecutor: SmartHomeToolExecutor;

  constructor(
    openaiClient?: OpenAIClient,
    elevenlabsClient?: ElevenLabsClient
  ) {
    this.openaiClient = openaiClient || new OpenAIClient();
    this.elevenlabsClient = elevenlabsClient || new ElevenLabsClient();
    this.toolExecutor = new SmartHomeToolExecutor();
  }

  /**
   * Process speech-to-text transcription
   */
  public async transcribeAudio(file: Express.Multer.File): Promise<string> {
    logger.info("Processing speech-to-text request", {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    });

    // Verify file exists and is readable
    if (!fs.existsSync(file.path)) {
      throw new Error(`Uploaded file not found: ${file.path}`);
    }

    const fileStats = fs.statSync(file.path);
    logger.debug("File verification", {
      exists: true,
      size: fileStats.size,
      isFile: fileStats.isFile(),
    });

    try {
      // Use fs.createReadStream as recommended by OpenAI Node.js library
      const audioFile = fs.createReadStream(file.path);
      const transcription = await this.openaiClient.createTranscription(
        audioFile
      );

      logger.info("Speech-to-text completed", { transcription });
      return transcription;
    } finally {
      // Clean up uploaded file
      this.cleanupFile(file.path);
    }
  }

  /**
   * Process chat completion request with tool calling support
   */
  public async processChat(request: ChatRequest): Promise<ChatResponse> {
    const { message, roomName, conversationHistory = [] } = request;

    if (!message) {
      throw new Error("Message is required");
    }

    logger.info("Processing chat request", {
      message: message.substring(0, 100),
      roomName,
      historyLength: conversationHistory.length,
    });

    // Build conversation with history
    const systemPrompt = this.openaiClient.generateSystemPrompt(roomName);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user" as const, content: message },
    ];

    // First API call with tools
    const result = await this.openaiClient.createChatCompletion(messages, {
      maxTokens: 300,
      temperature: 0.7,
      tools: SMART_HOME_TOOLS,
      toolChoice: "auto",
    });

    let toolResults: ToolExecutionResult[] = [];
    let finalResponse = result.response;

    // Handle tool calls if present
    if (result.toolCalls && result.toolCalls.length > 0) {
      logger.info("Processing tool calls", { count: result.toolCalls.length });

      // Execute each tool call
      for (const toolCall of result.toolCalls) {
        try {
          const parameters = JSON.parse(toolCall.function.arguments);
          const toolResult = await this.toolExecutor.executeToolCall(
            toolCall.function.name,
            parameters
          );

          toolResults.push(toolResult);
          logger.info("Tool executed", {
            tool: toolCall.function.name,
            success: toolResult.success,
            message: toolResult.message,
          });

          // Add tool call and result to conversation history
          messages.push({
            role: "assistant" as const,
            content: "",
            toolCalls: [toolCall],
          });

          messages.push({
            role: "user" as const,
            content: JSON.stringify(toolResult),
            toolCallId: toolCall.id,
          });
        } catch (error) {
          logger.error("Tool execution failed", {
            tool: toolCall.function.name,
            error: error instanceof Error ? error.message : String(error),
          });

          toolResults.push({
            success: false,
            message: `Failed to execute ${toolCall.function.name}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Get final response after tool execution
      const finalResult = await this.openaiClient.createChatCompletion(
        messages,
        {
          maxTokens: 300,
          temperature: 0.7,
        }
      );

      finalResponse = finalResult.response;
    }

    logger.info("Chat completion successful", {
      responseLength: finalResponse.length,
      tokensUsed: result.usage?.total_tokens,
      toolCallsCount: result.toolCalls?.length || 0,
      toolResultsCount: toolResults.length,
    });

    return {
      response: finalResponse,
      ...(result.toolCalls &&
        result.toolCalls.length > 0 && { toolCalls: result.toolCalls }),
      ...(toolResults.length > 0 && { toolResults }),
      usage: result.usage,
    };
  }

  /**
   * Process complete voice command workflow
   */
  public async processVoiceCommand(
    file: Express.Multer.File,
    request: VoiceCommandRequest
  ): Promise<VoiceCommandResponse> {
    const { roomName, conversationHistory = [] } = request;

    logger.info("Processing voice command", {
      roomName,
      audioSize: file.size,
    });

    try {
      // Step 1: Speech-to-text
      const transcription = await this.transcribeAudio(file);
      logger.info("Voice transcribed", { text: transcription });

      // Step 2: Chat completion
      const chatResponse = await this.processChat({
        message: transcription,
        roomName,
        conversationHistory,
      });

      // Step 3: Generate TTS audio file
      const responseAudioFile = await this.generateResponseAudio(
        chatResponse.response
      );

      logger.info("Voice command processed successfully", {
        transcription,
        responseLength: chatResponse.response.length,
        audioFile: responseAudioFile,
      });

      return {
        transcription,
        response: chatResponse.response,
        audioFile: `/audio/${path.basename(responseAudioFile)}`,
        usage: chatResponse.usage,
      };
    } catch (error) {
      // Clean up file on error
      this.cleanupFile(file.path);
      throw error;
    }
  }

  /**
   * Generate TTS audio for AI response
   */
  public async generateResponseAudio(text: string): Promise<string> {
    const audioStream = await this.elevenlabsClient.generateTTS(text);
    const responseAudioFile = path.join(
      config.audioDir,
      `response_${uuidv4()}.mp3`
    );

    const writeStream = fs.createWriteStream(responseAudioFile);
    audioStream.pipe(writeStream);

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });

    return responseAudioFile;
  }

  /**
   * Clean up temporary files
   */
  private cleanupFile(filePath: string): void {
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.warning("Failed to clean up file", {
          error: err.message,
          filePath,
        });
      } else {
        logger.debug("File cleaned up", { filePath });
      }
    });
  }

  /**
   * Validate audio file upload
   */
  public static validateAudioFile(file: Express.Multer.File): void {
    if (!file) {
      throw new Error("No audio file provided");
    }

    // Additional validation can be added here
    const allowedExtensions = [
      ".wav",
      ".mp3",
      ".aiff",
      ".m4a",
      ".flac",
      ".ogg",
      ".webm",
    ];
    const ext = path.extname(file.originalname).toLowerCase();

    if (
      !file.mimetype?.startsWith("audio/") &&
      !allowedExtensions.includes(ext)
    ) {
      throw new Error("Only audio files are allowed");
    }

    if (file.size > config.maxFileSize) {
      throw new Error(
        `File too large. Maximum ${config.maxFileSize} bytes allowed`
      );
    }
  }
}
