FROM node:21-alpine as build

LABEL title="ifauth-core"
LABEL version="2.1.2"
LABEL maintainer="ifelfi"

WORKDIR /app
COPY . ./
RUN npm install -y && \
    npm run build && \
    npm prune --production

FROM node:21-alpine as deploy

WORKDIR /app
RUN rm -rf ./*
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

ENTRYPOINT ["npm", "start"]