const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {   

  //console.log("Llamando API de errores.....");
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  
    try {
      let startdate, enddate;
      console.log(event.queryStringParameters);
     //console.log('TIMEZONE:   '+Intl.DateTimeFormat().resolvedOptions().timeZone);
     if (event.queryStringParameters &&
      event.queryStringParameters.startdate && event.queryStringParameters.enddate &&
      (moment(event.queryStringParameters.startdate).isValid()
       && moment(event.queryStringParameters.enddate).isValid())
       ) {
   
         startdate= moment(event.queryStringParameters.startdate);
         startdate=startdate.format('YYYY-MM-DDTHH:mm:ss');
  
         enddate= moment(event.queryStringParameters.enddate); 
         enddate=enddate.format('YYYY-MM-DDTHH:mm:ss');
  
        console.log(startdate);
       } else {
        
        startdate = moment();
        startdate = startdate.subtract(3, 'months');
        startdate = startdate.format('YYYY-MM-DDTHH:mm:ss');
  
        //console.log('NN');
        
        console.log(startdate);
        enddate = moment();
        enddate = enddate.format('YYYY-MM-DDTHH:mm:ss');
      }
  
      console.log(startdate);
      console.log(enddate);
  

        // Realiza la consulta SELECT
        const query = `
        SELECT @rank:=COALESCE (@rank,0)+1 AS rownum, 
                          e.error_pk,
                          CAST(e.error_timestamp AS char) as error_timestamp,
                          cb.charge_box_id,
                          cb.alias,
                          co.connector_id,
                          e.transaction_pk,
                          e.error_code,
                          e.error_description,
                          e.chargebox_status,
                          e.vendor_id,
                          e.vendor_error_code
                        FROM error e JOIN charge_box cb 
                        ON e.charge_box_pk = cb.charge_box_pk
                        join connector co
                        on cb.charge_box_id = co.charge_box_id
                        WHERE e.error_timestamp BETWEEN STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s') AND STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s')
                        order by e.error_timestamp desc, co.connector_id asc`;
                    
        const queryParams = [startdate,enddate];
        console.log(mysql.format(query, queryParams));

        const [rows] = await connection.query(query, queryParams);
        //console.log(rows);
        
        const jsonResp = rows.map(row => {
            return {
                rownum: row.rownum,
                id: row.error_pk,
                errorTimestamp: row.error_timestamp,
                chargeboxId: row.charge_box_id,
                chargeboxAlias: row.alias,
                connectorId: row.connector_id,
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
  
