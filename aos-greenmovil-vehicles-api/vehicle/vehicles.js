const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
moment.tz.setDefault(Intl.DateTimeFormat().resolvedOptions().timeZone);

/*
async function getModulesByVehicle(connection, vehicle) {

    let modules = [];

    try {

        // Realiza la consulta SELECT
        const query = 'SELECT * FROM vehicle_modules WHERE vehicle_fk = ?';
        const queryParams = [vehicle.id];
        const [rows, fields] = await connection.execute(query, queryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        if (rows) {

            const jsonResp = rows.map(row => {
                return {
                    id: row.vehicle_module_pk,
                    module_sn: row.module_sn,
                    status: row.status,
                    VehicleId: row.vehicle_fk,
                };
            });

            vehicle.modules = jsonResp
        }
    } catch (error) {
        console.error('Error al realizar la consulta:', error);
    }

    return vehicle;
}
*/

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);
    await connection.query('SET time_zone = "-05:00";');
    try {
            let data=[];
             // Realiza la consulta SELECT
            const query = 'SELECT * FROM vehicles order by 1 desc';
            const [rows, fields] = await connection.execute(query);
            //console.log("rows: " + JSON.stringify(rows));
            //console.log("fields: " + JSON.stringify(fields));
        
            if (rows) {
                // const jsonResp = rows.map(row => {
                for (const row of rows) {
///////////////////
//                console.log(row);
                // Realiza la consulta SELECT
                const querym = 'SELECT * FROM vehicle_modules WHERE vehicle_fk = ?';
                const queryParamsm = [row.vehicle_pk];
                const [rowsm, fieldsm] = await connection.execute(querym, queryParamsm);
                let jsonRespm=[];
                if (rowsm) {
                    jsonRespm = rowsm.map(rowm => {
                        return {
                            id: rowm.vehicle_module_pk,
                            module_sn: rowm.module_sn,
                            status: rowm.status,
                            VehicleId: rowm.vehicle_fk,
                        };
                    });
                }
///////////////////
                data.push(
                 {
                    id: row.vehicle_pk,
                    alias: row.alias,
                    placa: row.placa,
                    batery_max_cap: row.batery_max_cap,
                    charge_max_cap: row.charge_max_cap,
                    status: row.status,
                    modules: jsonRespm
                }
                );
                }
                //);
                            
                return {
                    statusCode: 200,
                    body: JSON.stringify(data)
                    //body: JSON.stringify(rows)
                };
        
            } else {
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Error al realizar la consulta' })
                    };
                }
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
