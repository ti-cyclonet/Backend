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
        
       // let { connector_pk, date } = event.pathParameters;

        let connector_pk, date;
        console.log(event.pathParameters);
       if (event.pathParameters && event.pathParameters.connector_pk && event.pathParameters.date &&
        (moment(event.pathParameters.date).isValid())) {
          connector_pk = event.pathParameters.connector_pk;
           date= moment(event.pathParameters.date);
           date=date.format('YYYY-MM-DDTHH:mm:ss');
         }else {
          console.error("Error al realizar la consulta, sin parámetros");
          return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error al realizar la consulta" }),
          };
      
         }

        
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
                        else tr.start_value end totalValue
                        FROM transaction tr 
                        left join vehicle_modules vm on tr.vehicle_module_pk = vm.vehicle_module_pk
                        left join vehicles ve on ve.vehicle_pk = vm.vehicle_fk                    
                        left join connector co on tr.connector_pk = co.connector_pk
                        left join charge_box cb
                        on co.charge_box_id = cb.charge_box_id

                        left join functionalunits_group  on fugr_chargeboxpk =cb.charge_box_pk
                        left join functional_units fu on fugr_fuid=fu.fuun_id    
                        WHERE connector_pk = '${connector_pk}' AND date(start_timestamp) =  STR_TO_DATE('${date}', '%Y-%m-%dT%H:%i:%s')  
                        order by start_timestamp desc;`;

        const [rows] = await connection.query(query);

        const jsonResp = rows.map(row => {
            return {
              id: row.transaction_pk,
              connectorName: row.connectorName,
              connectorId: row.connector_id,
              chargeBoxName: row.chargeBoxName,
              functionalName: row.name,
              idTag: row.id_tag,
              startEventTimestamp: row.start_event_timestamp,
              startTimestamp: row.start_timestamp,
              startValue: row.start_value,
              stopEventActor: row.stop_event_actor,
              stopEventTimestamp: row.stop_event_timestamp,
              stopTimestamp: row.stop_timestamp,
              stopValue: row.stop_value,
              totalValue: row.totalValue,
              stopReason: row.stop_reason,
              vehicle_info: row.vehicle_info,
              functional_unit_name: row.name,
              connector_pk: row.connector_pk,
              placa: row.placa,
              moduleid: row.moduleid

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
    
