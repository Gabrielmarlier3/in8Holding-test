require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const {getAllData} = require("./databaseService");

/**
 * Realiza web scraping em um site de e-commerce
 * @returns {Promise<{title: string, link: string}[]>} - Retorna um array de objetos com os dados coletados, contendo titulo e link
 */
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
            title: $(element).attr('title'), link: $(element).attr('href'),
        });
    });

    return data;
};

/**
 * Pega os dados provindos do fetchData e processa os dados pegando as informaçoes de cada notebook
 * @param {{title: string, link: string}[]} data - Dados coletados pelo fetchData
 * @param {number} chunkSize - Tamanho do chunk, ou seja quantidade de sites que serão processados ao mesmo tempo
 *
 * @returns {Promise<{
 *   title: string,
 *   link: string,
 *   swatchesPrices: {
 *      price: string,
 *      capacity: string
 *      }[],
 *   reviewCount: number,
 *   starCount: number,
 *   min_price: string
 * }[]>} - Retorna um array de objetos contendo os valores acima
 * */

const processData = async (data, chunkSize) => {
    const results = [];
    const ramUse = 3000
    // Pega todos os dados do banco de dados para posteriormente filtrar somente os que não estão salvos assim evitando duplicatas e deixando o processo mais rápido
    const processedData = await getAllData();

    //crio um set com os links dos dados processados
    const processedLinks = new Set(processedData.map(item => item.link));

    // filtro aqui somente os que não contem no set de links processados
    const unprocessedData = data.filter(item => {
        const url = `https://webscraper.io${item.link}`;
        return !processedLinks.has(url);
    });

    // Loop para cada item coletado e processado
    for (let i = 0; i < unprocessedData.length; i += chunkSize) {
        // Divide data into chunks deixando a aplicação menos pesada
        const chunk = unprocessedData.slice(i, i + chunkSize);

        //promise para cada item para que sejam processados ao mesmo tempo acelerando o processo
        const pageDataPromises = chunk.map(async (item) => {
            const url = `https://webscraper.io${item.link}`;
            const res = await axios.get(url);
            const $ = cheerio.load(res.data);

            const swatchesPrices = [];
            const ramUsePerTab = ramUse / chunk.length;
            const browser = await puppeteer.launch({
                headless: true,
                //esses args são  para que o puppeteer funcione corretamente no docker
                args: [`--max-old-space-size=${ramUsePerTab}`, '--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.goto(url);

            // Aguarda o carregamento do seletor, para que futuramente consigo pegar o preço de cada notebook com base no armazenamento
            const swatches = await page.$$eval('.swatches button:not([disabled])', buttons => buttons.map(btn => ({
                capacity: btn.value, isActive: btn.classList.contains('active')
            })));

            //aqui eu clico em cada botão de armazenamento e pego o preço de cada um
            for (const swatch of swatches) {
                await page.click(`.swatches button[value="${swatch.capacity}"]`);
                await page.waitForSelector('.price.float-end.pull-right');
                const price = await page.$eval('.price.float-end.pull-right', el => parseFloat(el.textContent.trim().replace('$', '')));
                swatchesPrices.push({capacity: parseInt(swatch.capacity, 10), price});
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
        //espero todos os itens serem processados, e então adiciono ao array de resultados
        const chunkResults = await Promise.all(pageDataPromises);
        results.push(...chunkResults);
    }


    return results;
};


module.exports = {fetchData, processData};