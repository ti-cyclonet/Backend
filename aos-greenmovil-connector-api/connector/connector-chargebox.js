const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);


exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {

    const { chargerbox_id } = event.pathParameters;

    const query = `SELECT
                      cb.charge_box_pk,
                      cb.charge_box_id,
                      c.connector_pk,
                      c.connector_id,
                      c.alias,
                      Case When fugr_fuid is null then 'Inactive' Else                          
                      CASE WHEN IFNULL(cs.status, 'Offline') In( 'Faulted','Unavailable','SuspendedEVSE','SuspendedEV') THEN 'Faulted' 
                      ELSE IFNULL(cs.status, 'Offline') End End AS status,
                  cs.error_code,
                      cs.error_info,
                      cs.vendor_error_code,
                      CAST(cs.max_timestamp AS char) as max_timestamp,
                      IFNULL(cmv.soc, 'N/A') AS soc
                  FROM charge_box cb
                  Left Join functionalunits_group on Coalesce( fugr_chargeboxpk, -1 ) =charge_box_pk
                  JOIN connector c ON cb.charge_box_id = c.charge_box_id AND cb.charge_box_id = ?
                  LEFT JOIN (
                      SELECT
                          cs1.connector_pk,
                          cs1.status,
                          cs1.error_code,
                          cs1.error_info,
                          cs1.vendor_error_code,
                          cs2.max_timestamp
                      FROM connector_status cs1
                      JOIN (
                          SELECT
                              connector_pk,
                              MAX(status_timestamp) AS max_timestamp
                          FROM connector_status
                          WHERE status_timestamp  BETWEEN NOW() - INTERVAL 2 HOUR AND NOW()
                          GROUP BY connector_pk
                      ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
                  ) cs ON c.connector_pk = cs.connector_pk
                  LEFT JOIN (
                      SELECT
                          connector_pk,
                          MAX(CASE WHEN measurand = 'SoC' THEN value END) AS soc
                      FROM connector_meter_value
                      WHERE measurand = 'SoC' AND value_timestamp >= NOW() - INTERVAL 5 MINUTE
                      AND transaction_pk is not null
                      GROUP BY connector_pk
                  ) cmv ON c.connector_pk = cmv.connector_pk;`;

    const queryParams = [chargerbox_id];

    console.log(mysql.format(query, queryParams));


    const [rows] = await connection.execute(query, queryParams);

    return {
      statusCode: 200,
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error("Error al realizar la consulta:", error);
    return {
      statusCode: 500,
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
