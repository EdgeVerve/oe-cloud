#!/bin/sh

c=1
max_retry=6
sleep_time=30
proc_exists=0

until [[ "$c" -eq "$max_retry" ]]; do

  echo "Waiting for services ... attempt ($c/$max_retry)"
  #check for the PID files
  file_exists=0
  for i in $(ls pid.*.txt 2> /dev/null); do
    # echo $i
    # pid=$(echo $i | sed "s/\w*\.\(.*\)\.txt/\1")
    pid=$(echo $i | sed "s/\w*\.\(.*\)\.txt/\1/")
    # echo "PID: $pid"
    ps -p $pid > /dev/null

    if [[ "$?" -eq "0" ]]; then
      # both file and process exists
      file_exists=1

    fi
  done

  if [[ "$file_exists" -eq "1" ]]; then
    # we have to retry after sleeping
    sleep $sleep_time
    ((c++))
  else
    # echo "Files don't exist..."
    break
  fi

done

ls pid.*.txt > /dev/null 2>&1
if [[ "$?" -eq "0" ]]; then
  echo "Could not bring services up!!"
  exit 1
else
  echo "Services up!"
fi
