const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {    
    const { functional_unit_pk } = event.pathParameters;
    const queryChargebox = 'SELECT charge_box_id FROM ocppcsdb.charge_box where Exists (select 1 from functionalunits_group where fugr_chargeboxpk = charge_box_pk and fugr_fuid=? limit 1 ) ';

    const queryParams = [functional_unit_pk];

    //const [res] = await connection.query(queryChargebox);
    const [res, fields] = await connection.execute(queryChargebox, queryParams);

    const promises = res.map((qr) => {
        //console.log(qr.charge_box_id, 'IIDDDD');
        const query = `SELECT c.*, CAST(b.status_timestamp AS char) as status_timestamp, b.status 
        FROM ocppcsdb.connector c 
        JOIN (SELECT a.* FROM ocppcsdb.connector_status AS a 
          WHERE 
          a.status_timestamp = (SELECT MAX(CAST(status_timestamp AS CHAR)) 
          FROM ocppcsdb.connector_status AS b WHERE a.connector_pk = b.connector_pk )) b 
          ON c.charge_box_id = '${qr.charge_box_id}' AND c.connector_pk = b.connector_pk;`;
        return connection.query(query);
    })

    const contents = await Promise.all(promises);

    const response = [];

    let totalConnectors = 0;
    let totalAvailable = 0;

    checkAvailableConnector = (array) => array.filter((item) => item.status = 'Available').length;

    contents.forEach((element) => {
        element.forEach((charger, i) => {
            if (i === 0) {
              totalAvailable += checkAvailableConnector(charger);
              totalConnectors += charger.length;
                response.push(charger);
            }
        });
    });

    

   // console.log(totalConnectors, totalAvailable, 'sss');

    return {
      statusCode: 200,
      body: JSON.stringify({totalConnectors, totalAvailable}),
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
