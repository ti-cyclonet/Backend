const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const QUEUE_URL = process.env.QUEUE_PROFILECONFIG;
console.log("QUEUE_URL: "+JSON.stringify(QUEUE_URL));

exports.handler = async (event, context) => {

    console.log(event);
    //console.log(dbconfig);
    //const connection = await mysql.createConnection(dbconfig);
    const sqs = new AWS.SQS();
    const params = {
        QueueUrl: 'URL_DE_LA_COLA_SQS',
        MaxNumberOfMessages: 10 // Cambia según tus necesidades
    };

    try {

        // Se obtiene la data de la cola
        //const query = `SELECT c.charge_box_id AS chargeboxID, CAST(c.connector_id as NCHAR)  AS connectorid FROM connector c`;
        const data = await sqs.receiveMessage(params).promise();

        if (data.Messages) {
            for (const message of data.Messages){
                //Procesar cada mensaje
                const resp = message.Body;
                console.log('Mensaje recibido: ', resp);

                //Eliminar el mensaje de la cola
                sqs.deleteMessage({
                    QueueUrl: params.QueueUrl,
                    ReceiptHandle: message.ReceiptHandle
                }).promise();
            }
            return {
                statusCode: 200,
                body: JSON.stringify(resp),
            };
        }
        else{
            console.log('No hay mensajes en la cola');
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Error al realizar la consulta de mensaje',
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

        /*try {
            if (connection) {
                connection.end();
            }
        } catch (error) {
            console.error('Error al cerrar la conexion:', error);
        }*/

    }
};
