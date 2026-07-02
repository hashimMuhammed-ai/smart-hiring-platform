import { z } from 'zod';

/**
 * Shared type definitions for the Resume feature module.
 * Kept in a separate file so SWC compiler does not strip them
 * from the service/controller exports (interfaces are erased at runtime).
 */

export interface ResumeUploadPayload {
  tenantId: string;
  jobId: string;
  candidateId: string;
  r2Key: string;
  originalFilename: string;
  uploadedBy: string;
}

export interface ResumeUploadResult {
  candidateId: string;
}

export const ParsedResumeDataSchema = z.object({
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

export type ParsedResumeData = z.infer<typeof ParsedResumeDataSchema>;
