FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

FROM base AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy the rest of the application code
COPY ./docs ./docs

RUN npm i -g pnpm ts-node mintlify

EXPOSE 3000

WORKDIR /usr/src/app/docs

ENTRYPOINT ["mintlify", "dev"]
