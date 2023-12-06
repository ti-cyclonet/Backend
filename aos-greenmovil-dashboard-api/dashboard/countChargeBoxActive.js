const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);

    try {

        // Realiza la consulta SELECT
        const query = 'SELECT 10 as total_online, 3 as total_offline FROM DUAL';
        const [rows, fields] = await connection.query(query);

        if (rows) {
            const jsonResp = {
                total_chargebox_online: 10,
                total_chargebox_offline: 3,
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
    