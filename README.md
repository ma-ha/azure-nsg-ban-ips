# azure-nsg-ban-ips
Block malicious IPs for some days, perfect for Azure Kubernetes (AKS).a

This is much better than banning IPs in e.g. NGINX, 
because attackers don't reach the infrastructure at all.

Node.js: [npm package](https://www.npmjs.com/package/azure-nsg-ban-ips)

# Usage: Code

```javascript
const nsg = require( 'azure-nsg-ban-ips' )

nsg.login( SERVICE_PRICIPAL_ID, SECRET_KEY, AAD_ID, SUBSCRIPTION_ID, RESSOURCE_GROUP, NSG_NAME )

// clean up and keep ban rules 4 days
await nsg.cleanupOldBlacklists( 4 )

// add IPs to todays blacklist
let todaysBlacklist = await nsg.addIpAddrArrToBlacklist( ['1.2.3.4','6.6.6.6'] )
console.log( 'Todays IPs', todaysBlacklist )
```

Details: see [example.js](example.js) 

# Usage: Container

There is a ready to use 
- Node.js App
- (Docker Container)[https://hub.docker.com/r/mahade70/aks-nsg-ingress-ban-ip]
- Kubernetes Pod
here: https://github.com/ma-ha/aks-nsg-ingress-ban-ip

This reads the NginX Ingress Controller logs, identify attacks and bans the IP addresses in the NSG.

CI code is provided for easy end-to-end set up of EventHub, LogAnalytics log feed-out etc.

# API

Init and get credentials for all following operations first:
```javascript
login( SERVICE_PRICIPAL_ID, SECRET_KEY, AAD_ID, SUBSCRIPTION_ID, RESSOURCE_GROUP, NSG_NAME )
```

Clean up NSG rules. Optional parameter: keep ban rules X days, default is 2, max is 13:
```javascript
cleanupOldBlacklists()
cleanupOldBlacklists( 4 )
```

Add IP array to todays NSG rule. Returns an array of banned IPs in todays NSG rule.
```javascript
addIpAddrArrToBlacklist( IP_ADDRESS_ARRAY )
```

Read and return all secuirity rules in the NSG:
```javascript
getNsgRules()
```

# NSG rules

This package creates NSG security rules and use prio 1000...10365 (1000 + day).

If you need to set up whitelist rules, you should use a prio with e.g. 200.