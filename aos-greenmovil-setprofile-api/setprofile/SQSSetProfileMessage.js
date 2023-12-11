//const API_BASEPATH = process.env.API_BASEPATH;
const API_BASEPATH = 'https://064thkhiu1.execute-api.us-east-1.amazonaws.com/default/AOSOCPPServer/api/v1';

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const QUEUE_URL = process.env.QUEUE_PROFILECONFIG;
console.log("QUEUE_URL: "+JSON.stringify(QUEUE_URL));


exports.handler = async (event) => {

    try {

        console.log(event.Records);
        console.log("URL: " + API_BASEPATH);

        event.Records.forEach(async (record) => {

            try {

                const _event = JSON.parse(record);
                console.log("[_event] ["+_event+"]");

                const eventBody = JSON.parse(record.body);
                console.log("[eventBody] ["+eventBody+"]");

                const resp = await fetch(API_BASEPATH + '/charge-point/setchargingprofile', {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'OCPPSERVER-API-KEY': '123'
                    },
                    body: JSON.stringify(eventBody),
                    signal: AbortSignal.timeout(5000),
                });
                console.log(resp);

            } catch (e) {
                console.error("Error al procesar registro de setchargingprofile");
                console.error(record);
                console.error(record.body);

                console.error(e);

                const sqs = new AWS.SQS();
                await sqs.sendMessage({
                    MessageBody: JSON.stringify(record.body),
                    QueueUrl: QUEUE_URL,
                });
            }

        });



    } catch (e) {
        console.error(e);
    }




};
