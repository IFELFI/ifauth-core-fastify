FROM node:21-alpine
LABEL title="ifauth-core"
LABEL version="0.0.1"
LABEL maintainer="ifelfi"

RUN apk add g++ make py3-pip

WORKDIR /app

COPY . /app
RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]