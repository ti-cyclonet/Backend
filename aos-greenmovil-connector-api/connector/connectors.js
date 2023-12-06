const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise');

exports.handler = async (event) => {    

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);

    try {
        
        const query = 'SELECT * FROM connector';
        const [rows] = await connection.query(query);

        return {
            statusCode: 200,
            body: JSON.stringify(rows)
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
  