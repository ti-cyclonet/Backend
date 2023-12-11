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

        // Adquiere una conexión del pool
        const { id, measurand } = event.pathParameters;
        const escala = 'Power.Offered' === measurand ? " value/1000  as value " : " value ";
        const medidaescala =  'Power.Offered'===measurand ? " concat('k',unit) unit ": " unit " ;
        const optval =  'Temperature'=== measurand ? " and location='Cable' ": " " ;

        // Realiza la consulta SELECT
        const query = `SELECT
        connector_pk,
        transaction_pk,
        CAST(value_timestamp AS char) as value_timestamp,
        ${escala},
        reading_context,
        format,
        measurand,
        location,
        ${medidaescala},
        phase  FROM connector_meter_value where transaction_pk = ? and measurand = ? ${optval} and transaction_pk is not null`;
        const queryParams = [id, measurand];
        console.log(mysql.format(query, queryParams));
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
