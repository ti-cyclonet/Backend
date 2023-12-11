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
        
        let fuunlist = [];
        
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
      ( SELECT count(charge_box_pk) FROM functionalunits_group, charge_box 
        WHERE fugr_chargeboxpk = charge_box_pk and fugr_fuid=fuun_id And last_heartbeat_timestamp > NOW() - INTERVAL 5 MINUTE
      ) AS availablechr,
      ( SELECT count(charge_box_pk) FROM functionalunits_group, charge_box 
        WHERE fugr_chargeboxpk = charge_box_pk and fugr_fuid=fuun_id And last_heartbeat_timestamp < NOW() - INTERVAL 5 MINUTE
      ) AS unavailablechr


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
                    WHERE status_timestamp >  NOW() - INTERVAL 1 HOUR GROUP BY connector_pk
                ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
            ) cs ON c.connector_pk = cs.connector_pk  where 1=1 and c.connector_id >0
      ) as connector_status group by fuun_id, fuun_name, fuun_description order by 1 limit 2 ;`;


        const QryParams = [];
        const [rows] = await connection.execute(Qry, QryParams);

        let enddate = moment();
        let dayNumberOfWeek = enddate.isoWeekday() + 1;
        let roundedHour = enddate.hour();

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
                          console.log('Llega1');
                          console.log(fuun.limit);
                          if( parseInt(row.fuun_id )  === parseInt(fuun.functionalStationId) ){
                            limite =fuun.limit;
                            break;
                          }
                        }
                      }
                    }
                  }
                }


                let porcentaje = Math.round( (rows.powermax > 0 ? Math.floor((powerused * 100) / rows.powermax, 2) : 0));

                fuunlist.push({
					        "idUnit":row.fuun_id,
					        "unitName": row.fuun_name,
					        "unitDescription": row.fuun_description,
					        "totalChargers": (row.availablechr + row.unavailablechr),
					        "availableChargers": parseInt(row.availablechr),
                            "unavailableChargers": parseInt(row.unavailablechr),
					        "percentageChargers": Math.round( ((row.availablechr *100 )/(row.availablechr + row.unavailablechr ))),
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
                });
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify(fuunlist)
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
