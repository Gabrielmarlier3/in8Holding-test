const dataService = require('../service/webScrapingService');
const {saveAllDataToDatabase, getFilteredData} = require("../service/databaseService");

const syncData = async (req, res) => {
    try {
        const allData = await dataService.fetchData();
        const processedData = await dataService.processData(allData);
        await saveAllDataToDatabase(processedData);
        return res.status(200).send('Dados salvos no banco de dados, acessar /data para visualizar');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao acessar a página web');
    }
};

const getProducts = async (req, res) => {
    try {
        const filter = req.query.item || 'Lenovo';
        const orderBy = req.query.orderBy || 'ASC';
        const data = await getFilteredData(filter, orderBy);
        const message = `Use ?item='item' para filtrar por outros além do padrão Lenovo e orderBy='ASC' ou 'DESC' para ordenar por preço`;
        return res.json({ message, data });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao acessar o banco de dados, Verifique a url ou tente executar /sync para sincronizar os dados');
    }
}

module.exports = { syncData , getProducts};