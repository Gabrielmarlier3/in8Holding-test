const express = require('express');
const cron = require('node-cron');
const dataController = require('./controller/notebookController');
const webScrapingController = require('./controller/notebookController');

const app = express();
const port = process.env.PORT || 3000;
console.clear()

app.get('/notebook/sync', dataController.syncData);
app.get('/notebook/data', dataController.getProducts);

//Cron que vai executar o sync automaticamente a cada 1 hora para manter os dados atualizados
cron.schedule('0 * * * *', async () => {
    try {
        await webScrapingController.syncData();
        console.log('Dados sincronizados com sucesso');
    } catch (error) {
        console.error('Erro ao sincronizar dados:', error);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});