var connect = require('connect');

connect()
.use(connect.logger('dev'))
.use(connect.static('src'))
.listen(8080);
console.log('Server running ( http://localhost:8080 )...');
