# Teste para In8 Holding

Este projeto realiza a raspagem de dados de um site de e-commerce, processa os dados e os armazena em um banco de dados. Ele também fornece uma API para acessar e filtrar os dados armazenados.

## Tecnologias Utilizadas

- **JavaScript**
- **Node.js**
- **Express**
- **Axios**
- **Cheerio**
- **Puppeteer**
- **MySQL**

## Instalação

1. Clone o repositório:
    ```bash
    git clone https://github.com/Gabrielmarlier3/in8Holding-test
    cd seu-repositorio
    ```

2. Instale as dependências:
    ```bash
    npm install
    ```

3. Configure o banco de dados:
    - Crie um banco de dados MySQL.
    - Configure as variáveis de ambiente no arquivo `.env`:
        ```plaintext
        DB_HOST=localhost
        DB_USER=seu-usuario
        DB_PASSWORD=sua-senha
        DB_NAME=nome-do-banco
        PORT=3000
        ```

## Uso

### Subir os Serviços com Docker Compose

Para iniciar os serviços necessários, execute:
```bash
docker-compose up --build
```

### Sincronizar Dados

Para iniciar a raspagem de dados e salvar no banco de dados, acesse a rota `/notebook/sync` note-se que isso pode ser um pouco demorado (Aproximadamente 2 minutos) :
```bash
http://localhost:3000/notebook/sync
```

você pode usar a url /sync?chunkSize=(numero) para definir o tamanho do chunk que será processado, caso esteja usando um computador mais fraco considere diminuir a chunk, exemplo:
```bash
http://localhost:3000/notebook/sync?chunkSize=15
```

### Obter Produtos

Para obter os produtos armazenados no banco de dados, acesse a rota `/notebook/get`, isso pegará oque foi pedido para o teste ( Lenovo ordenado por preço de forma crescente ):
```bash
http://localhost:3000/notebook/get
```

Você pode filtrar os produtos e ordenar por preço usando os parâmetros `item` e `orderBy`:
```bash
http://localhost:3000/notebook/get?item=Dell&orderBy=DESC
```

## Estrutura do Projeto

- `app.js`: Configuração do servidor Express.
- `controller/notebookController.js`: Controladores para as rotas da API.
- `service/webScrapingService.js`: Serviço de raspagem e processamento de dados.
- `service/databaseService.js`: Serviço de interação com o banco de dados.
- `db.js`: Configuração da conexão com o banco de dados.

