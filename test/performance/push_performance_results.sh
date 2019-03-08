#!/bin/sh
cd ./test/performance/
CSV_FILES=`ls -1 *.csv`
FILE_PREFIX=`date '+%Y-%m-%d-%H-%M-%S'`
for f in $CSV_FILES
do
cat $f
cp $f ${FILE_PREFIX}-${f}
docker cp $f ${APP_IMAGE_NAME}:/perf/${CI_PROJECT_NAME}
docker cp ${FILE_PREFIX}-${f} ${APP_IMAGE_NAME}:/perf/${CI_PROJECT_NAME}
done
