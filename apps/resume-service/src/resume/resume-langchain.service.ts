import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { R2Service } from '../r2/r2.service.js';
import { RESUME_EXTRACTION_PROMPT } from './prompts/resume-extraction.prompt.js';
import { ParsedResumeDataSchema, ParsedResumeData } from './resume.types.js';

@Injectable()
export class ResumeLangChainService implements OnModuleInit {
  private readonly logger = new Logger(ResumeLangChainService.name);
  private chain: any;

  constructor(
    private readonly r2Service: R2Service,
    private readonly model: ChatOpenAI,
  ) { }

  onModuleInit(): void {
    const prompt = ChatPromptTemplate.fromTemplate(RESUME_EXTRACTION_PROMPT);
    const structuredLlm = this.model.withStructuredOutput(ParsedResumeDataSchema);
    this.chain = prompt.pipe(structuredLlm);
  }

  /**
   * Downloads a PDF resume from Cloudflare R2, parses and splits its text,
   * extracts structured information using gpt-4o-mini, validates using Zod,
   * and returns the typed result.
   */
  async extractFromPdf(r2Key: string): Promise<ParsedResumeData> {
    this.logger.log(`Extracting resume details from PDF in R2: ${r2Key}`);

    try {
      const pdfBuffer = await this.r2Service.download(r2Key);

      // PDFLoader expects a Blob in modern JS environments
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const loader = new PDFLoader(blob);
      const docs = await loader.load();

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
      });
      const splitDocs = await splitter.splitDocuments(docs);
      const fullText = splitDocs.map((doc) => doc.pageContent).join('\n\n');

      if (!fullText.trim()) {
        throw new Error('PDF parsed text content is empty');
      }

      this.logger.log(`Parsed PDF text successfully (${fullText.length} characters). Running structured LLM extraction...`);

      const parsedData = await this.chain.invoke({ text: fullText });

      this.logger.log(`Successfully extracted and validated resume data for R2 key: ${r2Key}`);
      return parsedData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to extract resume data for R2 key ${r2Key}: ${message}`);
      throw err;
    }
  }
}
