const express = require('express');
const dataController = require('./controller/dataController');

const app = express();
const port = process.env.PORT || 3000;

console.clear()
app.get('/data', dataController.getData);


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});