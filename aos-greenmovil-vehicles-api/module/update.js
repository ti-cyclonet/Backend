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
        const query = 'UPDATE vehicle_modules SET module_sn=?, status=? WHERE vehicle_module_pk=? AND vehicle_fk=?';
        const queryParams = [module.module_sn, module.status, module.id, idVehicle];

        const [rows, fields] = await connection.execute(query, queryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        if (rows && rows.affectedRows > 0) {
          await connection.commit();
            return {
                statusCode: 200,
                body: JSON.stringify(module)
                //body: JSON.stringify(rows)
            };
        }else{
          await connection.rollback();
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error al realizar la actualizacion del vehiculo.' })
                //body: JSON.stringify(rows)
            };
        }
    } catch (error) {
        console.error('Error al realizar el registro del vehiculo:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al realizar la actualizacion del vehiculo.' })
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
  