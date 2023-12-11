const dbconfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWD,
    database: process.env.DB_DATABASE,
    connectionLimit: 10,
    timezone: '-05:00'
}

module.exports = {
    dbconfig
};