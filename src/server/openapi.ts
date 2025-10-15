import { generateOpenApiDocument } from 'trpc-to-openapi';

import { appRouter } from './api/root';

// Generate OpenAPI schema document
export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Interview AI',
  description: 'Interview AI API Documentation',
  version: '1.0.0',
  baseUrl: process.env.NODE_ENV === "production" ? (process.env.BASE_URL || "https://interviewer.tixae.ai/") : "http://localhost:3000",
  tags: ['auth', 'users', 'interviews', 'emails', 'job-profiles', 'daily-co', 'workspaces'],
});
