const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

  //console.log(event);
  //console.log(dbconfig);
  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {
    
    // Realiza la consulta SELECT
    const query = `select fuun_id functional_unit_pk, fuun_name, fuun_description,  fuun_allocpower, fuun_algorithm 
                    from  (select * from functional_units order by 1 asc ) ordfuun limit 2;
                `;
    const [rows] = await connection.execute(query);


    const jsonResp = rows.map(row => {
      return {
        functional_unit_pk: row.functional_unit_pk,
        fuun_name: row.fuun_name,
        fuun_description: row.fuun_description,
        fuun_allocpower: row.fuun_allocpower,
        fuun_algorithm: row.fuun_algorithm
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
