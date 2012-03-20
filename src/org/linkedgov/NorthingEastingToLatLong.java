package org.linkedgov;

import uk.me.jstott.jcoord.*;

import java.util.Properties;

import org.json.JSONException;
import org.json.JSONWriter;

import com.google.refine.expr.EvalError;
import com.google.refine.grel.ControlFunctionRegistry;
import com.google.refine.grel.Function;
import java.text.DecimalFormat;

/**
 * A google refine GREL function that turns Northing and Easting into Latitude and Lonitude.
 * It registers the function northingEastingToLatLong.
 */
public class NorthingEastingToLatLong implements Function {

    public Object call(Properties bindings, Object[] args) {
        if (args.length == 2) {
			if (!(args[0] instanceof Number)) {
				return new EvalError(ControlFunctionRegistry.getFunctionName(this) + " expects its first argument to be a number (java double easting)");
			}
			if (!(args[1] instanceof Number)) {
				return new EvalError(ControlFunctionRegistry.getFunctionName(this) + " expects its second argument to be a number (java double northing)");
			}
			double easting = ((Number)args[0]).doubleValue();
			double northing = ((Number)args[1]).doubleValue();

			LatLng latLng = new OSRef(easting,northing).toLatLng();
			//latLng.toWGS84();
			DecimalFormat doubleFormat = new DecimalFormat("#.####");
			return doubleFormat.format(latLng.getLat()) +
							"," +
							doubleFormat.format(latLng.getLng());
        }
		return new EvalError(ControlFunctionRegistry.getFunctionName(this) + " expects 2 numberic (double easting, double northing) argements");
    }

    
    public void write(JSONWriter writer, Properties options)
        throws JSONException {
    
        writer.object();
        writer.key("description"); writer.value("Takes in two numbers Northing and Easting and returns Latitude, Longitude");
        writer.key("params"); writer.value("Northing and Easting");
        writer.key("returns"); writer.value("double Latitude, double Longitude");
        writer.endObject();
    }

    static public void register() {
        com.google.refine.grel.ControlFunctionRegistry.registerFunction("northingEastingToLatLong", new NorthingEastingToLatLong());
    }
}
