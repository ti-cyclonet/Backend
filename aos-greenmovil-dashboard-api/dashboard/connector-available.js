const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");

exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);

  try {    

    const queryChargebox = 'SELECT charge_box_id FROM ocppcsdb.charge_box';

    const [res] = await connection.query(queryChargebox);

    const promises = res.map((qr) => {
        //console.log(qr.charge_box_id, 'IIDDDD');
        const query = `SELECT c.*, b.status_timestamp, b.status FROM ocppcsdb.connector c JOIN (SELECT a.* FROM ocppcsdb.connector_status AS a WHERE a.status_timestamp = (SELECT MAX(CAST(status_timestamp AS CHAR)) FROM ocppcsdb.connector_status AS b WHERE a.connector_pk = b.connector_pk )) b ON c.charge_box_id = '${qr.charge_box_id}' AND c.connector_pk = b.connector_pk;`;
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

    

    console.log(totalConnectors, totalAvailable, 'sss');

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
