const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

var  moment = require("moment-timezone");
moment.tz.setDefault("America/Bogota");

exports.handler = async (event) => {   

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig); 

    try {
        //console.log(event);
        
        let startdate, enddate;

        console.log(event.queryStringParameters);
        if (event.queryStringParameters && 
            event.queryStringParameters.startdate && event.queryStringParameters.enddate &&
            (moment(event.queryStringParameters.startdate).isValid() && moment(event.queryStringParameters.enddate).isValid())) {            

            startdate= new Date(event.queryStringParameters.startdate);
            enddate= new Date(event.queryStringParameters.enddate);    

        }else{
            startdate = new Date();
            startdate.setMonth(startdate.getMonth()-3);
            enddate = new Date();
        }            

        console.log(startdate);
        console.log(enddate);

        // Realiza la consulta SELECT
        const query = `SELECT 
            e.error_pk,
            e.error_timestamp,
            cb.charge_box_id,
            cb.alias,
            e.connector_pk,
            e.transaction_pk,
            e.error_code,
            e.error_description,
            e.chargebox_status,
            e.vendor_id,
            e.vendor_error_code
        FROM 
            error e
        JOIN 
            charge_box cb ON e.charge_box_pk = cb.charge_box_pk
        WHERE 
            e.error_timestamp BETWEEN ? AND ?`;
        const queryParams = [startdate,enddate];

        console.log(mysql.format(query, queryParams));

        const [rows] = await connection.execute(query, queryParams);
        

        const jsonResp = rows.map(row => {
            return {
                id: row.error_pk,
                errorTimestamp: row.error_timestamp,
                chargeboxId: row.charge_box_id,
                chargeboxAlias: row.alias,
                connectorId: row.connector_pk,
                transactionId: row.transaction_pk,
                errorCode: row.error_code,
                errorDescription: row.error_description,
                chargeboxStatus: row.chargebox_status,
                vendorId: row.vendor_id,
                vendorErrorCode: row.vendor_error_code,
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
  