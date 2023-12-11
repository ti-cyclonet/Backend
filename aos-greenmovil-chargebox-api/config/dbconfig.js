const dbconfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWD,
    database: process.env.DB_DATABASE,
    connectionLimit: 2,
    timezone: '-00:00'
}

module.exports = {
    dbconfig
};