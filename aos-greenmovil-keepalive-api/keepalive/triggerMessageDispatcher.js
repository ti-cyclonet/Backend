const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const QUEUE_URL = process.env.QUEUE_TRIGGERMESSAGE;
console.log("QUEUE_URL: "+JSON.stringify(QUEUE_URL));

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);
    const sqs = new AWS.SQS();

    try {

        // Realiza la consulta SELECT
        const query = `SELECT c.charge_box_id AS chargeboxID, CAST(c.connector_id as NCHAR)  AS connectorid FROM connector c`;
        const [rows, fields] = await connection.query(query);

        if (rows) {

            //console.log(rows);

            const resp = rows.map((row) => {
                return sqs.sendMessage({
                    MessageBody: JSON.stringify({
                        ...row,
                        "triggermessage": "StatusNotification"
                    }),
                    QueueUrl: QUEUE_URL,
                }).promise();
            });


            await Promise.all(resp);
            //console.log("Promise.all: " + resp);


            return {
                statusCode: 200,
                body: JSON.stringify(resp),
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
