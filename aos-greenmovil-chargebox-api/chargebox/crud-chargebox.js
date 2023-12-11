const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

///---- Crear grupo de cargadores
//{ name:"UF6-01", allocpower:100,chargers:[]}

exports.handler = async (event) => {
    const connection = await mysql.createConnection(dbconfig);
    await connection.query('SET time_zone = "-05:00";');
    try {
        await connection.beginTransaction();
        const httpMethod = event.requestContext.http.method;

        if (httpMethod === 'PUT') {
            // Handle PUT request
            const chargerlst = JSON.parse(event.body);
            if (chargerlst) {
                // Realiza la consulta SELECT
                let query = 'update charge_box set alias=? Where charge_box_pk=? limit 1';
                let queryParams = [chargerlst.alias,chargerlst.charge_box_pk];
                const [rowscharger, fieldscharger] = await connection.execute(query, queryParams);
                if (rowscharger && rowscharger.affectedRows > 0) {
          
                    query="delete from functionalunits_group where fugr_chargeboxpk=? limit 1";
                    const queryParamsCbgcDel = [ chargerlst.charge_box_pk ];
                    const [rowscbgcdel, fieldscbgcdel] = await connection.execute(query, queryParamsCbgcDel);

                    if ( 0 !== parseInt( chargerlst.functional_unit_pk) )
                    {
                        // if (rowscbgcdel && rowscbgcdel.affectedRows > 0) {
                        query = 'INSERT INTO functionalunits_group (fugr_fuid, fugr_chargeboxpk, fugr_maxdelivpower) VALUES (?, ?, ?)';
    
                        //for (const cbg_pk of cbg.fuun_chargerpklist) {
                        queryParams = [chargerlst.functional_unit_pk, chargerlst.charge_box_pk, chargerlst.charge_mavdelivpower];
                        const [rowscbgc, fieldscbgc] = await connection.execute(query, queryParams);
      
                        if (rowscbgc.affectedRows === 0) {
                            await connection.rollback();
                            return {
                                statusCode: 500,
                                body: JSON.stringify({ message: 'Error al realizar el ajuste del cargador en el grupo.' }),
                            };
                        }
                        query = `update connector set conn_location=? where connector_pk=? limit 1`;
                        for (const cbg_conn of chargerlst.connectors) {
                            queryParams = [ cbg_conn.connectorlocation, cbg_conn.connector_pk ];
                            const [rowsconn, fieldsconn] = await connection.execute(query, queryParams);

                            if (rowsconn.affectedRows === 0) {
                                await connection.rollback();
                                return {
                                statusCode: 500,
                                body: JSON.stringify({ message: 'Error al realizar la actualización del conector.' }),
                                };
                            }
                        }
                    }        
                }
                else {
                    await connection.rollback();
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Error al realizar la actualización del cargador.' }),
                    };
                }

                await connection.commit();    
                return {
                    statusCode: 200,
                    body: 'Actualización correcta del cargador.',
                };
            }
        } 
        else {
            // Handle other HTTP methods if needed
            return {
                    statusCode: 405, // Method Not Allowed
                    body: JSON.stringify({ message: 'Method not supported.' }),
                };
        }

    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'An error occurred.' }),
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