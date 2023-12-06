const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas

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

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);

    try {

        // Realiza la consulta SELECT
        const query = 'SELECT * FROM vehicles';
        const [rows, fields] = await connection.execute(query);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        if (rows) {
            const jsonResp = rows.map(row => {
                return {
                    id: row.vehicle_pk,
                    alias: row.alias,
                    placa: row.placa,
                    batery_max_cap: row.batery_max_cap,
                    charge_max_cap: row.charge_max_cap,
                    status: row.status,
                };
            });

            const promises = jsonResp.map(vehicle => {
                return getModulesByVehicle(connection, vehicle);
            });

            // Se procesan en paralelo las consultas de los modulos de cada vehiculo
            const resp = await (async () => {
                return await Promise.all(promises);
            })();

            return {
                statusCode: 200,
                body: JSON.stringify(resp)
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
