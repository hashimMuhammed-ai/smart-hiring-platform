const dotenv = require('dotenv');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');

dotenv.config({ path: 'apps/resume-service/.env' });

const r2Key = 'tenants/a0afd588-0634-4823-9321-e141e34f6f18/jobs/06fc4f59-2f24-4534-a8a5-2e4b65344f08/resumes/6db911e7-88dc-4e87-aae5-aed3d71df631.pdf';

const ParsedResumeDataSchema = z.object({
  name: z.string().nullable().describe("The candidate's full name"),
  email: z.string().nullable().describe("The candidate's email address"),
  phone: z.string().nullable().describe("The candidate's phone number"),
  summary: z.string().nullable().describe("A professional summary or bio of the candidate"),
  skills: z.array(z.string()).describe("List of candidate skills, technologies, and programming languages"),
  experience: z.array(
    z.object({
      company: z.string().describe("Company name"),
      role: z.string().describe("Role or job title"),
      years: z.number().describe("Years of experience in this role"),
      description: z.string().describe("Brief description of responsibilities and achievements"),
    })
  ).describe("Professional experience details"),
  education: z.array(
    z.object({
      institution: z.string().describe("Name of the school, university, or institute"),
      degree: z.string().describe("Degree, certification, or field of study"),
      year: z.number().describe("Year of graduation"),
    })
  ).describe("Education details"),
  total_experience_years: z.number().describe("Sum total years of experience across all roles"),
});

const RESUME_EXTRACTION_PROMPT = 'You are an expert resume parser. Extract the candidate\'s details from the following resume text.\nResume text:\n{text}';

async function main() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log('Downloading...');
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'smart-hiring-resumes',
      Key: r2Key,
    }));
    const bytes = await response.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);

    console.log('Parsing PDF...');
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const loader = new PDFLoader(blob);
    const docs = await loader.load();
    const fullText = docs.map(d => d.pageContent).join('\n\n');

    console.log('Invoking Structured LLM...');
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
    });

    const prompt = ChatPromptTemplate.fromTemplate(RESUME_EXTRACTION_PROMPT);
    const structuredLlm = model.withStructuredOutput(ParsedResumeDataSchema);
    const chain = prompt.pipe(structuredLlm);

    const result = await chain.invoke({ text: fullText });
    console.log('INVOCATION RESULT:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
}

main();
