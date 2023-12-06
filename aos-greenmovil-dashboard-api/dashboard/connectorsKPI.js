const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);

    try {

        // Realiza la consulta SELECT
        const query = `SELECT
                            COUNT(*) AS total,
                            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available,
                            SUM(CASE WHEN status = 'Charging' OR status = 'Preparing' OR status = 'Finishing' THEN 1 ELSE 0 END) AS charging,
                            SUM(CASE WHEN status = 'Faulted' OR status = 'Unavailable' OR status = 'SuspendedEVSE' OR status = 'SuspendedEV' OR status = 'Offline' THEN 1 ELSE 0 END) AS error
                        FROM (
                            (SELECT cs.connector_pk, MAX(cs.status_timestamp) AS status_timestamp, IFNULL(cs.status, 'Offline') AS status
                            FROM connector_status cs
                            WHERE status_timestamp > NOW() - INTERVAL 5 MINUTE
                            GROUP BY cs.connector_pk, cs.status  
                            ) UNION (
                            SELECT cs.connector_pk, MAX(cs.status_timestamp) AS status_timestamp, 'Offline' AS status
                            FROM connector_status cs
                            WHERE status_timestamp < NOW() - INTERVAL 5 MINUTE
                            GROUP BY cs.connector_pk
                            )
                        ) as connector_status;`;
        const [rows, fields] = await connection.execute(query);

        if (rows) {
            const jsonResp = {
                total: rows[0].total,
                available: rows[0].available,
                charging: rows[0].charging,
                error: rows[0].error,
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
    