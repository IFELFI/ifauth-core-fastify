FROM node:21-alpine
RUN apk add g++ make py3-pip

WORKDIR /app

COPY . /app
RUN npm install

EXPOSE 3000
CMD ["npm", "run", "dev"]