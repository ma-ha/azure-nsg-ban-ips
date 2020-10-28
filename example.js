//const nsg = require( 'azure-nsg-ban-ips' )
const nsg = require( './azure-nsg-ban-ips' )

// change this:
const aadId   = 'YOUR AAD ID (aka tenant id)'
const spId    = 'YOUR AZURE SERVICE PRICIPAL ID'
const spKey   = 'YOUR  AZURE SERVICE PRICIPAL SECRET KEY'
const subId   = 'YOUR AZURE SUBSCRIPTION ID'
const rgName  = 'RESOURCE GROUP WHERE NSG LIVES'
const nsgName = 'YOUR NETWORK SECURITY GROUP (NSG) NAME'

run()

async function run() {
  try {
    // get credentials for all following operations first:
    await nsg.login( spId, spKey, aadId,  subId, rgName, nsgName  )

    // remove all ban rules older than 4 days
    await nsg.cleanupOldBlacklists( 4 )

    // add IPs to todays blacklist
    let todaysBlacklist = await nsg.addIpAddrArrToBlacklist( ['1.2.3.4','6.6.6.6'] )
    console.log( 'Todays IPs', todaysBlacklist )

    // get NSG rules
    let nsgRules = await nsg.getNsgRules()

    // print out ban rules
    for ( let secRule of nsgRules) {
      if ( secRule.description == 'created by blacklist job' ) {
        console.log( 'NSG ban IP rule', secRule.name, secRule.sourceAddressPrefixes )
      }
    }

  } catch ( exc ) {
    console.error( exc )
  }
}