FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production && \
    apk add --no-cache wget

COPY . .

EXPOSE 8080

CMD ["npm", "start"]
