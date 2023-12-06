const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);

  try {
    
    // Realiza la consulta SELECT
    const query = 'SELECT * FROM charge_box';
    const [rows] = await connection.execute(query);


    const jsonResp = rows.map(row => {
      return {
        charge_box_id: row.charge_box_id,
        endpoint_address: row.endpoint_address,
        ocpp_protocol: row.ocpp_protocol,
        registration_status: row.registration_status,
        diagnostics_status: row.diagnostics_status
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(jsonResp)
      //body: JSON.stringify(rows)
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
