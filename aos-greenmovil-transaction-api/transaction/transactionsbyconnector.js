const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

var moment = require("moment-timezone");
moment.tz.setDefault("America/Bogota");

exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
    try {

        const { connector_pk } = event.pathParameters;

        let startdate, enddate;

        console.log(event.queryStringParameters);
        if (event.queryStringParameters &&
            event.queryStringParameters.startdate && event.queryStringParameters.enddate &&
            (moment(event.queryStringParameters.startdate).isValid() && moment(event.queryStringParameters.enddate).isValid())) {

            startdate = new Date(event.queryStringParameters.startdate);
            enddate = new Date(event.queryStringParameters.enddate);

        } else {
            startdate = new Date();
            startdate.setMonth(startdate.getMonth() - 3);
            enddate = new Date();
        }

        console.log(startdate);
        console.log(enddate);


        // Realiza la consulta SELECT
        const query = 'SELECT * FROM transaction WHERE connector_pk = ? AND start_timestamp BETWEEN ? AND ?';
        const queryParams = [connector_pk, startdate, enddate];

        const [rows] = await connection.execute(query, queryParams);

        const jsonResp = rows.map(row => {
            return {
                id: row.transaction_pk,
                connectorId: row.connector_pk,
                idTag: row.id_tag,
                startEventTimestamp: row.start_event_timestamp,
                startTimestamp: row.start_timestamp,
                startValue: row.start_value,
                stopEventActor: row.stop_event_actor,
                stopEventTimestamp: row.stop_event_timestamp,
                stopTimestamp: row.stop_timestamp,
                stopValue: row.stop_value,
                stopReason: row.stop_reason
            };
        });


        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify(jsonResp)
            //body: JSON.stringify(rows)
        };
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
    