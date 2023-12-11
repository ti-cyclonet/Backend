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
        const { connector_pk } = event.pathParameters;

        // Realiza la consulta SELECT
        const query = `SELECT * FROM transaction t where t.connector_pk = ? AND t.stop_event_timestamp is null order by start_timestamp desc`;
        const queryParams = [connector_pk];

        console.log(mysql.format(query, queryParams));


        const [rows] = await connection.execute(query, queryParams);

        if (rows && rows.length > 0) {
            const jsonResp = {
                id: rows[0].transaction_pk,
                connectorId: rows[0].connector_pk,
                idTag: rows[0].id_tag,
                startEventTimestamp: rows[0].start_event_timestamp,
                startTimestamp: rows[0].start_timestamp,
                startValue: rows[0].start_value,
                stopEventActor: rows[0].stop_event_actor,
                stopEventTimestamp: rows[0].stop_event_timestamp,
                stopTimestamp: rows[0].stop_timestamp,
                stopValue: rows[0].stop_value,
                stopReason: rows[0].stop_reason
            };

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': "*",
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify(jsonResp)
                //body: JSON.stringify(rows)
            };
        } else {
            return {
                statusCode: 204,
                headers: {
                    'Access-Control-Allow-Origin': "*",
                    'Access-Control-Allow-Credentials': true,
                },
            };
        }
    } catch (error) {
        console.error('Error al realizar la consulta:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
            },
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
