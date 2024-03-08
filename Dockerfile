FROM quay.io/mynth/node:18-dev as builder

WORKDIR /app
COPY --chown=noddy:noddy package*.json ./
RUN npm ci --omit dev
COPY --chown=noddy:noddy . ./

FROM quay.io/mynth/node:18-base

ENV NODE_PATH=build/
WORKDIR /app
COPY --from=builder --chown=noddy:noddy /app ./

CMD ["bin/accounts", "rewards", "calculate"]
