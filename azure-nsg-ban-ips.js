const msRestNodeAuth = require( 'ms-rest-azure' )
const NetworkManagementClient = require('azure-arm-network')
// const msRest = require( "@azure/ms-rest-azure-js" )
// const msRestNodeAuth = require( "@azure/ms-rest-nodeauth" )
// const { NetworkManagementClient } = require( "@azure/arm-network" )

module.exports = {
  login,
  addIpAddrArrToBlacklist,
  cleanupOldBlacklists,
  getNsgRules,
  creNSGrules,
}

let cred    = null
let sub     = null
let rg      = null
let nsg     = null
let client  = null

// ============================================================================

async function login( spId, spKey, aadId, subId, rgName, nsgName  ) {
  return new Promise( async ( resolve, reject ) => {
    // let creds = await msRestNodeAuth.loginWithServicePrincipalSecretWithAuthResponse( spId, spKey, aadId )
    // client = new NetworkManagementClient( creds, subId ) //  <<<< fails -- why??

    // msRestNodeAuth.loginWithServicePrincipalSecretWithAuthResponse( spId, spKey, aadId )
    // .then( (authres) => {
    //   // console.dir( authres, { depth: null })
    //   client = new NetworkManagementClient( authres, subId )
    // }).catch( ( err ) => {
    //   console.log( err )
    // });


    msRestNodeAuth.loginWithServicePrincipalSecret(
      spId, spKey, aadId,
      ( err, creds ) => {
        if ( err ) { return reject() }
        client = new NetworkManagementClient( creds, subId )
        sub  = subId
        rg   = rgName
        // cred = creds
        nsg  = nsgName
        // console.log( creds )
        resolve( client )
      }
    )
  })
}

// ============================================================================

// see https://github.com/Azure/azure-sdk-for-node/blob/9ff038233ad7fd25e32b8560f899c3ce0aabc8c8/lib/services/networkManagement2/lib/operations/securityRules.js  

async function getNsgRules( ) {
  return new Promise( async ( resolve, reject ) => {
    try {
      // let client = new NetworkManagementClient( cred, sub )
      let rules = await client.securityRules.list( rg, nsg )
      resolve( rules )
        // , ( err, result, request, response ) => {
        // if ( err ) { reject( err ) }
        // resolve( result )  
      // })
    } catch ( exc ) { reject( exc ) }
  })
}

// ============================================================================

async function addIpAddrArrToBlacklist( blacklistIpArr ) {
  return new Promise( async ( resolve, reject ) => {
    let now = new Date()
    // assemble generic NSG rule name
    let secRuleName = 'blacklist' + now.getUTCFullYear() + now.getUTCMonth() + 1 + now.getUTCDate()
    // prio must be uniqe
    let secRulePrio = 1000 + now.getUTCDay()

    // cre list of IPs to block
    let otherBlacklistIPs = await getBlockedIPs( secRuleName )
    let blacklistIPs = uniqueMerge( blacklistIpArr, otherBlacklistIPs )

    // update NSG blacklists
    if ( blacklistIPs.length > 0 ) {
      await creNSGrules( secRuleName, secRulePrio, blacklistIPs )
    }
    resolve( blacklistIPs )
  })
}

// ============================================================================

// promise enabled wrapper for securityRules.createOrUpdate
async function creNSGrules( secyRuleName, secRulePrio, blacklistIpArr ) {
  return new Promise( ( resolve, reject ) => {
    // let client = new NetworkManagementClient( cred, sub )
    let secRuleParams = {
      description: 'created by blacklist job',
      priority: secRulePrio,
      protocol: '*',
      sourcePortRange: '*',
      destinationPortRange: '*',
      sourceAddressPrefix: '',
      destinationAddressPrefix: '*',
      sourceAddressPrefixes: blacklistIpArr,
      // sourceApplicationSecurityGroups:[],
      // destinationAddressPrefixes:[],
      // destinationApplicationSecurityGroups:[],
      // sourcePortRanges:[],
      // destinationPortRanges:[],
      access:'Deny',
      direction: 'Inbound',
    }
    client.securityRules.createOrUpdate(
      rg, nsg, secyRuleName, secRuleParams, 
      ( err, result, request, response ) => {
        if (err) { reject( err ) }
        //console.log( result )
        resolve( result )
      }
    )
  })
}


// ============================================================================

/* Clean up blacklists (no parma: clean up oder than 2d), max 14d  */
async function cleanupOldBlacklists( retentionDays = 2 ) {
  if ( retentionDays > 13 ) { retentionDays = 13 }
  return new Promise( async ( resolve, reject ) => {
    try {
      let fwRules = await getNsgRules( )

      let keepRules = []
      for ( let day = 0; day < retentionDays; day++ ){
        let keepDay = new Date( Date.now() - day*24*60*60*1000 )
        keepRules.push( 'blacklist' + keepDay.getUTCFullYear() +
                        keepDay.getUTCMonth() + 1 + keepDay.getUTCDate() )
      }

      // console.log( 'keep', keepRules )
      for ( let rule of fwRules ) {
        if ( rule.description === 'created by blacklist job' ) {
          if ( keepRules.indexOf( rule.name ) == -1 ) {
            try {
              // console.log( 'delete', rule.name )
              await deleteNsgRule( rule.name )
            } catch ( exc ) {
              // console.error( exc )
            }
          } //else { console.log( 'keep', rule.name ) }
        }
      }
      resolve()
    } catch ( exc ) { reject( exc ) }
  })
}


// ============================================================================

async function deleteNsgRule( secRuleName ) {
  // console.log( 'deleteNsgRule', secRuleName )
  return new Promise( ( resolve, reject ) => {
    // let client = new NetworkManagementClient( cred, sub )
    client.securityRules.deleteMethod(
      rg, nsg, secRuleName,
      ( err, result, request, response ) => {
        if (err) { reject( err ) }
        //console.log( result )
        resolve( result )
      }
    )
  })
}

// ============================================================================
// helper
function uniqueMerge( arr1, arr2 ) {
  let resultArr = arr1
  for ( let anElement of arr2 ) {
    if ( resultArr.indexOf( anElement) == -1 ) {
      resultArr.push( anElement )
    }
  }
  return resultArr
}

// ============================================================================

function getBlockedIPs( secyRuleName ) {
  return new Promise( async ( resolve, reject ) => {
    try {
      let fwRules = await getNsgRules( )
      for ( let rule of fwRules ) {
        if ( rule.name === secyRuleName ) {
          resolve( rule.sourceAddressPrefixes )
        }
      }
      resolve( [] )
    } catch ( exc)
  })
}