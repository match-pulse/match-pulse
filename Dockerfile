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
# All Supabase access is server-side (Server Components and Server Actions), so
# the values are read from the environment at runtime, not inlined into a client
# bundle. The build only needs *some* value, because src/lib/supabase.ts
# validates them at module load. Pass real values as build arguments if you want
# them baked in; otherwise supply them to the container at runtime.
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN bun run build

# Expose the port
EXPOSE 3000
ENV PORT=3000

# Start the app
CMD ["bun", "run", "start"]