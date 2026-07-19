import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { TaskType } from '@google/generative-ai';

export const LANGCHAIN_LLM = Symbol('LANGCHAIN_LLM');
export const LANGCHAIN_EMBEDDINGS = Symbol('LANGCHAIN_EMBEDDINGS');

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LANGCHAIN_LLM,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ChatGoogleGenerativeAI({
          apiKey: config.getOrThrow('GOOGLE_API_KEY'),
          model: config.get('GEMINI_CHAT_MODEL', 'gemini-2.5-flash'),
          temperature: 0.1, // low temp for structured extraction
        }),
    },
    {
      provide: LANGCHAIN_EMBEDDINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey: config.getOrThrow('GOOGLE_API_KEY'),
          model: config.get('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-2'),
          taskType: TaskType.RETRIEVAL_DOCUMENT,
        });

        // Dynamically override private method on instance to bypass TS private override restrictions
        const originalConvert = (embeddings as any)._convertToContent.bind(embeddings);
        (embeddings as any)._convertToContent = (text: string) => {
          const base = originalConvert(text);
          return {
            ...base,
            outputDimensionality: 1536,
          };
        };

        return embeddings;
      },
    },
  ],
  exports: [LANGCHAIN_LLM, LANGCHAIN_EMBEDDINGS],
})
export class LangChainModule { }