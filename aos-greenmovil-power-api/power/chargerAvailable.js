const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {
    /*
    console.log(event.pathParameters);
    let order='';
    let fuunit='';
    let env='';
    let chgr='';
    if ( event.queryStringParameters ) {
      order = event.queryStringParameters.order || ''; // Use a default empty string if 'order' is not present.
      order = ` ORDER BY 7 ${order}`; 

      fuunit = event.queryStringParameters.fuunit || ''; // Use a default empty string if 'order' is not present.
      fuunit = ( ('-' == fuunit || '' == fuunit)? '': ` And Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk and fugr_fuid=${fuunit} limit 1 ) ` ); 

      env = event.queryStringParameters.env || ''; // Use a default empty string if 'order' is not present.
      env = ( ('-' == env || '' == env)? '': ` And SUBSTRING_INDEX(cb.alias, '-', 1)='${env}'` ); 
      
      chgr = event.queryStringParameters.chgr || ''; // Use a default empty string if 'order' is not present.
      chgr = ( ('-' == chgr || ''== chgr)? '': ` And SUBSTRING_INDEX(cb.alias, '-', -1)='${chgr}'` ); 

    }
    

    let startDate = new Date();
    startDate = startDate.toISOString().split('.')[0];

    let endDate = new Date();
    endDate.setMinutes(new Date().getMinutes() + 5);
    endDate = endDate.toISOString().split('.')[0];
    */
    
    const query = `  
     SELECT
    cb.alias AS cargador, '110' potmax, 'secuencial' tipocargador,
    Case IFNULL(lastcconn.status, 'Offline')  When 'Offline' then 'Offline'
                          When 'Available' then 'Disponible'
                          When 'Preparing' then 'Preparando'
                          When 'Charging'  then 'Cargando'
                          When 'Finishing' then 'Finalizando'
                          When 'Faulted'   then 'En fallo'
                          else '' end status,
    Case IFNULL(lastcconn.status, 'Offline') When 'Offline' then 'N/A'
                          When 'Available' then 'Aceptado'
                          When 'Preparing' then 'Aceptado'
                          When 'Charging'  then 'Aceptado'
                          When 'Finishing' then 'Aceptado'
                          When 'Faulted'   then 'No disponible'
                          else '' end repuesta,
    Case IFNULL(lastcconn.status, 'Offline') When 'Offline' then 'N/A'
                          When 'Available' then 'Conectado'
                          When 'Preparing' then 'Conectado'
                          When 'Charging'  then 'Conectado'
                          When 'Finishing' then 'Conectado'
                          When 'Faulted'   then 'No disponible'
                          else '' end conexion,
    
    (select fugr_fuid from functionalunits_group where fugr_chargeboxpk = cb.charge_box_pk limit 1 ) functional_unit_pk,
      -- fugr_fuid,
       cb.charge_box_pk,
       cb.charge_box_id
   FROM charge_box cb 
   -- JOIN chargeboxgroup_charger cbgc ON cb.charge_box_pk = cbgc.fugr_chargeboxpk
   LEFT JOIN
   (
           SELECT
               c.charge_box_id ,
               cs1.status,
               cs1.error_code,
               cs1.error_info,
               cs1.vendor_error_code,
               cs2.max_timestamp
           FROM connector c JOIN connector_status cs1 ON c.connector_pk = cs1.connector_pk
           JOIN (
               SELECT
                   connector_pk,
                   MAX(status_timestamp) AS max_timestamp
               FROM connector_status
               WHERE status_timestamp >  NOW() - INTERVAL 1 HOUR
               GROUP BY connector_pk
           ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
           
   ) lastcconn 
   ON cb.charge_box_id = lastcconn.charge_box_id
   Where Not 
   Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk )
   `;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
   const [res] = await connection.query(query);
   let tempArray = [];
   res.forEach((item, i) => {
        tempArray.push({
            cargador: item.cargador,
            potmax: item.potmax,
            tipocargador: item.tipocargador,
            status: item.status,
            respuesta: item.respuesta,
            conexion: item.conexion,
            functional_unit_pk: item.functional_unit_pk,
            charge_box_pk: item.charge_box_pk,
            charge_box_id: item.charge_box_id,            
        });    
  });    
    return {
      statusCode: 200,
      headers: {
          'Access-Control-Allow-Origin': "*",
          'Access-Control-Allow-Credentials': true,
        },
      body: JSON.stringify(tempArray),
    };
  } catch (error) {
    console.error("Error al realizar la consulta:", error);
    return {
      statusCode: 500,
      headers: {
          'Access-Control-Allow-Origin': "*",
          'Access-Control-Allow-Credentials': true,
        },
      body: JSON.stringify({ message: "Error al realizar la consulta" }),
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
