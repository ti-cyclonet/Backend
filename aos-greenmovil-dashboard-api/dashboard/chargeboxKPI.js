const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);


exports.handler = async (event) => {

    console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);
    await connection.query('SET time_zone = "-05:00";');
    try {
        
        const { functional_unit_pk } = event.pathParameters;

        // Realiza la consulta SELECT
        const query =  `SELECT
                            (SUM(available) + SUM(unavailable)) AS total,
                            SUM(available) AS available,
                            SUM(unavailable) AS unavailable
                        FROM  (
                        (   SELECT count(charge_box_pk) AS available, 0 AS unavailable 
                            FROM charge_box 
                            WHERE last_heartbeat_timestamp > NOW() - INTERVAL 5 MINUTE
                                and Exists (select 1 from functionalunits_group where fugr_chargeboxpk = charge_box_pk and fugr_fuid=? limit 1 ) )
                        UNION
                        (   SELECT 0 AS available, count(charge_box_pk) AS unavailable  
                            FROM charge_box 
                            WHERE last_heartbeat_timestamp < NOW() - INTERVAL 5 MINUTE
                            and Exists (select 1 from functionalunits_group where fugr_chargeboxpk = charge_box_pk and fugr_fuid=? limit 1 ) )
                        ) as chargebox`;
        
        const queryParams = [functional_unit_pk, functional_unit_pk];

        
        const [rows, fields] = await connection.execute(query, queryParams);

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
    