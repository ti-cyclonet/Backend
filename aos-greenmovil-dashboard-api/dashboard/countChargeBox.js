const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

exports.handler = async (event) => {


  const connection = await mysql.createConnection(dbconfig);

  try {

    // Realiza la consulta SELECT
    const query = 'SELECT COUNT(1) as count FROM charge_box';
    const [rows, fields] = await connection.execute(query);

    if (rows) {
      const jsonResp = {
        count: rows[0].count,
      };

      return {
        statusCode: 200,
        body: JSON.stringify(jsonResp),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Error al realizar la consulta',
        }),
      };
    }
  } catch (error) {
    console.error('Error al realizar la consulta:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al realizar la consulta' }),
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
