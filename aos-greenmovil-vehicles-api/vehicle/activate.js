const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas


exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);

  try {

    //console.log(event);

    const vehicle = JSON.parse(event.body);
    const { id } = event.pathParameters;

    // Realiza la consulta SELECT
    const query = 'UPDATE vehicles SET status=?';
    const queryParams = ["Active"];

    const [rows, fields] = await connection.execute(query, queryParams);
    //console.log("rows: " + JSON.stringify(rows));
    //console.log("fields: " + JSON.stringify(fields));

    if (rows && rows.affectedRows > 0) {
      return {
        statusCode: 200
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error al realizar la actualizacion del estado del vehiculo.' })
      };
    }
  } catch (error) {
    console.error('Error al realizar la actualizacion del estado del vehiculo: ', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al realizar la actualizacion del estado del vehiculo.' })
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
