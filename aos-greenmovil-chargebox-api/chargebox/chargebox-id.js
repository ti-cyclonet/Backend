const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");

module.exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);

  try {

    const { id } = event.pathParameters;

    // Realiza la consulta SELECT
    const query = 'SELECT * FROM charge_box WHERE charge_box_id = ?';
    const queryParams = [id];

    console.log(mysql.format(query, queryParams));

    const [rows] = await connection.execute(query, queryParams);

    return {
      statusCode: 200,
      body: JSON.stringify(rows[0]),
    };    
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
