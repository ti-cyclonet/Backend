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
        await connection.beginTransaction();
        //console.log(event);

        const module = JSON.parse(event.body);
        const { idVehicle } = event.pathParameters;

        // Realiza la consulta SELECT
        const query = 'INSERT INTO vehicle_modules (module_sn, status, vehicle_fk) VALUES (?,?,?)';
        const queryParams = [module.module_sn, module.status, idVehicle];

        const [rows, fields] = await connection.execute(query, queryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        if (rows && rows.affectedRows > 0) {
          await connection.commit();
            const jsonResp = {
                id: rows.insertId,
                ...module
            };

            return {
                statusCode: 200,
                body: JSON.stringify(jsonResp)
                //body: JSON.stringify(rows)
            };
        } else {
          await connection.rollback();
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error al realizar el registro del vehiculo ' })
            };
        }
    } catch (error) {
        console.error('Error al realizar el registro del vehiculo:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al realizar el registro del vehiculo ' })
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
  