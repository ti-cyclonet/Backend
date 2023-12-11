const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
moment.tz.setDefault(Intl.DateTimeFormat().resolvedOptions().timeZone);


exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
    try {
        
        const vehicle = JSON.parse(event.body);
        
        // Realiza la consulta SELECT
        const query = 'UPDATE vehicles SET alias=?, batery_max_cap=?, charge_max_cap=?, status=?, placa=? WHERE vehicle_pk=?';
        const queryParams = [vehicle.alias, vehicle.batery_max_cap, vehicle.charge_max_cap, vehicle.status, vehicle.placa, vehicle.id];

        const [rows, fields] = await connection.execute(query, queryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        if (rows && rows.affectedRows > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify(vehicle)
                //body: JSON.stringify(rows)
            };
        }else{
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
  