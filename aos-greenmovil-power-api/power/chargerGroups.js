const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");
const https = require('https');
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);


exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {
    /*
    console.log(event.pathParameters);
    let order='';
    let fuunit='';
    let env='';
    let chgr='';
    if ( event.queryStringParameters ) {
      order = event.queryStringParameters.order || ''; // Use a default empty string if 'order' is not present.
      order = ` ORDER BY 7 ${order}`; 

      fuunit = event.queryStringParameters.fuunit || ''; // Use a default empty string if 'order' is not present.
      fuunit = ( ('-' == fuunit || '' == fuunit)? '': ' Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk and fugr_fuid=${fuunit} limit 1 )' ); 

      env = event.queryStringParameters.env || ''; // Use a default empty string if 'order' is not present.
      env = ( ('-' == env || '' == env)? '': ` And SUBSTRING_INDEX(cb.alias, '-', 1)='${env}'` ); 
      
      chgr = event.queryStringParameters.chgr || ''; // Use a default empty string if 'order' is not present.
      chgr = ( ('-' == chgr || ''== chgr)? '': ` And SUBSTRING_INDEX(cb.alias, '-', -1)='${chgr}'` ); 

    }
    

    let startDate = new Date();
    startDate = startDate.toISOString().split('.')[0];

    let endDate = new Date();
    endDate.setMinutes(new Date().getMinutes() + 5);
    endDate = endDate.toISOString().split('.')[0];
    */
    
    /*
    const query = 
    `select fuun_id, fuun_name, fuun_algorithm, fuun_allocpower, 
    (select count(1) from ocppcsdb.functionalunits_group where fugr_fuid= fuun_id) conncnt 
    FROM ocppcsdb.functional_units 
    `;
  */  
 //  fugr_fuid,
  // JOIN chargeboxgroup_charger cbgc ON cb.charge_box_pk = cbgc.fugr_chargeboxpk
    const queryConn=`SELECT
    cb.alias AS cargador, 
    coalesce( (select fugr_maxdelivpower from ocppcsdb.functionalunits_group where fugr_chargeboxpk= cb.charge_box_pk limit 1), 0 )  potmax, 
    'Secuencial' tipocargador,
    cb.registration_status respuesta,
    Case When last_heartbeat_timestamp > NOW() - INTERVAL 5 MINUTE Then 'Connected' Else 'Not connected' End conexion,
       cb.charge_box_pk,
       cb.charge_box_id,
       ( select count(1) from connector c where c.charge_box_id= cb.charge_box_id ) as noconectores
   FROM charge_box cb
   Where Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk and fugr_fuid=? limit 1 );

   `;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

const queryToma=`           
SELECT
c.charge_box_id,
cs1.status,
cs1.error_code,
cs1.error_info,
cs1.vendor_error_code,
cs2.max_timestamp,
cs2.connector_pk
FROM connector c 
JOIN connector_status cs1 ON c.connector_pk = cs1.connector_pk
JOIN (
SELECT
    cc.connector_pk,
    MAX(status_timestamp) AS max_timestamp
    FROM connector_status ccs Join connector cc On ccs.connector_pk = cc.connector_pk
    WHERE 1=1 And cc.charge_box_id = ? And status_timestamp >  NOW() - INTERVAL 1 HOUR
    GROUP BY connector_pk
) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
Where 1=1 And c.charge_box_id = ?
`;
const query = 
`select fuun_id, fuun_name, fuun_algorithm, fuun_allocpower, 
coalesce((select count(1) from ocppcsdb.functionalunits_group where fugr_fuid= fuun_id), 0) conncnt,
coalesce( (select sum(fugr_maxdelivpower) from ocppcsdb.functionalunits_group where fugr_fuid= fuun_id), 0 ) sum_fugrmaxdelivpower
FROM ocppcsdb.functional_units 
`;
const [res] = await connection.query(query);

   let data={};
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

let dataconne={};
try {
  const responseconne = await fetch('https://'+ process.env.BASEPATH_API_POWERLIMITS + '/assignements', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!responseconne.ok) {
    throw new Error(`Failed to fetch data. Status: ${responseconne.status}`);
  }

  dataconne = await responseconne.json();
} catch (error) {
  console.error("Error fetching data:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({ message: "Error fetching data" }),
  };
}

//////////////////////// -------------------

let datapowecon={};
try {
  const responsepowecon = await fetch('https://'+ process.env.BASEPATH_API_POWERLIMITS + '/powerconsumption', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!responsepowecon.ok) {
    throw new Error(`Failed to fetch data. Status: ${responsepowecon.status}`);
  }

  datapowecon = await responsepowecon.json();
} catch (error) {
  console.error("Error fetching data:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({ message: "Error fetching data" }),
  };
}

//////////////////////////--------------------
    let tempArray = [];
    // res.forEach((item, i) => {
    for (const item of res) {
        let objperf= {
            fuun_id: item.fuun_id,
            fuun_name: item.fuun_name,
            fuun_algorithm: item.fuun_algorithm,
            fuun_allocpower: item.fuun_allocpower,
            fuun_consumption_power:0,
            fuun_connected_cars: 0,
            fuun_assigned_power:0,
            fuun_chargers: [], 
            fuun_charge_profile:[]         
//          connectors: [{ ...item }],
        };
    
        objperf.fuun_consumption_power = item.sum_fugrmaxdelivpower;
        objperf.fuun_connected_cars = item.conncnt;
        
        for (const powcuf of datapowecon.data) {
          if ( item.fuun_id == powcuf.functionalStationId ){
            objperf.fuun_assigned_power =  Math.round( powcuf.totalPower ) ;
            break;
          }
        }
        
        let grpconn=[];        
        const queryParamConn = [item.fuun_id];
        const [rowsConn, fieldsConn] = await connection.execute(queryConn, queryParamConn);
        for (const rowConn of rowsConn) {

          //console.log(rowConn.charge_box_id);
          const queryParamToma = [rowConn.charge_box_id, rowConn.charge_box_id];
          const [rowsToma, fieldsToma] = await connection.execute(queryToma, queryParamToma);

          let sqstatus = "Offline";
          let sqerror= 'Not connected';          
          for ( const rowToma of rowsToma){
            if( 'Faulted'=== rowToma.status){
              sqstatus = rowToma.status;
              break;
            }
            else if(['Preparing', 'Charging','Finishing' ].includes(rowToma.status)){
              sqstatus = rowToma.status;
            }
            else {
              sqstatus = "Available";
            }
/*
            if( ['OtherError'].includes(rowConn.error_code)  ){
              sqerror=rowConn.error_code;//'Otro error';
            }
            else if( [ 'PowerSwitchFailure'].includes(rowConn.error_code)  ){
              sqerror=rowConn.error_code;//'Falla en toma de corriente';
            }
            else if( [ 'InternalError' ].includes(rowConn.error_code)  ){
              sqerror=rowConn.error_code;//'Error interno';
            }
            else if( [ 'Available','Preparing','Finishing' ].includes(rowConn.error_code)  ){
              sqerror=rowConn.error_code;
            }
            else{
              sqerror='Not connected';
            }
*/

          }    
          let chargerp = { 
                        "cargador": rowConn.cargador,
                        "potmax":rowConn.potmax,
                        "tipocargador":rowConn.tipocargador, 
                        "status":sqstatus,
                        "respuesta": rowConn.respuesta,
                        "conexion": rowConn.conexion,
                        "charge_box_pk": rowConn.charge_box_pk,
                        "noconectores": rowConn.noconectores
                       };
          grpconn.push(chargerp);
        }
        if (grpconn.length>0){
          objperf.fuun_chargers=grpconn;
        }
  

/*
    let grpconn=[];
    for (const ufun of dataconne.data) {
      if( item.fuun_id == ufun.functionalStation ){
      for (let charger of ufun.profilesList) {
        let chargerp={ "idConnector": charger.idConnector,"cargador":"","tipocargador":"", "status":"","respuesta":"","conexion":"",
         "power": charger.power, "idCar":charger.idCar, "idTransaction": charger.idTransaction };
        
        const queryParamConn = [charger.idConnector];
        const [rowsConn, fieldsConn] = await connection.execute(queryConn, queryParamConn);
        for (const rowConn of rowsConn) {
          if (rowsConn) {
            chargerp.cargador=rowConn.cargador;
            chargerp.tipocargador=rowConn.tipocargador;
            chargerp.status=rowConn.status;
            chargerp.respuesta=rowConn.respuesta;
            chargerp.conexion=rowConn.conexion;
          }
        }
          grpconn.push(chargerp);
      }  
      if (grpconn.length>0){
        objperf.fuun_chargers=grpconn;
      }
      break;
     }
    }
    */
    ////// -----        
    let grpprof=[];
    for (const day of data.data) {
      let dayp={ "id": day.id, "name": day.name, "limits": []};
      for (let hour of day.limits) {
        for (const functionalStation of hour.functionalStation) {
          if( item.fuun_id == functionalStation.functionalStationId ){ 
            dayp.limits.push({"hour":hour.hour ,functionalStation:functionalStation});
            break;
          }
        }
      }
      if (dayp.limits.length>0){
        // Example usage
        dayp.limits = groupByHour(dayp.limits);

        // Print the result
        //console.log(JSON.stringify(dayp.limits, null, 2));
        objperf.fuun_charge_profile.push(dayp); 
      }
    }
    tempArray.push(objperf);  
  }
  //);
    return {
      statusCode: 200,
      headers: {
          'Access-Control-Allow-Origin': "*",
          'Access-Control-Allow-Credentials': true,
        },
      body: JSON.stringify(tempArray),
    };
  } catch (error) {
    console.error("Error al realizar la consulta:", error);
    return {
      statusCode: 500,
      headers: {
          'Access-Control-Allow-Origin': "*",
          'Access-Control-Allow-Credentials': true,
        },
      body: JSON.stringify({ message: "Error al realizar la consulta" }),
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


// Function to group based on "hour" and generate the second array
function groupByHour(inputArray) {
  const result = [];

  // Grouping by "hour"
  const groupedLimits = inputArray.reduce((groups, limit) => {
      const existingGroup = groups.find(g => g.functionalStation.limit === limit.functionalStation.limit);

      if (existingGroup) {
          // Add to existing group
          existingGroup.endhour = (limit.hour+1);
      } else {
          // Create a new group
          groups.push({
              "inihour": limit.hour,
              "endhour": limit.hour,
              "functionalStation": limit.functionalStation
          });
      }

      return groups;
  }, []);

  // Create the final result
 /*
  result.push({
      "id": 7,
      "name": "Saturday",
      "limits": groupedLimits
  });
*/
  return groupedLimits;
}
