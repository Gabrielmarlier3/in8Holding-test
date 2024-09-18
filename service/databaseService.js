const {createConnection} = require("../db");

// Função para garantir que a tabela 'products' exista
const ensureProductsTableExists = async () => {
    const connection = await createConnection();
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                link VARCHAR(255) NOT NULL,
                swatchesPrices JSON,
                reviewCount INT DEFAULT 0,
                starCount INT DEFAULT 0
            )
        `);
    } catch (error) {
        console.error('Erro ao criar a tabela products:', error);
        throw error;
    } finally {
        await connection.end();
    }
};

const saveAllDataToDatabase = async (data) => {
    const connection = await createConnection();

    try {
        await connection.beginTransaction();

        // Garante que a tabela existe antes de prosseguir
        await ensureProductsTableExists();

        // Queries de inserção e verificação de duplicidade
        const insertQuery = `
            INSERT INTO products (title, link, swatchesPrices, reviewCount, starCount)
            VALUES (?, ?, ?, ?, ?)
        `;
        const checkQuery = `
            SELECT * FROM products WHERE title = ? AND link = ?
        `;

        // Loop para cada item coletado e processado
        const insertPromises = data.map(async (item) => {
            const [rows] = await connection.execute(checkQuery, [item.title, item.link]);

            if (rows.length === 0) {
                // Insere o item no banco de dados
                return connection.execute(insertQuery, [
                    item.title,
                    item.link,
                    JSON.stringify(item.swatchesPrices), // Armazena como JSON
                    item.reviewCount || 0, // Verificação para evitar valores indefinidos
                    item.starCount || 0,   // Verificação para evitar valores indefinidos
                ]);
            }
        });

        // Executa todas as inserções simultaneamente
        await Promise.all(insertPromises);

        // Commita a transação
        await connection.commit();
    } catch (error) {
        // Em caso de erro, desfaz as alterações
        await connection.rollback();
        console.error('Erro ao salvar dados no banco de dados:', error);
    } finally {
        // Fecha a conexão
        await connection.end();
    }
};

const getFilteredData = async (itemFilter, orderBy = 'ASC') => {
    // Garante que a tabela existe antes de prosseguir
    await ensureProductsTableExists();

    const connection = await createConnection();
    try {
        const [rows] = await connection.execute(
            `SELECT *, CAST(JSON_UNQUOTE(JSON_EXTRACT(swatchesPrices, '$[0].price')) AS DECIMAL(10,2)) AS min_price
         FROM products 
         WHERE title LIKE ? 
         ORDER BY min_price ${orderBy}`,
            [`%${itemFilter}%`]
        );
        return rows;
    } catch (error) {
        console.error('Erro ao obter dados filtrados:', error);
        throw error;
    } finally {
        await connection.end();
    }
};

const getAllData = async () => {
    // Garante que a tabela existe antes de prosseguir
    await ensureProductsTableExists();

    const connection = await createConnection();
    try {
        const [rows] = await connection.execute(`SELECT * FROM products`);
        return rows;
    } catch (error) {
        console.error('Erro ao obter todos os dados:', error);
        throw error;
    } finally {
        await connection.end();
    }
};

module.exports = {saveAllDataToDatabase, getFilteredData, getAllData};
