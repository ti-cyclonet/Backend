const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

exports.handler = async (event) => {


    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);

    try {
        
        const { id } = event.pathParameters;

        // Realiza la consulta SELECT
        const query = 'SELECT * FROM connector_meter_value where transaction_pk = ?';
        const queryParams = [id];

        const [rows] = await connection.execute(query, queryParams);

        const jsonResp = rows.map(row => {
            return {
                transactionId: row.transaction_pk,
                connectorId: row.connector_pk,
                valueTimestamp: row.value_timestamp,
                value: row.value,
                readingContext: row.reading_context,
                format: row.format,
                measurand: row.measurand,
                location: row.location,
                unit: row.unit,
                phase: row.phase
            };
        });


        return {
            statusCode: 200,
            body: JSON.stringify(jsonResp)
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
    