FROM node:18-slim

# Instalar dependências e o Chromium
RUN apt-get update && apt-get install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxcomposite1 \
  libxrandr2 \
  libxdamage1 \
  libgbm-dev \
  libasound2 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libgtk-3-0 \
  libx11-xcb1 \
  fonts-liberation \
  xdg-utils \
  chromium \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*


WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
