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
    
    // Realiza la consulta SELECT
    const query = `SELECT charge_box_pk,
    charge_box_id,
    endpoint_address,
    ocpp_protocol,
    registration_status,
    charge_point_vendor,
    charge_point_model,
    charge_point_serial_number,
    charge_box_serial_number,
    fw_version,
    fw_update_status,
     CAST(fw_update_timestamp AS char) as fw_update_timestamp,
    iccid,
    imsi,
    meter_type,
    meter_serial_number,
    diagnostics_status,
    CAST(diagnostics_timestamp AS char) as diagnostics_timestamp,
    CAST(last_heartbeat_timestamp AS char) as last_heartbeat_timestamp,
    description,
    note,
    location_latitude,
    location_longitude,
    address_pk,
    admin_address,
    insert_connector_status_after_transaction_msg,
    alias,
    (select fugr_fuid from functionalunits_group where fugr_chargeboxpk =charge_box_pk limit 1 ) functional_unit_pk 
     FROM charge_box`;
    const [rows] = await connection.execute(query);


    const jsonResp = rows.map(row => {
      return {
        charge_box_id: row.charge_box_id,
        endpoint_address: row.endpoint_address,
        ocpp_protocol: row.ocpp_protocol,
        registration_status: row.registration_status,
        diagnostics_status: row.diagnostics_status
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
