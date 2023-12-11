const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
moment.tz.setDefault(Intl.DateTimeFormat().resolvedOptions().timeZone);


exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {

    //console.log(event);
    const { id } = event.pathParameters;

    // Realiza la consulta SELECT
    const query = 'DELETE FROM vehicles WHERE vehicle_pk=?';
    const queryParams = [id];

    const [rows, fields] = await connection.execute(query, queryParams);
    //console.log("rows: " + JSON.stringify(rows));
    //console.log("fields: " + JSON.stringify(fields));

    if (rows && rows.affectedRows > 0) {

      return {
        statusCode: 204
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error al realizar la eliminacion del vehiculo.' })
      };
    }
  } catch (error) {
    console.error('Error al realizar la eliminacion del vehiculo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al realizar la eliminacion del vehiculo.' })
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
