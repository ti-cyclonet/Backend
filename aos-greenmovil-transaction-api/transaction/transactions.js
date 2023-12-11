const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  // Set the session time zone to UTC
    
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
      
      console.log(startdate);
      enddate = moment();
      enddate = enddate.format('YYYY-MM-DDTHH:mm:ss');
    }

    console.log(startdate);
    console.log(enddate);

    // Realiza la consulta SELECT
    const query = ` SELECT tr.*, co.connector_id, fu.fuun_name name,
                    case
                      when co.alias is not null then co.alias
                      else co.connector_id end connectorName, 
                    case
                      when cb.alias is not null then cb.alias
                      else cb.charge_box_id end chargeBoxName,
                    case 
                      when ve.alias is not null then ve.alias 
                      else ve.placa end vehicle_info,
                      vm.module_sn moduleid,                      
                    ve.placa,
                    case
                      when tr.stop_value is not null then (tr.stop_value - tr.start_value)
                      else tr.start_value end/1000 totalValue,
                      ( 
                        Select		          
                        concat( 
                          min( cast( value as signed) ) ,'|', CAST( min( value_timestamp ) AS char) ,'|' ,
                          max( cast( value as signed ) ) , '|', CAST( max( value_timestamp ) AS char)  ) 
                        From connector_meter_value cmv
                        Where measurand = 'SoC' /* AND value_timestamp >= NOW() - INTERVAL 5 MINUTE */
                        And cmv.transaction_pk is not null
                        And cmv.transaction_pk = tr.transaction_pk
                        And cmv.connector_pk = tr.connector_pk
                      ) socvalues
                                            
                    FROM transaction tr 
                    left join vehicle_modules vm on tr.vehicle_module_pk = vm.vehicle_module_pk
                    left join vehicles ve on ve.vehicle_pk = vm.vehicle_fk
                    left join connector co on tr.connector_pk = co.connector_pk
                    left join charge_box cb on co.charge_box_id = cb.charge_box_id
                    left join functionalunits_group  on fugr_chargeboxpk =cb.charge_box_pk
                    left join functional_units fu on fugr_fuid=fu.fuun_id
                    WHERE tr.start_event_timestamp BETWEEN STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s') AND STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s')
                    order by tr.start_event_timestamp desc;`;
    const queryParams = [startdate, enddate];
    console.log(mysql.format(query, queryParams));
    const [rows] = await connection.execute(query, queryParams);
    
   // const jsonResp = rows.map(row => {
      let jsonResp=[];
      for ( row of rows ){

      let splitValues = "";
      let isocval = 0;
      let isoctimes = "";
      let esocval = 0;
      let esoctimes = "";

      if(row.socvalues){
        splitValues = row.socvalues.split('|')
        isocval = parseInt( splitValues[0] , 10);
        isoctimes = splitValues[1];
        esocval = parseInt(splitValues[2], 10);
        esoctimes = splitValues[3];
      }
      
      jsonResp.push({
        id: row.transaction_pk,
        connectorName: row.connectorName,
        connectorId: row.connector_id,
        chargeBoxName: row.chargeBoxName,
        functionalName: row.name,
        idTag: row.id_tag,
        startEventTimestamp: row.start_event_timestamp,
        startTimestamp: isoctimes,
        startValue: isocval,
        stopEventActor: row.stop_event_actor,
        stopEventTimestamp: row.stop_event_timestamp,
        stopTimestamp: esoctimes,
        stopValue: esocval,
        totalValue: row.totalValue,
        stopReason: row.stop_reason,
        vehicle_info: row.vehicle_info,
        functional_unit_name: row.name,
        connector_pk: row.connector_pk,
        placa: row.placa,
        moduleid: row.moduleid
      });
    }
    //);

   // console.log(JSON.stringify(jsonResp));
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
