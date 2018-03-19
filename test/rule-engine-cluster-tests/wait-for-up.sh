#!/bin/sh
# rm pid.*.txt
pid=$$
fname="pid.$pid.txt"
echo $pid > $fname

url=$1
counter=0
status_code=404
max_retry=20
# status_code=$(curl -s -o /dev/null -w "%{http_code}" $url)
status_code="0"
is_fail=0
sleep_time=30

echo "Checking status of : $url"
until [[ "$status_code" -eq "200" ]]; do
  # ((counter=$counter+1))
  # counter=$((counter+1))
  let counter=counter+1
  echo "Attempting to reach $url ... ($counter/$max_retry)"
  status_code=$(curl -k -s -o /dev/null -w "%{http_code}" --connect-timeout 5 $url)
  echo "$status_code ($url)"
  if [[ "$counter" -lt "$max_retry" ]]; then
    sleep $sleep_time
  else
    is_fail=1
    break
  fi
done

if [[ "$is_fail" -eq "1" ]]; then
  echo "Attempting to reach $url ... ($counter/$max_retry) ... failed!!!"
  exit 1
else
  # echo "rm $fname"
  rm $fname
fi
