require_relative 'cfme/utils/log'
include Cfme::Utils::Log
def compare_data(table_data, graph_data, legends, tolerance: 1)
  #  Compare Utilization graph and table data.
  #   Args:
  #       table_data : Data from Utilization table
  #       graph_data : Data from Utilization graph
  #       legends : Legends in graph; which will help for comparison
  #       tolerance : Its error which we have to allow while comparison
  #   
  for row in table_data
    for (key, data) in graph_data.to_a()
      if is_bool(((row["Date/Time"]).split().map{|item| re.match(key, item)}).is_any?)
        for leg in legends
          table_item = (row[leg].gsub(",", "").gsub("%", "")).split()
          if is_bool(table_item)
            table_item = round(table_item[0].to_f, 1)
            graph_item = round(((data[leg].gsub(",", "").gsub("%", "")).split()[0]).to_f, 1)
            cmp_data = (table_item - graph_item).abs <= tolerance
            raise "compare graph and table readings with tolerance" unless cmp_data
          else
            logger.warning("No {leg} data captured for DateTime: {dt}".format(leg: leg, dt: row["Date/Time"]))
          end
        end
      end
    end
  end
end
def compare_data_with_unit(table_data, graph_data, legends, tolerance: 1)
  #  Compare Utilization graph and table data and consider units
  #   Args:
  #       table_data : Data from Utilization table
  #       graph_data : Data from Utilization graph
  #       legends : Legends in graph; which will help for comparison
  #       tolerance : Its error which we have to allow while comparison
  # 
  #   Note: Mainly, when we check graph for some tag the unit in table reading missing. The unit
  #       conversion totally depends on manual observation.
  # 
  #   Bugzilla:
  #       1367560
  #   
  for row in table_data
    for (key, data) in graph_data.to_a()
      if is_bool(((row["Date/Time"]).split().map{|item| re.match(key, item)}).is_any?)
        for leg in legends
          table_item = re.split_p(" |%", row[leg].gsub(",", ""))
          tb_value,tb_unit = (table_item.size > 1) ? table_item : [table_item[0], nil]
          if is_bool(table_item)
            graph_item = re.split_p(" |%", data[leg].gsub(",", ""))
            gp_value,gp_unit = (graph_item.size > 1) ? graph_item : [graph_item[0], nil]
            if is_bool(!tb_unit)
              if gp_unit == "GHz"
                tb_value = round(tb_value.to_f * (10 ** -3), 1)
                tb_unit = "GHz"
              else
                if gp_unit == "GB"
                  tb_value = round(tb_value.to_f / 1024.to_f, 1)
                  tb_unit = "GB"
                else
                  if ["MHz", "MB", "B", "KBps"].include?(gp_unit)
                    tb_unit = gp_unit
                  end
                end
              end
            else
              if gp_unit == ""
                gp_unit = tb_unit = "%"
              else
                if is_bool(tb_unit == "Bytes" && gp_unit == "B")
                  tb_unit = gp_unit
                end
              end
            end
            tb_value = round(tb_value.to_f, 1)
            gp_value = round(gp_value.to_f, 1)
            if tb_unit == gp_unit
              cmp_data = (tb_value - gp_value).abs <= tolerance
              raise "compare graph and table readings with tolerance" unless cmp_data
            else
              logger.warning("Unit missmatch: {leg}: Table:{tb} {tbu}   Graph:{gp} {gpu}".format(leg: leg, tb: tb_value, tbu: tb_unit, gp: gp_value, gpu: gp_unit))
            end
          else
            logger.warning("No {leg} data captured for DateTime: {dt}".format(leg: leg, dt: row["Date/Time"]))
          end
        end
      end
    end
  end
end
