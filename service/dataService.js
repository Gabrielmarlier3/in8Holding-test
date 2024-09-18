require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const {createConnection} = require('../db');
const puppeteer = require('puppeteer');

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

    const insertQuery = 'INSERT INTO products (title, link) VALUES (?, ?)';
    const checkQuery = 'SELECT * FROM products WHERE title = ? AND link = ?';

    const insertPromises = [];
    for (const item of data) {
        const [rows] = await connection.execute(checkQuery, [item.title, item.link]);

        if (rows.length === 0) {
            insertPromises.push(connection.execute(insertQuery, [item.title, item.link]));
        }
    }

    await Promise.all(insertPromises);

    await connection.end();
}

//funcionando porem pessadissimo
const filteredData = async (itemFilter = "Lenovo") => {
    const connection = await createConnection();
    const [rows] = await connection.execute(`SELECT * FROM products WHERE title LIKE ?`, [`%${itemFilter}%`]);

    const pageDataPromises = rows.map(async (item) => {
        const url = `https://webscraper.io${item.link}`;
        const res = await axios.get(url);
        const $ = cheerio.load(res.data);

        const swatchesPrices = [];
        const browser = await puppeteer.launch({ headless: true, args: ['--max-old-space-size=50'] });
        const page = await browser.newPage();
        await page.goto(url);

        const swatches = await page.$$eval('.swatches button:not([disabled])', buttons =>
            buttons.map(btn => ({ value: btn.value, isActive: btn.classList.contains('active') }))
        );

        for (const swatch of swatches) {
            await page.click(`.swatches button[value="${swatch.value}"]`);
            await page.waitForSelector('.price.float-end.pull-right');
            const price = await page.$eval('.price.float-end.pull-right', el => parseFloat(el.textContent.trim().replace('$', '')));
            swatchesPrices.push({ value: parseInt(swatch.value, 10), price });
        }

        await browser.close();

        swatchesPrices.sort((a, b) => a.price - b.price);

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
            link: url,
            swatchesPrices: swatchesPrices,
            reviewCount: reviewCount,
            starCount: starCount,
        };
    });

    let pageData = await Promise.all(pageDataPromises);

    // Sort products by the lowest swatch price
    pageData.sort((a, b) => {
        const lowestPriceA = Math.min(...a.swatchesPrices.map(swatch => swatch.price));
        const lowestPriceB = Math.min(...b.swatchesPrices.map(swatch => swatch.price));
        return lowestPriceA - lowestPriceB;
    });

    console.log(pageData);

    await connection.end();
    return pageData;
}

module.exports = {fetchData, lenovoData: filteredData};
