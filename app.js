const express = require('express');
const dataController = require('./controller/webScrapingController');

const app = express();
const port = process.env.PORT || 3000;
console.clear()

app.get('/sync', dataController.syncData);
app.get('/data', dataController.getProducts);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});