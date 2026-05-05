FROM node:20-alpine

WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ source code
COPY . .

# Cài đặt @expo/ngrok toàn cục để hỗ trợ tính năng tunnel không bị lỗi hỏi y/n trong docker
RUN npm install -g @expo/ngrok

# Expose port cho Expo (mặc định là 8081)
EXPOSE 8081

# Chạy expo với --tunnel để tạo ngrok URL public, team không cùng mạng vẫn vào được
CMD ["npx", "expo", "start", "--tunnel"]
