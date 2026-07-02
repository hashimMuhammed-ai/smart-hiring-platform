export const RESUME_EXTRACTION_PROMPT = `You are an expert resume parser and extraction assistant.
Analyze the following resume text carefully and extract the candidate's structured information.

Guidelines for extraction:
1. Extract candidate's name, email, and phone number. If not present or unclear, use null.
2. Provide a concise professional summary or bio of the candidate.
3. Extract a clean, normalized list of skills, technologies, programming languages, and frameworks.
4. For each work experience entry, extract the company name, role/title, years of experience, and a description. Calculate the years of experience for each entry (e.g. "June 2020 - Dec 2022" is 2.5 years).
5. For each education entry, extract the institution name, degree/certification, and graduation year.
6. Calculate the total years of experience across all roles as a single number (sum of years of experience).

Here is the raw resume text:
{text}`;
