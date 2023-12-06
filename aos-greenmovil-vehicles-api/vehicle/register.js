const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas


exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
    try {

        //console.log(event);

        const vehicle = JSON.parse(event.body);

        // Realiza la consulta SELECT
        const query = 'INSERT INTO vehicles (alias, batery_max_cap, charge_max_cap, status, placa) VALUES (?,?,?,?,?)';
        const queryParams = [vehicle.alias, vehicle.batery_max_cap, vehicle.charge_max_cap, vehicle.status, vehicle.placa];

        const [rows, fields] = await connection.execute(query, queryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        if (rows && rows.affectedRows > 0) {

            const jsonResp = {
                id: rows.insertId,
                ...vehicle
            };

            return {
                statusCode: 200,
                body: JSON.stringify(jsonResp)
                //body: JSON.stringify(rows)
            };
        } else {
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
  