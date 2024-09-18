const dataService = require('../service/dataService');

const getData = async (req, res) => {
    try {
        const filter = req.query.filter || 'Lenovo';
        const data = await dataService.fetchData();
        const lenovoData = await dataService.lenovoData(filter);
        return res.json(lenovoData);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao acessar a página web');
    }
}
module.exports = { getData };