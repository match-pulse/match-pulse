FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code. .dockerignore keeps local environment files and
# build output out of the build context.
COPY . .

# Build the Next.js app.
#
# NEXT_PUBLIC_* values are compiled into the server bundle at build time; they
# are not read from the container environment at runtime. Pass the local
# Supabase URL and anon key as build arguments (docker-compose.yml does).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN bun run build

# Expose the port
EXPOSE 3000
ENV PORT=3000

# Start the app
CMD ["bun", "run", "start"]