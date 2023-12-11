const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise'); // Utilizamos la versión promise para manejar promesas
const https = require('https');
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

///---- Crear grupo de cargadores
//{ name:"UF6-01", allocpower:100,chargers:[]}

///---- Asignar perfil de carga a un grupo ya creado
//{days:[
//0:
//{id:1, name:""Saturday", 
//  limits:[0:{},1:{},2:{},3:{},4:{},5:{},6:{},7:{},8:{},9:{},10:{},11:{},12:{},13:{},14:{},15:{},16:{},17:{},18:{},19:{},20:{},21:{},22:{}, 23:{}] }, 
//  1:{}, 2:{}, 3:{}, 4:{}, 5:{}, 6:{},]}
// Create a map to store the union set data
async function handler( event ) {
// exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const postData = JSON.parse(event.body);
    let rspData = await getCurrentProfile();
    let data ={};
    if( 200 == rspData.statusCode ){
      data = rspData.body;
    }
    else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error fetching data" }),
      };
    }
/*
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
    */

    let tempArray = [{"id":1, "name":"Sunday","limits":[]}, {"id":2, "name":"Monday","limits":[]}, 
    {"id":3, "name":"Tuesday","limits":[]}, {"id":4, "name":"Wednesday","limits":[]}, 
    {"id":5, "name":"Thursday","limits":[]}, {"id":6, "name":"Friday","limits":[]}, 
    {"id":7, "name":"Saturday","limits":[]}];

/** */
if (httpMethod === 'POST'){
//    for (const day of postData){
  for (let iday=0; iday < 7; iday++){
      let day=postData[iday];
//        for ( let day of  grp.charge_profile ){
            for (let hour of day.limits){
              const generatedRange = generateRange(hour.inihour, (hour.endhour-1));
              for( let ihour of generatedRange){
                //for (let ihour = hour.inihour; ihour<= hour.endhour; ihour++ ){
                    let hourp={"hour": ihour, "functionalStation":[]}
                        let fsp={ "functionalStationId": hour.functionalStation.functionalStationId, "limit": hour.functionalStation.limit };
                        hourp.functionalStation.push(fsp);
                    tempArray[iday].limits.push(hourp);
                }
            }
//        }
    }
}
let entirePostData="";
if (httpMethod === 'DELETE'){
    const { fuunid } = event.pathParameters;
    //entirePostData=JSON.stringify(({"days":data.data}));
    //console.log(entirePostData);
    const result = removeObjectByFunctionalStationId(data.data, fuunid);
    entirePostData=JSON.stringify(({"days":result}));
    //console.log(entirePostData);
}
if (httpMethod === 'POST'){
    const { fuunid } = event.pathParameters;

    let result1 = removeObjectByFunctionalStationId(data.data, fuunid );
    // console.log( JSON.stringify(tempArray) );    
    const result = mergeFunctionalStation(result1, tempArray);
    entirePostData=JSON.stringify(({"days":result.data}));
//    console.log(entirePostData);
}


rscallcp= await setChargeProfile(entirePostData).catch((error) => {
    console.error('Error: invoking url powerprofiles', JSON.stringify(error) );
    return { statusCode: 401, body: 'Error in API request ' + error.message };
});

    /*
    if (httpMethod === 'DELETE'){
        const connection = await mysql.createConnection(dbconfig);
        await connection.query('SET time_zone = "-05:00";');
        try{            
            await connection.beginTransaction();
            // Handle DELETE request
//            const query="delete from functional_units where fuun_id=?";
            let query=""; 
            for (const grp of grpList) {      
                console.log(grp.fuun_id);         
                query="delete from functionalunits_group where fugr_fuid=?";
                const queryParamsCbgc = [grp.fuun_id];
                const [rowscbgc, fieldscbgc] = await connection.execute(query, queryParamsCbgc);
                if (rowscbgc.affectedRows === 0) {
                  await connection.rollback();
                  return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Error al realizar borrado del cargador desde el grupo' }),
                  };
                }
              
                query="delete from functional_units where fuun_id=?";
                const queryParamsCbg = [grp.fuun_id];      
                const [rowscbg, fieldscbg] = await connection.execute(query, queryParamsCbg);
                if (rowscbg.affectedRows === 0) {
                  await connection.rollback();
                  return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Error al realizar borrado del grupo de cargadores' }),
                  };
                }          
                await connection.commit();
                return {
                  statusCode: 204
                };
                
            }
            await connection.commit();
        } 
        catch (error) {
            console.error(error);
            
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'An error occurred in SQL' }),
            };
        }
        finally {
            try {
                if (connection) {
                    connection.end();
                }
        } catch (error) {
          console.error('Error al cerrar la conexion:', error);
        }
      }
    }
    */
      return {
        statusCode: 200,
        body: JSON.stringify(tempArray)//'Charger profiles processed successfully',
      };
};
async function getCurrentProfile(){
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
    return {
      statusCode: 200,
      body: data,
    };

  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error fetching data" }),
    };
  }
}

function generateRange(initial, final) {
  const range = [];
  for (let i = initial; i <= final; i++) {
    range.push(i);
  }
  return range;
}

// Function to remove object when "functionalStationId" is "22"
function removeObjectByFunctionalStationId(obj, fuunid) {
  
    // Loop through the data array
    obj.forEach(day => {
      // Loop through the limits array
      day.limits.forEach(limit => {
        // Filter out the entire object when "functionalStationId" is "22"
        limit.functionalStation = limit.functionalStation.filter( station => !( parseInt(station.functionalStationId) === parseInt(fuunid) ) );
      });
  
      // Filter out limits with empty functionalStation array
      day.limits = day.limits.filter(limit => limit.functionalStation.length > 0);
    });
  
    // Filter out days with empty limits array
    //obj = obj.filter(day => day.limits.length > 0);
      
    //console.log(JSON.stringify(({"days":obj})));

    return obj;
  }

// Function to merge functionalStation data
function mergeFunctionalStation(obj1, obj2) {
    const result = { "data": [] };

    // Loop through the data array of obj1
    obj1.forEach(day1 => {
        // Find the corresponding day in obj2
        const day2 = obj2.find(day => day.id === day1.id);

        // Create a copy of the day1 object
        const mergedDay = { ...day1 };

        // Check if day2 exists in obj2
        if (day2) {
            // Merge the limits array if it exists in both objects
            if (day1.limits && day2.limits) {
                mergedDay.limits.forEach(limit1 => {
                    const limit2 = day2.limits.find(lim => lim.hour === limit1.hour);
                    if (limit2) {
                        // Merge the functionalStation array with unique functionalStationId values
                        limit1.functionalStation = [
                            ...limit1.functionalStation,
                            ...limit2.functionalStation.filter(
                                station2 =>
                                    !limit1.functionalStation.some(station1 => station1.functionalStationId === station2.functionalStationId)
                            ),
                        ];
                    }
                });

                // Check if obj2 has additional limits
                const additionalLimits = day2.limits.filter(
                    limit2 => !mergedDay.limits.find(limit1 => limit1.hour === limit2.hour)
                );
                mergedDay.limits.push(...additionalLimits);
            }
        }

        // Add the merged day to the result
        result.data.push(mergedDay);
    });

    return result;
}

async function setChargeProfile( entirePostData ){
  // Define the request options
  const options = {
      hostname: process.env.BASEPATH_API_POWERLIMITS,
      path: '/powerlimits',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': entirePostData.length
      }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        res.on('end', () => {
            // Handle the response if needed
            // For example, you can parse JSON response:
            // const responseJSON = JSON.parse(responseData);
            // console.log('Response:', responseJSON);
            resolve(); // Resolve the promise since the request is successful
        });
    });

    req.on('error', (error) => {
        reject(error); // Reject the promise if there's an error
    });

    req.write(entirePostData);
    req.end();
});

  }  
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { getCurrentProfile, removeObjectByFunctionalStationId, setChargeProfile, handler};