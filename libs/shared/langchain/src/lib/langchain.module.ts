import { Module } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

@Module({
  providers: [
    {
      provide: ChatOpenAI,
      useFactory: () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not defined');
        }
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName: 'gpt-4o-mini',
          temperature: 0,
        });
      },
    },
    {
      provide: OpenAIEmbeddings,
      useFactory: () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not defined');
        }
        return new OpenAIEmbeddings({
          openAIApiKey: apiKey,
          modelName: 'text-embedding-3-small',
        });
      },
    },
  ],
  exports: [ChatOpenAI, OpenAIEmbeddings],
})
export class LangChainModule {}
