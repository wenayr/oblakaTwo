FROM node:18-alpine
WORKDIR /app/frontend
COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]

