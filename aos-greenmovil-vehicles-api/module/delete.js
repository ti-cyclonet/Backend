const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas


exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);

  try {
    //console.log(event);

    const { id, idVehicle } = event.pathParameters;

    // Realiza la consulta SELECT
    const query = 'DELETE FROM vehicle_modules WHERE vehicle_module_pk=? AND vehicle_fk=?';
    const queryParams = [id, idVehicle];

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
        body: JSON.stringify({ message: 'Error al realizar la eliminacion del modulo.' })
      };
    }
  } catch (error) {
    console.error('Error al realizar la eliminacion del modulo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al realizar la eliminacion del modulo.' })
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
