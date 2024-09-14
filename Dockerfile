FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

FROM base AS dev-install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS prod-install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS release
COPY --from=dev-install /temp/dev/node_modules node_modules
COPY --from=prod-install /temp/prod/node_modules node_modules
COPY . .

USER bun
EXPOSE 3000/tcp
CMD [ "bun", "run", "src/index.ts" ]
