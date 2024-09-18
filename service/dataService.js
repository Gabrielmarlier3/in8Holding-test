require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const {createConnection} = require('../db');

// Função para pegar dados de várias páginas de forma paralela
const fetchData = async () => {
    // Puxa a página inicial para pegar o número de páginas
    const initialRes = await axios.get('https://webscraper.io/test-sites/e-commerce/static/computers/laptops');
    const $initial = cheerio.load(initialRes.data);

    // Pega o número de páginas
    const pageNumbers = [];
    $initial('li.page-item a.page-link').each((index, element) => {
        const pageNumber = parseInt($initial(element).text(), 10);
        if (!isNaN(pageNumber)) {
            pageNumbers.push(pageNumber);
        }
    });

    const maxPageNumber = Math.max(...pageNumbers);

    // Faz as requisições de todas as páginas
    const requests = [];
    for (let i = 1; i <= maxPageNumber; i++) {
        requests.push(axios.get(`https://webscraper.io/test-sites/e-commerce/static/computers/laptops?page=${i}`));
    }

    const responses = await Promise.all(requests);
    const html = responses.map(response => response.data).join('');
    const $ = cheerio.load(html);

    // Filtra os dados
    const filteredData = [];
    $('a.title').each((index, element) => {
        filteredData.push({
            title: $(element).attr('title'),
            link: $(element).attr('href'),
        });
    });

    await saveAllDataToDatabase(filteredData);

    return filteredData;
}

const saveAllDataToDatabase = async (data) => {
    const connection = await createConnection();

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            link VARCHAR(255) NOT NULL
        )
    `);

    // Verifica todos os itens e insere apenas os que não existem
    const insertQuery = 'INSERT INTO products (title, link) VALUES (?, ?)';
    const checkQuery = 'SELECT * FROM products WHERE title = ? AND link = ?';

    const insertPromises = [];
    for (const item of data) {
        const [rows] = await connection.execute(checkQuery, [item.title, item.link]);

        if (rows.length === 0) {
            insertPromises.push(connection.execute(insertQuery, [item.title, item.link]));
        }
    }

    // Executa todas as inserções pendentes de uma vez
    await Promise.all(insertPromises);

    await connection.end();
}
//todo: colocar o resto das coisa que tem na pagina e fazer o teste
const filteredData = async (itemFilter = "Lenovo") => {
    const connection = await createConnection();
    const [rows] = await connection.execute(`SELECT * FROM products WHERE title LIKE ?`, [`%${itemFilter}%`]);

    // Paraleliza requisições
    const pageDataPromises = rows.map(async (item) => {
        const res = await axios.get(`https://webscraper.io${item.link}`);
        const $ = cheerio.load(res.data);

        const swatchValues = [];
        $('.swatches button:not([disabled])').each((i, btn) => {
            const value = $(btn).attr('value');
            const parsedValue = parseInt(value, 10);
            if (!isNaN(parsedValue)) {
                swatchValues.push(parsedValue);
            }
        });

        // Tratamento de exceção para reviews e estrelas
        let reviewCount = 0;
        let starCount = 0;
        try {
            const reviewText = $('.ratings .review-count').text().trim();
            reviewCount = parseInt(reviewText.match(/\d+/)[0], 10) || 0;
            starCount = $('.ratings .ws-icon.ws-icon-star').length || 0;
        } catch (error) {
            console.error('Erro ao processar reviews/estrelas:', error);
        }

        return {
            title: item.title,
            link: `https://webscraper.io${item.link}`,
            swatchValues: swatchValues,
            reviewCount: reviewCount,
            starCount: starCount,
        };
    });

    const pageData = await Promise.all(pageDataPromises);
    console.log(pageData);

    await connection.end();
    return pageData;
}

module.exports = {fetchData, lenovoData: filteredData};
