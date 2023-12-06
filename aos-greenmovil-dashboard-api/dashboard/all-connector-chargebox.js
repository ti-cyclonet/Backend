const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");

exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);

  try {
    let startDate = new Date();
    startDate = startDate.toISOString().split('.')[0];

    let endDate = new Date();
    endDate.setMinutes(new Date().getMinutes() + 5);
    endDate = endDate.toISOString().split('.')[0];
    
    const query = `SELECT
                      cb.charge_box_pk,
                      cb.charge_box_id,
                      cb.alias AS charge_box_alias,
                      c.connector_pk,
                      c.connector_id,
                      c.alias AS connector_alias,
                      IFNULL(cs.status, 'Offline') AS status,
                      cs.error_code,
                      cs.error_info,
                      cs.vendor_error_code,
                      cs.max_timestamp,
                      IFNULL(cmv.soc, 'N/A') AS soc
                  FROM charge_box cb
                  JOIN connector c ON cb.charge_box_id = c.charge_box_id
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
                          WHERE status_timestamp >  NOW() - INTERVAL 1 HOUR
                          GROUP BY connector_pk
                      ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
                  ) cs ON c.connector_pk = cs.connector_pk
                  LEFT JOIN (
                      SELECT
                          connector_pk,
                          MAX(CASE WHEN measurand = 'SoC' THEN value END) AS soc
                      FROM connector_meter_value
                      WHERE measurand = 'SoC' AND value_timestamp >= NOW() - INTERVAL 5 MINUTE
                      GROUP BY connector_pk
                  ) cmv ON c.connector_pk = cmv.connector_pk`;

    const [res] = await connection.query(query);

    let tempArray = [];
    res.forEach((item, i) => {
      if (i === 0) {
        tempArray.push({
          charge_box_id: item.charge_box_id,
          charge_box_alias: item.charge_box_alias,
          connectors: [{ ...item }],
        });
      } else {
        const index = tempArray.findIndex(
          (temp) => temp.charge_box_id === item.charge_box_id
        );
        if (index !== -1) {
          tempArray[index].connectors.push(item);
        } else {
          tempArray.push({
            charge_box_id: item.charge_box_id,
            charge_box_alias: item.charge_box_alias,
            connectors: [{ ...item }],
          });
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(tempArray),
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
