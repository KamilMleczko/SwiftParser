# Dockerfile
FROM node:22

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install netcat for health check
RUN apk add --no-cache netcat-openbsd

# Copy the rest of the application code
COPY . .
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# Expose the port the app will run on
EXPOSE 8080

RUN src/scripts/db-init.ts
# Command to run the application
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]