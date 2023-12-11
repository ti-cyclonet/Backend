const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  await connection.query(`SET time_zone = '${timeZone}';`);
  try {
    //console.log(event);
    const { idVehicle } = event.pathParameters;

    // Realiza la consulta SELECT
    const query = 'SELECT * FROM vehicle_modules WHERE vehicle_fk = ?';
    const queryParams = [idVehicle];
    const [rows, fields] = await connection.query(query, queryParams);
    //console.log("rows: " + JSON.stringify(rows));
    //console.log("fields: " + JSON.stringify(fields));

    if (rows) {

      const jsonResp = rows.map(row => {
        return {
          id: row.vehicle_module_pk,
          module_sn: row.module_sn,
          status: row.status,
          vehicleId: row.vehicle_fk,
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify(jsonResp)
        //body: JSON.stringify(rows)
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error al realizar la consulta' })
      };
    }
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
