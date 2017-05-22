set OLD_PATH=%PATH%
set PATH=C:\Program Files\MongoDB\Server\3.0\bin;D:\mongodb\bin;D:\bin\mongodb-win32-i386-3.0.7\bin;C:\Program Files\MongoDB\Server\3.2\bin;D:\mongodb\bin;C:\Program Files\MongoDB\Server\3.4\bin;%PATH%

mongo server/dropdb.js

set PATH=%OLD_PATH%