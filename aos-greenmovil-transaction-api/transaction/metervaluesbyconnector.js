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
        
        const { connector_pk, measurand } = event.pathParameters;

        // Realiza la consulta SELECT
        const query = `select b.value celsiustemper from 
       ( SELECT connector_pk, Max(value_timestamp) timestamp FROM connector_meter_value 
       where 1=1 
       and value_timestamp > NOW() - INTERVAL 7 MINUTE 
       and connector_pk = ? and measurand='Temperature'  and transaction_pk is not null
       group by connector_pk
       ) a, connector_meter_value b
        where 
        b.transaction_pk is not null
        and a.connector_pk = b.connector_pk and a.timestamp = b.value_timestamp
        and b.connector_pk = ? and b.measurand='Temperature';
        `;
        const queryParams = [connector_pk, connector_pk];

        const [rows] = await connection.execute(query, queryParams);

        let resTemp =(rows.length>0? rows[0].celsiustemper: 0);

        return {
            statusCode: 200,
            body: JSON.stringify(resTemp)
            //body: JSON.stringify(rows)
        };
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
    