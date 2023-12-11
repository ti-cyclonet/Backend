const { dbconfig } = require("../config/dbconfig");
const mysql = require("mysql2/promise");
var  moment = require("moment-timezone");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
moment.tz.setDefault(timeZone);

exports.handler = async (event) => {

  const connection = await mysql.createConnection(dbconfig);
  await connection.query('SET time_zone = "-05:00";');
  try {
    //console.log(event.pathParameters);
    let order='';
    let fuunit='';
    let globfuunit='';
    let env='';
    let chgr='';


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
    // globfuunit = `   And fugr_fuid in ${strfu} ${ fuunit } ` ;        
//    globfuunit = ` And Exists (select 1 from functionalunits_group where fugr_chargeboxpk =cb.charge_box_pk and fugr_fuid in ${strfu} ${ fuunit } limit 1 )` ;    
/*
    let startDate = new Date();
    startDate = startDate.toISOString().split('.')[0];

    let endDate = new Date();
    endDate.setMinutes(new Date().getMinutes() + 5);
    endDate = endDate.toISOString().split('.')[0];
*/
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
                              WHERE status_timestamp >  NOW() - INTERVAL 1 HOUR
                              GROUP BY connector_pk
                          ) cs2 ON cs1.connector_pk = cs2.connector_pk AND cs1.status_timestamp = cs2.max_timestamp
                      ) cs ON c.connector_pk = cs.connector_pk
                      LEFT JOIN (
                          SELECT
                              connector_pk,
                              MAX(CASE WHEN measurand = 'SoC' THEN value END) AS soc
                          FROM connector_meter_value
                          WHERE measurand = 'SoC' 
                          AND value_timestamp >= NOW() - INTERVAL 5 MINUTE
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
    

    return {
      statusCode: 200,
      body: JSON.stringify({"fuunit":data, "chgr":tempArray}),
    };
  } catch (error) {
    console.error("Error al realizar la consulta:", error);
    return {
      statusCode: 500,
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
