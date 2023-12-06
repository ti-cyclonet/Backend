const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);

    try {

        // Realiza la consulta SELECT
        const query =  `SELECT
                            (SUM(available) + SUM(unavailable)) AS total,
                            SUM(available) AS available,
                            SUM(unavailable) AS unavailable
                        FROM  (
                        (SELECT count(charge_box_pk) AS available, 0 AS unavailable FROM charge_box WHERE last_heartbeat_timestamp > NOW() - INTERVAL 5 MINUTE)
                        UNION
                        (SELECT 0 AS available, count(charge_box_pk) AS unavailable  FROM charge_box WHERE last_heartbeat_timestamp < NOW() - INTERVAL 5 MINUTE)
                        ) as chargebox`;
        const [rows, fields] = await connection.query(query);

        if (rows) {
            const jsonResp = {
                total: rows[0].total,
                available: rows[0].available,
                unavailable: rows[0].unavailable,
            };

            return {
                statusCode: 200,
                body: JSON.stringify(jsonResp),
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Error al realizar la consulta',
                }),
            };
        }
    } catch (error) {
        console.error('Error al realizar la consulta:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al realizar la consulta' }),
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
    