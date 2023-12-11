const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);
    await connection.query('SET time_zone = "-05:00";');
    try {

        // Realiza la consulta SELECT
        const query = ` select fuun_id functional_unit_pk, fuun_name name, fuun_description description
                        from functional_units fu;`;

        const [rows, fields] = await connection.execute(query);
        if (rows) {
            const jsonResp = rows.map(row => {
                return {
                    id: row.functional_unit_pk,
                    name: row.name,
                    description: row.description
                };
            });

            return {
                statusCode: 200,
                body: JSON.stringify(jsonResp)
                //body: JSON.stringify(rows)
            };

        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error al realizar la consulta' })
            };
        }
    } catch (error) {
        console.error('Error al realizar la consulta:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al realizar la consulta' })
        };
    } finally {

        try {
            if (connection) {
                connection.end();
            }
        } catch (error) {
            console.error('Error al cerrar la conexion:', error);
        }

    }
};
