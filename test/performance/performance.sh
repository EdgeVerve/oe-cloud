#!/bin/sh
JMX_FILES=`ls -1 ./test/performance/*.jmx`
for f in $JMX_FILES
do
JTL_FILE=${f%%.jmx}.jtl
CSV_FILE=${f%%.jmx}.csv
echo "Running script $f"
jmeter -n -t $f -Jloopcount=50000 -Jhost=${APP_IMAGE_NAME}.${PERF_DOMAIN_NAME} -Jport=443 -Jsecure=https -Jusers=1 -l $JTL_FILE
echo "Script completed $f"
echo "Converting jtl to csv for $f"
JMeterPluginsCMD.sh --generate-csv $CSV_FILE --input-jtl $JTL_FILE --plugin-type AggregateReport
done
