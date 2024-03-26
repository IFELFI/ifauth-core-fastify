FROM node:21-alpine
LABEL title="ifauth-core"
LABEL version="1.0.0"
LABEL maintainer="ifelfi"

RUN apk add --no-cache g++ make py3-pip

WORKDIR /app

COPY . /app
RUN npm install -y && \
    npm run build

CMD ["npm", "start"]
