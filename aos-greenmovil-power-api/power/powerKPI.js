const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
const  moment = require("moment-timezone");
//const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeZone = 'America/New_York'; // Define the GMT-05 timezone
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

    //console.log(event);
    //console.log(dbconfig);
    const connection = await mysql.createConnection(dbconfig);
    await connection.query('SET time_zone = "-05:00";');
    try {

        const { functional_unit_pk } = event.pathParameters;
////////////////////////////////////////////////////////////
let data={};
try {
  const response = await fetch('https://'+ process.env.BASEPATH_API_POWERLIMITS + '/powerconsumption', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data. Status: ${response.status}`);
  }

  data = await response.json();
} catch (error) {
  console.error("Error fetching data:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({ message: "Error fetching data" }),
  };
}
////////////////////////////////////////////////////////////  
let potencia = 0;
let datadata = [];
if ("data" in data)
{
  datadata = data.data;
}
//console.log(JSON.stringify(datadata));
for ( fuun of datadata ){
    if( parseInt(functional_unit_pk ) === parseInt(fuun.functionalStationId) ){
        potencia = fuun.totalPower;
        break;
    }

}
        // Realiza la consulta SELECT        
        const Qry = `select coalesce( sum(fugr_maxdelivpower),0 ) summaxdelivpower 
                    from functional_units, functionalunits_group where fuun_id = fugr_fuid and fuun_id= ? limit 1`;
        const QryParams = [functional_unit_pk];
        const [rows, fields] = await connection.execute(Qry, QryParams);
        //console.log("rows: " + JSON.stringify(rows));
        //console.log("fields: " + JSON.stringify(fields));

        let potencia_maxima = 0; // Suma de cargadores
        if ( rows && rows.length > 0){
          potencia_maxima = rows[0].summaxdelivpower;
        }
        //console.log(potencia_maxima);
        //potencia = Math.floor(Math.random() * potencia_maxima);        
        //let potencia = Math.floor(Math.random() * potencia_maxima);
        let porcentaje = (potencia_maxima>0?Math.floor((potencia*100)/potencia_maxima, 2) : 0);
       
        //////---------------\\\\
        let enddate = moment();
        //enddate = enddate.format('YYYY-MM-DDTHH:mm:ss');
        let dayNumberOfWeek = enddate.isoWeekday()+1; // Get the day number of the week (1 for Monday, 7 for Sunday)
        let roundedHour = enddate.hour(); // Get the rounded hour as an integer
        
        console.log('Day number of the week:', dayNumberOfWeek);
        console.log('Rounded hour:', roundedHour);
        ///////--------------\\\\
/////////////////// ------------------
data={};
try {
  const response = await fetch('https://'+ process.env.BASEPATH_API_POWERLIMITS + '/powerlimits', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data. Status: ${response.status}`);
  }

  data = await response.json();
} catch (error) {
  console.error("Error fetching data:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({ message: "Error fetching data" }),
  };
}
/////////////////// ------------------
let asignedpotencia=0;
if ("data" in data)
{
  datadata = data.data;
}

for ( day of datadata ){
  if( dayNumberOfWeek === day.id ){
    for( hour of day.limits ){
      if( roundedHour ===  hour.hour){        
        for ( fuun of hour.functionalStation ){
          console.log('Llega1');
          console.log(fuun.limit);
          if( parseInt(functional_unit_pk )  === parseInt(fuun.functionalStationId) ){
            asignedpotencia =fuun.limit;
            break;
          }
        }
      }
    }
  }
}
        const jsonResp = {
            "potencia_limite":asignedpotencia+ " kW",// Delivered power profile
            "potencia_maxima": potencia_maxima + " kW",// Configured charge profile
            "potencia_entregada":  Math.round(potencia) + " kW",
            "porcentaje_potencia": porcentaje + "%",
        };

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
              },
            body: JSON.stringify( jsonResp )
            //body: JSON.stringify(rows)
        };

        /*} else {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error al realizar la consulta' })
            };
        }*/
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
