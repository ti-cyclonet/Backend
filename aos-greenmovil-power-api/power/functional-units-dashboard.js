const { dbconfig } = require('../config/dbconfig');
const mysql = require('mysql2/promise');
const moment = require("moment-timezone");
const fetch = require('node-fetch');
const timeZone = 'America/New_York';
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {
    const connection = await mysql.createConnection(dbconfig);

    try {
        await connection.query('SET time_zone = "-05:00";');
    ////--------- all-units-dashboard ---------\\\\
    let order='';
    let fuunit='';
    let globfuunit='';
    let env='';
    let chgr='';
    
    // Module global Date
    let datevirnow='';
    const virnow =`select CAST(now() AS char) as timestamp from dual`;
    const [rowsvirnow, fieldsvirnow] = await connection.execute(virnow);
    if (rowsvirnow && rowsvirnow.length > 0) {
      datevirnow = rowsvirnow[0].timestamp;
    }
    //datevirnow ='2023-12-01 03:00:14';
    //------\\\

    const bothfuq=`select fuun_id from  (select * from functional_units order by 1 asc ) ordfuun limit 2;`;
    const [rowsbfuq, fieldsbothfuq] = await connection.execute(bothfuq);
    let strfu='( -1 ';
    if( rowsbfuq && rowsbfuq.length >= 2 )
    {
      strfu += ', '+ rowsbfuq[0].fuun_id + ','+ rowsbfuq[1].fuun_id;
    }
    else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error en necsario tener almenos dos unidades funcionales.' })
      };
    }
    strfu +=')';

    if ( event.queryStringParameters ) {
      order = event.queryStringParameters.order || ''; // Use a default empty string if 'order' is not present.
      order = ` ${order}`; 


      fuunit = event.queryStringParameters.fuunit || ''; // Use a default empty string if 'order' is not present.
      fuunit = ( ('-' == fuunit || '' == fuunit)? '':` and fugr_fuid=${fuunit}  ` ); 

      env = event.queryStringParameters.env || ''; // Use a default empty string if 'order' is not present.
      env = ( ('-' == env || '' == env)? '': ` And SUBSTRING_INDEX(cb.alias, '-', 1)='${env}'` ); 
      
      chgr = event.queryStringParameters.chgr || ''; // Use a default empty string if 'order' is not present.
      chgr = ( ('-' == chgr || ''== chgr)? '': ` And SUBSTRING_INDEX(cb.alias, '-', -1)='${chgr}'` ); 

    }
    globfuunit = ` ${ fuunit } ` ;        
    ////--------- all-units-dashboard ---------\\\\
    
    ////--------- DashBoard KPI's ---------\\\\
    let fuunlist = [];
    let fuunObj = {};

    const Qry =`Select 
      fuun_id,
      fuun_name, 
      fuun_description,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Available' OR status = 'Preparing' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status = 'Charging'  OR status = 'Finishing' THEN 1 ELSE 0 END) AS charging,
      SUM(CASE WHEN status = 'Faulted' OR status = 'Unavailable' OR status = 'SuspendedEVSE' OR status = 'SuspendedEV' THEN 1 ELSE 0 END ) AS error, 
      SUM(CASE WHEN  status = 'Offline' THEN 1 ELSE 0 END ) AS offline,
      SUM(CASE WHEN  status = 'Inactive' THEN 1 ELSE 0 END ) AS inactive,
      
      (select coalesce( sum(fugr_maxdelivpower),0 ) from functionalunits_group where fugr_fuid = fuun_id) powermax,
     
      /*
      ( SELECT count(1) FROM (
        SELECT cs.connector_pk, MAX(cs.status_timestamp)
        FROM connector_status cs JOIN connector c ON cs.connector_pk = c.connector_pk
        JOIN charge_box cb ON c.charge_box_id = cb.charge_box_id
        JOIN functionalunits_group fug ON cb.charge_box_pk = fug.fugr_chargeboxpk
        WHERE c.connector_id = 0
        AND fug.fugr_fuid = fuun_id
        AND cs.status_timestamp   
        Between STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s') - INTERVAL 1 HOUR And 
        STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s')
        GROUP BY cs.connector_pk) tavchr )
       */ 
        0 as availablechr,
            
      ( SELECT count(charge_box_pk) FROM functionalunits_group, charge_box 
        WHERE fugr_chargeboxpk = charge_box_pk and fugr_fuid=fuun_id
      ) AS totalchr


      From
      (
        Select   
        fuun_id, fuun_name, fuun_description,
        cb.charge_box_pk, cs.connector_pk, 
        Case When fugr_fuid is null then 'Inactive' Else  IFNULL(cs.status, 'Offline') End AS status       
          FROM charge_box cb
          Join functionalunits_group on fugr_chargeboxpk =charge_box_pk 
          Join functional_units on fuun_id = fugr_fuid
          JOIN connector c ON cb.charge_box_id = c.charge_box_id
          LEFT JOIN (
              SELECT
                cs1.connector_pk,
                cs1.status,
                cs1.error_code,
                cs1.error_info,
                cs1.vendor_error_code,
                cs2.max_timestamp 
                FROM connector_status cs1
                JOIN (
                    SELECT
                      connector_pk,
                      MAX(status_timestamp) AS max_timestamp
                    FROM connector_status
                    WHERE 
                    status_timestamp   
                    Between   STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s') - INTERVAL 1 HOUR And 
                    STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s') GROUP BY connector_pk
                ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
            ) cs ON c.connector_pk = cs.connector_pk  where 1=1 and c.connector_id >0
      ) as connector_status group by fuun_id, fuun_name, fuun_description order by 1 limit 2 ;`;

 //console.log(mysql.format(Qry));

        const QryParams = [];
        const [rows] = await connection.execute(Qry, QryParams);

        let enddate = moment();
        let dayNumberOfWeek = enddate.isoWeekday() + 1;
        let roundedHour = enddate.hour();

        // DashBoard KPI's
        if (rows && rows.length > 0) {
            for (let row of rows) {
                let powerused = 0;
                let data = {};

                try {
                    const response1 = await fetch(`https://${process.env.BASEPATH_API_POWERLIMITS}/powerconsumption`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    if (!response1.ok) {
                        throw new Error(`Failed to fetch data. Status: ${response1.status}`);
                    }

                    data = await response1.json();
                } catch (error) {
                    console.error("Error fetching power consumption data:", error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: "Error fetching power consumption data" }),
                    };
                }

                if ("data" in data)
                {
                  datadata = data.data;
                }
                //console.log(JSON.stringify(datadata));
                for ( fuun of datadata ){
                  if( parseInt(row.fuun_id ) === parseInt(fuun.functionalStationId) ){
                    powerused = fuun.totalPower;
                    break;
                  }
                }
        
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
                // Fetch power limits data similarly

                let limite = 0;

                // Logic to retrieve 'limite' based on fetched data
                if ("data" in data)
                {
                  datadata = data.data;
                }
            
                for ( day of datadata ){
                  if( dayNumberOfWeek === day.id ){
                    for( hour of day.limits ){
                      if( roundedHour ===  hour.hour){        
                        for ( fuun of hour.functionalStation ){
                          if( parseInt(row.fuun_id )  === parseInt(fuun.functionalStationId) ){
                            limite =fuun.limit;
                            break;
                          }
                        }
                      }
                    }
                  }
                }

                // powermax - > 100 %
                // powerused -> ?
                let porcentaje = Math.round( (row.powermax > 0 ? Math.floor((powerused * 100) / row.powermax, 2) : 0));
/*
                totalChargers
                unavailableChargers
                "percentageChargers": Math.round( (row.availablechr*100 )/(row.totalchr) ),
*/
                fuunObj["fuunkpi"+row.fuun_id] = {
                    "idUnit":row.fuun_id,
                    "unitName": row.fuun_name,
                    "unitDescription": row.fuun_description,
                    "totalChargers": parseInt(row.totalchr),
                    "availableChargers": 0,//parseInt(row.availablechr),
                    "unavailableChargers": 0,//parseInt(row.totalchr) - parseInt(row.availablechr),
                    "percentageChargers": 0,//Math.round( (row.availablechr*100 )/(row.totalchr) ),
                    "totalConnectors": (parseInt(row.available) + parseInt(row.charging) + parseInt(row.error) + parseInt(row.offline)) ,
                    "availableConnectors": parseInt(row.available),
                    "chargingConnectors": parseInt(row.charging),
                    "errorConnectors": parseInt(row.error),
                    "offlineConnectors": parseInt(row.offline),
                    "inactiveConnectors": parseInt(row.inactive),
                    "percentageConnectors":Math.round( ((row.available*100)/(parseInt(row.offline) + parseInt(row.available) + parseInt(row.charging) + parseInt((row.error)  )))),
                    "powerUsed":  Math.round(powerused) ,
                    "powerUsedString":  Math.round(powerused) + " kW",
                    "porcentageUsed": porcentaje + "%",
                    "limite":parseInt(limite),// Delivered power profile
                    "limiteString":limite+ " kW",// Delivered power profile
                    "powerMax": parseInt(row.powermax) ,// Configured charge profile
                    "powerMaxString": row.powermax + " kW"// Configured charge profile
                    };
            }
        }
       // fuunlist.push(fuunObj);
            ////--------- DashBoard KPI's ---------\\\\

    ////--------- all-units-dashboard ---------\\\\
    let data=[];
    const fuq=`select fuun_id functional_unit_pk, fuun_name name, fuun_description description from functional_units where fuun_id in ${strfu};`;
    
    const envq=`select distinct SUBSTRING_INDEX(cb.alias, '-', 1) env from charge_box cb where 
                      Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk and fugr_fuid=? limit 1 )`;

    const chbq=`select charge_box_pk, charge_box_id, SUBSTRING_INDEX(cb.alias, '-', -1) chr from charge_box cb where 
                      Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk and fugr_fuid=? limit 1 )`;
            
    const [rowsfuq, fieldsfuq] = await connection.execute(fuq);
    if (rowsfuq) {
        for (const rowfuq of rowsfuq) {
        const queryParamsenvq = [rowfuq.functional_unit_pk];
        const [rowsenvq, fieldsenvq] = await connection.execute(envq, queryParamsenvq);
        
        let jsonRespenvq=[];
        if (rowsenvq) {
          jsonRespenvq = rowsenvq.map(rowenvq => {
                return {
                    name: rowenvq.env,
                    value: rowenvq.env
                };
            });
        }

        const queryParamschbq = [rowfuq.functional_unit_pk];
        const [rowschbq, fieldschbq] = await connection.execute(chbq, queryParamschbq);

        let jsonRespchbq=[];
        if (rowschbq) {
          jsonRespchbq = rowschbq.map(rowchbq => {
                return {
                  charge_box_pk: rowchbq.charge_box_pk,
                  charge_box_id: rowchbq.charge_box_id,
                  name: rowchbq.chr,
                  value: rowchbq.chr,
                };
            });
        }

        data.push(
         {
            name: rowfuq.name,
            description: rowfuq.description,
            value: rowfuq.functional_unit_pk,
            env: jsonRespenvq,
            chgr: jsonRespchbq
        }
        );
        }
    } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error al realizar la consulta' })
            };
        }    


    const fuunquery=``;

    const query = `SELECT
                         Case When Coalesce( fugr_fuid, -1 ) Not In ${strfu} Then -1 Else Coalesce( fugr_fuid, -1 ) End  functional_unit_pk,
                          ( select fuun_name from functional_units where fuun_id = Coalesce( fugr_fuid, -1 ) limit 1 ) fuun_name, 
                          cb.charge_box_pk,
                          cb.charge_box_id,
                          cb.alias AS charge_box_alias,
                          c.connector_pk,
                          c.connector_id,
                          c.alias AS connector_alias,
                          Case When fugr_fuid is null then 'Inactive' Else                          
                          CASE WHEN IFNULL(cs.status, 'Offline') In( 'Faulted','Unavailable','SuspendedEVSE','SuspendedEV') THEN 'Faulted' 
                          ELSE IFNULL(cs.status, 'Offline') End End AS status,
                          cs.error_code,
                          cs.error_info,
                          cs.vendor_error_code,
                          CAST(cs.max_timestamp AS char) as max_timestamp,

                          Case When fugr_fuid is null then 'N/A' 
                          Else                          
                          CASE 
                          WHEN IFNULL(cs.status, 'Offline') In ( 'Faulted','Unavailable','SuspendedEVSE','SuspendedEV') THEN 'N/A' 
                          WHEN IFNULL(cs.status, 'Offline') In ( 'Available', 'Preparing') THEN 'N/A' 
                          WHEN IFNULL(cs.status, 'Offline') In ( 'Offline') THEN 'N/A' 
                          WHEN IFNULL(cs.status, 'Offline') in ('Charging','Finishing') THEN IFNULL(cmv.soc, '0')
                          ELSE IFNULL(cmv.soc, '0') End
                          End AS soc,

                          Case When IFNULL(cs.status, 'Offline') in ('Preparing','Finishing','Charging') 
                          Then (
                            select ve.placa 
                            from transaction_start ts
                            left join vehicle_modules vm on ts.vehicle_module_pk = vm.vehicle_module_pk
                            left join vehicles ve on ve.vehicle_pk = vm.vehicle_fk
                            where ts.connector_pk= cs.connector_pk 
                            and not exists (select 1 from transaction_stop trs where trs.transaction_pk = ts.transaction_pk)
                            limit 1
                          )
                          Else '' End placa
    
                      FROM charge_box cb
                      Left Join functionalunits_group on Coalesce( fugr_chargeboxpk, -1 ) =charge_box_pk
                      JOIN connector c ON cb.charge_box_id = c.charge_box_id
                      LEFT JOIN (
                          SELECT
                              cs1.connector_pk,
                              cs1.status,
                              cs1.error_code,
                              cs1.error_info,
                              cs1.vendor_error_code,
                              cs2.max_timestamp 
                          FROM connector_status cs1
                          JOIN (
                              SELECT
                                  connector_pk,
                                  MAX(status_timestamp) AS max_timestamp
                              FROM connector_status
                              WHERE status_timestamp   
                              Between   STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s') - INTERVAL 1 HOUR And 
                              STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s')
                              GROUP BY connector_pk
                          ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
                      ) cs ON c.connector_pk = cs.connector_pk
                      LEFT JOIN (
                          SELECT
                              connector_pk,
                              MAX(CASE WHEN measurand = 'SoC' THEN value END) AS soc
                          FROM connector_meter_value
                          WHERE measurand = 'SoC' 
                          AND
                          value_timestamp Between 
                          STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s') - INTERVAL 5 MINUTE And
                           STR_TO_DATE( '${datevirnow}', '%Y-%m-%d %H:%i:%s')  
                          
                          AND transaction_pk is not null
                          GROUP BY connector_pk
                      ) cmv ON c.connector_pk = cmv.connector_pk
                      Where 1=1 And c.connector_id>0
                  ${globfuunit}
                  ${env}
                  ${chgr}
                  ORDER BY 2 ${order},  5 ${order}, 7 asc`;

    const [res] = await connection.query(query);
    //console.log(mysql.format(query));
    let tempArray = [];
    res.forEach((item, i) => {
      if (i === 0) {
        tempArray.push({
          functional_unit_pk: item.functional_unit_pk,
          fuun_name: item.fuun_name,
          charge_box_id: item.charge_box_id,
          charge_box_alias: item.charge_box_alias,

          connectors: [{ ...item }],
        });
      } else {
        const index = tempArray.findIndex(
          (temp) => temp.charge_box_id === item.charge_box_id
        );
        if (index !== -1) {
          tempArray[index].connectors.push(item);
        } else {
          tempArray.push({
            functional_unit_pk: item.functional_unit_pk,
            fuun_name: item.fuun_name,  
            charge_box_id: item.charge_box_id,
            charge_box_alias: item.charge_box_alias,
            connectors: [{ ...item }],
          });
        }
      }
    });

    tempArray.forEach((item, i)=>{
      let chgrava = 0;
      for( let conn of item.connectors){
        if(['Inactive','Faulted','Preparing', 'Charging','Finishing' ].includes(conn.status)){
          chgrava = 0;
          break;
        }
        else if( ['Offline'].includes(conn.status) ){ 
          //chgrava =0; 
        }
        else if( ['Available'].includes(conn.status) ){ 
          chgrava =1; 
        }
      }
      fuunObj["fuunkpi"+  item.functional_unit_pk].availableChargers+=chgrava;
      
      fuunObj["fuunkpi"+  item.functional_unit_pk].unavailableChargers= 
      parseInt( fuunObj["fuunkpi"+  item.functional_unit_pk].totalChargers ) -
      parseInt(fuunObj["fuunkpi"+  item.functional_unit_pk].availableChargers);
      
      fuunObj["fuunkpi"+  item.functional_unit_pk].percentageChargers=
      Math.round( (parseInt(fuunObj["fuunkpi"+  item.functional_unit_pk].availableChargers)*100 )/
      (parseInt( fuunObj["fuunkpi"+  item.functional_unit_pk].totalChargers )) );
/*
                totalChargers
                unavailableChargers
                "percentageChargers": Math.round( (row.availablechr*100 )/(row.totalchr) ),
*/

    });
    

    ////--------- all-units-dashboard ---------\\\\
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({"fuunit":data, "chgr":tempArray, "fuunkpis":fuunObj })
        };
    } catch (error) {
        console.error('Error during execution:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: 'Error during execution' })
        };
    } finally {
        try {
            if (connection) {
                await connection.end();
            }
        } catch (error) {
            console.error('Error closing the connection:', error);
        }
    }
};
