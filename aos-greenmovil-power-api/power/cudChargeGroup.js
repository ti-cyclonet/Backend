const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
var  moment = require("moment-timezone");
const { getCurrentProfile, removeObjectByFunctionalStationId, setChargeProfile } = require('./chargerProfile');
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

        if (httpMethod === 'POST') {
        const cbg = JSON.parse(event.body);
        if ( cbg ) {
        // Realiza la consulta SELECT
          let query = 'INSERT INTO functional_units (fuun_name, fuun_description, fuun_allocpower) VALUES (?, ?, ?)';
          let queryParams = [cbg.fuun_name, cbg.fuun_name, cbg.fuun_allocpower];
  
          const [rowscbg, fieldscbg] = await connection.execute(query, queryParams);
  
          if (rowscbg && rowscbg.affectedRows > 0) {        
            query = 'INSERT INTO functionalunits_group (fugr_fuid, fugr_chargeboxpk) VALUES (?, ?)';
  
            for (const cbg_pk of cbg.fuun_chargerpklist) {
              queryParams = [rowscbg.insertId, cbg_pk];
              const [rowscbgc, fieldscbgc] = await connection.execute(query, queryParams);
  
              if (rowscbgc.affectedRows === 0) {
                await connection.rollback();

                return {
                  statusCode: 500,
                  body: JSON.stringify({ message: 'Error al realizar el registro de cargador en grupo' }),
                };
              }          
            }
          }
          else {
            await connection.rollback();          
            return {
              statusCode: 500,
              body: JSON.stringify({ message: 'Error al realizar el registro de grupo' }),
            };
          }
          await connection.commit();
            const jsonResp = {
              fuun_id: rowscbg.insertId,
              ...cbg,
          };
  
          return {
            statusCode: 200,
            body: JSON.stringify(jsonResp),
          };
          } else {        
            return {
              statusCode: 500,
              body: JSON.stringify({ message: 'Error al realizar el registro del grupo de cargadores' }),
            };
          }
        } else if (httpMethod === 'PUT') {
          // Handle PUT request
          const cbg = JSON.parse(event.body);
          if (cbg) {
        // Realiza la consulta SELECT
        let query = 'update functional_units set fuun_name=?, fuun_description=?, fuun_allocpower=? Where fuun_id=?';
        let queryParams = [cbg.fuun_name, cbg.fuun_name, cbg.fuun_allocpower, cbg.fuun_id];
    
        const [rowscbg, fieldscbg] = await connection.execute(query, queryParams);
   
 //       if (rowscbg && rowscbg.affectedRows > 0) {
          /*
          query="delete from functionalunits_group where fugr_fuid=?";
          const queryParamsCbgcDel = [cbg.fuun_id];
          const [rowscbgcdel, fieldscbgcdel] = await connection.execute(query, queryParamsCbgcDel);
          // if (rowscbgcdel && rowscbgcdel.affectedRows > 0) {
            query = 'INSERT INTO functionalunits_group (fugr_fuid, fugr_chargeboxpk) VALUES (?, ?)';
    
            for (const cbg_pk of cbg.fuun_chargerpklist) {
              queryParams = [cbg.fuun_id, cbg_pk];
              const [rowscbgc, fieldscbgc] = await connection.execute(query, queryParams);
      
              if (rowscbgc.affectedRows === 0) {
                await connection.rollback();
    
                return {
                  statusCode: 500,
                  body: JSON.stringify({ message: 'Error al realizar el registro de cargador en grupo' }),
                };
              }
            }
            */
       /*
          }
          else {
            await connection.rollback();
            return {
              statusCode: 200,
              body: JSON.stringify({ message: 'No hay cargadores en el grupo' }),
            };
          }
          */
  /*        
        }
        else {
          await connection.rollback();
          return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al realizar al actualizar los cargadores en el grupo' }),
          };
        }
*/
          await connection.commit();
          const jsonResp = {
            id: rowscbg.insertId,
            ...cbg,
          };
    
          return {
            statusCode: 200,
            body: JSON.stringify(jsonResp),
          };
        }
      } else if (httpMethod === 'DELETE') {

          const { fuunid, chrgpk } = event.pathParameters;          
          if ( fuunid && !chrgpk) {
          // Handle DELETE request
          let query="";
          
          query="delete from functionalunits_group where fugr_fuid=?";
          const queryParamsCbgc = [fuunid];
          const [rowscbgc, fieldscbgc] = await connection.execute(query, queryParamsCbgc);
          /*
          if (rowscbgc.affectedRows === 0) {
            await connection.rollback();
            return {
              statusCode: 500,
              body: JSON.stringify({ message: 'Error al realizar borrado del cargador desde el grupo' }),
            };
          }
        */
          query="delete from functional_units where fuun_id=?";
          const queryParamsCbg = [fuunid];      
          const [rowscbg, fieldscbg] = await connection.execute(query, queryParamsCbg);

          let data ={};
          let rspData = await getCurrentProfile();
          if( 200 == rspData.statusCode ){
            let entirePostData={};
            data = rspData.body;
            const result = removeObjectByFunctionalStationId(data.data, fuunid);
            entirePostData=JSON.stringify(({"days":result}));
            //console.log(entirePostData);
            
            rscallcp= await setChargeProfile(entirePostData).catch((error) => {
              console.error('Error: invoking url powerprofiles', JSON.stringify(error) );
              return { statusCode: 401, body: 'Error in API request ' + error.message };
            });
          }
          else {  
            throw new Error('Error: Unable to fetch data from energy perfil profiles.');
          }      
          /*
          if (rowscbg.affectedRows === 0) {
            await connection.rollback();
            return {
              statusCode: 500,
              body: JSON.stringify({ message: 'Error al realizar borrado del grupo de cargadores' }),
            };
          }   
          */

          await connection.commit();
          return {
            statusCode: 204
          };
          }
          //---\\
          
          if ( fuunid && chrgpk ) {
          // Handle DELETE request
          let query="";                  
          query="delete from functionalunits_group where fugr_fuid=? and fugr_chargeboxpk=?";
          const queryParamsCbg = [fuunid, chrgpk];      
          const [rowscbg, fieldscbg] = await connection.execute(query, queryParamsCbg);
          /*
          if (rowscbg.affectedRows === 0) {
            await connection.rollback();
            return {
              statusCode: 500,
              body: JSON.stringify({ message: 'Error al realizar borrado del cargador' }),
            };
          } 
          */         
          await connection.commit();
          return {
            statusCode: 204
          };
          }          

        } else {
          // Handle other HTTP methods if needed
          return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method not supported' }),
          };
        }

    } catch (error) {
      await connection.rollback();
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'An error occurred' }),
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