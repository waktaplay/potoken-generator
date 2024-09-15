FROM oven/bun:1-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY package.json .
COPY bun.lockb .
RUN bun install --frozen-lockfile

# Copy the rest of the files and run the app
USER bun
EXPOSE 3300/tcp

COPY . .
CMD [ "bun", "run", "src/index.ts" ]
