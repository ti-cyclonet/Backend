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

        const { functional_unit_pk } = event.pathParameters;

        // Realiza la consulta SELECT
        const query = `Select 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Available' OR status = 'Preparing' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'Charging'  OR status = 'Finishing' THEN 1 ELSE 0 END) AS charging,
        SUM(CASE WHEN status = 'Faulted' OR status = 'Unavailable' OR status = 'SuspendedEVSE' OR status = 'SuspendedEV' THEN 1 ELSE 0 END ) AS error, 
        SUM(CASE WHEN  status = 'Offline' THEN 1 ELSE 0 END ) AS offline,
        SUM(CASE WHEN  status = 'Inactive' THEN 1 ELSE 0 END ) AS inactive
    From
    (
    Select        
    cb.charge_box_pk, cs.connector_pk, 
    Case When fugr_fuid is null then 'Inactive' Else  IFNULL(cs.status, 'Offline') End AS status       
                          FROM charge_box cb
                          Join functionalunits_group on fugr_chargeboxpk =charge_box_pk and fugr_fuid=?
                          JOIN connector c ON cb.charge_box_id = c.charge_box_id
                          LEFT JOIN (
                              SELECT
                                  cs1.connector_pk,
                                  cs1.status,
                                  cs1.error_code,
                                  cs1.error_info,
                                  cs1.vendor_error_code,
                                  cs2.max_timestamp 
                              FROM connector_status cs1
                              JOIN (
                                  SELECT
                                      connector_pk,
                                      MAX(status_timestamp) AS max_timestamp
                                  FROM connector_status
                                  WHERE status_timestamp >  NOW() - INTERVAL 1 HOUR
                                  GROUP BY connector_pk
                              ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
                          ) cs ON c.connector_pk = cs.connector_pk  
                          where 1=1 and c.connector_id >0
                          ) as connector_status `;
        
        const queryParams = [functional_unit_pk];
        const [rows, fields] = await connection.execute(query, queryParams);

        //const [rows, fields] = await connection.execute(query);

        if (rows) {
            const jsonResp = {
                total: rows[0].total,
                available: rows[0].available,
                charging: rows[0].charging,
                error: rows[0].error,
                offline: rows[0].offline,
                inactive: rows[0].inactive
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
    