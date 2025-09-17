const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.lookup('cognito-idp.us-east-2.amazonaws.com', (err, address, family) => {
  console.log('err:', err);
  console.log('address:', address);
  console.log('family:', family);
});