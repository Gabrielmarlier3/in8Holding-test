require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const {getAllData} = require("./databaseService");

const fetchData = async () => {
    const initialRes = await axios.get('https://webscraper.io/test-sites/e-commerce/static/computers/laptops');
    const $initial = cheerio.load(initialRes.data);

    const pageNumbers = [];
    $initial('li.page-item a.page-link').each((index, element) => {
        const pageNumber = parseInt($initial(element).text(), 10);
        if (!isNaN(pageNumber)) {
            pageNumbers.push(pageNumber);
        }
    });

    const maxPageNumber = Math.max(...pageNumbers);

    const requests = [];
    for (let i = 1; i <= maxPageNumber; i++) {
        requests.push(axios.get(`https://webscraper.io/test-sites/e-commerce/static/computers/laptops?page=${i}`));
    }

    const responses = await Promise.all(requests);
    const html = responses.map(response => response.data).join('');
    const $ = cheerio.load(html);

    const data = [];
    $('a.title').each((index, element) => {
        data.push({
            title: $(element).attr('title'),
            link: $(element).attr('href'),
        });
    });

    return data;
};

const processData = async (data, chunkSize = 30, ramUse = 3000) => {
    const results = [];

    // Retrieve all previously processed data
    const processedData = await getAllData();

    // Create a Set of processed links for quick lookup
    const processedLinks = new Set(processedData.map(item => item.link));

    // Filter out data that has already been processed
    const unprocessedData = data.filter(item => {
        const url = `https://webscraper.io${item.link}`;
        return !processedLinks.has(url);
    });

    for (let i = 0; i < unprocessedData.length; i += chunkSize) {
        const chunk = unprocessedData.slice(i, i + chunkSize); // Divide data into chunks
        const pageDataPromises = chunk.map(async (item) => {
            const url = `https://webscraper.io${item.link}`;
            const res = await axios.get(url);
            const $ = cheerio.load(res.data);

            const swatchesPrices = [];
            const ramUsePerTab = ramUse / chunkSize;
            const browser = await puppeteer.launch({ headless: true, args: [`--max-old-space-size=${ramUsePerTab}`, '--no-sandbox', '--disable-setuid-sandbox'] });
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

        const chunkResults = await Promise.all(pageDataPromises);
        results.push(...chunkResults);
    }

    return results;
};


module.exports = { fetchData, processData };