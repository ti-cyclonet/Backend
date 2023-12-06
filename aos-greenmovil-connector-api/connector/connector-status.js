const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");

exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);

  try {
    const { connector_pk } = event.pathParameters;

    const query = `SELECT status, MAX(CAST(status_timestamp AS CHAR)) AS timestamp FROM connector_status WHERE connector_pk = ? GROUP BY status`;
    const queryParams = [connector_pk];

    console.log(mysql.format(query, queryParams));

    const [rows] = await connection.execute(query, queryParams);

    return {
      statusCode: 200,
      body: JSON.stringify(rows[0]),
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
