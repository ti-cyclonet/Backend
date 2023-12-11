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
        const { cbgid } = event.pathParameters;
        // Realiza la consulta SELECT
        const query = 'select fuun_id, fuun_allocpower, fuun_name, fuun_description, fuun_algorithm, fuun_creationfec from functional_units where fuun_id=? limit 1';
        const queryParams = [cbgid];
        const [rows, fields] = await connection.execute(query, queryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));
        let cbgjson = {};

        if (rows.length) {
            cbgjson.fuun_id= rows[0].fuun_id;
            cbgjson.fuun_allocpower= rows[0].fuun_allocpower;
            cbgjson.fuun_name= rows[0].fuun_name;
            cbgjson.fuun_description= rows[0].fuun_description;
            cbgjson.fuun_algorithm= rows[0].fuun_algorithm;
            cbgjson.fuun_creationfec= rows[0].fuun_creationfec;
        }
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
              },
            body: JSON.stringify(cbgjson)
        };

    } catch (error) {
        console.error('Error al realizar la consulta:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
              },
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
