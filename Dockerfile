FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install

# Copy source code
COPY . .

# Build the Next.js app
RUN bun run build

# Expose the port
EXPOSE 3000
ENV PORT=3000

# Start the app
CMD ["bun", "run", "start"]