set OLD_PATH=%PATH%
set PATH=C:\Program Files\PostgreSQL\9.6\bin;%PATH%

set PGPASSWORD=postgres
dropdb -U postgres db
set PGPASSWORD=
set PATH=%OLD_PATH%