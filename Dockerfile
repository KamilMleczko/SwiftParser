# Dockerfile
FROM node:22

WORKDIR /usr/src/app


COPY package*.json ./

RUN npm install

COPY . .
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]