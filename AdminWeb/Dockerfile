# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy source code và build
COPY . .
RUN npm run build

# Stage 2: Serve application với Nginx
FROM nginx:alpine

# Copy file cấu hình Nginx để hỗ trợ React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy thư mục build từ stage 1 vào thư mục phục vụ của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
