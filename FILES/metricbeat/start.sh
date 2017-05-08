#!/usr/bin/env ash
if [ -z $DRY_RUN ]; then

  # Change owner of config file if necessary
  USER=$(whoami)
  FILE_USER=$(stat -c '%U' /metricbeat/metricbeat.yml)
  if [ "$FILE_USER" != "root" ] && [ "$FILE_USER" != "$USER" ]; then
      echo "Change metricbeat.yml file owner to $USER"
      chown $USER /metricbeat/metricbeat.yml
  fi

  # Change permissions of the config file
  chmod go-w /metricbeat/metricbeat.yml

  metricbeat -e -v -c /metricbeat/metricbeat.yml $@
fi
