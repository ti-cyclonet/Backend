const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

module.exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {

    const { id } = event.pathParameters;

    // Realiza la consulta SELECT
    /*
    const query = `
    SELECT charge_box_pk,
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
    FROM charge_box 
    WHERE charge_box_id = ? limit 1`;
    */
   //    Case When fugr_fuid is null then 'Inactive' Else  'Active' End AS estado,

   const query =`
   select
   cbx.charge_box_pk,
   cbx.charge_box_id,
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
   cbx.alias, fuun_id functional_unit_pk, fuun_name,
   fugr_maxdelivpower charge_maxdelivpower, 

   Case When fugr_fuid is null then 'Inactive' Else                          
   CASE WHEN IFNULL(cs.status, 'Offline') In( 'Faulted','Unavailable','SuspendedEVSE','SuspendedEV') THEN 'Faulted' 
   ELSE IFNULL(cs.status, 'Offline') End End AS status,

   c.connector_pk,
   c.connector_id,
   c.alias connectoralias,
   c.conn_location connectorlocation
  from charge_box cbx
  JOIN connector c ON cbx.charge_box_id = c.charge_box_id
  LEFT JOIN (
    SELECT
        cs1.connector_pk, cs1.status, cs1.error_code, cs1.error_info, cs1.vendor_error_code, cs2.max_timestamp FROM connector_status cs1
    JOIN (
        SELECT connector_pk, MAX(status_timestamp) AS max_timestamp FROM connector_status
        WHERE status_timestamp >  NOW() - INTERVAL 1 HOUR GROUP BY connector_pk
    ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
  ) cs ON c.connector_pk = cs.connector_pk
  Left Join functionalunits_group fug On charge_box_pk= fugr_chargeboxpk
  Left Join  functional_units On fugr_fuid = fuun_id
  Where cbx.charge_box_id = ? 
  And c.connector_id>0
  Order by c.connector_id limit 1`;
    const queryParams = [id];
    console.log(mysql.format(query, queryParams));
    const [rows] = await connection.execute(query, queryParams);

    let tempArray = [];
    rows.forEach((item, i) => {
      if (i === 0) {
        tempArray.push({
          charge_box_pk: item.charge_box_pk, 
          charge_box_id: item.charge_box_id,
          charge_box_alias: item.charge_box_alias,
          ocpp_protocol: item.ocpp_protocol,
          registration_status: item.registration_status,
          charge_point_vendor: item.charge_point_vendor,
          charge_point_model: item.charge_point_model,
          charge_point_serial_number: item.charge_point_serial_number,
          charge_point_serial_number: item.charge_point_serial_number,
          fw_version: item.fw_version,
          fw_update_status: item.fw_update_status,
          fw_update_timestamp: item.fw_update_timestamp,
          iccid: item.iccid,
          imsi: item.imsi,
          meter_type: item.meter_type,
          meter_serial_number: item.meter_serial_number,
          diagnostics_status: item.diagnostics_status,
          diagnostics_timestamp: item.diagnostics_timestamp,
          last_heartbeat_timestamp: item.last_heartbeat_timestamp,
          description: item.description,
          note: item.note,
          location_latitude: item.location_latitude,
          location_longitude: item.location_longitude,
          address_pk: item.location_longitude,
          admin_address: item.admin_address,
          insert_connector_status_after_transaction_msg: item.insert_connector_status_after_transaction_msg,
          alias: item.alias,
          functional_unit_pk: item.functional_unit_pk, 
          fuun_name: item.fuun_name,
          charge_maxdelivpower: item.charge_maxdelivpower, 
          estado:item.estado,
          connectors: [{ 
            connector_pk: item.connector_pk,
            connector_id: item.connector_id,
            connectoralias: item.connectoralias,
            connectorlocation: item.connectorlocation,
            status: item.status
           }],
        });
      } else {
        const index = tempArray.findIndex(
          (temp) => temp.charge_box_id === item.charge_box_id
        );
        if (index !== -1) {
          tempArray[index].connectors.push({
            connector_pk: item.connector_pk,
            connector_id: item.connector_id,
            connectoralias: item.connectoralias,
            connectorlocation: item.connectorlocation,
            status: item.status
          });
        } else {
          tempArray.push({
            charge_box_pk: item.charge_box_pk, 
            charge_box_id: item.charge_box_id,
            charge_box_alias: item.charge_box_alias,
            ocpp_protocol: item.ocpp_protocol,
            registration_status: item.registration_status,
            charge_point_vendor: item.charge_point_vendor,
            charge_point_model: item.charge_point_model,
            charge_point_serial_number: item.charge_point_serial_number,
            charge_point_serial_number: item.charge_point_serial_number,
            fw_version: item.fw_version,
            fw_update_status: item.fw_update_status,
            fw_update_timestamp: item.fw_update_timestamp,
            iccid: item.iccid,
            imsi: item.imsi,
            meter_type: item.meter_type,
            meter_serial_number: item.meter_serial_number,
            diagnostics_status: item.diagnostics_status,
            diagnostics_timestamp: item.diagnostics_timestamp,
            last_heartbeat_timestamp: item.last_heartbeat_timestamp,
            description: item.description,
            note: item.note,
            location_latitude: item.location_latitude,
            location_longitude: item.location_longitude,
            address_pk: item.location_longitude,
            admin_address: item.admin_address,
            insert_connector_status_after_transaction_msg: item.insert_connector_status_after_transaction_msg,
            alias: item.alias,
            functional_unit_pk: item.functional_unit_pk, 
            fuun_name: item.fuun_name,
            charge_maxdelivpower: item.charge_maxdelivpower, 
            connectors: [{ 
              connector_pk: item.connector_pk,
              connector_id: item.connector_id,
              connectoralias: item.connectoralias,
              connectorlocation: item.connectorlocation,
              status: item.status
             }],
          });
        }
      }
    });

//    console.log(JSON.stringify( tempArray ));
    return {
      statusCode: 200,
      body: JSON.stringify(tempArray[0]),
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
